-- Corrige o trigger compartilhado set_updated_at: groups não possuía updated_at,
-- então qualquer UPDATE de activity_status falhava antes de executar a mudança.
alter table public.groups
  add column if not exists updated_at timestamptz not null default now();

update public.groups
set updated_at = coalesce(updated_at, now());
