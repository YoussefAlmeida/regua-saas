-- ================================================================
-- Pagamentos do Asaas já aplicados (idempotência do webhook)
-- O Asaas manda CONFIRMED e RECEIVED do mesmo pagamento e reenvia
-- quando não recebe 200. Antes a trava era "contar no admin_log e
-- depois inserir" — duas entregas juntas passavam as duas e davam
-- dois meses. Agora a chave primária garante: um pagamento, um mês.
-- Só acrescenta (não mexe em nada que já existe).
-- ================================================================
create table if not exists pagamentos_asaas (
  pagamento_id  text        primary key,
  barbearia_id  uuid        not null references barbearias(id) on delete cascade,
  plano         text        not null,
  valor         numeric(10,2),
  estornado_em  timestamptz,
  criado_em     timestamptz not null default now()
);
create index if not exists pagamentos_asaas_barbearia on pagamentos_asaas (barbearia_id, criado_em desc);

-- Só o servidor (service role) lê e grava
alter table pagamentos_asaas enable row level security;
