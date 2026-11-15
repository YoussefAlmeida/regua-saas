-- Perfil do cliente: foto, e-mail de contato e preferências de aviso.
-- Só acrescenta colunas; pode rodar mais de uma vez.

alter table usuarios add column if not exists foto_url      text;
-- E-mail de contato do cliente. Fica separado de "email" (login do dono, único no sistema)
-- pra um cliente nunca bloquear o cadastro de uma barbearia com o mesmo e-mail.
alter table usuarios add column if not exists email_contato text;
-- { "lembretes": true|false, "atualizacoes": true|false } · sem nada gravado = tudo ligado
alter table usuarios add column if not exists notificacoes  jsonb not null default '{}'::jsonb;
