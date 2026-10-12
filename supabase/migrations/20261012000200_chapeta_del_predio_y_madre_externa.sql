-- =============================================================================
-- Formato de chapeta del predio y madre externa
-- Especificación: docs/tecnica/13-registro-de-animal.md, secciones 2.1, 4 y 8
--
-- Reemplaza el formato genérico de la migración 20261012000100 por la numeración que definió el
-- propietario el 2026-10-12: los números del 1 al 9999 y, después, una letra seguida de un número
-- del 1 al 999 (A1 … A999, B1 …). La letra O no se usa, para no confundirla con el cero. Sin ceros
-- a la izquierda: «01» y «1» son la misma chapeta, y el teléfono guarda «1».
--
-- Agrega la madre externa: como el padre (3.8.8), la madre puede no pertenecer al predio, y entonces
-- se consigna como texto. Nunca las dos formas a la vez.
-- =============================================================================

alter table public.animal
  drop constraint animal_codigo_chapeta_formato,
  add constraint animal_codigo_chapeta_formato check (codigo_chapeta ~ '^([1-9][0-9]{0,3}|[A-NP-Z][1-9][0-9]{0,2})$'),
  add column madre_externa text,
  add constraint animal_madre_una_sola_forma check (madre_id is null or madre_externa is null);

comment on constraint animal_codigo_chapeta_formato on public.animal is
  'Chapeta del predio: 1 a 9999, o una letra (sin O) seguida de 1 a 999, sin ceros a la izquierda (docs/tecnica/13-registro-de-animal.md, sección 2.1).';
