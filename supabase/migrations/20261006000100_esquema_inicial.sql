-- =============================================================================
-- Esquema inicial del servicio remoto · Ganadería JR
-- Especificación: docs/tecnica/05-esquema-remoto.md
--
-- Principio rector (sección 2): en las tablas del predio solo se inserta y se
-- consulta. Ningún rol de la aplicación puede modificar ni eliminar filas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Marca de recepción fijada por el servicio (sección 4)
--
-- recibido_en ordena las correcciones que compiten (3.7.3) y es la marca de
-- avance de la descarga incremental (3.7.7). La fija siempre el reloj del
-- servicio, ignorando cualquier valor que envíe el dispositivo.
-- clock_timestamp() distingue también las filas de un mismo lote.
-- -----------------------------------------------------------------------------
create function public.fijar_recibido_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.recibido_en := clock_timestamp();
  return new;
end;
$$;

comment on function public.fijar_recibido_en() is
  'Fija recibido_en con el reloj del servicio en cada inserción (docs/tecnica/05-esquema-remoto.md, sección 4).';


-- -----------------------------------------------------------------------------
-- Datos de referencia
-- -----------------------------------------------------------------------------

-- Usuarios del predio. El identificador es el mismo de la cuenta de autenticación.
create table public.usuario (
  id      uuid primary key references auth.users (id) on delete restrict,
  nombre  text not null check (length(trim(nombre)) > 0),
  perfil  text not null check (perfil in ('propietario', 'trabajador'))
);

-- Valores de operación ajustables sin modificar la aplicación (Tabla 30, 3.8.9).
create table public.parametro (
  clave        text primary key,
  valor        numeric not null,
  unidad       text not null,
  descripcion  text not null
);


-- -----------------------------------------------------------------------------
-- Tablas del predio
--
-- Atributos comunes (sección 4):
--   id           uuid v7 generado en el dispositivo (3.7.1)
--   autor_id     usuario que registró, fijado en el dispositivo (RD-04)
--   creado_en    instante de creación según el dispositivo (RD-04)
--   recibido_en  instante de recepción según el servicio (disparador)
-- -----------------------------------------------------------------------------

create table public.medicamento (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  nombre                      text not null check (length(trim(nombre)) > 0),
  tipo                        text not null check (tipo in ('vacuna', 'purga', 'vitamina', 'antibiotico', 'otro')),
  unidad                      text not null check (unidad in ('ml', 'cc', 'mg', 'dosis')),
  intervalo_advertencia_dias  integer not null check (intervalo_advertencia_dias >= 0)
);

-- «Ivermectina» e «ivermectina» son el mismo producto (3.8.9).
create unique index medicamento_nombre_unico on public.medicamento (lower(trim(nombre)));


create table public.animal (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  -- Único entre todos los animales, activos y retirados (3.8.10, 3.7.3 tercera regla).
  codigo_chapeta           text not null unique check (length(trim(codigo_chapeta)) > 0),
  sexo                     text not null check (sexo in ('macho', 'hembra')),
  fecha_nacimiento         date,
  fecha_nacimiento_exacta  boolean not null,
  fecha_ingreso            date,
  procedencia              text,
  peso_inicial             numeric check (peso_inicial > 0),
  madre_id                 uuid references public.animal (id),
  padre_id                 uuid references public.animal (id),
  padre_externo            text,

  -- El padre es un animal del predio o un reproductor externo, nunca las dos cosas (3.8.8).
  constraint animal_padre_una_sola_forma check (padre_id is null or padre_externo is null),
  constraint animal_no_es_su_propio_progenitor check (madre_id is distinct from id and padre_id is distinct from id)
);
-- Sin columna de estado: se deduce de la existencia de una salida vigente
-- (docs/tecnica/02-esquema-local.md, sección 6.1).


-- La ruta de la imagen no se almacena: es {animal_id}/{id}.webp (sección 2.1).
-- La fotografía vigente de cada vista es la más reciente (sección 5.2).
create table public.fotografia (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  animal_id  uuid not null references public.animal (id),
  tipo       text not null check (tipo in ('izquierdo', 'derecho', 'frontal'))
);


-- El destino vigente es la fila más reciente; las anteriores forman el historial (RF-19, sección 5.2).
create table public.destino_productivo (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  animal_id  uuid not null references public.animal (id),
  destino    text not null check (destino in ('reproductor', 'reproductora', 'leche', 'ceba', 'venta', 'sacrificio')),
  desde      date not null
);


create table public.evento_sanitario (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  animal_id       uuid not null references public.animal (id),
  fecha           date not null,
  tipo            text not null check (tipo in ('vacuna', 'purga', 'vitamina', 'tratamiento', 'otro')),
  medicamento_id  uuid not null references public.medicamento (id),
  dosis           numeric check (dosis >= 0),
  costo           numeric check (costo >= 0),
  sintomas        text
);


create table public.produccion_leche (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  animal_id  uuid not null references public.animal (id),
  -- Fecha calendario del predio, no un instante (3.8.6).
  fecha      date not null,
  -- Admite cero: ordeño sin producción.
  litros     numeric not null check (litros >= 0),

  -- Un solo registro por vaca y fecha (3.8.6). Un segundo registro se convierte en corrección.
  constraint produccion_leche_una_por_vaca_y_fecha unique (animal_id, fecha)
);


create table public.pesaje (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  animal_id  uuid not null references public.animal (id),
  fecha      date not null,
  peso       numeric not null check (peso > 0),
  metodo     text not null check (metodo in ('cinta', 'bascula'))
);


create table public.parto (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  madre_id     uuid not null references public.animal (id),
  fecha        date not null,
  resultado    text not null check (resultado in ('cria_viva', 'cria_nacida_muerta', 'aborto')),
  cria_id      uuid references public.animal (id),
  observacion  text,

  -- La cría existe como animal si y solo si nació viva (3.8.8).
  constraint parto_cria_solo_si_nace_viva check ((resultado = 'cria_viva') = (cria_id is not null)),
  constraint parto_madre_distinta_de_cria check (cria_id is distinct from madre_id)
);


create table public.movimiento_economico (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  animal_id    uuid not null references public.animal (id),
  concepto     text not null check (concepto in ('compra', 'servicio_veterinario', 'alimentacion')),
  fecha        date not null,
  valor        numeric not null check (valor > 0),
  descripcion  text
);

-- Un animal admite un solo movimiento de compra (3.8.12).
create unique index movimiento_economico_una_compra_por_animal
  on public.movimiento_economico (animal_id)
  where concepto = 'compra';


create table public.salida (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  -- Un animal admite una sola salida.
  animal_id     uuid not null unique references public.animal (id),
  fecha         date not null,
  motivo        text not null check (motivo in ('venta', 'muerte', 'perdida_robo')),
  peso_venta    numeric check (peso_venta > 0),
  valor_venta   numeric check (valor_venta > 0),
  comprador     text,
  causa_muerte  text,

  constraint salida_venta_con_peso_y_valor check (motivo <> 'venta' or (peso_venta is not null and valor_venta is not null)),
  constraint salida_muerte_con_causa check (motivo <> 'muerte' or (causa_muerte is not null and length(trim(causa_muerte)) > 0))
);


-- Solo se almacena la decisión de posponer; los recordatorios vigentes se derivan (3.8.11).
create table public.recordatorio (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  tipo             text not null check (tipo in ('sin_pesaje_reciente', 'sin_registro_ordeno', 'produccion_bajo_promedio', 'sin_registros_recientes', 'sincronizacion_pendiente')),
  animal_id        uuid references public.animal (id),
  pospuesto_hasta  date not null,

  constraint recordatorio_pospuesto_a_futuro check (pospuesto_hasta > (creado_en at time zone 'America/Bogota')::date)
);


-- Correcciones y anulaciones (3.9.5). El registro afectado puede estar en cualquiera de las
-- tablas corregibles, por eso registro_id no es clave foránea.
--
-- La regla «no se corrige un registro anulado» (Tabla 24) se verifica en el dispositivo y NO aquí:
-- si una anulación llega antes que una corrección hecha sin conexión, la corrección debe
-- conservarse en el historial (Tabla 21). Ver docs/tecnica/05-esquema-remoto.md, sección 5.3.
create table public.correccion (
  id           uuid primary key,
  autor_id     uuid not null references public.usuario (id),
  creado_en    timestamptz not null,
  recibido_en  timestamptz not null default clock_timestamp(),

  entidad_afectada  text not null check (entidad_afectada in (
                      'animal', 'fotografia', 'evento_sanitario', 'produccion_leche', 'pesaje',
                      'parto', 'destino_productivo', 'movimiento_economico', 'salida', 'medicamento')),
  registro_id       uuid not null,
  tipo              text not null check (tipo in ('correccion', 'anulacion')),
  campo             text,
  valor_anterior    text,
  valor_nuevo       text,
  motivo            text not null check (motivo in ('error_digitacion', 'animal_equivocado', 'fecha_equivocada', 'registro_duplicado', 'otro')),
  nota              text,

  constraint correccion_anulacion_sin_campo check (tipo <> 'anulacion' or (campo is null and valor_anterior is null and valor_nuevo is null)),
  constraint correccion_con_campo check (tipo <> 'correccion' or (campo is not null and length(trim(campo)) > 0)),
  constraint correccion_otro_con_nota check (motivo <> 'otro' or (nota is not null and length(trim(nota)) > 0))
);


-- -----------------------------------------------------------------------------
-- Disparadores e índices comunes de las doce tablas del predio
-- -----------------------------------------------------------------------------
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'medicamento', 'animal', 'fotografia', 'destino_productivo', 'evento_sanitario',
    'produccion_leche', 'pesaje', 'parto', 'movimiento_economico', 'salida',
    'recordatorio', 'correccion'
  ] loop
    execute format(
      'create trigger fijar_recibido_en before insert on public.%I
         for each row execute function public.fijar_recibido_en()', tabla);
    -- Descarga incremental: «cambios recibidos después de la marca de avance» (3.7.7).
    execute format('create index %I on public.%I (recibido_en)', tabla || '_recibido_en', tabla);
  end loop;
end;
$$;

-- Índices sobre las claves foráneas más consultadas.
create index fotografia_animal on public.fotografia (animal_id);
create index destino_productivo_animal on public.destino_productivo (animal_id);
create index evento_sanitario_animal on public.evento_sanitario (animal_id);
create index evento_sanitario_medicamento on public.evento_sanitario (medicamento_id);
create index pesaje_animal on public.pesaje (animal_id);
create index parto_madre on public.parto (madre_id);
create index movimiento_economico_animal on public.movimiento_economico (animal_id);
create index correccion_registro on public.correccion (registro_id);


-- -----------------------------------------------------------------------------
-- Privilegios de los roles de la aplicación (sección 6)
--
-- El proyecto se creó con la exposición automática de tablas activada, que
-- concede todos los privilegios a anon y authenticated. Se retiran primero
-- todos y se conceden después solo los necesarios.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on function public.fijar_recibido_en() from public, anon, authenticated;

-- Las tablas que creen migraciones futuras tampoco reciben privilegios automáticamente.
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select, insert on
  public.medicamento, public.animal, public.fotografia, public.destino_productivo,
  public.evento_sanitario, public.produccion_leche, public.pesaje, public.parto,
  public.movimiento_economico, public.salida, public.recordatorio, public.correccion
to authenticated;

grant select on public.usuario, public.parametro to authenticated;


-- -----------------------------------------------------------------------------
-- Seguridad a nivel de fila (sección 6)
--
-- Activada en las catorce tablas. Sin políticas, nadie accede: el paso 1.9
-- definirá exactamente lo que permite la Tabla 27.
-- -----------------------------------------------------------------------------
alter table public.usuario enable row level security;
alter table public.parametro enable row level security;
alter table public.medicamento enable row level security;
alter table public.animal enable row level security;
alter table public.fotografia enable row level security;
alter table public.destino_productivo enable row level security;
alter table public.evento_sanitario enable row level security;
alter table public.produccion_leche enable row level security;
alter table public.pesaje enable row level security;
alter table public.parto enable row level security;
alter table public.movimiento_economico enable row level security;
alter table public.salida enable row level security;
alter table public.recordatorio enable row level security;
alter table public.correccion enable row level security;
