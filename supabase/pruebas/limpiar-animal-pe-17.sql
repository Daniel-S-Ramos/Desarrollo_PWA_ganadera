-- =============================================================================
-- Limpieza tras PE-17 (docs/pruebas/iteracion-2.md, PE-17)
--
-- Durante la prueba manual sin conexión se registró por error un animal con la chapeta «1», un
-- número que el propietario usará en su ganado real (documento técnico 13, sección 2.4). Ningún
-- usuario de la aplicación puede borrar; esta sentencia se ejecuta como dueño de las tablas
-- mediante la CLI, autorizada por el autor del proyecto el 2026-10-12.
--
-- Protecciones: solo borra si hay exactamente un animal que cumple las tres condiciones (chapeta
-- «1», autor Daniel Ramos, creado el 2026-10-12) y ningún otro registro lo referencia. Si algo no
-- coincide, se detiene sin borrar nada.
-- =============================================================================

do $$
declare
  objetivo     uuid;
  coincidencias int;
  referencias  int;
begin
  select count(*), min(a.id::text)::uuid into coincidencias, objetivo
    from public.animal a
    join public.usuario u on u.id = a.autor_id
   where a.codigo_chapeta = '1'
     and u.nombre = 'Daniel Ramos'
     and (a.creado_en at time zone 'America/Bogota')::date = date '2026-10-12';

  if coincidencias <> 1 then
    raise exception 'Se esperaba exactamente 1 animal y hay %; no se borra nada', coincidencias;
  end if;

  select (select count(*) from public.fotografia where animal_id = objetivo)
       + (select count(*) from public.destino_productivo where animal_id = objetivo)
       + (select count(*) from public.evento_sanitario where animal_id = objetivo)
       + (select count(*) from public.produccion_leche where animal_id = objetivo)
       + (select count(*) from public.pesaje where animal_id = objetivo)
       + (select count(*) from public.parto where madre_id = objetivo or cria_id = objetivo)
       + (select count(*) from public.movimiento_economico where animal_id = objetivo)
       + (select count(*) from public.salida where animal_id = objetivo)
       + (select count(*) from public.recordatorio where animal_id = objetivo)
       + (select count(*) from public.correccion where registro_id = objetivo)
       + (select count(*) from public.animal where madre_id = objetivo or padre_id = objetivo)
    into referencias;

  if referencias > 0 then
    raise exception 'El animal tiene % registros asociados; no se borra nada', referencias;
  end if;

  delete from public.animal where id = objetivo;
end;
$$;

-- Verificación final: la chapeta «1» queda libre (debe ser 0).
select count(*) as animales_con_chapeta_1 from public.animal where codigo_chapeta = '1';
