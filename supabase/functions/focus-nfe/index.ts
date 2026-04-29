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
    const { reference_id, reference_type, pet_name: req_pet_name, tutor_name: req_tutor_name } = await req.json()
    console.log(`[FocusNFe] Iniciando emissão para ${reference_type}: ${reference_id} (Pet: ${req_pet_name})`)

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
    const petName = req_pet_name || data.pet_name || data.petName || 'Pet';
    const customer = {
      nome: req_tutor_name || data.owner_name || data.client_name || data.tutor_name || data.name || 'Cliente não identificado',
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
    // Subtrair 1 hora para evitar erro de "data no futuro"
    const adjustedNow = new Date(now.getTime() - 60 * 60 * 1000)
    
    // Formatação manual para Brasília (-03:00)
    // Se UTC é 19:35, adjustedNow (UTC) é 18:35. Em BRT (UTC-3) seria 15:35.
    const brTime = new Date(adjustedNow.getTime() - (3 * 60 * 60 * 1000))
    const pad = (n: number) => n.toString().padStart(2, '0')
    const isoDate = `${brTime.getUTCFullYear()}-${pad(brTime.getUTCMonth()+1)}-${pad(brTime.getUTCDate())}T${pad(brTime.getUTCHours())}:${pad(brTime.getUTCMinutes())}:${pad(brTime.getUTCSeconds())}-03:00`
    const dateOnly = `${brTime.getUTCFullYear()}-${pad(brTime.getUTCMonth()+1)}-${pad(brTime.getUTCDate())}`
    
    const payload = {
        data_emissao: isoDate,
        data_competencia: dateOnly,
        emitente_dps: 1, // 1 - Prestador
        codigo_municipio_emissora: 3513801, // Diadema, SP
        cnpj_prestador: "27859716000103",
        codigo_opcao_simples_nacional: "2", // 2 - MEI (Em string conforme docs)
        regime_especial_tributacao: "0",
        
        // Dados do Tomador
        cpf_tomador: customer.cpf.replace(/\D/g, ''),
        razao_social_tomador: customer.nome || "Consumidor",
        email_tomador: customer.email || undefined,
        logradouro_tomador: customer.endereco || "Não informado",
        numero_tomador: "SN",
        bairro_tomador: "Bairro",
        codigo_municipio_tomador: 3513801,
        // uf_tomador removido pois não existe no padrão flat nfsen do FocusNFe
        cep_tomador: (customer.cep || "09910770").replace(/\D/g, ''),
        
        // Dados do Serviço
        codigo_municipio_prestacao: 3513801,
        item_lista_servico: "05.08",
        codigo_tributacao_nacional_iss: "050801", // Guarda, tratamento, amestramento, embelezamento, alojamento e congêneres, relativos a animais.
        descricao_servico: `${customer.service} - Pet: ${petName}`,
        valor_servico: customer.price,
        tributacao_iss: 1, // 1 - Sim (Tributável)
        tipo_retencao_iss: 1 // 1 - Não Retido
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

    // A URL do PDF para NFS-e Nacional só fica disponível após o processamento.
    // Vamos fazer um polling (consulta repetida) por alguns segundos para tentar obter o link real.
    let pdfUrl = null;
    let finalStatus = result.status;
    let consultData = result;

    // Tentar consultar por até 5 vezes (total de ~10 segundos)
    for (let i = 0; i < 5; i++) {
        // Esperar 2 segundos entre tentativas (o processamento nacional pode levar um tempinho)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const consultRes = await fetch(`${baseUrl}/${focusRef}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${btoa(apiKey + ':')}`,
            }
        });
        
        if (consultRes.ok) {
            consultData = await consultRes.json();
            finalStatus = consultData.status;
            
            // No padrão nacional, o PDF oficial (DANFSe) vem no campo url_danfse
            if (consultData.url_danfse) {
                pdfUrl = consultData.url_danfse;
                break;
            }
            
            // Caso não tenha url_danfse mas tenha um ID UUID, podemos tentar montar a URL com token
            if (consultData.id) {
                pdfUrl = `${baseUrl}/${consultData.id}.pdf?token=${apiKey}`;
                break;
            }
            
            // Se der erro ou for negada, paramos o polling
            if (finalStatus === 'erro_autorizacao' || finalStatus === 'negado') {
                break;
            }
        }
    }

    step = 'salvando registro fiscal'
    await supabase.from('fiscal_notes').insert({
        reference_id,
        reference_type,
        focus_nfe_reference: focusRef,
        focus_nfe_id: consultData.id || result.id || null,
        status: finalStatus || 'pending',
        nfe_url_pdf: pdfUrl,
        raw_response: {
          ...consultData,
          pet_name: petName,
          tutor_real_name: customer.nome
        }
    })

    return new Response(JSON.stringify({ 
        success: true, 
        reference: focusRef, 
        pdf_url: pdfUrl,
        status: finalStatus,
        data: consultData 
    }), {
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
