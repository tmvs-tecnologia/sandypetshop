-- Adiciona campo CPF/CNPJ para emissão de nota fiscal em todas as tabelas de agendamento e clientes
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS owner_cpf text;
ALTER TABLE public.pet_movel_appointments ADD COLUMN IF NOT EXISTS owner_cpf text;
ALTER TABLE public.agendamento_banhotosa ADD COLUMN IF NOT EXISTS owner_cpf text;
ALTER TABLE public.monthly_clients ADD COLUMN IF NOT EXISTS owner_cpf text;
ALTER TABLE public.daycare_enrollments ADD COLUMN IF NOT EXISTS owner_cpf text;
ALTER TABLE public.hotel_registrations ADD COLUMN IF NOT EXISTS owner_cpf text;

-- Comentários para documentação
COMMENT ON COLUMN public.appointments.owner_cpf IS 'CPF ou CNPJ do tutor para emissão de nota fiscal';
COMMENT ON COLUMN public.pet_movel_appointments.owner_cpf IS 'CPF ou CNPJ do tutor para emissão de nota fiscal';
COMMENT ON COLUMN public.agendamento_banhotosa.owner_cpf IS 'CPF ou CNPJ do tutor para emissão de nota fiscal';
COMMENT ON COLUMN public.monthly_clients.owner_cpf IS 'CPF ou CNPJ do tutor para emissão de nota fiscal';
COMMENT ON COLUMN public.daycare_enrollments.owner_cpf IS 'CPF ou CNPJ do tutor para emissão de nota fiscal';
COMMENT ON COLUMN public.hotel_registrations.owner_cpf IS 'CPF ou CNPJ do tutor para emissão de nota fiscal';
