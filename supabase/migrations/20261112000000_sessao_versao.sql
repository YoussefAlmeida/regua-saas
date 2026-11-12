-- ================================================================
-- Versão da sessão (auditoria 360, etapa 1 — segurança)
-- Trocar a senha passa a derrubar as sessões abertas em outros
-- aparelhos: o cookie leva a versão em que foi emitido e só vale
-- enquanto ela for a atual.
-- Só ACRESCENTA uma coluna. Quem já está logado continua (versão 0).
-- O app funciona antes e depois de rodar; a proteção só liga depois.
-- Pode rodar mais de uma vez sem erro.
-- ================================================================
alter table usuarios add column if not exists sessao_versao integer not null default 0;

-- O acesso "como usuário" (só leitura) não precisa enxergar essa coluna
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke select (sessao_versao) on usuarios from authenticated;
  end if;
end $$;
