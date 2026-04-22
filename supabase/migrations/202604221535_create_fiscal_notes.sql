-- Tabela para armazenar o histórico e status das notas fiscais emitidas via FocusNFe
CREATE TABLE IF NOT EXISTS public.fiscal_notes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Referência ao agendamento ou serviço
    reference_id uuid NOT NULL, 
    reference_type text NOT NULL, -- 'appointment', 'monthly_client', 'daycare', 'hotel'
    
    -- Dados da FocusNFe
    focus_nfe_reference text UNIQUE, -- Referência interna enviada para a API
    focus_nfe_id text, -- ID retornado pela FocusNFe
    
    -- Status e Retorno
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'authorized', 'rejected', 'error', 'cancelled'
    nfe_number text, -- Número da nota
    nfe_series text, -- Série da nota
    nfe_url_pdf text, -- Link para o PDF
    nfe_url_xml text, -- Link para o XML
    
    error_message text, -- Mensagem de erro caso falhe
    raw_response jsonb, -- Resposta completa da API para auditoria
    
    CONSTRAINT fiscal_notes_pkey PRIMARY KEY (id)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_fiscal_notes_reference ON public.fiscal_notes(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_fiscal_notes_status ON public.fiscal_notes(status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.fiscal_notes ENABLE ROW LEVEL SECURITY;

-- Política para permitir que administradores vejam todas as notas
-- (Ajustar conforme o sistema de roles atual)
CREATE POLICY "Admins can do everything on fiscal_notes" 
ON public.fiscal_notes 
FOR ALL 
TO authenticated 
USING (true);
