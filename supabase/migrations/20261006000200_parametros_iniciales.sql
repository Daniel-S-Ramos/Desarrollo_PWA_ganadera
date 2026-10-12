-- =============================================================================
-- Parámetros de operación iniciales · Tabla 30 del documento
-- Especificación: docs/tecnica/05-esquema-remoto.md, sección 7
--
-- Son valores de ejemplo acordados para el prototipo. El documento establece que
-- su definición final corresponde al propietario (3.10.4.6).
-- No se cargan el intervalo de advertencia por medicamento, que vive en cada
-- medicamento (3.8.9), ni la ganancia diaria esperada y la variación atípica,
-- que la Tabla 30 deja sin valor de ejemplo.
-- =============================================================================

insert into public.parametro (clave, valor, unidad, descripcion) values
  ('dias_sin_pesaje',          30,   'días',  'Días sin pesaje que originan un recordatorio en un animal de ceba'),
  ('dias_sin_ordeno',          3,    'días',  'Días sin registro de ordeño que originan un recordatorio en una vaca de leche'),
  ('dias_sin_registros',       90,   'días',  'Días sin ningún registro que originan un recordatorio en un animal activo'),
  ('dias_sin_transmitir',      3,    'días',  'Días con información sin transmitir que originan un recordatorio'),
  ('dias_promedio_produccion', 7,    'días',  'Periodo de cálculo del promedio de producción por vaca'),
  ('precio_litro_leche',       1950, 'pesos', 'Precio por litro de leche empleado en el consolidado económico');
