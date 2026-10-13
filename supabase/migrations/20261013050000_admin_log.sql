-- ================================================================
-- Registro das ações feitas no painel admin do RÉGUA
-- (estender teste, ativar plano, suspender, apagar barbearia…)
-- Fica fora de "auditoria" porque o admin não é usuário de barbearia.
-- barbearia_id sem chave estrangeira: o registro continua mesmo
-- depois que a barbearia é apagada.
-- Pode rodar mais de uma vez sem erro.
-- ================================================================
create table if not exists admin_log (
  id              uuid        primary key default uuid_generate_v4(),
  barbearia_id    uuid,
  barbearia_nome  text,
  acao            text        not null,
  detalhe         jsonb,
  ip              text,
  criado_em       timestamptz not null default now()
);
create index if not exists admin_log_barbearia on admin_log (barbearia_id, criado_em desc);

alter table admin_log enable row level security;
