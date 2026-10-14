-- ================================================================
-- Erros do sistema — guardados pra aparecer na "pasta" de cada
-- barbearia no painel admin (o log da Vercel grátis some em 1 hora).
-- barbearia_id sem chave estrangeira: erro de barbearia apagada
-- continua no histórico geral. Pode rodar mais de uma vez.
-- ================================================================
create table if not exists erros_sistema (
  id              uuid        primary key default uuid_generate_v4(),
  barbearia_id    uuid,
  usuario_id      uuid,
  onde            text        not null,     -- ex.: 'agendar', 'criar cliente', 'painel/servicos'
  codigo          text,                     -- código do Postgres/HTTP quando houver
  mensagem        text,
  detalhe         jsonb,
  resolvido       boolean     not null default false,
  criado_em       timestamptz not null default now()
);
create index if not exists erros_sistema_barbearia on erros_sistema (barbearia_id, criado_em desc);
create index if not exists erros_sistema_abertos on erros_sistema (criado_em desc) where not resolvido;

alter table erros_sistema enable row level security;
