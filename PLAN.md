# Plan de desarrollo — PWA Ganadería JR

Plan de trabajo del tercer objetivo específico. Sigue la planificación por iteraciones del
apartado 2.8.7 (Tabla 13) del documento de trabajo de grado.

**Forma de trabajo en cada paso**

1. Se explica qué se va a hacer y por qué, con referencia al documento. Los componentes con lógica propia se documentan en `docs/tecnica/` antes de implementarse.
2. Daniel aprueba o ajusta.
3. Se implementa.
4. Daniel lo verifica en su equipo (comando, navegador o teléfono).
5. Se documentan las pruebas del paso en `docs/pruebas/` con su evidencia.
6. Se registra el avance con un commit y se anotan los insumos para el capítulo 4.

Estado: ⬜ pendiente · 🔄 en curso · ✅ terminado

---

## Fase 0 — Preparación del entorno (apartado 1.6.3.2)

| Paso | Contenido | Estado |
|---|---|---|
| 0.1 | Herramientas del equipo: Node.js, npm, Git, VS Code y sus extensiones | ✅ |
| 0.2 | Proyecto base: `package.json`, versiones fijadas de la Tabla 19, TypeScript, Vite | ✅ |
| 0.3 | Estructura de carpetas según los componentes de la Tabla 20 | ✅ |
| 0.4 | Repositorio Git local y repositorio privado en GitHub; primer commit | ✅ |
| 0.5 | Conexión con Supabase: archivo `.env.local` y cliente `supabase-js` | ✅ |
| 0.6 | Pantalla mínima y primer arranque con `npm run dev` | ✅ |
| 0.7 | Configuración PWA: manifiesto, íconos, Service Worker; instalación en el teléfono | ✅ |
| 0.8 | Entorno de pruebas con Vitest y una primera prueba | ✅ |

## Iteración 1 — Fundación técnica (HU-08, HU-06, HU-07 · 16 puntos) · cerrada el 2026-10-12 · `v0.1`

| Paso | Contenido | Referencia | Estado |
|---|---|---|---|
| 1.1 | Tipos del dominio (entidades y valores admitidos) | Tablas 23 y 24 | ✅ |
| 1.2 | Identificador UUID v7 generado en el dispositivo | 3.7.1 | ✅ |
| 1.3 | Esquema local con Dexie | 3.8.4, Tabla 25 | ✅ |
| 1.4 | Repositorio local y cola de operaciones en una sola transacción | 3.7.2 | ✅ |
| 1.5 | Solicitud de almacenamiento persistente | RNF-15, 3.8.7 | ✅ |
| 1.6 | Esquema remoto en Supabase: tablas, permisos e inmutabilidad de autoría | 3.8.3, 3.9.4 | ✅ |
| 1.7 | Autenticación: ingreso, perfil en el token, verificación sin red | 3.9.1 | ✅ |
| 1.8 | Código de desbloqueo local | 3.9.1 | ✅ |
| 1.9 | Gestor de sesión y permisos, y reglas a nivel de fila | 3.9.2, 3.9.3, Tabla 27 | ✅ |
| 1.10 | Motor de sincronización: subida, bajada, marca de avance, idempotencia | 3.7.3 – 3.7.8 | ✅ |
| 1.11 | Indicador de sincronización (contador y marca por registro) | 3.7.4, 3.10.4.5 | ✅ |
| 1.12 | Cierre de sesión con cola vacía | 3.9.1 | ✅ |
| 1.13 | Pruebas y verificación de criterios de aceptación de la iteración | 1.6.3.9 | ✅ |

## Calendario de la Fase 3

El apartado 2.8.7 fija el calendario al disponer de la velocidad medida en la primera iteración:
**16 puntos en 7 días** (6 al 12 de octubre de 2026). Con iteraciones de entre 13 y 16 puntos, se
estima una semana por iteración. Es una estimación: la Iteración 1 incluyó preparación que no se
repite, y las siguientes tienen más pantallas. Se recalibra al cierre de cada iteración.

| Iteración | Puntos | Inicio | Cierre estimado | Cierre real | Velocidad |
|---|---|---|---|---|---|
| 1 · Fundación técnica | 16 | 2026-10-06 | — | 2026-10-12 | 16 puntos / 7 días |
| 2 · Identificación y ficha | 15 | 2026-10-13 | 2026-10-19 | | |
| 3 · Sanidad, leche y destino | 16 | 2026-10-20 | 2026-10-26 | | |
| 4 · Peso, partos y correcciones | 13 | 2026-10-27 | 2026-11-02 | | |
| 5 · Consultas, alertas y economía | 16 | 2026-11-03 | 2026-11-09 | | |
| Cierre · Evaluación del prototipo | — | 2026-11-10 | 2026-11-23 | | |

## Iteración 2 — Identificación animal y ficha (HU-01, HU-02, HU-15 · 15 puntos)

**Criterios de cierre heredados de la Iteración 1:** verificar en pantalla HU-06.1 (el trabajador
crea y consulta), HU-06.4 (opciones ocultas según el perfil), HU-07.1 (registro y consulta sin
conexión) y la marca por registro de HU-07.3; y ejecutar a mano los casos pendientes de PE-14
(reingreso de otro usuario con pendientes) y PE-16 (cierre de sesión con pendientes).

| Paso | Contenido | Estado |
|---|---|---|
| 2.1 | Registrar animal (CU-02) con validación de chapeta única | ✅ |
| 2.2 | Fotografías: captura, compresión y cola de imágenes | ✅ |
| 2.2b | Publicación con HTTPS para probar la cámara en el teléfono (adelantado del paso 6.5) | ✅ |
| 2.3 | Listado de animales y búsqueda por chapeta (CU-03) | ✅ |
| 2.4 | Ficha del animal con autoría visible (HU-15) | ✅ |
| 2.5 | Carga inicial de un dispositivo nuevo (3.7.6) | ⬜ |
| 2.6 | Pruebas y cierre de iteración | ⬜ |

## Iteración 3 — Sanidad, leche y destino (HU-03, HU-04, HU-09, HU-13 · 16 puntos)

| Paso | Contenido | Estado |
|---|---|---|
| 3.1 | Catálogo de medicamentos y tabla de parámetros | ⬜ |
| 3.2 | Destino productivo y su historial (CU-12) | ⬜ |
| 3.3 | Registro sanitario e historial (CU-04, CU-05) | ⬜ |
| 3.4 | Advertencia por repetición de medicamento (RF-09) | ⬜ |
| 3.5 | Ronda de ordeño con regla de un registro por vaca y fecha (CU-06) | ⬜ |
| 3.6 | Consulta de producción diaria, semanal y mensual | ⬜ |
| 3.7 | Pruebas y cierre de iteración | ⬜ |

## Iteración 4 — Peso, partos y correcciones (HU-05, HU-12, HU-17 · 13 puntos)

| Paso | Contenido | Estado |
|---|---|---|
| 4.1 | Registro de pesaje y evolución con ganancia diaria (CU-08, CU-09) | ⬜ |
| 4.2 | Registro de parto con resultado, cría y genealogía (CU-10, CU-11) | ⬜ |
| 4.3 | Corrección y anulación con valor vigente (CU-17) | ⬜ |
| 4.4 | Consulta de correcciones (CU-18) | ⬜ |
| 4.5 | Pruebas y cierre de iteración | ⬜ |

## Iteración 5 — Consultas, alertas y economía (HU-10, HU-11, HU-14, HU-16 · 16 puntos)

| Paso | Contenido | Estado |
|---|---|---|
| 5.1 | Comparación de producción entre vacas (CU-07) | ⬜ |
| 5.2 | Registro de salida y venta (CU-13) | ⬜ |
| 5.3 | Recordatorios derivados y posponer (CU-15) | ⬜ |
| 5.4 | Consolidado económico por animal (CU-14) | ⬜ |
| 5.5 | Pruebas y cierre de iteración | ⬜ |

## Cierre — Evaluación del prototipo (apartados 1.6.3.7 – 1.6.3.11)

| Paso | Contenido | Estado |
|---|---|---|
| 6.1 | Conjunto de datos simulados con el volumen de la Ganadería JR | ⬜ |
| 6.2 | Documento de casos de prueba | ⬜ |
| 6.3 | Pruebas funcionales de flujos completos | ⬜ |
| 6.4 | Verificación en conectividad limitada | ⬜ |
| 6.5 | Despliegue del prototipo en un alojamiento con HTTPS (adelantado al paso 2.2b; aquí queda la versión final) | ⬜ |
| 6.6 | Matriz de trazabilidad entre requerimientos y pruebas | ⬜ |
| 6.7 | Insumos para el capítulo 4 del documento | ⬜ |

---

## Decisiones tomadas durante el desarrollo

Registro para justificarlas en el capítulo 4.

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-03 | Proyecto en `C:\Users\dsram\Desarrollo_PWA_ganadera`, fuera de OneDrive | OneDrive bloquea archivos de `node_modules` y no permite excluirlos de la sincronización |
| 2026-10-03 | Lenguaje TypeScript | Los valores admitidos del modelo de datos se verifican al compilar |
| 2026-10-03 | Versiones fijadas exactamente como en la Tabla 19 | Reproducibilidad y coherencia con el documento |
| 2026-10-03 | react-router 7.18.4 en lugar de la 8 | La versión 8 exige Node 22.22 y el equipo tiene Node 22.14 |
| 2026-10-03 | Registro abierto de usuarios desactivado en Supabase | Los tres usuarios del predio los crea el propietario (3.9.1); con el registro abierto cualquiera con la clave publicable podría crear una cuenta |
| 2026-10-03 | Archivo `.gitattributes` con fin de línea LF | Evita diferencias de formato entre Windows y otros sistemas |
| 2026-10-05 | Logo: iniciales JR en dorado, sin fondo; fondo claro solo en los íconos maskable y de Apple | Decisión del propietario del proyecto; Android e iOS rellenan de negro lo transparente en esas dos variantes |
| 2026-10-05 | Nombre corto de la aplicación «JR» | «Ganadería JR» se corta bajo el ícono en algunos teléfonos |
| 2026-10-05 | @vite-pwa/assets-generator 1.0.4 en lugar de la 2.0.0 | vite-plugin-pwa 1.3.0 (Tabla 19) solo es compatible con la serie 1.x |
| 2026-10-05 | Actualización de la aplicación con aviso al usuario (registerType: prompt) | Evita que la aplicación se recargue en medio de un registro |
| 2026-10-05 | Fondo rojizo #FBECEA y texto secundario #49584E | La prueba PU-01 detectó contrastes de 6,60:1 y 6,85:1, por debajo del 7:1 que adopta el apartado 3.10.4.1 |
| 2026-10-05 | Informe automático de pruebas en `docs/pruebas/resultados/` | Evidencia versionada de cada ejecución, vinculada al commit evaluado |
| 2026-10-06 | Unidades de dosis `ml, cc, mg, dosis`; tipos de evento sanitario `vacuna, purga, vitamina, tratamiento, otro` | Validados con el propietario del proyecto; el documento no los enumera |
| 2026-10-06 | El informe de pruebas incluye la verificación de tipos | Las afirmaciones `expectTypeOf` solo las evalúa el compilador |
| 2026-10-06 | Sin índices únicos en el esquema local; la unicidad la impone el servicio remoto | Un índice único local cancelaría los lotes de descarga con un conflicto de chapeta y el dispositivo no volvería a sincronizar (3.7.3, 3.7.7) |
| 2026-10-06 | Lectura mediante tablas de solo lectura y prueba de arquitectura que impide importar `db.ts` fuera de `src/datos/` | Garantiza que toda escritura pase por el repositorio y entre a la cola (Tabla 20, 3.7.2) |
| 2026-10-06 | El estado del animal (activo o retirado) no se almacena: se deduce de la existencia de una salida vigente | Evita modificar registros (RNF-06), no exige permiso de modificación en el servidor (3.7.8) y la anulación de una salida restituye el estado sin intervención (documento técnico 02, sección 6.1) |
| 2026-10-06 | El almacenamiento persistente se solicita en cada inicio mientras no esté concedido, no solo en el primero | Chrome decide según el uso y puede conceder tras la instalación un permiso que negó antes; la solicitud no muestra nada al usuario (documento técnico 04, sección 4.1) |
| 2026-10-06 | El aviso de almacenamiento tiene dos variantes según la aplicación esté instalada o no | En PE-12 Chrome para Windows negó la persistencia aun con la aplicación instalada; pedir instalarla a quien ya lo hizo confunde al usuario |
| 2026-10-06 | El servicio remoto solo admite inserciones y consultas en las tablas del predio | Lleva al extremo la inmutabilidad (3.7.3, RNF-06) y el argumento del 3.7.8: sin privilegio de modificación, ninguna política futura puede habilitarlo por error |
| 2026-10-06 | La ruta de la fotografía se deduce y no se almacena | Evita actualizar la fila de la fotografía tras subir la imagen |
| 2026-10-06 | «No corregir un registro anulado» se verifica en el dispositivo; el servicio acepta ambas filas | Compatibiliza la Tabla 24 con la Tabla 21 cuando la anulación llega primero (documento técnico 05, sección 5.3) |
| 2026-10-06 | Esquema remoto aplicado con la CLI de Supabase mediante migraciones versionadas | Reproducible y con registro de las migraciones aplicadas |
| 2026-10-06 | Se retira el privilegio de ejecución de `public.rls_auto_enable()` | El revisor de seguridad de Supabase la encontró ejecutable por anon y authenticated; la crea la opción «Habilitar RLS automático» del proyecto |
| 2026-10-07 | Biblioteca `jose` 6.2.12 para verificar la firma del token | Biblioteca de referencia para los estándares JOSE (JWT), auditada y sin dependencias; reduce el riesgo frente a una verificación escrita a mano |
| 2026-10-07 | Sesión local propia, separada de la sesión de supabase-js | Si el token de refresco deja de ser válido la biblioteca borra su sesión; el 3.9.1 exige no borrar nada y seguir operando sin red |
| 2026-10-07 | El nombre del usuario viaja en el token junto con el perfil | Permite mostrarlo desde el primer ingreso, antes de que las reglas del paso 1.9 permitan consultar la tabla `usuario` |
| 2026-10-07 | Los datos personales de los usuarios (nombres y correos) se cargan desde el panel de Supabase y no se versionan | Privacidad: no quedan en el repositorio ni en la documentación |
| 2026-10-07 | La regla de arquitectura de PU-05 excluye los archivos de prueba | Las pruebas necesitan manipular la base de datos para simular fallas y ataques |
| 2026-10-07 | Código de desbloqueo derivado con PBKDF2-SHA-256, sal aleatoria y 600.000 iteraciones; se rechazan códigos triviales | Valor recomendado por OWASP; el código nunca se guarda en claro (3.9.1) |
| 2026-10-07 | Tras un bloqueo, con pendientes solo el mismo usuario puede reingresar, y el aviso nombra al usuario y la cantidad de pendientes | Evita que los registros de otro autor queden atascados en la cola; el aviso explica el motivo (decisión del propietario del proyecto) |
| 2026-10-07 | Tras cada ingreso con credenciales se define un código nuevo | El código pertenece a la sesión que lo definió |
| 2026-10-07 | Permisos en dos niveles: la Tabla 27 se aplica a las funciones en el teléfono; en el servicio el trabajador lee todos los datos salvo los económicos | El teléfono del trabajador necesita producción, partos, destinos, salidas y correcciones para operar sin conexión (documento técnico 08, sección 2) |
| 2026-10-07 | «Mismo día» de una corrección del trabajador: misma fecha del predio según el teléfono y llegada al servicio a más tardar 7 días después | Admite correcciones hechas sin conexión y cierra la puerta al reloj atrasado (documento técnico 08, sección 4.1) |
| 2026-10-07 | Las políticas leen el perfil de la tabla `usuario`, no del token | Un cambio de perfil se aplica de inmediato |
| 2026-10-07 | La lectura de `usuario` se abre a cualquier usuario autenticado | Condicionarla al perfil provocaría una recursión infinita en la política; el registro abierto está deshabilitado |
| 2026-10-07 | Contraseñas de al menos 10 caracteres con minúsculas, mayúsculas y dígitos; sin protección contra contraseñas filtradas | Esa protección solo existe en los planes de pago de Supabase (advertencia del revisor de seguridad); los requisitos más estrictos la mitigan |
| 2026-10-08 | Rechazos definitivos del servicio: salen de la cola y quedan en conflicto con la causa | Evita que un registro bloquee la subida para siempre y que se pierda en silencio (documento técnico 09, sección 4) |
| 2026-10-08 | Ordeño duplicado que choca con un permiso: la corrección queda en conflicto conservando el valor, y decide el propietario | Respeta a la vez el 3.8.6 y la regla de corrección del trabajador |
| 2026-10-08 | Ventana de solapamiento de 2 minutos al inicio de cada descarga, y paginación por cursor (recibido_en, id) | Evita saltarse filas cuya transacción terminó después de leer la marca, sin entrar en un ciclo sin fin (documento técnico 10, sección 3) |
| 2026-10-08 | Cuenta de prueba «Usuario de pruebas» (trabajador) para la prueba de extremo a extremo, con limpieza automática | Las pantallas de registro llegan en la Iteración 2; se eliminará al cerrar la evaluación |
| 2026-10-08 | Sincronización también tras guardar y cada 5 minutos, además de al abrir y al volver la señal | Reduce el tiempo que la información pasa solo en el teléfono |
| 2026-10-12 | Ambos perfiles pueden descartar pendientes al cerrar sesión, con doble confirmación | Lo establece el 3.9.1; restringirlo al propietario podría dejar a un trabajador sin poder entregar el teléfono |
| 2026-10-12 | Al descartar se borran también los registros pendientes, no solo la cola | Evita registros marcados como pendientes que nada podría enviar |
| 2026-10-12 | Se retira la tarjeta de diagnóstico «Conexión con Supabase» | Solo consultaba al abrir y podía quedar desactualizada (PE-15); la barra inferior informa la conexión en tiempo real |
| 2026-10-12 | La Iteración 1 se cierra con 8 criterios verificados de extremo a extremo y 4 a nivel técnico; la verificación en pantalla de estos últimos pasa a la Iteración 2 | Las pantallas de registro y consulta no forman parte de la fundación técnica (Tabla 13) |
| 2026-10-12 | Calendario de la Fase 3: una semana por iteración | Velocidad medida en la Iteración 1: 16 puntos en 7 días (2.8.7) |
| 2026-10-12 | La chapeta se normaliza (sin espacios, en mayúsculas, con los ceros a la izquierda) y se guarda normalizada | La unicidad del servidor compara texto exacto; `045 ` y `045` no pueden ser dos animales (documento técnico 13, sección 2.1). **Revisada el mismo día, ver abajo** |
| 2026-10-12 | Numeración del predio, definida por el propietario: 1 a 9999 y después letra + 1 a 999 (A1 … A999, B1 …), sin la letra O. Los ceros a la izquierda se eliminan (`01` = `1`) | Con esa numeración los ceros no significan nada; `01` y `1` habrían sido dos animales (hallazgo de PE-17) |
| 2026-10-12 | La madre también puede ser externa al predio (`madre_externa`), con la misma regla que el padre | Pedido del propietario: un animal comprado puede tener una madre conocida que nunca fue del predio |
| 2026-10-12 | Las pruebas que escriben en el servicio usan las chapetas Z900 a Z999 | No ocupan números que el predio usará; se borran antes de la evaluación |
| 2026-10-12 | Vista principal de la fotografía: costado izquierdo, si falta el derecho y por último el frente | Indicación del propietario; es la que reconoce en campo (3.8.10) |
| 2026-10-12 | Se suben al servicio la versión completa y la reducida de cada fotografía | Un teléfono nuevo descarga ~2,5 MB de reducidas en lugar de ~15 MB de completas (3.7.6) |
| 2026-10-12 | La publicación con HTTPS se adelanta al paso 2.2b | La cámara del teléfono exige un contexto seguro; es el primer componente que necesita el teléfono real |
| 2026-10-12 | Alojamiento en Vercel (plan Hobby), con una dirección por rama | Se conecta con GitHub y publica cada rama por separado; la aplicación son archivos estáticos (~660 KB) y los datos van directo a Supabase. El plan Hobby es no comercial: si la ganadería la adopta después de la evaluación, plan pago o Cloudflare Pages (README, «Publicación») |
| 2026-10-12 | Los dispositivos del predio son Android; iPhone queda fuera del alcance de la evaluación | El propietario y los trabajadores usan Android. Las fotos dependen de que el navegador genere WebP, que Chrome para Android sí hace (PE-18) |
| 2026-10-13 | El peso inicial se nombra según el origen: «peso de compra» (comprado) o «peso al nacer» (nacido en el predio), en la ficha y en el formulario | A pedido del autor: «peso inicial» no le dice al propietario qué peso es; el campo sigue siendo uno solo (documento técnico 16, sección 3.1) |
| 2026-10-13 | La ficha se construye con su lógica completa (último peso, vacuna, leche, destino) aunque esos registros lleguen en las Iteraciones 3 y 4 | Cuando se guarden, la ficha los mostrará sin cambios; mientras tanto dice que no hay datos (CU-03, 4a) |
| 2026-10-12 | El origen se pregunta como «nacido en el predio» o «comprado», con edad aproximada para los comprados; no se almacena, se deduce de la fecha de ingreso | El propietario conoce de manera aproximada la edad de un animal comprado (3.8.10) |
| 2026-10-12 | La genealogía se captura al registrar el animal, opcional | La ficha no se modifica; en la carga inicial se perdería la madre de los nacidos en el predio |
| 2026-10-12 | El destino productivo inicial se agrega al formulario de registro en el paso 3.2 | Es exclusivo del propietario (CU-12) y su historial se construye en la Iteración 3 |

## Pendientes de diseño

Decisiones que el documento no resuelve y que deben acordarse antes del paso indicado.

| Paso | Pendiente | Origen |
|---|---|---|
| ~~6.4~~ | ~~Verificar en un teléfono Android si instalar la aplicación concede el almacenamiento persistente~~ **Resuelto el 2026-10-12 (PE-18, parte 2): en Android sí lo concede** | Documento técnico 04, sección 3 |
| 2.6 | Tomar capturas de la aplicación en el teléfono (registro con fotos, barra sin señal, ficha) para la sustentación; PE-18 parte 2 se evidenció con datos del servicio | PE-18, observación 1 |
| ~~2.x~~ | ~~iPhone: respaldo en JPEG si Safari no genera WebP~~ **Fuera de alcance (2026-10-12): el propietario y los trabajadores usan Android.** Si en el futuro se usara un iPhone, probarlo y agregar el respaldo | PE-18, observación 4 |
| 2.x | Probar a mano el rechazo del reingreso de otro usuario con pendientes (PU-08 lo cubre de forma automática) | PE-14, pendiente |
| 6.4 | Riesgo: el plan gratuito de Supabase pausa el proyecto tras días sin actividad (ocurrió el 2026-10-12). Durante la evaluación el uso diario lo mantiene activo; si no, configurar una tarea que lo despierte o reactivarlo desde el panel | Incidente del 2026-10-12 |
| 6.x | Eliminar la cuenta de prueba (`pruebas@ganaderiajr.test`) al cerrar la evaluación | Decisión del 2026-10-08 |
| 6.x | Antes de la evaluación, borrar del servicio los animales de la serie de pruebas Z900–Z999 y sus registros | Documento técnico 13, sección 2.4 |
| 6.x | Opcional: dividir el código por pantallas (el paquete pesa 633 kB, 188 kB comprimido) para aligerar la primera carga | Aviso de Vite en la compilación del paso 2.1 |
| 2.x | Probar a mano el cierre de sesión con pendientes: «Enviar y cerrar sesión» y el descarte con doble confirmación (PU-13 lo cubre de forma automática) | PE-16, pendiente |
| ~~2.3~~ | **Hecho en los pasos 2.3 y 2.4:** distintivo junto a cada animal en el listado y la ficha. Falta observarlo a mano con pendientes y conflictos (paso 2.6). Mostrar el distintivo de sincronización junto a cada registro en el listado y la ficha, y observar a mano los estados con pendientes y conflictos | PE-15, observación 1 |
| 2.1 | Cómo resuelve el propietario un conflicto de chapeta. Si son dos animales distintos, corregir el código (3.9.5). Si es el mismo animal registrado dos veces, anular el duplicado; falta definir qué pasa con los eventos que ya se le registraron al duplicado en ese teléfono. Consultar con el propietario | 3.7.3, tercera regla · conversación del 2026-10-06 |

## Pendientes para el documento

- Tabla 27: precisar que la columna del trabajador restringe funciones (pantallas) y no el acceso a los datos que esas funciones resumen, salvo la información económica (documento técnico 08, sección 2).
- Apartado 3.9.5: precisar cómo se mide «el mismo día» de una corrección hecha sin conexión (documento técnico 08, sección 4.1).
- Agregar a la Tabla 19: TypeScript, react-router, Vitest, jose y la CLI de Supabase (no figuran hoy).
- Corregir en 3.8.11 la referencia «los once componentes de la Tabla 19» → Tabla 20.
- Tabla 24, fila `salida`: precisar que el estado «retirado» del animal no se almacena sino que se deduce de la existencia de una salida vigente (decisión del 2026-10-06). Revisar también la fila `animal` («El sexo y el estado admiten valores definidos»).
- Tabla 24, fila `correccion`: la restricción «no se admite una corrección ni una anulación sobre un registro ya anulado» es incompatible en el servidor con la Tabla 21 («prevalece la anulación, cualquiera que sea el orden de llegada; la corrección se conserva»). Precisar que la verifica el dispositivo y que el servicio acepta ambas filas y calcula el valor vigente al leer (decisión del 2026-10-06, documento técnico 05, sección 5.3).
- Tabla 24, filas `destino_productivo` y `fotografia`: con el servidor de solo inserciones, el destino y la fotografía vigentes son los más recientes; no se declaran como restricción (documento técnico 05, sección 5.2).
- Apartado 3.7.3, segunda regla, y Tabla 21, fila «La ficha de un animal modificada en ambos dispositivos»: la ficha ya no tiene campos que cambien; la regla de «prevalece la más reciente» se aplica a las correcciones (documento técnico 05, sección 2.1).
- Modelo de fotografía: la ruta en el servicio de archivos se deduce como `{animal_id}/{id}.webp` y no se almacena.
- RF-04, apartado 3.8.8 y Tabla 24 (fila `animal`): la madre también puede ser externa al predio (`madre_externa`), decisión del propietario del 2026-10-12. Precisar también en 3.8.10 la numeración de las chapetas (1 a 9999, luego letra sin O y 1 a 999) y que los ceros a la izquierda no cuentan (documento técnico 13, sección 2.1).
- Unificar qué casos de uso extiende CU-15 (2.8.6.3 dice CU-04 y CU-08; 2.8.6.5 dice CU-06 y CU-08).

## Temas de estudio para la sustentación

Lógica que conviene repasar a fondo al terminar el desarrollo, porque es probable que el jurado
la pregunte. Cada tema tiene su documento técnico.

| Tema | Por qué es importante | Documento |
|---|---|---|
| Identificador UUID v7 | Sostiene el registro sin conexión entre varios dispositivos (RD-02) y la deduplicación de la sincronización (3.7.8) | [01-identificador-uuidv7.md](docs/tecnica/01-identificador-uuidv7.md) |
| Estado del animal deducido y no almacenado | Ejemplo del principio «no guardar lo que puede calcularse», el mismo de los recordatorios derivados (3.8.11) | [02-esquema-local.md](docs/tecnica/02-esquema-local.md), sección 6.1 |
| Servidor de solo inserciones | Por qué sin privilegio UPDATE ninguna política futura puede habilitar una sobrescritura (3.7.8), y cómo eso obligó a deducir la ruta de la foto y el estado del animal | [05-esquema-remoto.md](docs/tecnica/05-esquema-remoto.md), sección 2 |
| Conflicto entre las Tablas 21 y 24 | Ejemplo de una contradicción del diseño descubierta al implementarlo, y su resolución | [05-esquema-remoto.md](docs/tecnica/05-esquema-remoto.md), sección 5.3 |
| Token firmado con clave asimétrica | Cómo el teléfono confía en el perfil sin preguntarle al servidor, y por qué una sesión alterada se detecta (3.9.1, RD-03) | [06-autenticacion.md](docs/tecnica/06-autenticacion.md), secciones 3 a 5 |
| Código de desbloqueo con PBKDF2 | Por qué un código corto no se puede guardar con un resumen simple, qué aportan la sal y las iteraciones, y qué no protege (3.9.1) | [07-codigo-de-desbloqueo.md](docs/tecnica/07-codigo-de-desbloqueo.md), secciones 4 y 7 |
| Doble aplicación de permisos y funciones frente a datos | Por qué el teléfono no es confiable, qué decide el servicio y por qué el trabajador recibe datos de pantallas que no ve (3.9.3) | [08-permisos.md](docs/tecnica/08-permisos.md), secciones 1, 2 y 4 |
| Motor de sincronización | Clasificación de respuestas, ordeño duplicado convertido en corrección, marca de avance con ventana de solapamiento y paginación por cursor (3.7.3 a 3.7.8) | [09](docs/tecnica/09-sincronizacion-subida.md) y [10](docs/tecnica/10-sincronizacion-bajada.md) |
| Unicidad de la chapeta sin índice único local | Decisión que parece un descuido y en realidad evita que un teléfono deje de sincronizar para siempre (3.7.3, tercera regla) | [02-esquema-local.md](docs/tecnica/02-esquema-local.md), sección 6 |
| Verificación dentro de la transacción y unicidad en tres niveles | Por qué la chapeta se verifica al escribir, otra vez dentro de la transacción y por último en el servicio, y qué límite no puede eliminar un teléfono sin conexión (3.7.3) | [13-registro-de-animal.md](docs/tecnica/13-registro-de-animal.md), sección 2.2 |
| Normalización de la chapeta y la regla del predio | Cómo una prueba con el usuario real cambió una decisión aprobada (los ceros a la izquierda) y por qué la regla vive a la vez en el teléfono y en el servicio | [13-registro-de-animal.md](docs/tecnica/13-registro-de-animal.md), secciones 2.1 y 8 |
| Cola de imágenes y Storage de solo inserciones | Por qué las fotos viajan en su propia cola y al final, por qué una imagen espera a que llegue su fotografía, cómo «ya existe» da la idempotencia y qué conserva el teléfono (3.8.5, Tabla 25) | [14-fotografias.md](docs/tecnica/14-fotografias.md), secciones 3, 6 y 7 |
