# supabase/migrations

Migraciones del servicio remoto, en orden de aplicación. Especificación:
[docs/tecnica/05-esquema-remoto.md](../../docs/tecnica/05-esquema-remoto.md).

| Archivo | Contenido |
|---|---|
| `20261006000100_esquema_inicial.sql` | 14 tablas, restricciones de la Tabla 24, disparador de `recibido_en`, privilegios (solo `SELECT` e `INSERT`) y RLS activada |
| `20261006000200_parametros_iniciales.sql` | Valores de la Tabla 30 |
| `20261006000300_revocar_rls_auto_enable.sql` | Retira el permiso de ejecución de la función `rls_auto_enable` que el revisor de seguridad encontró expuesta |
| `20261007000100_gancho_perfil_token.sql` | Función que agrega el perfil y el nombre al token de acceso, con sus privilegios y la política de lectura de `usuario` para el servicio de autenticación |
| `20261007000200_politicas_rls.sql` | Políticas de lectura y escritura por perfil (Tabla 27), regla de corrección del trabajador y parámetro de días máximos de corrección sin conexión |
| `20261012000100_formato_chapeta.sql` | La chapeta debe llegar normalizada: de 1 a 20 letras mayúsculas, dígitos o guiones (documento técnico 13, sección 8) |
| `20261012000200_chapeta_del_predio_y_madre_externa.sql` | Reemplaza el formato por la numeración del predio (1 a 9999, luego letra sin O y 1 a 999) y agrega la madre externa |
| `20261012000300_almacen_fotografias.sql` | Bucket privado `fotografias` (solo WebP, hasta 1 MB) con políticas de subir y leer; nadie reemplaza ni borra (documento técnico 14, sección 7) |
| `20261013000100_nombre_medicamento_normalizado.sql` | Nombre de medicamento único sin mayúsculas, tildes ni espacios repetidos: función `normalizar_nombre` e índice nuevo (documento técnico 18, sección 3) |
| `20261018000100_chapeta_puesta.sql` | Chapeta pendiente de poner: `animal.chapeta_puesta`, tabla `colocacion_chapeta` (una por animal, solo inserciones) y parámetro `dias_recordar_chapeta` de 90 días (documento técnico 25, sección 7.1) |
| `20261020000100_salida_observacion.sql` | Observación opcional de la salida por pérdida o robo (CU-13, 3b; documento técnico 29, sección 4) |
| `20261021000100_salida_vigente_unica.sql` | Una sola salida **vigente** por animal: la restricción única pasa a un disparador que no cuenta las salidas anuladas (documento técnico 29, sección 8) |
| `20261021000200_compra_vigente_unica.sql` | Una sola compra **vigente** por animal: el índice único parcial pasa a un disparador que no cuenta las compras anuladas (documento técnico 31, sección 4) |
| `20261022000100_ordeno_vigente_unico.sql` | Un solo ordeño **vigente** por vaca y día: la restricción única pasa a un disparador que no cuenta los ordeños anulados (documento técnico 32, sección 3) |

Se aplican con `npm run db:push` (CLI de Supabase), que registra en el servicio cuáles ya se
aplicaron. Una migración aplicada no se edita: los cambios van en un archivo nuevo.
