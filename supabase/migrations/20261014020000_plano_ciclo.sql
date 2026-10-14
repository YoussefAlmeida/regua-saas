-- ================================================================
-- Ciclo do plano e mudança agendada (rebaixamento no fim do mês pago)
-- Pode rodar mais de uma vez sem erro.
-- ================================================================
alter table barbearias add column if not exists plano_ciclo_fim       timestamptz;  -- até quando o mês atual está pago
alter table barbearias add column if not exists plano_agendado        text
  check (plano_agendado in ('cadeira', 'barbearia', 'rede'));                         -- plano que entra no fim do ciclo
alter table barbearias add column if not exists plano_agendado_em     timestamptz;  -- quando a troca acontece
alter table barbearias add column if not exists plano_agendado_manter jsonb;        -- ids dos profissionais que continuam
alter table barbearias add column if not exists aviso_mudanca         jsonb;        -- clientes pra avisar depois da troca

-- Saúde do sistema passa a enxergar as colunas de barbearias também
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
    'bucket_fotos', exists(select 1 from storage.buckets where id = 'fotos')
  )
$$;
revoke all on function regua_saude() from public, anon, authenticated;
