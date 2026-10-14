-- ================================================================
-- Tranca o acesso direto ao banco + entrada automática sem duplicar
-- Pode rodar mais de uma vez sem erro.
--
-- Todo o app fala com o banco pelo servidor (service role). O acesso
-- "como usuário" (RLS) é só leitura e com um token feito no servidor.
-- Então: sem login (anon) não lê nem escreve nada; logado só lê, e
-- nunca a coluna senha_hash.
-- ================================================================

-- Sem login: nada direto nas tabelas
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Logado: só leitura (escritas passam pela API, que confere permissões)
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from authenticated;

-- senha_hash nunca sai: leitura de usuarios só nas outras colunas
revoke select on usuarios from authenticated;
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'usuarios' and column_name <> 'senha_hash';
  execute format('grant select (%s) on usuarios to authenticated', cols);
end $$;

-- Tabelas internas: só o servidor
revoke all on tentativas_login, admin_log, erros_sistema from authenticated;

-- Tabelas que forem criadas depois já nascem trancadas
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke insert, update, delete, truncate on tables from authenticated;

-- ── Entrada automática: uma por atendimento ─────────────────────
-- Remove duplicadas que um clique duplo possa ter criado (fica a primeira)
delete from movimentacoes m
using movimentacoes m2
where m.origem = 'automatica' and m2.origem = 'automatica'
  and m.agendamento_id = m2.agendamento_id
  and m.ctid > m2.ctid;

create unique index if not exists movimentacoes_uma_automatica
  on movimentacoes (agendamento_id) where origem = 'automatica';

-- ── Saúde do sistema enxerga se o banco está trancado ───────────
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
    'entrada_unica', exists(select 1 from pg_indexes where indexname = 'movimentacoes_uma_automatica')
  )
$$;
revoke all on function regua_saude() from public, anon, authenticated;
