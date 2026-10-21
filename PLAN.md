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
| 2 · Identificación y ficha | 15 | 2026-10-12 | 2026-10-19 | 2026-10-13 | 15 puntos / 2 días |
| 3 · Sanidad, leche y destino | 16 | 2026-10-13 | 2026-10-26 | 2026-10-15 | 16 puntos / 3 días |
| 4 · Peso, partos y correcciones | 13 | 2026-10-15 | 2026-11-02 | 2026-10-19 | 13 puntos / 5 días |
| 5 · Consultas, alertas y economía | 16 | 2026-10-20 | 2026-10-26 | | |
| Cierre · Evaluación del prototipo | — | 2026-10-27 | 2026-11-09 | | |

Recalibrado al cierre de la Iteración 4: con 13 a 16 puntos en 3 a 5 días, la Iteración 5 se estima en una
semana y el cierre en dos, que dependen también del tiempo que puedan dedicar el propietario y los
trabajadores a la evaluación.

## Iteración 2 — Identificación animal y ficha (HU-01, HU-02, HU-15 · 15 puntos) · cerrada el 2026-10-13 · `v0.2`

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
| 2.5 | Carga inicial de un dispositivo nuevo (3.7.6) | ✅ |
| 2.6 | Pruebas y cierre de iteración | ✅ |

## Iteración 3 — Sanidad, leche y destino (HU-03, HU-04, HU-09, HU-13 · 16 puntos) · cerrada el 2026-10-15 · `v0.3`

**Criterios de cierre heredados de la Iteración 2:** HU-02.4 (acceso desde la ficha al historial sanitario), HU-06.4 (opciones exclusivas del propietario ocultas al trabajador, con el destino y la salida) y la comprobación en la ficha de la última vacuna, la leche y el destino (HU-02.1).

| Paso | Contenido | Estado |
|---|---|---|
| 3.1 | Catálogo de medicamentos y tabla de parámetros | ✅ |
| 3.2 | Destino productivo y su historial (CU-12) | ✅ |
| 3.3 | Registro sanitario e historial (CU-04, CU-05) | ✅ |
| 3.4 | Advertencia por repetición de medicamento (RF-09) | ✅ |
| 3.5 | Ronda de ordeño con regla de un registro por vaca y fecha (CU-06) | ✅ |
| 3.6 | Consulta de producción diaria, semanal y mensual | ✅ |
| 3.7 | Pruebas y cierre de iteración | ✅ |

## Iteración 4 — Peso, partos y correcciones (HU-05, HU-12, HU-17 · 13 puntos) · cerrada el 2026-10-19 · `v0.4`

| Paso | Contenido | Estado |
|---|---|---|
| 4.1 | Registro de pesaje y evolución con ganancia diaria (CU-08, CU-09) | ✅ |
| 4.2 | Registro de parto con resultado, cría y genealogía (CU-10, CU-11) | ✅ |
| 4.3a | Corrección y anulación con valor vigente (CU-17) | ✅ |
| 4.3b | Resolución de conflictos de chapeta y de medicamento (Tabla 21, regla del propietario) | ✅ |
| 4.4 | Consulta de correcciones (CU-18) | ✅ |
| 4.5 | Pruebas y cierre de iteración | ✅ |

## Iteración 5 — Consultas, alertas y economía (HU-10, HU-11, HU-14, HU-16 · 16 puntos)

| Paso | Contenido | Estado |
|---|---|---|
| 5.1 | Comparación de producción entre vacas (CU-07) | ✅ |
| 5.2 | Registro de salida y venta (CU-13) | ✅ |
| 5.3 | Recordatorios derivados y posponer (CU-15) | ✅ |
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
| 2026-10-21 | Costos y consolidado (CU-14): registrar compra (solo comprados, una vigente), servicio veterinario y alimentación, también en un retirado con fecha hasta su salida; consolidado con invertido (incluye el costo de los eventos sanitarios), generado (leche al precio del parámetro y venta), resultado y los avisos de CU-14 y HU-16.4; una sola compra vigente por disparador, como la salida | Decisiones A–I aprobadas por el autor (documento técnico 31; migración 20261021000200) |
| 2026-10-21 | Recordatorios (CU-15): sección en Inicio para ambos perfiles, solo el propietario pospone; cinco reglas de 3.8.11 con los parámetros de la Tabla 30 («más de N días»), valores vigentes y sin retirados; la chapeta del paso 4.2 como sexto tipo, sin posponer; agrupados por tipo, del más antiguo al más reciente, de 5 en 5; posponer 1, 3 o 7 días, decisión del predio | Decisiones A–H aprobadas por el autor (documento técnico 30) |
| 2026-10-20 | Salida: **una sola salida vigente** por animal (disparador en el servicio en lugar de la restricción única); con la anterior anulada se admite otra | Cambio del autor en PE-35: con la restricción única, un animal con la salida anulada no podía volver a salir (documento técnico 29, sección 8; migración 20261021000100) |
| 2026-10-20 | Salida y venta (CU-13): botón en la ficha del animal activo, solo el propietario; motivo venta (peso y valor obligatorios, comprador opcional), muerte (causa) o pérdida o robo (observación, columna nueva); último peso sin precargar y aviso de pesaje no reciente que no bloquea; confirmación; retirado = salida vigente, con las acciones de registro ocultas; la salida se corrige y se anula (una sola por animal); el valor lo lee el consolidado desde salida | Decisiones A–I aprobadas por el autor (documento técnico 29) |
| 2026-10-20 | Producción por vaca, semanal y mensual: **una semana o un mes a la vez**, con su resumen y cada día hasta hoy; sin registros, ir al periodo del ordeño anterior o siguiente | Ajuste del autor en PE-34: los rangos de 12 semanas o 12 meses no se entendían (documento técnico 23) |
| 2026-10-19 | Producción por vaca, vista diaria: **un día a la vez** (abre en hoy; Anterior y Siguiente se mueven de a un día), con la comparación frente a su promedio y accesos al ordeño anterior y al siguiente; semanal y mensual conservan su ventana, con el rango siempre visible | Ajuste del autor en PE-34: un rango de días confundía al ganadero (documento técnico 23) |
| 2026-10-19 | Comparación entre vacas: abre en el **día de hoy** (se agrega Día a Semana y Mes) y al tocar una vaca abre su producción **diaria** | Ajuste del autor en PE-34: el propietario compara a diario (documento técnico 28, secciones 3 y 8) |
| 2026-10-19 | Comparación entre vacas (CU-07, pasos 5 y 6): semana o mes con navegación; vacas en leche en algún momento del periodo según su historial, más las que tienen ordeños; orden por promedio por día registrado (no por total), de mayor a menor o al revés; promedio del hato como promedio de promedios; «Pocos registros» con menos de la mitad de los días; sin comparación con menos de dos vacas | Decisiones A–I aprobadas por el autor (documento técnico 28) |
| 2026-10-18 | Consulta de correcciones (CU-18): botón en Inicio solo para el propietario; cada entrada con animal y registro (valor vigente), cambio legible o «Anulado», motivo, nota, autor, fecha y estado; de la más reciente a la más antigua, por día, de 30 en 30; filtro por autor; abre la sección del registro; las resoluciones de conflictos no aparecen | Decisiones A–I aprobadas por el autor (documento técnico 27) |
| 2026-10-18 | Conflictos por unicidad: el propietario resuelve cualquiera y el trabajador los de los registros que él creó, en su teléfono, con las mismas opciones (cambiar el número, unir, usar el medicamento existente, descartar la chapeta puesta) | El registro rechazado solo existe en el teléfono donde se creó; el propietario no lo ve, y entrar con su cuenta en el teléfono del trabajador descartaría los pendientes que esperan por él. Opción 1 aprobada por el autor (documento técnico 26, sección 10) |
| 2026-10-18 | Corrección y anulación: qué campos se corrigen por tabla (la chapeta no; un resultado de parto o un destino se anulan); valor vigente por orden de recepción con la anulación siempre prevaleciente, aplicado en todas las pantallas y cálculos; un ordeño anulado impide otro de esa vaca ese día (limitación); conflictos de chapeta y de medicamento resueltos en el teléfono por el propietario porque nunca llegaron al servicio. El paso se divide en 4.3a y 4.3b | Decisiones A–I aprobadas por el autor (documento técnico 26) |
| 2026-10-18 | Parto: un formulario con la cría dentro, en una transacción; el reproductor se guarda en la cría; advertencia de parentesco (padre, hijo, hermanos, abuelo, nieto, externo con el mismo nombre); otro parto a menos de 240 días pide confirmación; el control reproductivo es solo del propietario | Decisiones A–H aprobadas por el autor (documento técnico 25) |
| 2026-10-18 | **La cría recibe su número al nacer, pero la chapeta física se pone después (plazo máximo: 90 días).** Se registra la colocación (tabla `colocacion_chapeta` y `animal.chapeta_puesta`), con aviso en la ficha, sección en Inicio y marca en el listado; será un sexto tipo de recordatorio en el paso 5.3 | Pedido del propietario; decisiones I–L (documento técnico 25, sección 7) |
| 2026-10-15 | Pesaje: método obligatorio sin preselección; fecha no anterior a la llegada; dos pesajes el mismo día se admiten con una segunda confirmación (pedida en PE-29); **confirmación si la ganancia diaria es mayor que 2,0 o menor que −2,0 kg/día** (o más de 10 % el mismo día); la evolución empieza en el peso de compra o al nacer; la meta de ganancia diaria queda sin valor hasta que la dé el propietario | Decisiones A–F aprobadas; los umbrales de la D los fijó el autor (documento técnico 24) |
| 2026-10-15 | Consulta de producción: solo el propietario (CU-07); ventanas de 30 días, 12 semanas de lunes a domingo y 12 meses, con anterior y siguiente; total, promedio por día registrado y días registrados; barras horizontales sin librerías | Decisiones A–F aprobadas por el autor (documento técnico 23) |
| 2026-10-14 | Ronda de ordeño: desde Inicio, en espera durante la carga inicial; vacas con destino leche; promedio de los 7 días anteriores solo con días registrados; palabras con umbrales de 10 % y 25 % (de presentación); el reemplazo es una corrección de litros con motivo «registro duplicado»; el valor vigente de los litros se adelanta del paso 4.3 | Decisiones A–G aprobadas por el autor (documento técnico 22) |
| 2026-10-14 | Advertencia por repetición: se compara con la aplicación del mismo medicamento al animal más cercana a la fecha elegida, antes o después; advierte si la distancia es menor que el intervalo; la confirmación se pierde al cambiar medicamento o fecha, se verifica otra vez al guardar y **no se almacena** | Decisiones A–G aprobadas por el autor (documento técnico 21) |
| 2026-10-14 | Registro sanitario: desde la ficha; el tipo filtra el catálogo; la dosis se precarga con la última del medicamento en el predio; **el costo solo lo ve y lo registra el propietario**; la fecha puede ser anterior al ingreso pero no al nacimiento; «Aplicar lo mismo a otro animal» para los ciclos de vacunación | Decisiones A–H aprobadas por el autor (documento técnico 20) |
| 2026-10-13 | Durante la carga inicial de un teléfono nuevo se puede consultar pero no registrar, hasta que lleguen los datos; las fotos no bloquean | Corrige el documento técnico 10: registrar sin el inventario completo puede producir un conflicto de chapeta (documento técnico 17, sección 2) |
| 2026-10-13 | La fila de datos de una foto se cuenta como fotografía, no como registro: un animal con una foto es «1 registro y 1 fotografía». El reingreso cuenta también las fotos | Hallazgo de PE-22: «2 registros» se leía como dos animales (documento técnico 14, sección 8.2) |
| 2026-10-13 | Conflicto de chapeta, según el propietario: si son dos animales distintos con la misma chapeta por error humano, se corrige la chapeta del que llegó segundo; si es el mismo animal registrado dos veces, se anula el duplicado y **sus eventos se pasan al animal correcto** | Respuesta al pendiente de diseño 2.1; se implementa con las correcciones (CU-17) en la Iteración 4 |
| 2026-10-13 | La última aplicación de un medicamento a un animal se muestra siempre: como información fuera del intervalo y como advertencia con confirmación dentro de él | Precisión del autor: aunque una nueva aplicación sea correcta en teoría, quien registra debe saber cuándo fue la anterior (documento técnico 18, sección 2) |
| 2026-10-13 | El catálogo de medicamentos lo registra el propietario desde la aplicación, no por SQL | Por SQL quedaría a nombre de quien ejecuta el script (HU-15); 14 productos propuestos en el documento técnico 18, sección 7 |
| 2026-10-13 | 35 días de intervalo de advertencia para los seis productos sin intervalo deducible (dosis única y vacunas) | Decisión del autor; la última aplicación se muestra siempre, y el valor puede corregirse si el veterinario indica otro |
| 2026-10-12 | El origen se pregunta como «nacido en el predio» o «comprado», con edad aproximada para los comprados; no se almacena, se deduce de la fecha de ingreso | El propietario conoce de manera aproximada la edad de un animal comprado (3.8.10) |
| 2026-10-12 | La genealogía se captura al registrar el animal, opcional | La ficha no se modifica; en la carga inicial se perdería la madre de los nacidos en el predio |
| 2026-10-12 | El destino productivo inicial se agrega al formulario de registro en el paso 3.2 | Es exclusivo del propietario (CU-12) y su historial se construye en la Iteración 3 |

## Pendientes de diseño

Decisiones que el documento no resuelve y que deben acordarse antes del paso indicado.

| Paso | Pendiente | Origen |
|---|---|---|
| ~~6.4~~ | ~~Verificar en un teléfono Android si instalar la aplicación concede el almacenamiento persistente~~ **Resuelto el 2026-10-12 (PE-18, parte 2): en Android sí lo concede** | Documento técnico 04, sección 3 |
| ~~2.6~~ | **Hecho:** capturas del teléfono en PE-20 (listado, fichas, fotos sin señal) y PE-22. Tomar capturas de la aplicación en el teléfono (registro con fotos, barra sin señal, ficha) para la sustentación; PE-18 parte 2 se evidenció con datos del servicio | PE-18, observación 1 |
| ~~2.x~~ | ~~iPhone: respaldo en JPEG si Safari no genera WebP~~ **Fuera de alcance (2026-10-12): el propietario y los trabajadores usan Android.** En PE-22 el registro de datos sin conexión funcionó en Chrome para iOS. **Confirmado en PE-32 (2026-10-18): en iPhone la foto no se guarda en ningún navegador**, porque todos usan el motor de Safari, que no genera WebP; el mensaje ahora lo dice en lugar de sugerir Chrome. Si en el futuro se usara un iPhone, probarlo y agregar el respaldo | PE-18, observación 4 |
| 6.4 | Riesgo: el plan gratuito de Supabase pausa el proyecto tras días sin actividad (ocurrió el 2026-10-12). Durante la evaluación el uso diario lo mantiene activo; si no, configurar una tarea que lo despierte o reactivarlo desde el panel | Incidente del 2026-10-12 |
| 5.x | El ordeño anulado impide otro ordeño de esa vaca ese día (restricción única de `produccion_leche`, documento técnico 26, sección 7). Evaluar el mismo arreglo que la salida: unicidad del ordeño vigente con un disparador | PE-35, cambio de la salida (documento técnico 29, sección 8) |
| 6.x | Eliminar la cuenta de prueba (`pruebas@ganaderiajr.test`) al cerrar la evaluación | Decisión del 2026-10-08 |
| 6.x | Antes de la evaluación, borrar del servicio los animales de la serie de pruebas Z900–Z999 y sus registros (fotos, destinos, eventos sanitarios), y los medicamentos de prueba: los que empiezan por «Prueba» y además «Otro mas» (PE-25) y «pp prueba» (PE-26) | Documento técnico 13, sección 2.4 · PE-25, observación 4 |
| 6.x | Opcional: dividir el código por pantallas (el paquete pesa 633 kB, 188 kB comprimido) para aligerar la primera carga | Aviso de Vite en la compilación del paso 2.1 |
| ~~2.3~~ | **Hecho en los pasos 2.3 y 2.4:** distintivo junto a cada animal en el listado y la ficha. Falta observarlo a mano con pendientes y conflictos (paso 2.6). Mostrar el distintivo de sincronización junto a cada registro en el listado y la ficha, y observar a mano los estados con pendientes y conflictos | PE-15, observación 1 |
| ~~4.3~~ | **Diseñado el 2026-10-18 en el documento técnico 26, sección 10 (entrega 4.3b):** como el animal en conflicto y sus dependientes nunca llegaron al servicio, se arreglan en el teléfono (otro número, o unir con el animal correcto reescribiendo los registros no enviados, fotos incluidas); no hace falta corregir `animal_id`. Texto original: **Resolver un conflicto de chapeta** con la regla que dio el propietario el 2026-10-13: dos animales distintos → corregir la chapeta del que llegó segundo; el mismo animal dos veces → anular el duplicado y pasar sus eventos (y fotos) al animal correcto. Implica: (1) el animal en conflicto nunca llegó al servicio, así que la corrección debe crear un animal nuevo con la chapeta corregida o reenviarlo, no corregir una fila del servicio; (2) «pasar los eventos» encaja con la corrección del campo `animal_id` con el motivo «animal equivocado» (3.9.5); (3) la foto del animal rechazado, que hoy queda pendiente para siempre (PE-22), debe seguir al animal. Diseñarlo en el documento técnico de las correcciones | 3.7.3, tercera regla · PE-22 · decisión del propietario del 2026-10-13 |

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
- Tabla 28: agregar la pantalla «Medicamentos» (catálogo, ambos perfiles), que permite cargar el catálogo antes de usarlo en el registro sanitario (documento técnico 18, sección 6).
- RF-09 y apartado 3.8.9: precisar que el intervalo de advertencia es el mínimo de días entre dos aplicaciones del mismo medicamento al mismo animal, que se cuenta en días porque el evento registra la fecha, y que la última aplicación se muestra siempre (documento técnico 18, sección 2).
- Apartado 3.8.9: el nombre del medicamento es único sin distinguir mayúsculas, tildes ni espacios repetidos (documento técnico 18, sección 3).
- Tabla 24 y apartado 3.8.11: el animal registra si ya tiene la chapeta puesta y la tabla `colocacion_chapeta` la fecha en que se puso; los recordatorios pasan de cinco a seis tipos con el de chapeta pendiente (plazo de 90 días, parámetro `dias_recordar_chapeta`). Decisión del propietario del 2026-10-18 (documento técnico 25, sección 7).
- Tabla 21 (y apartado 3.7.3, tercera regla): un conflicto por unicidad no se «presenta al propietario», porque el registro rechazado solo existe en el teléfono donde se creó; lo resuelve allí el propietario o quien lo registró (documento técnico 26, sección 10, decisión del 2026-10-18). Es un hallazgo del desarrollo que conviene explicar en el documento.
- RF-32 y apartado 3.9.5: las resoluciones de conflictos (cambiar el número, unir un animal o un medicamento, descartar una chapeta puesta) no dejan constancia en `correccion`, porque el registro rechazado nunca llegó al servicio; la consulta de correcciones no las muestra (documento técnico 27, sección 8). Declararlo como límite de la trazabilidad.
- Tabla 24, fila `salida`: agregar la columna `observacion` (opcional, hasta 300 caracteres) que exige CU-13, 3b, y precisar que el estado retirado se deduce de la salida **vigente** (no anulada); la unicidad es de la salida **vigente**: con la anterior anulada se admite otra, y la restricción única pasó a un disparador (documento técnico 29, secciones 4, 7 y 8). Explicar por qué: con solo inserciones, una unicidad que cuente los registros anulados deja sin salida al animal.
- Tabla 24, fila `movimiento_economico`: la unicidad es de la compra **vigente** (disparador en lugar del índice único parcial), por la misma razón que la salida (documento técnico 31, sección 4).
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
