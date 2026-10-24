# 33 · Cuentas de usuario y recuperación de la contraseña

| | |
|---|---|
| **Componente** | Sesión (Tabla 20) · `src/sesion/recuperacion.ts` (nuevo) · `src/ui/pantallas/PantallaInicioSesion.tsx` · `src/ui/pantallas/PantallaRecuperarContrasena.tsx` (nueva) · `src/ui/pantallas/PantallaNuevaContrasena.tsx` (nueva) · `src/app/App.tsx` (ruta del enlace) |
| **Capa** | Sesión y presentación; configuración del servicio de autenticación |
| **Origen en el documento** | RF-24 · RD-03 · CU-01 (Tabla A1) · HU-06 · apartado 3.9.1 · Tabla 27. **Hallazgo del desarrollo:** ningún requerimiento pide recuperar la contraseña, pero sin esa opción el propietario puede quedar por fuera de la aplicación |
| **Depende de** | [06 · Autenticación](06-autenticacion.md) (sesión local sin red) · [07 · Código de desbloqueo](07-codigo-de-desbloqueo.md) (cuándo se vuelve a pedir la contraseña) |
| **Configuración** | Panel de Supabase: registro abierto desactivado, dirección del enlace, plantilla del correo en español y servicio de correo (sección 6). La hace el administrador |
| **Pruebas** | PU-35 · PE-39 |

---

## 1. El problema

En el teléfono donde ya ingresó, el usuario no necesita la contraseña: la aplicación pide solo el código de
desbloqueo (documento 07). Pero la contraseña vuelve a pedirse en tres situaciones:

- cuando toca **«Olvidé mi código»**;
- después de **5 intentos fallidos** del código;
- al cambiar de teléfono o cerrar la sesión.

Si en ese momento no la recuerda, hoy queda por fuera: la única salida es que el administrador la restablezca
desde el panel del servicio. Para el propietario, que es quien más usa la información económica y las
consultas, es un riesgo real durante la evaluación y después de ella.

## 2. Las cuentas (decisión A)

**No hay registro abierto.** El predio tiene tres cuentas: el propietario (perfil propietario) y dos
trabajadores (perfil trabajador). **El administrador del sistema** las crea, las actualiza o las elimina en el
servicio de autenticación y asigna el perfil en la tabla `usuario`.

Un registro abierto permitiría que cualquiera con la dirección de la aplicación creara una cuenta. Aunque sin
perfil no vería ningún dato (las reglas a nivel de fila exigen un perfil, apartado 3.9.3; el ingreso responde
«Esta cuenta no tiene un perfil asignado»), el acceso controlado que piden RF-24 y HU-06 exige que el perfil lo
asigne alguien de confianza. Por eso, además, el registro se desactiva en el servicio (sección 6).

Queda como pendiente para el documento de grado: precisar quién crea las cuentas y cómo.

## 3. «¿Olvidó su contraseña?» (decisión B)

En la tarjeta de inicio de sesión, debajo de **Ingresar**, un enlace **«¿Olvidó su contraseña?»** abre la
pantalla de recuperación, con el mismo diseño de las pantallas del código (candado, título, explicación y
paisaje).

| Elemento | Contenido |
|---|---|
| Título | **Recuperar la contraseña** |
| Explicación | «Escriba el correo con el que ingresa. Le enviaremos un enlace para crear una contraseña nueva.» |
| Campo | **Correo**, con el ícono del sobre; llega con el correo que se haya escrito en el inicio de sesión |
| Botón | **Enviar el enlace** (64 px) · **Volver al inicio de sesión** (secundario) |

| Situación | Lo que se muestra |
|---|---|
| **Sin conexión** (la misma detección de la barra de sincronización) | «Necesita conexión a internet para recuperar la contraseña. Busque un lugar con señal e intente de nuevo.» El botón queda desactivado: sin señal el correo no se envía |
| Correo vacío o sin forma de correo | «Escriba un correo válido.» |
| **Enviado** | «Le enviamos un correo con un enlace para crear una contraseña nueva. Revise su bandeja de entrada y también la carpeta de correo no deseado. Si en unos minutos no le llega, comuníquese con el administrador del sistema para que lo ayude.» |
| El servicio limita los envíos (demasiados intentos) | «Ya se enviaron varios correos en poco tiempo. Espere unos minutos o comuníquese con el administrador del sistema.» |
| Otra falla del servicio | «No fue posible enviar el correo. Intente de nuevo o comuníquese con el administrador del sistema.» |

**El mensaje de enviado es el mismo aunque el correo no tenga cuenta.** Así nadie puede usar la pantalla para
averiguar qué correos están registrados; el servicio ya responde igual en ambos casos.

La solicitud usa `resetPasswordForEmail` del servicio, con la dirección de la aplicación como destino del enlace
(`/restablecer-contrasena`).

## 4. La contraseña nueva (decisión C)

El enlace del correo abre la aplicación en **`/restablecer-contrasena`**. Si el teléfono la tiene instalada,
normalmente el enlace se abre en el **navegador**, no en la aplicación instalada; la pantalla funciona igual en
los dos.

| Elemento | Contenido |
|---|---|
| Título | **Cree su contraseña nueva** |
| Campos | **Contraseña nueva** y **Repita la contraseña**, con el botón del ojo para mostrarla (como en el inicio de sesión) |
| Regla | Al menos **6 caracteres**, el mínimo del servicio; las dos deben coincidir |
| Botón | **Guardar la contraseña** (64 px) |

| Situación | Lo que se muestra |
|---|---|
| Menos de 6 caracteres | «La contraseña debe tener al menos 6 caracteres.» |
| No coinciden | «Las dos contraseñas no coinciden.» |
| **Guardada** | «Contraseña actualizada. Ya puede ingresar con su contraseña nueva.» y el botón **Ir al inicio de sesión** |
| Enlace vencido, ya usado o incompleto | «El enlace venció o ya se usó. Pida uno nuevo desde «¿Olvidó su contraseña?».» con el botón **Pedir otro enlace** |
| Sin conexión | El mismo aviso de la sección 3; el botón queda desactivado |

### 4.1 Cómo se verifica el enlace sin tocar la sesión de la aplicación

Dos cuidados de diseño:

1. **Un cliente aparte, que no guarda nada.** La página usa un cliente del servicio exclusivo para la
   recuperación, sin persistencia (`persistSession: false`). Así no reemplaza la sesión que la aplicación
   conserva en el teléfono, que puede ser de otro usuario o tener registros pendientes por enviar (documentos 06
   y 12). Al terminar, ese cliente cierra su sesión temporal.
2. **El enlace lleva un código de un solo uso (`token_hash`), no una sesión.** La plantilla del correo arma el
   enlace como `{{ .RedirectTo }}?token_hash=…&type=recovery`, es decir, `…/restablecer-contrasena?token_hash=…&type=recovery`
   en la misma dirección desde la que se pidió. La página lo verifica con `verifyOtp`, y
   solo entonces cambia la contraseña con `updateUser`. Funciona aunque el correo se haya pedido desde otro
   teléfono o desde la aplicación instalada, y no depende de la configuración `detectSessionInUrl: false` del
   cliente principal, que sigue igual.

La ruta se atiende **antes** de la cerradura de la aplicación: con la sesión bloqueada, o sin sesión, la página
de la contraseña nueva se muestra igual. Después de guardar, **Ir al inicio de sesión** lleva a la pantalla
que corresponda: el ingreso, o el código si el teléfono ya tenía una sesión.

## 5. Procedimiento de respaldo (decisión E)

Si el correo no llega, por ejemplo por falta de señal, porque el servicio de correo lo retiene o porque el
usuario no tiene acceso a su correo, **el administrador del sistema restablece la contraseña desde el panel
del servicio** (Authentication → Users → el usuario → restablecer o fijar una contraseña nueva) y se la
comunica al usuario en persona. Va en el manual de usuario y en el documento.

## 6. Configuración del servicio (decisión D)

La hace el **administrador** en el panel de Supabase; ninguna de estas opciones va en el código, y las
credenciales nunca se escriben en el chat ni en el repositorio.

| Ajuste | Dónde | Valor |
|---|---|---|
| Registro abierto | Authentication → Sign In / Providers | **Desactivado** («Allow new users to sign up»). El administrador sigue pudiendo crear usuarios desde el panel |
| Dirección del sitio y del enlace | Authentication → URL Configuration | Site URL: la dirección principal de la aplicación. Redirect URLs: la principal y la de la rama de pruebas, terminadas en `/restablecer-contrasena` |
| Plantilla del correo | Authentication → Emails → Reset Password | Texto en español y el enlace con `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` (sección 4.1). `RedirectTo` es la dirección desde la que se pidió el enlace (la principal o la de la rama de pruebas), siempre que esté en las Redirect URLs |
| Largo mínimo | Authentication → Policies (o Sign In) | 6 caracteres, el que valida la aplicación. Si se sube, se ajusta la regla de la sección 4 |
| Servicio de correo | Authentication → Emails → SMTP | **A verificar.** El servicio de correo incluido en el plan gratuito permite muy pocos mensajes por hora y, según su documentación, solo entrega a las direcciones del equipo del proyecto. Si el panel lo confirma, hay que conectar un servicio de correo propio (SMTP), por ejemplo uno gratuito como Resend o una cuenta de Gmail con contraseña de aplicación, para que el correo le llegue al propietario |

Texto propuesto para el correo:

> **Asunto:** Ganadería JR · Recupere su contraseña
>
> Hola. Recibimos una solicitud para crear una contraseña nueva para su cuenta de la Ganadería JR.
> Toque el siguiente enlace para crearla: **Crear mi contraseña nueva**.
> Si usted no lo pidió, ignore este correo: su contraseña actual sigue funcionando.

## 7. Pruebas (decisión F)

### PU-35 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Validación del correo | Vacío o sin forma de correo se rechaza; con espacios alrededor se acepta recortado |
| 2 | Sin conexión | No se llama al servicio; se devuelve el aviso de conexión |
| 3 | Enviado | Se llama a `resetPasswordForEmail` con el correo recortado y la dirección `…/restablecer-contrasena`; el mensaje es el mismo exista o no la cuenta |
| 4 | Límite de envíos y otras fallas | El código de límite del servicio (429) da su mensaje; cualquier otra falla, el mensaje general |
| 5 | Lectura del enlace | `token_hash` y `type=recovery` presentes → se verifica; faltantes o de otro tipo → «El enlace venció o ya se usó» |
| 6 | Contraseña nueva | Menos de 6 caracteres y no coincidentes se rechazan; válida → `verifyOtp` y después `updateUser`, y se cierra la sesión temporal |
| 7 | Enlace vencido | `verifyOtp` con error → «El enlace venció o ya se usó» y no se llama a `updateUser` |
| 8 | La sesión de la aplicación | El cliente de recuperación no guarda sesión; la sesión local de la aplicación no cambia |

### PE-39 (manual)

Con la **cuenta de prueba** y su correo: en el teléfono, cerrar la sesión; en el inicio de sesión tocar
**«¿Olvidó su contraseña?»**; probar sin señal (aviso y botón desactivado); con señal, enviar el enlace y ver el
mensaje; abrir el correo, tocar el enlace, probar una contraseña corta y dos distintas, guardar una válida;
ingresar con la contraseña nueva; tocar de nuevo el enlace ya usado y ver «El enlace venció o ya se usó».
Comprobar en el panel que el registro abierto quedó desactivado.

## Referencias

- Documento de trabajo de grado: RF-24; RD-03; CU-01 (Tabla A1); HU-06 (Tabla B6); apartados 3.9.1 y 3.9.3;
  Tabla 27.
- Documentos técnicos 06, 07 y 12.
