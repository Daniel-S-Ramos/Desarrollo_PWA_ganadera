-- =============================================================================
-- Retira el permiso de ejecución de public.rls_auto_enable()
--
-- Hallazgo del revisor de seguridad de Supabase (supabase db advisors) tras
-- aplicar el esquema inicial: la función que crea la opción «Habilitar RLS
-- automático» del proyecto es SECURITY DEFINER y quedó ejecutable por anon y
-- authenticated a través de /rest/v1/rpc/rls_auto_enable.
--
-- La función la invoca el sistema como disparador de eventos al crear tablas,
-- lo que no requiere el privilegio EXECUTE de los roles de la aplicación. Sin
-- ese privilegio sigue cumpliendo su función y deja de estar expuesta en la API.
-- Ver docs/pruebas/iteracion-1.md, PI-01.
-- =============================================================================

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
