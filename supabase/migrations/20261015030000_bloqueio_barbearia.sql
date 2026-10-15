-- ================================================================
-- Bloqueio da barbearia toda (feito pelo dono)
-- profissional_id vazio = vale para toda a equipe (feriado, reforma,
-- fechar mais cedo). O barbeiro vê, respeita e não consegue remover.
-- Pode rodar mais de uma vez sem erro.
-- ================================================================
alter table bloqueios_agenda alter column profissional_id drop not null;

create index if not exists bloqueios_barbearia_periodo
  on bloqueios_agenda (barbearia_id, inicio, fim) where profissional_id is null;

-- Saúde do sistema: confere se já dá pra bloquear a barbearia toda
create or replace function regua_saude() returns jsonb
language sql security definer set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'tabelas', (select coalesce(jsonb_agg(table_name), '[]'::jsonb)
                from information_schema.tables where table_schema = 'public'),
    'colunas_usuarios', (select coalesce(jsonb_agg(column_name), '[]'::jsonb)
                from information_schema.columns where table_schema = 'public' and table_name = 'usuarios'),
    'colunas_barbearias', (select coalesce(jsonb_agg(column_name), '[]'::jsonb)
                from information_schema.columns where table_schema = 'public' and table_name = 'barbearias'),
    'indices_usuarios', (select coalesce(jsonb_agg(indexname), '[]'::jsonb)
                from pg_indexes where schemaname = 'public' and tablename = 'usuarios'),
    'gatilho_categorias', exists(select 1 from pg_trigger where tgname = 'barbearia_categorias_padrao'),
    'bucket_fotos', exists(select 1 from storage.buckets where id = 'fotos'),
    'banco_trancado', not has_table_privilege('anon', 'public.usuarios', 'select')
                  and not has_column_privilege('authenticated', 'public.usuarios', 'senha_hash', 'select')
                  and not has_table_privilege('authenticated', 'public.usuarios', 'update'),
    'entrada_unica', exists(select 1 from pg_indexes where indexname = 'movimentacoes_uma_automatica'),
    'status_agendamento', coalesce((
      select pg_get_constraintdef(c.oid) like '%agendado%' and pg_get_constraintdef(c.oid) like '%faltou%'
      from pg_constraint c where c.conname = 'agendamentos_status_check' limit 1), false)
      and coalesce((select column_default like '%agendado%' from information_schema.columns
                    where table_schema = 'public' and table_name = 'agendamentos' and column_name = 'status'), false),
    'bloqueio_barbearia', coalesce((select is_nullable = 'YES' from information_schema.columns
                    where table_schema = 'public' and table_name = 'bloqueios_agenda' and column_name = 'profissional_id'), false)
  )
$$;
revoke all on function regua_saude() from public, anon, authenticated;
