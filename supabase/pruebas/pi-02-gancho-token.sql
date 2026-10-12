-- =============================================================================
-- PI-02 · Gancho de token de acceso (docs/tecnica/06-autenticacion.md, sección 11)
--
-- Prueba de integración contra la base de datos real de Supabase.
-- Uso:  npm run prueba:pi-02
--
-- No deja datos: el usuario de apoyo se crea dentro de un bloque que se revierte.
-- =============================================================================

create or replace function pg_temp.pi02()
returns table (n int, verificacion text, resultado text, detalle text)
language plpgsql as $$
declare
  r          jsonb := '[]'::jsonb;
  con_fila   uuid := gen_random_uuid();
  sin_fila   uuid := gen_random_uuid();
  salida     jsonb;
  ok         boolean;
  funcion    constant text := 'public.custom_access_token_hook(jsonb)';
begin
  begin
    insert into auth.users (id, email) values (con_fila, 'pi02-' || con_fila || '@prueba.local');
    insert into public.usuario (id, nombre, perfil) values (con_fila, 'Trabajador PI-02', 'trabajador');

    -- 1. Usuario con fila en usuario: el token sale con perfil y nombre.
    salida := public.custom_access_token_hook(jsonb_build_object(
      'user_id', con_fila,
      'claims', jsonb_build_object('sub', con_fila, 'role', 'authenticated')));
    r := r || jsonb_build_object('n',1,'v','Usuario con fila en usuario: el token incluye perfil y nombre',
           'ok', salida->'claims'->>'perfil' = 'trabajador' and salida->'claims'->>'nombre' = 'Trabajador PI-02'
                 and salida->'claims'->>'sub' = con_fila::text,
           'd', 'perfil: ' || coalesce(salida->'claims'->>'perfil','(ninguno)') || ' · nombre: ' || coalesce(salida->'claims'->>'nombre','(ninguno)'));

    -- 2. Usuario sin fila: el token sale sin perfil, aunque llegara uno en las declaraciones originales.
    salida := public.custom_access_token_hook(jsonb_build_object(
      'user_id', sin_fila,
      'claims', jsonb_build_object('sub', sin_fila, 'role', 'authenticated', 'perfil', 'propietario')));
    r := r || jsonb_build_object('n',2,'v','Usuario sin fila en usuario: el token sale sin perfil ni nombre',
           'ok', not (salida->'claims' ? 'perfil') and not (salida->'claims' ? 'nombre'),
           'd', 'declaraciones: ' || (salida->'claims')::text);

    -- 3. Privilegios de ejecución.
    ok := has_function_privilege('supabase_auth_admin', funcion, 'EXECUTE')
          and not has_function_privilege('authenticated', funcion, 'EXECUTE')
          and not has_function_privilege('anon', funcion, 'EXECUTE');
    r := r || jsonb_build_object('n',3,'v','Solo supabase_auth_admin puede ejecutar la función','ok', ok,
           'd', 'auth_admin: ' || has_function_privilege('supabase_auth_admin', funcion, 'EXECUTE')
                || ' · authenticated: ' || has_function_privilege('authenticated', funcion, 'EXECUTE')
                || ' · anon: ' || has_function_privilege('anon', funcion, 'EXECUTE'));

    -- 4. El servicio de autenticación puede leer usuario (privilegio y política).
    ok := has_table_privilege('supabase_auth_admin', 'public.usuario', 'SELECT')
          and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'usuario'
                        and 'supabase_auth_admin' = any (roles) and cmd = 'SELECT');
    r := r || jsonb_build_object('n',4,'v','supabase_auth_admin puede leer usuario (privilegio y política de RLS)','ok', ok,
           'd', case when ok then 'privilegio y política presentes' else 'falta el privilegio o la política' end);

    -- 5. La función no se ejecuta con privilegios de su dueño.
    select not p.prosecdef into ok from pg_proc p join pg_namespace s on s.oid = p.pronamespace
     where s.nspname = 'public' and p.proname = 'custom_access_token_hook';
    r := r || jsonb_build_object('n',5,'v','La función no es SECURITY DEFINER','ok', coalesce(ok, false),
           'd', case when ok then 'SECURITY INVOKER' else 'SECURITY DEFINER o inexistente' end);

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

select * from pg_temp.pi02();
