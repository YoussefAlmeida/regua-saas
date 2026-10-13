-- ================================================================
-- Fotos de perfil (barbeiro) e logo da barbearia
-- Bucket público pra leitura; escrita só pelo servidor (service_role),
-- que valida o tipo real do arquivo e o tamanho antes de subir.
-- ================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
