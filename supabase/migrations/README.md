# supabase/migrations

Migraciones del servicio remoto, en orden de aplicación. Especificación:
[docs/tecnica/05-esquema-remoto.md](../../docs/tecnica/05-esquema-remoto.md).

| Archivo | Contenido |
|---|---|
| `20261006000100_esquema_inicial.sql` | 14 tablas, restricciones de la Tabla 24, disparador de `recibido_en`, privilegios (solo `SELECT` e `INSERT`) y RLS activada |
| `20261006000200_parametros_iniciales.sql` | Valores de la Tabla 30 |
| `20261006000300_revocar_rls_auto_enable.sql` | Retira el permiso de ejecución de la función `rls_auto_enable` que el revisor de seguridad encontró expuesta |
| `20261007000100_gancho_perfil_token.sql` | Función que agrega el perfil y el nombre al token de acceso, con sus privilegios y la política de lectura de `usuario` para el servicio de autenticación |

Se aplican con `npm run db:push` (CLI de Supabase), que registra en el servicio cuáles ya se
aplicaron. Una migración aplicada no se edita: los cambios van en un archivo nuevo.
