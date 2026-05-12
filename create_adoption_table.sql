CREATE TABLE IF NOT EXISTS public.adoption_pets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    description text NOT NULL,
    contact_phone text NOT NULL,
    photo_url text,
    video_url text,
    age text, -- Filhote, Adulto, Idoso
    size text, -- Pequeno, Médio, Grande
    gender text, -- Macho, Fêmea
    CONSTRAINT adoption_pets_pkey PRIMARY KEY (id)
);

-- SE VOCÊ JÁ CRIOU A TABELA, EXECUTE O SCRIPT ABAIXO NO SQL EDITOR DO SUPABASE:
-- ALTER TABLE public.adoption_pets ADD COLUMN IF NOT EXISTS age text;
-- ALTER TABLE public.adoption_pets ADD COLUMN IF NOT EXISTS size text;
-- ALTER TABLE public.adoption_pets ADD COLUMN IF NOT EXISTS gender text;

-- Habilitando RLS básico e permissões públicas para leitura e administração interna
ALTER TABLE public.adoption_pets ENABLE ROW LEVEL SECURITY;

-- Permite que qualquer pessoa veja os pets para adoção
CREATE POLICY "Permitir leitura publica para pets de adocao" ON public.adoption_pets
FOR SELECT USING (true);

-- Em muitos setups deste projeto, a inserção/exclusão pelo admin é feita via cliente autenticado anonimamente mas confiável
-- Ou via service_role, se você já tiver políticas mais abertas, pode rodar o seguinte:
CREATE POLICY "Permitir insercao anonima temporaria" ON public.adoption_pets FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir exclusao anonima temporaria" ON public.adoption_pets FOR DELETE USING (true);
CREATE POLICY "Permitir atualizacao anonima temporaria" ON public.adoption_pets FOR UPDATE USING (true);
