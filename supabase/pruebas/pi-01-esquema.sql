-- =============================================================================
-- PI-01 · Esquema remoto (docs/tecnica/05-esquema-remoto.md, sección 10)
--
-- Prueba de integración contra la base de datos real de Supabase.
-- Uso:  npx supabase db query --linked -f supabase/pruebas/pi-01-esquema.sql
--
-- No deja datos: todas las inserciones ocurren dentro de un bloque que se revierte
-- al final, y solo se conservan, en memoria, los resultados de cada verificación.
-- =============================================================================

-- Ejecuta una sentencia y devuelve 'OK' o el código de error de PostgreSQL (SQLSTATE).
-- 23505 = violación de unicidad · 23514 = violación de CHECK.
create or replace function pg_temp.intentar(sentencia text) returns text
language plpgsql as $$
begin
  execute sentencia;
  return 'OK';
exception when others then
  return sqlstate;
end;
$$;

create or replace function pg_temp.pi01()
returns table (n int, verificacion text, resultado text, detalle text)
language plpgsql as $$
declare
  r         jsonb := '[]'::jsonb;
  usuario   uuid := gen_random_uuid();
  med       uuid := gen_random_uuid();
  vaca      uuid := gen_random_uuid();
  ternero   uuid := gen_random_uuid();
  becerro   uuid := gen_random_uuid();
  salida1   uuid := gen_random_uuid();
  compra1   uuid := gen_random_uuid();
  codigos   text[];
  ok        boolean;
  valor     text;
  cuenta    int;
  tablas_predio text[] := array['medicamento','animal','fotografia','destino_productivo','evento_sanitario',
    'produccion_leche','pesaje','parto','movimiento_economico','salida','recordatorio','correccion','colocacion_chapeta'];
  tablas_ref    text[] := array['usuario','parametro'];
  t text;
  ahora constant text := quote_literal(now()::text);
begin
  begin
    -- -------------------------------------------------------------- 1. Estructura
    select count(*) into cuenta from pg_class c join pg_namespace s on s.oid = c.relnamespace
     where s.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
       and c.relname = any (tablas_predio || tablas_ref);
    r := r || jsonb_build_object('n',1,'v','Existen las 15 tablas con RLS activada',
           'ok', cuenta = 15, 'd', cuenta || ' de 15 tablas con RLS');

    -- -------------------------------------------------------------- 2. Privilegios
    ok := true;
    foreach t in array tablas_predio loop
      ok := ok and has_table_privilege('authenticated', 'public.'||t, 'SELECT')
               and has_table_privilege('authenticated', 'public.'||t, 'INSERT')
               and not has_table_privilege('authenticated', 'public.'||t, 'UPDATE')
               and not has_table_privilege('authenticated', 'public.'||t, 'DELETE')
               and not has_table_privilege('authenticated', 'public.'||t, 'TRUNCATE');
    end loop;
    foreach t in array tablas_ref loop
      ok := ok and has_table_privilege('authenticated', 'public.'||t, 'SELECT')
               and not has_table_privilege('authenticated', 'public.'||t, 'INSERT')
               and not has_table_privilege('authenticated', 'public.'||t, 'UPDATE')
               and not has_table_privilege('authenticated', 'public.'||t, 'DELETE');
    end loop;
    foreach t in array tablas_predio || tablas_ref loop
      ok := ok and not has_table_privilege('anon', 'public.'||t, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE');
    end loop;
    r := r || jsonb_build_object('n',2,'v','authenticated: solo SELECT e INSERT (predio) o SELECT (referencia); anon: ninguno; nadie UPDATE ni DELETE',
           'ok', ok, 'd', case when ok then '15 tablas verificadas' else 'algún privilegio no coincide' end);

    -- Datos de apoyo: un usuario de autenticación, su fila en usuario y un medicamento.
    insert into auth.users (id, email) values (usuario, 'pi01-' || usuario || '@prueba.local');
    insert into public.usuario (id, nombre, perfil) values (usuario, 'Usuario PI-01', 'propietario');

    -- -------------------------------------------------------------- 3. recibido_en
    insert into public.medicamento (id, autor_id, creado_en, recibido_en, nombre, tipo, unidad, intervalo_advertencia_dias)
    -- Nombre propio de la prueba: «Prueba Ivermectina» chocó con el que registró el trabajador en PE-25 (2026-10-18).
    values (med, usuario, now(), '2000-01-01T00:00:00Z', 'PI01 Ivermectina', 'purga', 'ml', 30);
    select recibido_en::text into valor from public.medicamento where id = med;
    r := r || jsonb_build_object('n',3,'v','recibido_en la fija el servicio aunque el dispositivo envíe otra',
           'ok', (select recibido_en > now() - interval '5 minutes' from public.medicamento where id = med),
           'd', 'enviado 2000-01-01, guardado ' || valor);

    -- -------------------------------------------------------------- 4. Clave primaria e idempotencia
    insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta)
    values (vaca, usuario, now(), 'Z901', 'hembra', true);
    codigos := array[
      pg_temp.intentar(format('insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta) values (%L, %L, %s, %L, %L, true)', vaca, usuario, ahora, 'Z902', 'hembra')),
      pg_temp.intentar(format('insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta) values (%L, %L, %s, %L, %L, true) on conflict (id) do nothing', vaca, usuario, ahora, 'Z902', 'hembra'))];
    select count(*) into cuenta from public.animal where id = vaca;
    r := r || jsonb_build_object('n',4,'v','Mismo id: se rechaza; con ON CONFLICT DO NOTHING se ignora sin error (3.7.8)',
           'ok', codigos = array['23505','OK'] and cuenta = 1, 'd', 'inserción repetida: ' || codigos[1] || ' · con ON CONFLICT: ' || codigos[2] || ' · filas con ese id: ' || cuenta);

    -- -------------------------------------------------------------- 5. Chapeta única
    valor := pg_temp.intentar(format('insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta) values (%L, %L, %s, %L, %L, true)', gen_random_uuid(), usuario, ahora, 'Z901', 'macho'));
    r := r || jsonb_build_object('n',5,'v','Un segundo animal con la misma chapeta se rechaza','ok', valor = '23505','d','código: ' || valor);

    -- -------------------------------------------------------------- 6. Un ordeño por vaca y fecha
    insert into public.produccion_leche (id, autor_id, creado_en, animal_id, fecha, litros)
    values (gen_random_uuid(), usuario, now(), vaca, '2026-10-06', 6.5);
    valor := pg_temp.intentar(format('insert into public.produccion_leche (id, autor_id, creado_en, animal_id, fecha, litros) values (%L, %L, %s, %L, %L, 7)', gen_random_uuid(), usuario, ahora, vaca, '2026-10-06'));
    r := r || jsonb_build_object('n',6,'v','Un segundo ordeño de la misma vaca en la misma fecha se rechaza','ok', valor = '23505','d','código: ' || valor);

    -- -------------------------------------------------------------- 7. Restricciones de valores
    codigos := array[
      -- litros negativos
      pg_temp.intentar(format('insert into public.produccion_leche (id, autor_id, creado_en, animal_id, fecha, litros) values (%L,%L,%s,%L,%L,-1)', gen_random_uuid(), usuario, ahora, vaca, '2026-10-07')),
      -- peso cero
      pg_temp.intentar(format('insert into public.pesaje (id, autor_id, creado_en, animal_id, fecha, peso, metodo) values (%L,%L,%s,%L,%L,0,%L)', gen_random_uuid(), usuario, ahora, vaca, '2026-10-06', 'cinta')),
      -- sexo inválido
      pg_temp.intentar(format('insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta) values (%L,%L,%s,%L,%L,true)', gen_random_uuid(), usuario, ahora, 'Z903', 'otro')),
      -- padre interno y externo a la vez
      pg_temp.intentar(format('insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta, padre_id, padre_externo) values (%L,%L,%s,%L,%L,true,%L,%L)', gen_random_uuid(), usuario, ahora, 'Z904', 'macho', vaca, 'Toro del vecino')),
      -- parto con cría viva sin cría
      pg_temp.intentar(format('insert into public.parto (id, autor_id, creado_en, madre_id, fecha, resultado) values (%L,%L,%s,%L,%L,%L)', gen_random_uuid(), usuario, ahora, vaca, '2026-10-06', 'cria_viva')),
      -- venta sin valor
      pg_temp.intentar(format('insert into public.salida (id, autor_id, creado_en, animal_id, fecha, motivo, peso_venta) values (%L,%L,%s,%L,%L,%L,410)', gen_random_uuid(), usuario, ahora, vaca, '2026-10-06', 'venta')),
      -- anulación con valores
      pg_temp.intentar(format('insert into public.correccion (id, autor_id, creado_en, entidad_afectada, registro_id, tipo, campo, valor_anterior, valor_nuevo, motivo) values (%L,%L,%s,%L,%L,%L,%L,%L,%L,%L)', gen_random_uuid(), usuario, ahora, 'pesaje', gen_random_uuid(), 'anulacion', 'peso', '650', '6.5', 'error_digitacion')),
      -- motivo «otro» sin nota
      pg_temp.intentar(format('insert into public.correccion (id, autor_id, creado_en, entidad_afectada, registro_id, tipo, campo, valor_anterior, valor_nuevo, motivo) values (%L,%L,%s,%L,%L,%L,%L,%L,%L,%L)', gen_random_uuid(), usuario, ahora, 'pesaje', gen_random_uuid(), 'correccion', 'peso', '650', '6.5', 'otro'))];
    r := r || jsonb_build_object('n',7,'v','Se rechazan valores fuera del dominio (8 casos de la Tabla 24)',
           'ok', codigos = array_fill('23514'::text, array[8]), 'd', 'códigos: ' || array_to_string(codigos, ', '));

    -- -------------------------------------------------------------- 8. Medicamento sin distinguir mayúsculas
    valor := pg_temp.intentar(format('insert into public.medicamento (id, autor_id, creado_en, nombre, tipo, unidad, intervalo_advertencia_dias) values (%L,%L,%s,%L,%L,%L,30)', gen_random_uuid(), usuario, ahora, ' pi01 ivermectina ', 'purga', 'ml'));
    r := r || jsonb_build_object('n',8,'v','«pi01 ivermectina» se rechaza si ya existe «PI01 Ivermectina» (3.8.9)','ok', valor = '23505','d','código: ' || valor);

    -- -------------------------------------------------------------- 9. Una compra por animal
    insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor)
    values (gen_random_uuid(), usuario, now(), vaca, 'compra', '2026-01-10', 2800000),
           (gen_random_uuid(), usuario, now(), vaca, 'alimentacion', '2026-02-01', 80000);
    codigos := array[
      pg_temp.intentar(format('insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor) values (%L,%L,%s,%L,%L,%L,1)', gen_random_uuid(), usuario, ahora, vaca, 'compra', '2026-03-01')),
      pg_temp.intentar(format('insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor) values (%L,%L,%s,%L,%L,%L,1)', gen_random_uuid(), usuario, ahora, vaca, 'alimentacion', '2026-03-01'))];
    r := r || jsonb_build_object('n',9,'v','Segunda compra del mismo animal se rechaza; segunda alimentación se admite',
           'ok', codigos = array['23505','OK'], 'd', 'compra: ' || codigos[1] || ' · alimentación: ' || codigos[2]);

    -- -------------------------------------------------------------- 10. Parámetros
    select count(*) into cuenta from public.parametro where clave in
      ('dias_sin_pesaje','dias_sin_ordeno','dias_sin_registros','dias_sin_transmitir','dias_promedio_produccion','precio_litro_leche');
    r := r || jsonb_build_object('n',10,'v','Están cargados los seis parámetros de la Tabla 30','ok', cuenta = 6,'d', cuenta || ' de 6');

    -- -------------------------------------------------------------- 11. Funciones expuestas
    -- Ninguna función SECURITY DEFINER del esquema public es ejecutable por los roles de la aplicación
    -- (hallazgo del revisor de seguridad de Supabase sobre public.rls_auto_enable).
    select coalesce(string_agg(p.proname, ', '), '') into valor
      from pg_proc p join pg_namespace s on s.oid = p.pronamespace
     where s.nspname = 'public' and p.prosecdef
       and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
    r := r || jsonb_build_object('n',11,'v','Ninguna función SECURITY DEFINER de public es ejecutable por anon ni authenticated',
           'ok', valor = '', 'd', case when valor = '' then 'ninguna expuesta' else 'expuestas: ' || valor end);

    -- -------------------------------------------------------------- 12. Formato de la chapeta
    -- El servicio solo admite la numeración del predio, normalizada (docs/tecnica/13-registro-de-animal.md, sección 8).
    -- Las chapetas de prueba usan la serie Z900 a Z999, reservada para pruebas.
    codigos := array(
      select pg_temp.intentar(format('insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta) values (%L,%L,%s,%L,%L,true)', gen_random_uuid(), usuario, ahora, c, 'hembra'))
        from unnest(array['z905', 'Z 905', '0905', 'O905', 'Z0', 'ZZ1', 'Z1000', '10000', 'Z905']) with ordinality as t(c, i)
       order by i);
    r := r || jsonb_build_object('n',12,'v','Chapeta: se rechazan minúscula, espacio, cero inicial, letra O, cero, dos letras y fuera de rango; Z905 se admite',
           'ok', codigos = array['23514','23514','23514','23514','23514','23514','23514','23514','OK'],
           'd', 'códigos: ' || array_to_string(codigos, ', '));

    -- -------------------------------------------------------------- 13. Madre de una sola forma
    -- Como el padre (3.8.8), la madre es del predio o externa, nunca las dos cosas.
    codigos := array[
      pg_temp.intentar(format('insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta, madre_id, madre_externa) values (%L,%L,%s,%L,%L,true,%L,%L)', gen_random_uuid(), usuario, ahora, 'Z906', 'hembra', vaca, 'Vaca del vecino')),
      pg_temp.intentar(format('insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta, madre_externa) values (%L,%L,%s,%L,%L,true,%L)', gen_random_uuid(), usuario, ahora, 'Z907', 'hembra', 'Vaca del vecino'))];
    r := r || jsonb_build_object('n',13,'v','Madre del predio y externa a la vez se rechaza; solo externa se admite',
           'ok', codigos = array['23514','OK'], 'd', 'ambas: ' || codigos[1] || ' · solo externa: ' || codigos[2]);

    -- -------------------------------------------------------------- 14. Medicamento sin tildes ni espacios repetidos
    -- Con «PI01 Ivermectina» registrada (verificación 3), las otras escrituras del mismo nombre se rechazan
    -- y un nombre distinto se admite (docs/tecnica/18-catalogo-de-medicamentos.md, sección 3).
    codigos := array(
      select pg_temp.intentar(format('insert into public.medicamento (id, autor_id, creado_en, nombre, tipo, unidad, intervalo_advertencia_dias) values (%L,%L,%s,%L,%L,%L,30)', gen_random_uuid(), usuario, ahora, c, 'purga', 'ml'))
        from unnest(array['PI01 Ivermectína', '  pi01   IVERMECTINA ', 'PI01 Ivermectina 1%']) with ordinality as t(c, i)
       order by i);
    r := r || jsonb_build_object('n',14,'v','Medicamento con tilde o espacios repetidos se rechaza; otro nombre se admite',
           'ok', codigos = array['23505','23505','OK'], 'd', 'códigos: ' || array_to_string(codigos, ', '));

    -- -------------------------------------------------------------- 15. Chapeta pendiente de poner
    -- Un animal se registra sin la chapeta puesta, y su colocación se admite una sola vez
    -- (docs/tecnica/25-parto-y-control-reproductivo.md, sección 7.1).
    codigos := array[
      pg_temp.intentar(format('insert into public.animal (id, autor_id, creado_en, codigo_chapeta, sexo, fecha_nacimiento_exacta, chapeta_puesta) values (%L,%L,%s,%L,%L,true,false)', becerro, usuario, ahora, 'Z908', 'macho')),
      pg_temp.intentar(format('insert into public.colocacion_chapeta (id, autor_id, creado_en, animal_id, fecha) values (%L,%L,%s,%L,current_date)', gen_random_uuid(), usuario, ahora, becerro)),
      pg_temp.intentar(format('insert into public.colocacion_chapeta (id, autor_id, creado_en, animal_id, fecha) values (%L,%L,%s,%L,current_date)', gen_random_uuid(), usuario, ahora, becerro))];
    select count(*) into cuenta from public.parametro p where p.clave = 'dias_recordar_chapeta' and p.valor = 90;
    r := r || jsonb_build_object('n',15,'v','Animal sin chapeta puesta se admite; su colocación, una sola vez; plazo de 90 días cargado',
           'ok', codigos = array['OK','OK','23505'] and cuenta = 1,
           'd', 'códigos: ' || array_to_string(codigos, ', ') || ' · parámetro: ' || cuenta);

    -- -------------------------------------------------------------- 16. Observación de la salida
    -- Una salida por pérdida o robo admite una observación opcional, de hasta 300 caracteres
    -- (docs/tecnica/29-salida-y-venta.md, sección 4).
    codigos := array[
      pg_temp.intentar(format('insert into public.salida (id, autor_id, creado_en, animal_id, fecha, motivo, observacion) values (%L,%L,%s,%L,current_date,%L,%L)', gen_random_uuid(), usuario, ahora, becerro, 'perdida_robo', 'Se salió por la cerca del potrero de abajo')),
      pg_temp.intentar(format('insert into public.salida (id, autor_id, creado_en, animal_id, fecha, motivo, observacion) values (%L,%L,%s,%L,current_date,%L,%L)', gen_random_uuid(), usuario, ahora, vaca, 'perdida_robo', repeat('x', 301)))];
    select count(*) into cuenta from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = 'salida' and c.column_name = 'observacion' and c.is_nullable = 'YES';
    r := r || jsonb_build_object('n',16,'v','La salida admite una observación opcional de hasta 300 caracteres',
           'ok', codigos = array['OK','23514'] and cuenta = 1,
           'd', 'códigos: ' || array_to_string(codigos, ', ') || ' · columna: ' || cuenta);

    -- -------------------------------------------------------------- 17. Una sola salida vigente
    -- Una segunda salida se rechaza mientras la primera esté vigente; el reenvío de la misma se ignora; anulada
    -- la primera, se admite otra (docs/tecnica/29-salida-y-venta.md, sección 8).
    codigos := array[
      pg_temp.intentar(format('insert into public.salida (id, autor_id, creado_en, animal_id, fecha, motivo, peso_venta, valor_venta) values (%L,%L,%s,%L,current_date,%L,410,1000000)', salida1, usuario, ahora, vaca, 'venta')),
      pg_temp.intentar(format('insert into public.salida (id, autor_id, creado_en, animal_id, fecha, motivo, causa_muerte) values (%L,%L,%s,%L,current_date,%L,%L)', gen_random_uuid(), usuario, ahora, vaca, 'muerte', 'Rayo')),
      pg_temp.intentar(format('insert into public.salida (id, autor_id, creado_en, animal_id, fecha, motivo, peso_venta, valor_venta) values (%L,%L,%s,%L,current_date,%L,410,1000000) on conflict (id) do nothing', salida1, usuario, ahora, vaca, 'venta')),
      pg_temp.intentar(format('insert into public.correccion (id, autor_id, creado_en, entidad_afectada, registro_id, tipo, motivo) values (%L,%L,%s,%L,%L,%L,%L)', gen_random_uuid(), usuario, ahora, 'salida', salida1, 'anulacion', 'animal_equivocado')),
      pg_temp.intentar(format('insert into public.salida (id, autor_id, creado_en, animal_id, fecha, motivo, causa_muerte) values (%L,%L,%s,%L,current_date,%L,%L)', gen_random_uuid(), usuario, ahora, vaca, 'muerte', 'Rayo'))];
    r := r || jsonb_build_object('n',17,'v','Una sola salida vigente: la segunda se rechaza, el reenvío se ignora y, anulada la primera, se admite otra',
           'ok', codigos = array['OK','23505','OK','OK','OK'],
           'd', 'códigos: ' || array_to_string(codigos, ', '));

    -- -------------------------------------------------------------- 18. Una sola compra vigente
    -- Una segunda compra se rechaza mientras la primera esté vigente; el reenvío se ignora; anulada la primera, se
    -- admite otra; la alimentación no se limita (docs/tecnica/31-consolidado-economico.md, sección 4).
    codigos := array[
      pg_temp.intentar(format('insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor) values (%L,%L,%s,%L,%L,current_date,900000)', compra1, usuario, ahora, becerro, 'compra')),
      pg_temp.intentar(format('insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor) values (%L,%L,%s,%L,%L,current_date,950000)', gen_random_uuid(), usuario, ahora, becerro, 'compra')),
      pg_temp.intentar(format('insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor) values (%L,%L,%s,%L,%L,current_date,900000) on conflict (id) do nothing', compra1, usuario, ahora, becerro, 'compra')),
      pg_temp.intentar(format('insert into public.correccion (id, autor_id, creado_en, entidad_afectada, registro_id, tipo, motivo) values (%L,%L,%s,%L,%L,%L,%L)', gen_random_uuid(), usuario, ahora, 'movimiento_economico', compra1, 'anulacion', 'error_digitacion')),
      pg_temp.intentar(format('insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor) values (%L,%L,%s,%L,%L,current_date,950000)', gen_random_uuid(), usuario, ahora, becerro, 'compra')),
      pg_temp.intentar(format('insert into public.movimiento_economico (id, autor_id, creado_en, animal_id, concepto, fecha, valor) values (%L,%L,%s,%L,%L,current_date,50000)', gen_random_uuid(), usuario, ahora, becerro, 'alimentacion'))];
    r := r || jsonb_build_object('n',18,'v','Una sola compra vigente: la segunda se rechaza, el reenvío se ignora y, anulada la primera, se admite otra',
           'ok', codigos = array['OK','23505','OK','OK','OK','OK'],
           'd', 'códigos: ' || array_to_string(codigos, ', '));

    -- Revertir todo lo insertado. Solo sobrevive la variable r con los resultados.
    raise exception using errcode = 'P0099', message = 'REVERTIR';
  exception when sqlstate 'P0099' then
    null;
  end;

  return query
    select (e->>'n')::int,
           e->>'v',
           case when (e->>'ok')::boolean then 'APROBADA' else 'FALLIDA' end,
           e->>'d'
      from jsonb_array_elements(r) e
     order by 1;
end;
$$;

select * from pg_temp.pi01();
