-- =============================================================================
-- Limpieza tras PI-04 (docs/tecnica/10-sincronizacion-bajada.md, sección 8)
--
-- Borra del servicio los registros creados por la cuenta de prueba. Ningún usuario
-- de la aplicación puede borrar (servidor de solo inserciones); esta sentencia se
-- ejecuta como dueño de las tablas mediante la CLI, solo para limpiar pruebas.
-- =============================================================================
with prueba as (select id from auth.users where email = 'pruebas@ganaderiajr.test'),
  c  as (delete from public.correccion where autor_id in (select id from prueba) returning 1),
  ps as (delete from public.pesaje where autor_id in (select id from prueba) returning 1),
  pl as (delete from public.produccion_leche where autor_id in (select id from prueba) returning 1),
  es as (delete from public.evento_sanitario where autor_id in (select id from prueba) returning 1),
  pa as (delete from public.parto where autor_id in (select id from prueba) returning 1),
  fo as (delete from public.fotografia where autor_id in (select id from prueba) returning 1)
select (select count(*) from c) as correcciones, (select count(*) from ps) as pesajes, (select count(*) from pl) as ordenos,
       (select count(*) from es) as eventos, (select count(*) from pa) as partos, (select count(*) from fo) as fotografias;

-- Los animales y medicamentos van después, porque los registros anteriores los referencian.
with prueba as (select id from auth.users where email = 'pruebas@ganaderiajr.test'),
  an as (delete from public.animal where autor_id in (select id from prueba) returning 1),
  me as (delete from public.medicamento where autor_id in (select id from prueba) returning 1)
select (select count(*) from an) as animales_borrados, (select count(*) from me) as medicamentos_borrados;

-- Verificación final: lo que quede de la cuenta de prueba (debe ser 0 en todo).
with prueba as (select id from auth.users where email = 'pruebas@ganaderiajr.test')
select (select count(*) from public.animal where autor_id in (select id from prueba)) as animales_restantes,
       (select count(*) from public.pesaje where autor_id in (select id from prueba)) as pesajes_restantes,
       (select count(*) from public.produccion_leche where autor_id in (select id from prueba)) as ordenos_restantes,
       (select count(*) from public.evento_sanitario where autor_id in (select id from prueba)) as eventos_restantes,
       (select count(*) from public.correccion where autor_id in (select id from prueba)) as correcciones_restantes;
