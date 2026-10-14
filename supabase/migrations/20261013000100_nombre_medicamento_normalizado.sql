-- =============================================================================
-- Nombre de medicamento único sin mayúsculas, tildes ni espacios repetidos
-- Especificación: docs/tecnica/18-catalogo-de-medicamentos.md, sección 3
--
-- El índice anterior (lower(trim(nombre))) aceptaba «Ivermectína» como un producto distinto de
-- «Ivermectina», y con dos entradas para el mismo producto la advertencia por dosis repetida (RF-09)
-- no aparece (3.8.9). La regla es la misma de src/dominio/medicamentos.ts.
-- =============================================================================

-- Sin extensiones: translate cambia las vocales con tilde, diéresis o acentos grave y circunflejo por
-- su vocal simple; la ñ se conserva. Es inmutable, condición para usarla en un índice.
create function public.normalizar_nombre(nombre text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select translate(
    lower(regexp_replace(trim(nombre), '\s+', ' ', 'g')),
    'áéíóúàèìòùäëïöüâêîôû',
    'aeiouaeiouaeiouaeiou'
  );
$$;

comment on function public.normalizar_nombre(text) is
  'Forma de comparación de un nombre de medicamento (docs/tecnica/18-catalogo-de-medicamentos.md, sección 3).';

drop index public.medicamento_nombre_unico;
create unique index medicamento_nombre_unico on public.medicamento (public.normalizar_nombre(nombre));
