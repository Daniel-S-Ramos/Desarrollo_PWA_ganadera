-- =============================================================================
-- Parámetros de la Tabla 30 definidos por el propietario el 2026-10-24
-- Especificación: docs/tecnica/24-pesaje-y-evolucion.md (sección 8) y
-- docs/tecnica/22-ronda-de-ordeno.md (sección 6.3)
--
-- La Tabla 30 los dejó sin valor de ejemplo porque su definición corresponde al
-- propietario (3.10.4.6):
--   · espera que un animal de ceba gane de 0,5 a 0,8 kg por día; se carga el mínimo,
--     por debajo del cual el pesaje se marca «bajo lo esperado»;
--   · una vaca que da 35 % o más por debajo de su promedio se marca «muy por debajo».
-- =============================================================================

insert into public.parametro (clave, valor, unidad, descripcion) values
  ('ganancia_diaria_esperada', 0.5, 'kg/día', 'Ganancia diaria mínima esperada en un animal de ceba (el propietario espera de 0,5 a 0,8 kg por día)'),
  ('variacion_atipica_leche',  35,  '%',      'Porcentaje por debajo del promedio desde el cual la producción de una vaca se marca como muy por debajo');
