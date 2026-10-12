-- =============================================================================
-- PI-03 · Políticas de seguridad a nivel de fila (docs/tecnica/08-permisos.md, sección 10)
--
-- Prueba de integración contra la base de datos real de Supabase.
-- Uso:  npm run prueba:pi-03
--
-- Simula, dentro de la base de datos, las sesiones de un propietario, de dos
-- trabajadores, de una cuenta sin perfil y de un visitante sin sesión, y
-- verifica lo que las políticas permiten y rechazan. Es lo que vería el
-- servicio si un teléfono manipulado intentara saltarse las verificaciones
-- locales. No deja datos: todo se revierte al terminar.
-- =============================================================================

-- Ejecuta una sentencia con la identidad indicada y devuelve 'OK' o el código de error.
-- 42501 = privilegio insuficiente o fila rechazada por una política de RLS.
create or replace function pg_temp.como(rol text, usuario uuid, sentencia text) returns text
language plpgsql as $$
declare
  resultado text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', usuario, 'role', rol)::text, true);
  execute format('set local role %I', rol);
  begin
    execute sentencia;
    resultado := 'OK';
  exception when others then
    resultado := sqlstate;
  end;
  execute 'reset role';
  return resultado;
end;
$$;

-- Cuenta las filas que ve la identidad indicada. Devuelve -1 si la consulta falla.
create or replace function pg_temp.contar_como(rol text, usuario uuid, consulta text) returns int
language plpgsql as $$
declare
  n int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', usuario, 'role', rol)::text, true);
  execute format('set local role %I', rol);
  begin
    execute consulta into n;
  exception when others then
    n := -1;
  end;
  execute 'reset role';
  return n;
end;
$$;

create or replace function pg_temp.pi03()
returns table (n int, verificacion text, resultado text, detalle text)
language plpgsql as $$
declare
  r     jsonb := '[]'::jsonb;
  p     uuid := gen_random_uuid();   -- propietario
  t     uuid := gen_random_uuid();   -- trabajador
  t2    uuid := gen_random_uuid();   -- otro trabajador
  sp    uuid := gen_random_uuid();   -- cuenta sin perfil
  vaca  uuid := gen_random_uuid();
  -- Pesajes que serán objeto de corrección.
  pp_hoy     uuid := gen_random_uuid();
  pt2_hoy    uuid := gen_random_uuid();
  pt_ayer    uuid := gen_random_uuid();
  pt_hace3   uuid := gen_random_uuid();
  pt_hace30  uuid := gen_random_uuid();
  c          text[];
  v          int[];
  correccion constant text := 'insert into public.correccion (id, autor_id, creado_en, entidad_afectada, registro_id, tipo, campo, valor_anterior, valor_nuevo, motivo) values (gen_random_uuid(), %L, %L, ''pesaje'', %L, ''correccion'', ''peso'', ''650'', ''6.5'', ''error_digitacion'')';
  animal_de  constant text := 'insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta) values (gen_random_uuid(), %L, now(), %L, ''hembra'', true)';
begin
  begin
    -- ------------------------------------------------------------ Datos de apoyo (como dueño de las tablas)
    insert into auth.users (id, email) values
      (p, 'pi03-p-' || p || '@prueba.local'), (t, 'pi03-t-' || t || '@prueba.local'),
      (t2, 'pi03-t2-' || t2 || '@prueba.local'), (sp, 'pi03-sp-' || sp || '@prueba.local');
    insert into public.usuario (id, nombre, perfil) values
      (p, 'Propietario PI-03', 'propietario'), (t, 'Trabajador PI-03', 'trabajador'), (t2, 'Trabajador 2 PI-03', 'trabajador');
    insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta)
      values (vaca, p, now(), 'Z911', 'hembra', true);
    insert into public.pesaje (id, autor_id, creado_en, animal_id, fecha, peso, metodo) values
      (pp_hoy,    p,  now(),                      vaca, current_date, 300, 'cinta'),
      (pt2_hoy,   t2, now(),                      vaca, current_date, 301, 'cinta'),
      (pt_ayer,   t,  now() - interval '1 day',   vaca, current_date, 302, 'cinta'),
      (pt_hace3,  t,  now() - interval '3 days',  vaca, current_date, 303, 'cinta'),
      (pt_hace30, t,  now() - interval '30 days', vaca, current_date, 304, 'cinta');
    insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor)
      values (gen_random_uuid(), p, now(), vaca, 'alimentacion', current_date, 50000);

    -- ------------------------------------------------------------ 1. Autoría
    c := array[
      pg_temp.como('authenticated', p, format(animal_de, p, 'Z912')),
      pg_temp.como('authenticated', t, format(animal_de, t, 'Z913')),
      pg_temp.como('authenticated', t, format(animal_de, p, 'Z914'))];
    r := r || jsonb_build_object('n',1,'v','Cada perfil registra con su propia autoría; nadie registra a nombre de otro',
           'ok', c = array['OK','OK','42501'], 'd', 'propietario: ' || c[1] || ' · trabajador: ' || c[2] || ' · trabajador a nombre del propietario: ' || c[3]);

    -- ------------------------------------------------------------ 2. Tablas exclusivas del propietario: el trabajador
    c := array[
      pg_temp.como('authenticated', t, format('insert into public.destino_productivo (id, autor_id, creado_en, animal_id, destino, desde) values (gen_random_uuid(), %L, now(), %L, ''ceba'', current_date)', t, vaca)),
      pg_temp.como('authenticated', t, format('insert into public.salida (id, autor_id, creado_en, animal_id, fecha, motivo, peso_venta, valor_venta) values (gen_random_uuid(), %L, now(), %L, current_date, ''venta'', 410, 3200000)', t, vaca)),
      pg_temp.como('authenticated', t, format('insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor) values (gen_random_uuid(), %L, now(), %L, ''alimentacion'', current_date, 1000)', t, vaca)),
      pg_temp.como('authenticated', t, format('insert into public.recordatorio (id, autor_id, creado_en, tipo, pospuesto_hasta) values (gen_random_uuid(), %L, now(), ''sincronizacion_pendiente'', current_date + 3)', t))];
    r := r || jsonb_build_object('n',2,'v','El trabajador no registra destino, salida, movimiento económico ni posposición (Tabla 27)',
           'ok', c = array_fill('42501'::text, array[4]), 'd', 'códigos: ' || array_to_string(c, ', '));

    -- ------------------------------------------------------------ 3. Tablas exclusivas del propietario: el propietario
    c := array[
      pg_temp.como('authenticated', p, format('insert into public.destino_productivo (id, autor_id, creado_en, animal_id, destino, desde) values (gen_random_uuid(), %L, now(), %L, ''leche'', current_date)', p, vaca)),
      pg_temp.como('authenticated', p, format('insert into public.salida (id, autor_id, creado_en, animal_id, fecha, motivo, peso_venta, valor_venta) values (gen_random_uuid(), %L, now(), %L, current_date, ''venta'', 410, 3200000)', p, vaca)),
      pg_temp.como('authenticated', p, format('insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor) values (gen_random_uuid(), %L, now(), %L, ''alimentacion'', current_date, 1000)', p, vaca)),
      pg_temp.como('authenticated', p, format('insert into public.recordatorio (id, autor_id, creado_en, tipo, pospuesto_hasta) values (gen_random_uuid(), %L, now(), ''sincronizacion_pendiente'', current_date + 3)', p))];
    r := r || jsonb_build_object('n',3,'v','El propietario registra destino, salida, movimiento económico y posposición',
           'ok', c = array_fill('OK'::text, array[4]), 'd', 'códigos: ' || array_to_string(c, ', '));

    -- ------------------------------------------------------------ 4. Lectura de la información económica
    v := array[
      pg_temp.contar_como('authenticated', t, 'select count(*) from public.movimiento_economico'),
      pg_temp.contar_como('authenticated', p, 'select count(*) from public.movimiento_economico')];
    r := r || jsonb_build_object('n',4,'v','Solo el propietario lee los movimientos económicos (2.8.6, 3.8.12)',
           'ok', v[1] = 0 and v[2] >= 1, 'd', 'filas que ve el trabajador: ' || v[1] || ' · el propietario: ' || v[2]);

    -- ------------------------------------------------------------ 5. Lectura de los datos que el trabajador necesita
    v := array[
      pg_temp.contar_como('authenticated', t, 'select count(*) from public.pesaje'),
      pg_temp.contar_como('authenticated', t, 'select count(*) from public.salida'),
      pg_temp.contar_como('authenticated', t, 'select count(*) from public.destino_productivo'),
      pg_temp.contar_como('authenticated', t, format('select count(*) from public.usuario where id = %L', p)),
      pg_temp.contar_como('authenticated', t, 'select count(*) from public.parametro')];
    r := r || jsonb_build_object('n',5,'v','El trabajador lee pesajes, salidas, destinos, los usuarios del predio y los parámetros (sección 2)',
           'ok', v[1] >= 5 and v[2] >= 1 and v[3] >= 1 and v[4] = 1 and v[5] >= 7,
           'd', 'pesajes ' || v[1] || ' · salidas ' || v[2] || ' · destinos ' || v[3] || ' · ve al propietario ' || v[4] || ' · parámetros ' || v[5]);

    -- ------------------------------------------------------------ 6. Corrección del trabajador permitida
    c := array[
      pg_temp.como('authenticated', t, format(correccion, t, now(), pt2_hoy)),
      pg_temp.como('authenticated', t, format(correccion, t, now() - interval '3 days', pt_hace3))];
    r := r || jsonb_build_object('n',6,'v','El trabajador corrige un registro de otro trabajador del mismo día, también si sincroniza 3 días después',
           'ok', c = array['OK','OK'], 'd', 'mismo día: ' || c[1] || ' · hecha hace 3 días y recibida hoy: ' || c[2]);

    -- ------------------------------------------------------------ 7. Corrección del trabajador rechazada
    c := array[
      pg_temp.como('authenticated', t, format(correccion, t, now(), pp_hoy)),
      pg_temp.como('authenticated', t, format(correccion, t, now(), pt_ayer)),
      pg_temp.como('authenticated', t, format(correccion, t, now() - interval '30 days', pt_hace30))];
    r := r || jsonb_build_object('n',7,'v','El trabajador no corrige un registro del propietario, ni de otro día, ni con el reloj atrasado 30 días',
           'ok', c = array_fill('42501'::text, array[3]),
           'd', 'del propietario: ' || c[1] || ' · de otro día: ' || c[2] || ' · reloj atrasado: ' || c[3]);

    -- ------------------------------------------------------------ 8. Corrección del propietario
    c := array[
      pg_temp.como('authenticated', p, format(correccion, p, now(), pt_hace30)),
      pg_temp.como('authenticated', p, format(correccion, p, now(), pt2_hoy))];
    r := r || jsonb_build_object('n',8,'v','El propietario corrige cualquier registro, sin límite de tiempo',
           'ok', c = array['OK','OK'], 'd', 'de un trabajador hace 30 días: ' || c[1] || ' · de otro trabajador hoy: ' || c[2]);

    -- ------------------------------------------------------------ 9. Cuenta sin perfil
    c := array[pg_temp.como('authenticated', sp, format(animal_de, sp, 'Z915'))];
    v := array[pg_temp.contar_como('authenticated', sp, 'select count(*) from public.animal')];
    r := r || jsonb_build_object('n',9,'v','Una cuenta sin perfil no registra ni lee información del predio',
           'ok', c[1] = '42501' and v[1] = 0, 'd', 'registrar: ' || c[1] || ' · animales que ve: ' || v[1]);

    -- ------------------------------------------------------------ 10. Visitante sin sesión
    c := array[
      pg_temp.como('anon', null, 'select count(*) from public.animal'),
      pg_temp.como('anon', null, format(animal_de, p, 'Z916'))];
    r := r || jsonb_build_object('n',10,'v','Sin sesión no se lee ni se registra nada',
           'ok', c = array['42501','42501'], 'd', 'leer: ' || c[1] || ' · registrar: ' || c[2]);

    -- ------------------------------------------------------------ 11. Inmutabilidad, también con políticas
    c := array[
      pg_temp.como('authenticated', p, format('update public.pesaje set peso = 999 where id = %L', pp_hoy)),
      pg_temp.como('authenticated', p, format('delete from public.pesaje where id = %L', pp_hoy))];
    r := r || jsonb_build_object('n',11,'v','Ni el propietario puede modificar ni eliminar un registro (RNF-06)',
           'ok', c = array['42501','42501'], 'd', 'modificar: ' || c[1] || ' · eliminar: ' || c[2]);

    raise exception using errcode = 'P0099', message = 'REVERTIR';
  exception when sqlstate 'P0099' then
    null;
  end;

  return query
    select (e->>'n')::int, e->>'v',
           case when (e->>'ok')::boolean then 'APROBADA' else 'FALLIDA' end,
           e->>'d'
      from jsonb_array_elements(r) e
     order by 1;
end;
$$;

select * from pg_temp.pi03();
