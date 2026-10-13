-- ================================================================
-- Bloqueio progressivo de login — seção 10.1
-- 3 erros → 30s · 5 erros → 5min · 8+ erros → 1h
-- Uma linha por identificador (e-mail/WhatsApp) e uma por IP.
-- Só o service_role lê/escreve (RLS ligada, sem policy).
-- ================================================================
create table tentativas_login (
  chave           text        primary key,          -- 'id:<email|whatsapp>' ou 'ip:<ip>'
  falhas          int         not null default 0,
  bloqueado_ate   timestamptz,
  atualizado_em   timestamptz not null default now()
);

alter table tentativas_login enable row level security;
