-- =============================================================================
-- Chapeta pendiente de poner
-- Especificación: docs/tecnica/25-parto-y-control-reproductivo.md, sección 7.1
--
-- La cría recibe su número al nacer, pero la chapeta física se le pone después, cuando el ternero está
-- más fuerte; el plazo máximo es de 90 días (dato del propietario, 2026-10-18).
--
-- El servidor solo admite inserciones: el animal no puede «marcarse» después. Por eso:
--   · animal.chapeta_puesta se fija al registrar (false para las crías) y no cambia;
--   · colocacion_chapeta registra, una sola vez por animal, la fecha en que se puso.
-- Una chapeta está pendiente si chapeta_puesta es false y no hay colocación.
-- =============================================================================

alter table public.animal
  add column chapeta_puesta boolean not null default true;

comment on column public.animal.chapeta_puesta is
  'Si el animal ya tenía la chapeta física al registrarse. False para las crías: su colocación se registra en colocacion_chapeta (docs/tecnica/25-parto-y-control-reproductivo.md, sección 7).';

create table public.colocacion_chapeta (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  animal_id    uuid not null references public.animal (id),
  fecha        date not null,

  -- Una sola colocación por animal: si dos teléfonos la registran sin conexión, el segundo queda en
  -- conflicto con su causa (sección 7.2).
  constraint colocacion_chapeta_una_por_animal unique (animal_id)
);

-- Como las demás tablas: la marca de recepción la fija el servicio y la descarga incremental la usa (3.7.7).
create trigger fijar_recibido_en before insert on public.colocacion_chapeta
  for each row execute function public.fijar_recibido_en();
create index colocacion_chapeta_recibido_en on public.colocacion_chapeta (recibido_en);

-- Solo inserciones y consultas (documento técnico 05, sección 2.1).
revoke all on public.colocacion_chapeta from anon, authenticated;
grant select, insert on public.colocacion_chapeta to authenticated;

alter table public.colocacion_chapeta enable row level security;

-- Ambos perfiles la consultan y la registran: quien pone la chapeta suele ser el trabajador (decisión J).
create policy "Los usuarios del predio consultan colocacion_chapeta"
  on public.colocacion_chapeta for select to authenticated
  using ((select public.perfil_actual()) is not null);

create policy "Los usuarios del predio registran en colocacion_chapeta"
  on public.colocacion_chapeta for insert to authenticated
  with check (autor_id = (select auth.uid()) and (select public.perfil_actual()) is not null);

-- Plazo para poner la chapeta, del propietario (Tabla 30, nuevo parámetro).
insert into public.parametro (clave, valor, unidad, descripcion) values
  ('dias_recordar_chapeta', 90, 'días', 'Plazo máximo para poner la chapeta a un ternero después de nacer');
