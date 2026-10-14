-- =============================================================================
-- Formato de la chapeta · Especificación: docs/tecnica/13-registro-de-animal.md, sección 8
--
-- El teléfono guarda la chapeta normalizada: sin espacios, en mayúsculas, con los ceros a la
-- izquierda (sección 2.1). La restricción de unicidad compara texto exacto, así que el servicio
-- debe rechazar una chapeta sin normalizar: si la aceptara, «045 » y «045» serían dos animales.
-- El teléfono oculta y rechaza; el servicio decide (3.9.3).
-- =============================================================================

alter table public.animal
  drop constraint animal_codigo_chapeta_check,
  add constraint animal_codigo_chapeta_formato check (codigo_chapeta ~ '^[A-Z0-9-]{1,20}$');

comment on constraint animal_codigo_chapeta_formato on public.animal is
  'Chapeta normalizada: de 1 a 20 letras mayúsculas sin tilde, dígitos o guiones (docs/tecnica/13-registro-de-animal.md, sección 2.1).';
