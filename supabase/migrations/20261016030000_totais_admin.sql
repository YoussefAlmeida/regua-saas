-- ================================================================
-- Totais no banco (auditoria, lote 4)
-- O painel admin buscava todos os agendamentos de 30 dias de todas as
-- barbearias pra contar no JavaScript: passava de 1000 linhas e o
-- Supabase cortava o resto calado. Agora o banco conta.
-- Só leitura, só o servidor (service role) pode chamar.
-- ================================================================
create or replace function admin_agendamentos_por_barbearia(desde timestamptz)
returns table (barbearia_id uuid, total bigint)
language sql stable security invoker set search_path = public
as $$
  select a.barbearia_id, count(*)
  from agendamentos a
  where a.inicio >= desde and a.status <> 'cancelado'
  group by a.barbearia_id
$$;

revoke all on function admin_agendamentos_por_barbearia(timestamptz) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function admin_agendamentos_por_barbearia(timestamptz) from anon, authenticated;
    grant execute on function admin_agendamentos_por_barbearia(timestamptz) to service_role;
  end if;
end $$;
