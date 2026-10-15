-- ================================================================
-- Conta do cliente — Módulo 1
-- Cliente criado pelo painel (ou pelo agendamento antigo, sem senha)
-- ainda não escolheu senha. No primeiro agendamento pelo link ele
-- define a senha e a conta passa a ser dele.
-- ================================================================
-- Só na primeira vez: rodar de novo NÃO pode marcar como "sem senha" quem
-- já escolheu a dela (isso deixaria qualquer um definir a senha da conta)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usuarios' and column_name = 'senha_definida'
  ) then
    alter table usuarios add column senha_definida boolean not null default true;
    update usuarios set senha_definida = false where papel = 'cliente';
  end if;
end $$;
