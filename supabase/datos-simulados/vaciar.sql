-- =============================================================================
-- Vaciar los registros del predio · supabase/datos-simulados/README.md
--
-- BORRA DE FORMA DEFINITIVA todos los animales y sus registros (fotografías,
-- destinos, eventos sanitarios, ordeños, pesajes, partos, movimientos económicos,
-- salidas, recordatorios pospuestos, correcciones, colocaciones de chapeta) y el
-- catálogo de medicamentos. Conserva las cuentas (usuario) y los parámetros.
--
-- Se usa dos veces, con autorización explícita del autor: antes de cargar los datos
-- simulados de la evaluación (paso 6.1) y antes de entregar la aplicación (R9), para
-- que el propietario empiece con sus datos reales. Los archivos de las fotos se borran
-- aparte, desde el panel de Supabase (Storage → fotografias).
--
-- El servidor es de solo inserciones para la aplicación (sin UPDATE ni DELETE para
-- authenticated); este borrado solo lo puede hacer el administrador con la CLI.
-- =============================================================================

begin;

delete from public.correccion;
delete from public.recordatorio;
delete from public.colocacion_chapeta;
delete from public.fotografia;
delete from public.evento_sanitario;
delete from public.produccion_leche;
delete from public.pesaje;
delete from public.parto;
delete from public.movimiento_economico;
delete from public.salida;
delete from public.destino_productivo;
delete from public.animal;
delete from public.medicamento;

select (select count(*) from public.animal) as animales,
       (select count(*) from public.medicamento) as medicamentos,
       (select count(*) from public.produccion_leche) as ordenos,
       (select count(*) from public.usuario) as cuentas_conservadas,
       (select count(*) from public.parametro) as parametros_conservados,
       (select count(*) from storage.objects where bucket_id = 'fotografias') as archivos_de_fotos_por_borrar_en_el_panel;

commit;
