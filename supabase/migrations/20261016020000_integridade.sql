-- ================================================================
-- Integridade do banco (auditoria, lote 3)
-- Só ACRESCENTA regras e índices. Não apaga nem altera dado nenhum.
-- Se já existir dado duplicado que impeça uma regra, ela é pulada
-- com um aviso (NOTICE) em vez de dar erro; o resto continua.
-- Pode rodar mais de uma vez.
-- ================================================================

-- 1. Um barbeiro por usuário (clique duplo no "eu também corto" criava dois)
do $$
begin
  if exists (select usuario_id from profissionais group by usuario_id having count(*) > 1) then
    raise notice 'PULADO: há usuários com mais de um registro em profissionais. Me mande o resultado de: select usuario_id, count(*) from profissionais group by 1 having count(*) > 1;';
  else
    create unique index if not exists profissionais_um_por_usuario on profissionais (usuario_id);
  end if;
end $$;

-- 2. Um horário por dia da semana pra cada barbeiro
do $$
begin
  if exists (select 1 from horarios_trabalho group by profissional_id, dia_semana having count(*) > 1) then
    raise notice 'PULADO: há barbeiros com dia da semana repetido em horarios_trabalho.';
  else
    create unique index if not exists horarios_um_por_dia on horarios_trabalho (profissional_id, dia_semana);
  end if;
end $$;

-- 3. Despesa fixa lança no máximo uma vez por mês (cron rodando em dobro não duplica)
do $$
begin
  if exists (
    select 1 from movimentacoes where recorrente_id is not null
    group by recorrente_id, date_trunc('month', data::timestamp) having count(*) > 1
  ) then
    raise notice 'PULADO: já existe despesa fixa lançada duas vezes no mesmo mês. Confira no Financeiro e apague a repetida.';
  else
    create unique index if not exists movimentacoes_fixa_uma_por_mes
      on movimentacoes (recorrente_id, date_trunc('month', data::timestamp))
      where recorrente_id is not null;
  end if;
end $$;

-- 4. Fim depois do início (vale para o que entrar daqui pra frente;
--    "not valid" não confere as linhas antigas, então não falha)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agendamentos_fim_depois_inicio') then
    alter table agendamentos add constraint agendamentos_fim_depois_inicio check (fim > inicio) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bloqueios_fim_depois_inicio') then
    alter table bloqueios_agenda add constraint bloqueios_fim_depois_inicio check (fim > inicio) not valid;
  end if;
end $$;

-- 5. Índice em toda chave estrangeira que não tem (apagar barbearia grande
--    ou cliente não precisa varrer a tabela inteira)
do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as tabela, a.attname as coluna, c.conrelid as relid, c.conkey[1] as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_namespace n on n.oid = (select relnamespace from pg_class where oid = c.conrelid)
    where c.contype = 'f' and n.nspname = 'public' and array_length(c.conkey, 1) = 1
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]
      )
  loop
    execute format('create index if not exists %I on %s (%I)',
      left(replace(r.tabela::text, '"', '') || '_' || r.coluna || '_fk', 63), r.tabela, r.coluna);
    raise notice 'índice criado: %.%', r.tabela, r.coluna;
  end loop;
end $$;
