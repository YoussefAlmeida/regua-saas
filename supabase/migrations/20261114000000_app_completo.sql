-- ================================================================
-- App completo (redesign Tech Futurista)
-- Só ACRESCENTA colunas, todas opcionais. O app funciona antes e
-- depois de rodar; cada recurso liga quando a coluna existe.
-- Pode rodar mais de uma vez sem erro.
-- ================================================================

-- Serviço com foto e descrição curta (vitrine da página de agendamento)
alter table servicos add column if not exists foto_url  text;
alter table servicos add column if not exists descricao text;

-- Comissão (%) e meta do mês (R$) de cada profissional
alter table profissionais add column if not exists comissao_pct numeric(5,2);
alter table profissionais add column if not exists meta_mensal  numeric(10,2);

-- "Iniciar atendimento": a hora em que o barbeiro começou
alter table agendamentos add column if not exists iniciado_em timestamptz;

-- Observação da equipe sobre o cliente (ex.: "degradê baixo")
alter table usuarios add column if not exists nota_equipe text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'servicos_descricao_tamanho') then
    alter table servicos add constraint servicos_descricao_tamanho check (descricao is null or char_length(descricao) <= 140);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profissionais_comissao_faixa') then
    alter table profissionais add constraint profissionais_comissao_faixa check (comissao_pct is null or (comissao_pct >= 0 and comissao_pct <= 100));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profissionais_meta_positiva') then
    alter table profissionais add constraint profissionais_meta_positiva check (meta_mensal is null or meta_mensal >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'usuarios_nota_tamanho') then
    alter table usuarios add constraint usuarios_nota_tamanho check (nota_equipe is null or char_length(nota_equipe) <= 300);
  end if;
  -- O acesso "como usuário" (só leitura) não precisa da observação interna
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke select (nota_equipe) on usuarios from authenticated;
  end if;
end $$;
