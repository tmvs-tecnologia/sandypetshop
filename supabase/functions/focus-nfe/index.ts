import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, expires',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  let step = 'inicializando'
  try {
    const { reference_id, reference_type } = await req.json()
    console.log(`[FocusNFe] Iniciando emissão para ${reference_type}: ${reference_id}`)

    const rawApiKey = Deno.env.get('FOCUS_NFE_API_KEY')
    if (!rawApiKey) throw new Error('A variável FOCUS_NFE_API_KEY não está configurada.')
    const apiKey = rawApiKey.trim()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let data = null
    step = 'buscando dados no banco'

    const tablesToSearch = [
        'appointments',
        'pet_movel_appointments',
        'agendamento_banhotosa',
        'monthly_clients',
        'hotel_registrations',
        'daycare_enrollments',
        'clients'
    ]

    const searchErrors: string[] = []
    console.log(`[FocusNFe] Buscando ${reference_id} em ${tablesToSearch.join(', ')}...`)

    for (const table of tablesToSearch) {
        try {
            const { data: record, error: tableError } = await supabase
                .from(table)
                .select('*')
                .eq('id', reference_id)
                .maybeSingle()
            
            if (record) {
                console.log(`[FocusNFe] Registro encontrado na tabela: ${table}`)
                data = { ...record, _source_table: table }
                break
            }
            if (tableError) {
                searchErrors.push(`${table}: ${tableError.message}`)
            }
        } catch (err) {
            searchErrors.push(`${table} (catch): ${err.message}`)
        }
    }

    if (!data) {
        throw new Error(`Registro ${reference_id} não encontrado. Erros por tabela: ${searchErrors.join(' | ')}`)
    }

    step = 'preparando dados do cliente'
    const customer = {
      nome: data.owner_name || data.client_name || data.tutor_name || data.name || 'Cliente não identificado',
      cpf: data.owner_cpf || data.cpf || data.client_cpf || '',
      email: data.owner_email || data.email || data.client_email || data.tutor_email || '',
      endereco: data.owner_address || data.address || data.tutor_address || 'Não informado',
      price: data.price || data.total_price || data.total_services_price || 0,
      service: data.service || data.plan || (data._source_table === 'hotel_registrations' ? 'Hospedagem Pet' : (data._source_table === 'daycare_enrollments' ? 'Creche Pet' : 'Serviço de PetShop'))
    }

    if (!customer.cpf || customer.cpf.replace(/\D/g, '').length < 11) {
        throw new Error(`CPF inválido ou não informado para ${customer.nome}.`)
    }

    step = 'chamando API FocusNFe'
    const focusEnv = Deno.env.get('FOCUS_NFE_ENVIRONMENT') || 'homologacao'
    const baseUrl = focusEnv === 'producao' 
      ? 'https://api.focusnfe.com.br/v2/nfsen' 
      : 'https://homologacao.focusnfe.com.br/v2/nfsen'
    
    const focusRef = `${reference_type || 'service'}-${reference_id}-${Date.now()}`
    
    const now = new Date()
    const isoDate = now.toISOString().split('.')[0] + 'Z'
    const dateOnly = now.toISOString().split('T')[0]
    
    const payload = {
        data_emissao: isoDate,
        data_competencia: dateOnly,
        emitente_dps: 1, // 1 - Prestador
        codigo_municipio_emissora: 3513801, // Diadema, SP
        cnpj_prestador: "27859716000103",
        codigo_opcao_simples_nacional: 2, // 2 - Simples Nacional (ME/EPP)
        regime_especial_tributacao: "0",
        
        // Dados do Tomador (Estrutura Plana conforme doc)
        cpf_tomador: customer.cpf.replace(/\D/g, ''),
        nome_tomador: customer.nome,
        email_tomador: customer.email || undefined,
        logradouro_tomador: customer.endereco,
        numero_tomador: "SN",
        bairro_tomador: "Bairro",
        codigo_municipio_tomador: 3513801,
        uf_tomador: "SP",
        cep_tomador: "09900000",
        
        // Dados do Serviço (Estrutura Plana conforme doc)
        codigo_municipio_prestacao: 3513801,
        codigo_tributacao_nacional_iss: "071001", // Mapeamento para Veterinária / PetShop (07.10)
        descricao_servico: `${customer.service} - Pet: ${data.pet_name || 'Não informado'}`,
        valor_servico: customer.price,
        tributacao_iss: 1 // 1 - Sim (Tributável)
    }

    const response = await fetch(`${baseUrl}?ref=${focusRef}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const rawText = await response.text()
    let result;
    try {
        result = JSON.parse(rawText)
    } catch (e) {
        throw new Error(`Resposta não-JSON da FocusNFe: ${rawText.substring(0, 100)}...`)
    }
    
    if (!response.ok) {
      const errorMsg = result.mensagem || result.errors?.[0]?.mensagem || JSON.stringify(result)
      throw new Error(`Erro da FocusNFe: ${errorMsg}`)
    }

    step = 'salvando registro fiscal'
    await supabase.from('fiscal_notes').insert({
        reference_id,
        reference_type,
        focus_nfe_reference: focusRef,
        focus_nfe_id: result.id,
        status: 'pending',
        raw_response: result
    })

    return new Response(JSON.stringify({ success: true, reference: focusRef, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`[Erro no passo ${step}]:`, error.message)
    return new Response(JSON.stringify({ 
        success: false, 
        error: `Erro no passo [${step}]: ${error.message}` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
