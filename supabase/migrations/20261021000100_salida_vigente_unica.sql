-- =============================================================================
-- Una sola salida VIGENTE por animal
-- Especificación: docs/tecnica/29-salida-y-venta.md, sección 8
--
-- La restricción única sobre salida.animal_id contaba también las salidas anuladas: como el servicio solo
-- admite inserciones y la anulación vive en la tabla correccion, un animal con la salida anulada no podía
-- volver a salir nunca, y como lo anulado no admite correcciones, tampoco había cómo arreglarla (PE-35,
-- decisión del autor del 2026-10-20).
--
-- La regla pasa a ser «una sola salida vigente»: antes de insertar se comprueba que el animal no tenga una
-- salida sin anulación. Si la tiene, se rechaza con el mismo código de unicidad (23505), de modo que el
-- teléfono la trata como hasta ahora: conflicto «Este animal ya tiene registrada su salida».
-- =============================================================================

alter table public.salida drop constraint salida_animal_id_key;

create index salida_animal on public.salida (animal_id);

create or replace function public.salida_vigente_unica() returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Dos salidas del mismo animal que llegan a la vez se atienden una tras otra.
  perform pg_advisory_xact_lock(hashtext('salida:' || new.animal_id::text));
  if exists (
    select 1
      from public.salida s
     where s.animal_id = new.animal_id
       -- El mismo registro reenviado no cuenta: lo resuelve ON CONFLICT (id) DO NOTHING (3.7.8).
       and s.id <> new.id
       and not exists (
         select 1 from public.correccion c
          where c.entidad_afectada = 'salida' and c.registro_id = s.id and c.tipo = 'anulacion')
  ) then
    raise exception using errcode = '23505', message = 'El animal ya tiene una salida vigente',
      constraint = 'salida_vigente_unica';
  end if;
  return new;
end;
$$;

comment on function public.salida_vigente_unica() is
  'Un animal admite una sola salida vigente (no anulada). Documento técnico 29, sección 8.';

create trigger salida_vigente_unica
  before insert on public.salida
  for each row execute function public.salida_vigente_unica();

-- Nadie la llama directamente: la ejecuta el disparador.
revoke all on function public.salida_vigente_unica() from public, anon, authenticated;
