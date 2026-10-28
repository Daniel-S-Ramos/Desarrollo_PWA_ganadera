-- =============================================================================
-- Un solo ordeño VIGENTE por vaca y día
-- Especificación: docs/tecnica/32-ordeno-vigente-unico.md, sección 3
--
-- La restricción única produccion_leche_una_por_vaca_y_fecha contaba también los ordeños anulados: con un
-- servidor de solo inserciones y la anulación en la tabla correccion, una vaca con el ordeño del día anulado no
-- podía tener otro ese día, y lo anulado no admite correcciones (documento técnico 26, sección 7). Es el mismo
-- problema de la salida (20261021000100) y de la compra (20261021000200); se resuelve igual (paso 6.0, aprobado
-- el 2026-10-22).
--
-- Antes de insertar un ordeño se comprueba que la vaca no tenga ese día otro sin anulación. Si lo tiene, se
-- rechaza con el código de unicidad (23505): el teléfono lo trata como hasta ahora, convirtiéndolo en corrección
-- del ordeño vigente (documento técnico 22, sección 7).
-- =============================================================================

alter table public.produccion_leche drop constraint produccion_leche_una_por_vaca_y_fecha;

-- Lo usan el disparador y la búsqueda del ordeño aceptado (documento técnico 32, sección 4).
create index produccion_leche_vaca_fecha on public.produccion_leche (animal_id, fecha);

create or replace function public.ordeno_vigente_unico() returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Dos ordeños de la misma vaca y día que llegan a la vez se atienden uno tras otro.
  perform pg_advisory_xact_lock(hashtext('ordeno:' || new.animal_id::text || ':' || new.fecha::text));
  if exists (
    select 1
      from public.produccion_leche p
     where p.animal_id = new.animal_id
       and p.fecha = new.fecha
       -- El mismo registro reenviado no cuenta: lo resuelve ON CONFLICT (id) DO NOTHING (3.7.8).
       and p.id <> new.id
       and not exists (
         select 1 from public.correccion c
          where c.entidad_afectada = 'produccion_leche' and c.registro_id = p.id and c.tipo = 'anulacion')
  ) then
    raise exception using errcode = '23505', message = 'La vaca ya tiene un ordeño vigente ese día',
      constraint = 'ordeno_vigente_unico';
  end if;
  return new;
end;
$$;

comment on function public.ordeno_vigente_unico() is
  'Una vaca admite un solo ordeño vigente (no anulado) por día. Documento técnico 32, sección 3.';

create trigger ordeno_vigente_unico
  before insert on public.produccion_leche
  for each row execute function public.ordeno_vigente_unico();

-- Nadie la llama directamente: la ejecuta el disparador.
revoke all on function public.ordeno_vigente_unico() from public, anon, authenticated;
