-- Tabela de registros do Diário do Pet
create table if not exists public.daycare_diary_entries (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.daycare_enrollments(id) on delete cascade,
  date date not null,
  mood text check (mood in ('Animado','Normal','Sonolento','Agitado')),
  behavior int check (behavior between 1 and 5),
  social_outros boolean default false,
  social_descanso boolean default false,
  social_quieto boolean default false,
  feeding text check (feeding in ('Comeu tudo','Comeu pouco','Não comeu')),
  needs_logs jsonb default '[]'::jsonb,
  obs text,
  media_urls text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Garantir um registro por (enrollment_id, date)
create unique index if not exists daycare_diary_entries_unique on public.daycare_diary_entries (enrollment_id, date);

-- Segurança por linha
alter table public.daycare_diary_entries enable row level security;

-- Leitura pública (visualização)
create policy if not exists "read diary anon+auth" on public.daycare_diary_entries
for select
to anon, authenticated
using (true);

-- Escrita apenas autenticado (admin)
create policy if not exists "insert diary authenticated" on public.daycare_diary_entries
for insert
to authenticated
with check (true);

create policy if not exists "update diary authenticated" on public.daycare_diary_entries
for update
to authenticated
using (true);

create policy if not exists "delete diary authenticated" on public.daycare_diary_entries
for delete
to authenticated
using (true);

