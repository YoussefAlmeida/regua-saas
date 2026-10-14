-- ================================================================
-- Situação do agendamento igual à do sistema
-- Em produção a regra (check) da coluna status estava diferente da
-- usada pelo app, e todo agendamento novo era recusado pelo banco
-- ("violates check constraint agendamentos_status_check").
-- Pode rodar mais de uma vez sem erro.
-- ================================================================

alter table agendamentos drop constraint if exists agendamentos_status_check;

-- Situações que não existem no sistema viram "agendado" (dados de teste)
update agendamentos set status = 'agendado'
where status is null or status not in ('agendado', 'confirmado', 'concluido', 'cancelado', 'faltou');

alter table agendamentos alter column status set default 'agendado';
alter table agendamentos alter column status set not null;
alter table agendamentos add constraint agendamentos_status_check
  check (status in ('agendado', 'confirmado', 'concluido', 'cancelado', 'faltou'));

-- Mesma conferência para quem cancelou
alter table agendamentos drop constraint if exists agendamentos_cancelado_por_check;
update agendamentos set cancelado_por = null
where cancelado_por is not null and cancelado_por not in ('dono', 'barbeiro', 'cliente');
alter table agendamentos add constraint agendamentos_cancelado_por_check
  check (cancelado_por in ('dono', 'barbeiro', 'cliente'));

-- ── Saúde do sistema passa a conferir essa regra ────────────────
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
                    where table_schema = 'public' and table_name = 'agendamentos' and column_name = 'status'), false)
  )
$$;
revoke all on function regua_saude() from public, anon, authenticated;
