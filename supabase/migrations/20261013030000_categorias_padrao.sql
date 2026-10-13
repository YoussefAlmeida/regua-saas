-- ================================================================
-- Categorias financeiras padrão — Módulo 4
-- Toda barbearia nova já nasce com as categorias; as que já existem
-- recebem agora. O dono pode criar outras pelo painel.
-- Pode rodar mais de uma vez sem erro.
-- ================================================================
create or replace function criar_categorias_padrao(b uuid) returns void as $$
begin
  if exists (select 1 from categorias_fin where barbearia_id = b) then
    return;
  end if;
  insert into categorias_fin (barbearia_id, nome, tipo, cor, padrao) values
    (b, 'Serviços',          'entrada', '#4FB477', true),
    (b, 'Venda de produto',  'entrada', '#6BA3D6', true),
    (b, 'Outras entradas',   'entrada', '#A1A1A8', true),
    (b, 'Aluguel',           'saida',   '#E2564D', true),
    (b, 'Energia / Água',    'saida',   '#E2564D', true),
    (b, 'Internet',          'saida',   '#E2564D', true),
    (b, 'Produtos',          'saida',   '#E8B04B', true),
    (b, 'Pró-labore (dono)', 'saida',   '#A1A1A8', true),
    (b, 'Marketing',         'saida',   '#6BA3D6', true),
    (b, 'Outros',            'saida',   '#A1A1A8', true);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function trg_barbearia_categorias() returns trigger as $$
begin
  perform criar_categorias_padrao(new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists barbearia_categorias_padrao on barbearias;
create trigger barbearia_categorias_padrao
  after insert on barbearias
  for each row execute function trg_barbearia_categorias();

select criar_categorias_padrao(id) from barbearias;

create unique index if not exists categorias_fin_nome_unico on categorias_fin (barbearia_id, tipo, lower(nome));
