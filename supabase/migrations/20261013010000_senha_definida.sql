-- ================================================================
-- Conta do cliente — Módulo 1
-- Cliente criado pelo painel (ou pelo agendamento antigo, sem senha)
-- ainda não escolheu senha. No primeiro agendamento pelo link ele
-- define a senha e a conta passa a ser dele.
-- ================================================================
alter table usuarios add column senha_definida boolean not null default true;

update usuarios set senha_definida = false where papel = 'cliente';
