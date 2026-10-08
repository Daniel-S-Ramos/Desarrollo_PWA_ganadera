-- =============================================================================
-- Políticas de seguridad a nivel de fila (RLS) · Tabla 27 del documento
-- Especificación: docs/tecnica/08-permisos.md
--
-- Hasta esta migración las 14 tablas tenían RLS activada sin políticas: nadie
-- accedía. Aquí se abre exactamente lo que cada perfil puede hacer. Es la
-- garantía real del modelo de permisos: el teléfono oculta y rechaza, pero el
-- servicio decide (3.9.3).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Parámetro de la regla de corrección sin conexión (sección 4.1)
-- -----------------------------------------------------------------------------
insert into public.parametro (clave, valor, unidad, descripcion) values
  ('dias_maximos_correccion_sin_conexion', 7, 'días',
   'Días máximos entre la fecha declarada de una corrección de un trabajador y su llegada al servicio');


-- -----------------------------------------------------------------------------
-- Funciones auxiliares
--
-- Ambas son SECURITY INVOKER: se ejecutan con los permisos de quien consulta,
-- de modo que solo ven lo que las propias políticas le permiten ver.
-- -----------------------------------------------------------------------------

-- Perfil del usuario autenticado, leído de la tabla usuario y no del token (sección 6):
-- un cambio de perfil se aplica de inmediato, sin esperar a que se renueve el token.
create function public.perfil_actual()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select u.perfil from public.usuario u where u.id = (select auth.uid());
$$;

comment on function public.perfil_actual() is
  'Perfil del usuario autenticado según la tabla usuario (docs/tecnica/08-permisos.md, sección 6).';


-- Regla de corrección del trabajador (sección 4): el registro corregido debe existir, haber sido
-- creado por un trabajador, tener la misma fecha del predio que la corrección, y la corrección
-- debe llegar a más tardar dias_maximos_correccion_sin_conexion días después de su fecha.
create function public.trabajador_puede_corregir(entidad text, registro uuid, corregido_en timestamptz)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  autor_registro   uuid;
  creado_registro  timestamptz;
  dias_maximos     numeric;
  fecha_correccion date := (corregido_en at time zone 'America/Bogota')::date;
begin
  -- entidad_afectada ya está restringida por un CHECK de la tabla correccion; %I la cita igualmente.
  execute format('select autor_id, creado_en from public.%I where id = $1', entidad)
     into autor_registro, creado_registro
    using registro;

  if autor_registro is null then
    return false;  -- el registro no existe o no es visible para quien corrige
  end if;

  if (select u.perfil from public.usuario u where u.id = autor_registro) is distinct from 'trabajador' then
    return false;  -- nunca sobre registros del propietario
  end if;

  if (creado_registro at time zone 'America/Bogota')::date <> fecha_correccion then
    return false;  -- solo el mismo día del registro
  end if;

  select p.valor into dias_maximos from public.parametro p where p.clave = 'dias_maximos_correccion_sin_conexion';
  if (now() at time zone 'America/Bogota')::date - fecha_correccion > coalesce(dias_maximos, 7) then
    return false;  -- una corrección que dice ser antigua pero llega hoy (reloj atrasado)
  end if;

  return true;
end;
$$;

comment on function public.trabajador_puede_corregir(text, uuid, timestamptz) is
  'Regla de corrección del trabajador (docs/tecnica/08-permisos.md, sección 4).';

revoke execute on function public.perfil_actual() from public, anon;
revoke execute on function public.trabajador_puede_corregir(text, uuid, timestamptz) from public, anon;
grant execute on function public.perfil_actual() to authenticated;
grant execute on function public.trabajador_puede_corregir(text, uuid, timestamptz) to authenticated;


-- -----------------------------------------------------------------------------
-- Lectura (sección 5)
-- -----------------------------------------------------------------------------

-- Los usuarios del predio: el teléfono necesita el perfil de cada autor para aplicar la regla de
-- corrección sin conexión (Tabla 25).
--
-- No puede condicionarse a perfil_actual(), porque esa función lee esta misma tabla y la política
-- se invocaría a sí misma sin fin. Se abre a cualquier usuario autenticado: el registro abierto está
-- deshabilitado (PE-04) y las únicas cuentas son las que crea el propietario.
create policy "Los usuarios autenticados consultan los usuarios del predio"
  on public.usuario for select to authenticated
  using (true);

create policy "Los usuarios del predio consultan los parámetros"
  on public.parametro for select to authenticated
  using ((select public.perfil_actual()) is not null);

-- Todas las tablas del predio, salvo la económica, las leen ambos perfiles: el teléfono del
-- trabajador las necesita para operar sin conexión (sección 2).
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'medicamento', 'animal', 'fotografia', 'destino_productivo', 'evento_sanitario',
    'produccion_leche', 'pesaje', 'parto', 'salida', 'recordatorio', 'correccion'
  ] loop
    execute format(
      'create policy "Los usuarios del predio consultan %1$s" on public.%1$I
         for select to authenticated
         using ((select public.perfil_actual()) is not null)', tabla);
  end loop;
end;
$$;

-- La información económica es exclusiva del propietario (2.8.6, 3.8.12).
create policy "Solo el propietario consulta movimiento_economico"
  on public.movimiento_economico for select to authenticated
  using ((select public.perfil_actual()) = 'propietario');


-- -----------------------------------------------------------------------------
-- Escritura (sección 3)
--
-- Regla común: el autor de la fila es quien la envía, y tiene perfil en usuario.
-- -----------------------------------------------------------------------------

-- Ambos perfiles insertan.
do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'animal', 'fotografia', 'evento_sanitario', 'medicamento', 'produccion_leche', 'pesaje', 'parto'
  ] loop
    execute format(
      'create policy "Los usuarios del predio registran en %1$s" on public.%1$I
         for insert to authenticated
         with check (autor_id = (select auth.uid()) and (select public.perfil_actual()) is not null)', tabla);
  end loop;
end;
$$;

-- Solo el propietario inserta (Tabla 27: CU-12, CU-13, CU-14 y posponer de CU-15).
do $$
declare
  tabla text;
begin
  foreach tabla in array array['destino_productivo', 'salida', 'movimiento_economico', 'recordatorio'] loop
    execute format(
      'create policy "Solo el propietario registra en %1$s" on public.%1$I
         for insert to authenticated
         with check (autor_id = (select auth.uid()) and (select public.perfil_actual()) = ''propietario'')', tabla);
  end loop;
end;
$$;

-- Correcciones: el propietario sobre cualquier registro; el trabajador con la regla de la sección 4.
create policy "Correcciones según el perfil"
  on public.correccion for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and (
      (select public.perfil_actual()) = 'propietario'
      or (
        (select public.perfil_actual()) = 'trabajador'
        and public.trabajador_puede_corregir(entidad_afectada, registro_id, creado_en)
      )
    )
  );
