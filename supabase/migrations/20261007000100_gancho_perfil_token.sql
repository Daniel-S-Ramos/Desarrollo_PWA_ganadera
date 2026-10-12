-- =============================================================================
-- Gancho de token de acceso: perfil y nombre del usuario dentro del token
-- Especificación: docs/tecnica/06-autenticacion.md, sección 4
--
-- El servicio de autenticación llama a esta función cada vez que emite un token
-- y firma el resultado con su clave privada (ES256). Así el perfil que el
-- teléfono lee sin conexión es un dato firmado por el servidor (3.9.1).
--
-- Activación: una vez, en el panel de Supabase, Authentication → Hooks →
-- Customize Access Token (JWT) Claims → public.custom_access_token_hook.
-- =============================================================================

create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims  jsonb := event -> 'claims';
  fila    record;
begin
  select u.perfil, u.nombre into fila
    from public.usuario u
   where u.id = (event ->> 'user_id')::uuid;

  if found then
    claims := claims || jsonb_build_object('perfil', fila.perfil, 'nombre', fila.nombre);
  else
    -- Una cuenta sin fila en usuario no tiene perfil asignado: el token sale sin
    -- perfil y el teléfono rechaza el ingreso (sección 4.1).
    claims := claims - 'perfil' - 'nombre';
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Agrega perfil y nombre al token de acceso (docs/tecnica/06-autenticacion.md, sección 4).';

-- Solo la ejecuta el servicio de autenticación. Ningún rol de la aplicación puede invocarla.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;

-- El servicio de autenticación necesita leer usuario. La tabla tiene RLS activada y ese
-- rol no la omite, de modo que además del privilegio requiere una política.
grant select on table public.usuario to supabase_auth_admin;

create policy "El servicio de autenticación lee los perfiles"
  on public.usuario
  as permissive
  for select
  to supabase_auth_admin
  using (true);
