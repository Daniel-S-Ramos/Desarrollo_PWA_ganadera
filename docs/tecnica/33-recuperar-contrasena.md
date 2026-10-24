# 33 · Cuentas de usuario y ayuda para recuperar la contraseña

| | |
|---|---|
| **Componente** | Sesión (Tabla 20) · `src/sesion/administrador.ts` (nuevo) · `src/ui/pantallas/PantallaInicioSesion.tsx` · `src/ui/pantallas/PantallaAyudaContrasena.tsx` (nueva) |
| **Capa** | Sesión y presentación; configuración del servicio de autenticación y de la aplicación |
| **Origen en el documento** | RF-24 · RF-27 · CU-01 (Tabla A1) · HU-06 · HU-15 · apartado 3.9.1 · Tabla 27. **Hallazgo del desarrollo**, validado con el propietario (sección 7) |
| **Depende de** | [06 · Autenticación](06-autenticacion.md) (sesión local sin red) · [07 · Código de desbloqueo](07-codigo-de-desbloqueo.md) (cuándo se vuelve a pedir la contraseña) |
| **Configuración** | Panel de Supabase: registro abierto desactivado. Aplicación: nombre y teléfono del administrador (`VITE_ADMIN_NOMBRE`, `VITE_ADMIN_TELEFONO`) |
| **Pruebas** | PU-35 · PE-39 |

---

## 1. El problema

En el teléfono donde ya ingresó, el usuario no necesita la contraseña: la aplicación pide solo el código de
desbloqueo (documento 07). Pero la contraseña vuelve a pedirse en tres situaciones:

- cuando toca **«Olvidé mi código»**;
- después de **5 intentos fallidos** del código;
- al cambiar de teléfono o cerrar la sesión.

Si en ese momento no la recuerda, hoy queda por fuera sin saber qué hacer: la pantalla de ingreso no ofrece
ninguna salida.

## 2. Las cuentas (decisión A)

**No hay registro abierto.** El predio tiene tres cuentas: el propietario (perfil propietario) y dos
trabajadores (perfil trabajador). **El administrador del sistema** las crea, las actualiza o las desactiva en el
servicio de autenticación y asigna el perfil en la tabla `usuario`. El registro también está desactivado en el
servicio («Allow new users to sign up»), de modo que nadie puede crear una cuenta con la llave pública.

**Una cuenta por persona, aunque el correo sea de la finca.** La autoría de cada registro (RF-27, HU-15, la
corrección del mismo día de 3.9.5) exige saber quién lo hizo, y la aplicación muestra el nombre **actual** de
la cuenta: una cuenta heredada por un trabajador nuevo atribuiría a este los registros del anterior. Si la finca
prefiere un solo correo para los trabajadores, se usan los alias de Gmail (`correofinca+nombre@gmail.com` llega a
la misma bandeja y es una cuenta distinta para el servicio). Cuando un trabajador se va, su cuenta se
**desactiva, no se borra**, para que sus registros sigan con su nombre.

## 3. «¿Olvidó su contraseña?» (decisión B)

En la tarjeta de inicio de sesión, debajo de **Ingresar**, el enlace **«¿Olvidó su contraseña?»** abre una
pantalla de ayuda, con el diseño de las pantallas del código (candado, título, explicación y paisaje):

| Elemento | Contenido |
|---|---|
| Título | **¿Olvidó su contraseña?** |
| Explicación | «Comuníquese con el administrador del sistema. Él le asigna una contraseña nueva en pocos minutos y usted vuelve a ingresar aquí.» |
| Contacto | «Administrador: **Daniel**» y el teléfono, con los botones **Llamar a Daniel** y **Escribir por WhatsApp** (64 px) |
| Botón | **Volver al inicio de sesión** (secundario) |

- **Funciona sin señal**: no envía nada. El botón de llamar abre el marcador del teléfono (`tel:`), que no
  necesita datos; el de WhatsApp abre la conversación (`https://wa.me/…`) y sí los necesita.
- **El nombre y el teléfono no van en el código:** se leen de la configuración de la aplicación
  (`VITE_ADMIN_NOMBRE` y `VITE_ADMIN_TELEFONO`, en `.env.local` y en las variables de Vercel). Si cambia el
  administrador, se cambia la configuración y se publica de nuevo.
- **Con solo el nombre** (sin teléfono), la tarjeta muestra «Administrador del sistema · Daniel Ramos», sin botones: el
  propietario ya tiene el número (decisión del autor, 2026-10-24). **Sin configuración**, solo el mensaje general.
- El teléfono se escribe con o sin el indicativo de Colombia: un celular de 10 dígitos que empieza por 3 se
  completa con el 57 para los enlaces, y se muestra como «300 123 4567».

## 4. Procedimiento del administrador (decisión E)

Es el camino principal. El administrador entra al panel del servicio (Authentication → Users → el usuario),
fija una contraseña nueva y se la comunica al usuario **en persona o por llamada**, nunca por un mensaje que
quede guardado. El usuario ingresa con ella en la aplicación. Va en el manual de usuario.

## 5. Configuración (decisión D)

| Ajuste | Dónde | Valor |
|---|---|---|
| Registro abierto | Supabase: Authentication → Sign In / Providers | **Desactivado** (hecho el 2026-10-24) |
| Nombre del administrador | `.env.local` y variables de Vercel (tipo Config) | `VITE_ADMIN_NOMBRE=Daniel Ramos` |
| Teléfono del administrador | `.env.local` y variables de Vercel (tipo Config) | Opcional; hoy no se configura porque el propietario ya tiene el número |

## 6. Pruebas (decisión F)

### PU-35 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Teléfono | Con o sin 57, con espacios, guiones o «+»: el enlace `tel:+57…`, el de WhatsApp `https://wa.me/57…` y la forma «300 123 4567» |
| 2 | Teléfono inválido o vacío | Sin teléfono: no hay botones |
| 3 | Nombre | El que se configure, recortado; con solo el nombre, sin botones; sin nombre, ninguno |
| 4 | Sin configuración | Solo el mensaje general |

### PE-39 (manual)

En el teléfono, cerrar la sesión; en el inicio de sesión tocar **«¿Olvidó su contraseña?»**; ver el mensaje, el
nombre y el teléfono; tocar **Llamar a Daniel** (abre el marcador) y **Escribir por WhatsApp**; probar la
pantalla sin señal; volver al inicio de sesión. Como administrador, fijar una contraseña nueva desde el panel a
la cuenta de prueba e ingresar con ella. Comprobar en el panel que el registro abierto está desactivado.

## 7. Hallazgo: de la recuperación por correo a la ayuda del administrador

El diseño aprobado primero (2026-10-24) recuperaba la contraseña **por correo**: un enlace de un solo uso y una
pantalla para crear la contraseña nueva, con un cliente aparte que no tocaba la sesión del teléfono. Se
programó y se probó. Al revisarlo con el propietario se encontró que el correo de la finca **no lo maneja él
sino su esposa**, que él no lo revisa y que no conoce su contraseña. El enlace le llegaría a otra persona, que
tendría que abrirlo y crear la contraseña por él: más difícil que llamar al administrador, para alguien con poca
experiencia con la tecnología. Además, el servicio de correo incluido en el plan gratuito solo entrega a las
direcciones del equipo del proyecto y no permite editar las plantillas sin un servicio de correo propio.

Se decidió reemplazarlo por la **ayuda del administrador** (secciones 3 y 4) y retirar el código del correo,
para no dejar funciones sin uso. Es un ejemplo de diseño ajustado al contexto real del usuario, para el
capítulo 4.

## Referencias

- Documento de trabajo de grado: RF-24; RF-27; CU-01 (Tabla A1); HU-06 (Tabla B6); HU-15; apartados 3.9.1,
  3.9.3 y 3.9.5; Tabla 27.
- Documentos técnicos 06 y 07.
