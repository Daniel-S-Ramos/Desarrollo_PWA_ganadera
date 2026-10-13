-- =============================================================================
-- Servicio de archivos de las fotografías · Especificación: docs/tecnica/14-fotografias.md, sección 7
--
-- Un bucket privado con la misma filosofía del servidor de solo inserciones (documento 05):
-- los usuarios del predio suben y leen; nadie reemplaza ni borra. Cada archivo debe corresponder a
-- una fotografía existente de ese animal, de modo que no haya imágenes sueltas ni sin su registro.
-- =============================================================================

-- Solo WebP y como máximo 1 MB: una foto sin comprimir (3 a 8 MB) se rechaza aunque alguien evite el
-- teléfono (RNF-12).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotografias', 'fotografias', false, 1048576, array['image/webp']);


-- Subir: la ruta es {animal_id}/{fotografia_id}.webp o {animal_id}/{fotografia_id}-reducida.webp
-- (sección 4.2) y la fotografía existe con ese animal. Como en las tablas, solo usuarios con perfil.
create policy "Los usuarios del predio suben las imágenes de sus fotografías"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotografias'
    and (select public.perfil_actual()) is not null
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(-reducida)?\.webp$'
    and exists (
      select 1
        from public.fotografia f
       where f.id::text = substring(name from '^[0-9a-f-]{36}/([0-9a-f-]{36})')
         and f.animal_id::text = split_part(name, '/', 1)
    )
  );

-- Leer: ambos perfiles leen todas las fotografías del predio (documento 08, sección 2).
create policy "Los usuarios del predio ven las imágenes de las fotografías"
  on storage.objects for select to authenticated
  using (bucket_id = 'fotografias' and (select public.perfil_actual()) is not null);

-- No hay políticas de update ni de delete: el servicio rechaza reemplazar o borrar una imagen.
