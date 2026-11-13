-- ================================================================
-- Identidade visual de cada barbearia (auditoria 360, etapa 6)
-- Capa, cores e texto "sobre" da página pública de agendamento.
-- (logo_url já existia.) Só ACRESCENTA colunas, todas opcionais:
-- sem nada preenchido, a página usa a identidade padrão do RÉGUA.
-- O app funciona antes e depois de rodar; a tela "Aparência" avisa
-- enquanto esta atualização não tiver rodado.
-- Pode rodar mais de uma vez sem erro.
-- ================================================================
alter table barbearias add column if not exists capa_url       text;
alter table barbearias add column if not exists sobre          text;
alter table barbearias add column if not exists cor_primaria   text;
alter table barbearias add column if not exists cor_secundaria text;

-- Cor só no formato #RRGGBB (o app também confere; isto é a segunda trava)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'barbearias_cor_primaria_hex') then
    alter table barbearias add constraint barbearias_cor_primaria_hex
      check (cor_primaria is null or cor_primaria ~ '^#[0-9A-Fa-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'barbearias_cor_secundaria_hex') then
    alter table barbearias add constraint barbearias_cor_secundaria_hex
      check (cor_secundaria is null or cor_secundaria ~ '^#[0-9A-Fa-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'barbearias_sobre_tamanho') then
    alter table barbearias add constraint barbearias_sobre_tamanho
      check (sobre is null or char_length(sobre) <= 300);
  end if;
end $$;
