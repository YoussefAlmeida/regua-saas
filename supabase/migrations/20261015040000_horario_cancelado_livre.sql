-- ================================================================
-- Horário cancelado volta a ficar livre
-- Recria a trava "dois clientes no mesmo horário" do jeito certo:
-- ela só vale para horários ativos (agendado/confirmado/concluído).
-- Cancelado e falta não seguram o horário.
-- Pode rodar mais de uma vez sem erro.
-- ================================================================
create extension if not exists btree_gist;

alter table agendamentos drop constraint if exists sem_conflito_horario;
alter table agendamentos add constraint sem_conflito_horario
  exclude using gist (
    profissional_id with =,
    tstzrange(inicio, fim) with &&
  ) where (status not in ('cancelado', 'faltou'));

-- Saúde do sistema confere essa trava
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
                    where table_schema = 'public' and table_name = 'bloqueios_agenda' and column_name = 'profissional_id'), false),
    'cancelado_libera', coalesce((
      select pg_get_constraintdef(c.oid) like '%cancelado%'
      from pg_constraint c where c.conname = 'sem_conflito_horario' limit 1), false)
  )
$$;
revoke all on function regua_saude() from public, anon, authenticated;
