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

    if (reference_type === 'appointment') {
        const { data: appt } = await supabase.from('appointments').select('*').eq('id', reference_id).single()
        data = appt
        if (!data) {
            const { data: pma } = await supabase.from('pet_movel_appointments').select('*').eq('id', reference_id).single()
            data = pma
        }
        if (!data) {
            const { data: abt } = await supabase.from('agendamento_banhotosa').select('*').eq('id', reference_id).single()
            data = abt
        }
    } else if (reference_type === 'monthly_client') {
        const { data: mc } = await supabase.from('monthly_clients').select('*').eq('id', reference_id).single()
        data = mc
    } else if (reference_type === 'hotel') {
        const { data: hr } = await supabase.from('hotel_registrations').select('*').eq('id', reference_id).single()
        data = hr
    }

    if (!data) throw new Error(`Registro ${reference_id} não encontrado.`)

    step = 'preparando dados do cliente'
    const customer = {
      nome: data.owner_name || data.tutor_name || 'Cliente não identificado',
      cpf: data.owner_cpf || data.cpf || '',
      email: data.owner_email || data.tutor_email || data.email || '',
      endereco: data.owner_address || data.tutor_address || 'Não informado',
      price: data.price || data.total_services_price || 0,
      service: data.service || 'Serviço de PetShop'
    }

    if (!customer.cpf || customer.cpf.replace(/\D/g, '').length < 11) {
        throw new Error(`CPF inválido ou não informado para ${customer.nome}.`)
    }

    step = 'chamando API FocusNFe'
    const focusEnv = Deno.env.get('FOCUS_NFE_ENVIRONMENT') || 'homologacao'
    const baseUrl = focusEnv === 'producao' 
      ? 'https://api.focusnfe.com.br/v2/nfsen' 
      : 'https://homologacao.focusnfe.com.br/v2/nfsen'
    
    const focusRef = `${reference_type}-${reference_id}-${Date.now()}`
    
    const payload = {
        data_emissao: new Date().toISOString(),
        cnpj_prestador: "27859716000103",
        inscricao_municipal_prestador: "95127",
        codigo_municipio_emissora: "3513801", // Diadema, SP (IBGE)
        tomador: {
            nome: customer.nome,
            email: customer.email || undefined,
            cpf: customer.cpf.replace(/\D/g, ''),
            endereco: {
                logradouro: customer.endereco,
                numero: "SN",
                bairro: "Bairro",
                codigo_municipio: "3513801", // Diadema, SP
                uf: "SP",
                cep: "09900000" // CEP Genérico de Diadema
            }
        },
        servico: {
            codigo_servico: "07.10", 
            discriminacao: `${customer.service} - Pet: ${data.pet_name || 'Não informado'}`,
            valor_servicos: customer.price,
            optante_simples_nacional: true,
            regime_especial_tributacao: 0
        }
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
