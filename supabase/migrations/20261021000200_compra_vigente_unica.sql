-- =============================================================================
-- Una sola compra VIGENTE por animal
-- Especificación: docs/tecnica/31-consolidado-economico.md, sección 4
--
-- El índice único parcial movimiento_economico_una_compra_por_animal contaba también las compras anuladas: con
-- un servidor de solo inserciones y la anulación en la tabla correccion, un animal con la compra anulada no podía
-- registrar otra, y lo anulado no admite correcciones. Es el mismo problema que tuvo la salida en PE-35
-- (migración 20261021000100); se resuelve igual (decisión D del paso 5.4, aprobada el 2026-10-21).
--
-- Antes de insertar una compra se comprueba que el animal no tenga otra sin anulación. Si la tiene, se rechaza
-- con el código de unicidad (23505): el teléfono la trata como hasta ahora («Este animal ya tiene registrada su
-- compra»).
-- =============================================================================

-- «if exists»: un primer intento de esta migración se detuvo antes de registrarse (2026-10-21).
drop index if exists public.movimiento_economico_una_compra_por_animal;

create or replace function public.compra_vigente_unica() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.concepto <> 'compra' then
    return new;
  end if;
  -- Dos compras del mismo animal que llegan a la vez se atienden una tras otra.
  perform pg_advisory_xact_lock(hashtext('compra:' || new.animal_id::text));
  if exists (
    select 1
      from public.movimiento_economico m
     where m.animal_id = new.animal_id
       and m.concepto = 'compra'
       -- El mismo registro reenviado no cuenta: lo resuelve ON CONFLICT (id) DO NOTHING (3.7.8).
       and m.id <> new.id
       and not exists (
         select 1 from public.correccion c
          where c.entidad_afectada = 'movimiento_economico' and c.registro_id = m.id and c.tipo = 'anulacion')
  ) then
    raise exception using errcode = '23505', message = 'El animal ya tiene una compra vigente',
      constraint = 'compra_vigente_unica';
  end if;
  return new;
end;
$$;

comment on function public.compra_vigente_unica() is
  'Un animal admite una sola compra vigente (no anulada). Documento técnico 31, sección 4.';

create trigger compra_vigente_unica
  before insert on public.movimiento_economico
  for each row execute function public.compra_vigente_unica();

-- Nadie la llama directamente: la ejecuta el disparador.
revoke all on function public.compra_vigente_unica() from public, anon, authenticated;
