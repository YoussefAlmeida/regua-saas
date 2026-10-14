-- ================================================================
-- Saúde do sistema — usada pelo painel admin pra mostrar o que
-- falta configurar no banco (atualizações que não rodaram).
-- Só o servidor (service_role) chama. Pode rodar mais de uma vez.
-- ================================================================
create or replace function regua_saude() returns jsonb
language sql security definer set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'tabelas', (select coalesce(jsonb_agg(table_name), '[]'::jsonb)
                from information_schema.tables where table_schema = 'public'),
    'colunas_usuarios', (select coalesce(jsonb_agg(column_name), '[]'::jsonb)
                from information_schema.columns where table_schema = 'public' and table_name = 'usuarios'),
    'indices_usuarios', (select coalesce(jsonb_agg(indexname), '[]'::jsonb)
                from pg_indexes where schemaname = 'public' and tablename = 'usuarios'),
    'gatilho_categorias', exists(select 1 from pg_trigger where tgname = 'barbearia_categorias_padrao'),
    'bucket_fotos', exists(select 1 from storage.buckets where id = 'fotos')
  )
$$;

revoke all on function regua_saude() from public, anon, authenticated;
