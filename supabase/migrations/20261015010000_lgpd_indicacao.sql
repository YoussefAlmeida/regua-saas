-- ================================================================
-- LGPD (aceite dos termos), indicação entre barbearias e índices
-- Pode rodar mais de uma vez sem erro.
-- ================================================================

-- Quando e qual versão dos Termos/Privacidade a pessoa aceitou
alter table usuarios add column if not exists termos_aceitos_em timestamptz;
alter table usuarios add column if not exists termos_versao     text;

-- Barbearia que chegou pelo "Agendamento por RÉGUA" de outra (slug de quem indicou)
alter table barbearias add column if not exists indicada_por text;

-- Consultas frequentes: "Meus horários", checagem de duplicidade e lembrete
create index if not exists agendamentos_cliente_inicio on agendamentos (cliente_id, inicio);
create index if not exists agendamentos_status_inicio  on agendamentos (status, inicio);

-- Limpeza de logs antigos (cron diário): datas indexadas
create index if not exists erros_sistema_criado on erros_sistema (criado_em);
create index if not exists auditoria_criado     on auditoria (criado_em);
