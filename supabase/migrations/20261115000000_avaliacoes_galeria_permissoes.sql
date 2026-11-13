-- ================================================================
-- Avaliações dos clientes, galeria de fotos e permissões da equipe
-- Só ACRESCENTA (uma tabela e duas colunas). O app funciona antes e
-- depois de rodar; cada recurso liga quando existe no banco.
-- Pode rodar mais de uma vez sem erro.
-- ================================================================

-- Uma avaliação por atendimento concluído (nota de 1 a 5 e comentário opcional)
create table if not exists avaliacoes (
  id              uuid        primary key default uuid_generate_v4(),
  barbearia_id    uuid        not null references barbearias(id)   on delete cascade,
  agendamento_id  uuid        not null unique references agendamentos(id) on delete cascade,
  cliente_id      uuid        not null references usuarios(id)     on delete cascade,
  profissional_id uuid        references profissionais(id)         on delete set null,
  nota            int         not null check (nota between 1 and 5),
  comentario      text        check (comentario is null or char_length(comentario) <= 300),
  criado_em       timestamptz not null default now()
);
create index if not exists avaliacoes_barbearia on avaliacoes (barbearia_id, criado_em desc);
create index if not exists avaliacoes_profissional on avaliacoes (profissional_id);
create index if not exists avaliacoes_cliente on avaliacoes (cliente_id);

-- Só o servidor lê e grava (RLS ligada, sem política)
alter table avaliacoes enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on avaliacoes from anon, authenticated;
  end if;
end $$;

-- Galeria: lista de endereços de fotos da barbearia (até 8)
alter table barbearias add column if not exists galeria jsonb not null default '[]';

-- Permissões da equipe: o que o barbeiro pode fazer (vazio = tudo liberado, como hoje)
alter table barbearias add column if not exists permissoes jsonb not null default '{}';
