-- ================================================================
-- Cliente pode ter conta em várias barbearias com o mesmo WhatsApp
-- Antes: WhatsApp único no sistema inteiro (cliente da barbearia A
-- não conseguia marcar na barbearia B).
-- Agora:
--   • dentro de uma barbearia, cada WhatsApp é uma pessoa só
--   • barbeiro continua com WhatsApp único no sistema (limite do MVP:
--     um barbeiro = uma barbearia), mas pode ser cliente em outra
-- Pode rodar mais de uma vez sem erro.
-- ================================================================
drop index if exists usuarios_whatsapp_unico;

create unique index if not exists usuarios_whatsapp_por_barbearia
  on usuarios (barbearia_id, whatsapp) where whatsapp is not null;

create unique index if not exists usuarios_whatsapp_barbeiro_unico
  on usuarios (whatsapp) where whatsapp is not null and papel = 'barbeiro';
