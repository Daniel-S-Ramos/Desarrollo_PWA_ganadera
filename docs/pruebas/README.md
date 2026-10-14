# Documentación de pruebas

Registro de las pruebas ejecutadas sobre el prototipo, conforme a los apartados 1.6.3.7 a
1.6.3.11 del documento de trabajo de grado. Reúne los tres entregables de pruebas de la Fase 3
(Tabla 3): el **documento de casos de prueba**, el **informe de resultados** y la **matriz de
trazabilidad entre requerimientos y pruebas**.

## Tipos de prueba e identificadores

| Prefijo | Tipo | Qué verifica | Cómo se ejecuta |
|---|---|---|---|
| **PE** | Verificación del entorno | Que las herramientas, la configuración y la infraestructura funcionan antes de construir sobre ellas (Fase 0) | Comandos y observación en el navegador |
| **PU** | Unitaria | Un componente aislado (una función, una regla) | Automática con Vitest |
| **PI** | Integración | La comunicación entre módulos y la consistencia de la información entre ellos | Automática con Vitest |
| **PF** | Funcional | Un flujo completo de registro o consulta desde la interfaz, contra los criterios de aceptación | Manual, guiada por el caso de prueba |
| **PC** | Conectividad limitada | El registro y la consulta sin red y la sincronización al volver la señal (1.6.3.10) | Manual, con las herramientas del navegador y el teléfono |

## Plantilla de un caso de prueba

Cada caso registra los campos que exige el apartado 1.6.3.7 (condiciones iniciales, datos de
entrada, pasos y resultado esperado) y los que exige el 1.6.3.11 (resultado obtenido y
observaciones):

| Campo | Contenido |
|---|---|
| Identificador | Prefijo y número |
| Objetivo | Qué se quiere comprobar |
| Requerimiento | RF, RNF, RD o paso del plan que verifica |
| Condiciones iniciales | Estado necesario antes de ejecutar |
| Datos de entrada | Valores empleados |
| Pasos | Secuencia de ejecución |
| Resultado esperado | Lo que debe ocurrir para aprobar |
| Resultado obtenido | Lo que ocurrió, con su evidencia |
| Estado | ✅ Aprobada · ❌ Fallida · ⚠️ Aprobada con observaciones |
| Fecha y responsable | Cuándo y quién la ejecutó |
| Commit | Versión del código sobre la que se ejecutó |
| Observaciones | Hallazgos, incidentes y acciones tomadas |

Las evidencias (capturas de pantalla y salidas de comandos) se guardan en `evidencias/`, con el
identificador del caso como prefijo del nombre del archivo.

## Informes de las pruebas automáticas

Las pruebas unitarias y de integración se ejecutan con `npm run test:informe`. Primero verifica
los tipos con TypeScript, que es la que evalúa las afirmaciones de tipos de las pruebas, y
después ejecuta Vitest. Además de mostrar el resultado en la terminal guarda un informe en [`resultados/`](resultados/). El nombre
del archivo lleva la fecha, la hora y el commit evaluado, así que los informes se ordenan solos
y cada uno puede vincularse con la versión exacta del código. Se generan automáticamente y no
se editan a mano.

## Documentos

| Documento | Alcance | Casos | Resultado |
|---|---|---|---|
| [fase-0-entorno.md](fase-0-entorno.md) | Preparación del entorno (pasos 0.1 a 0.8) | 12 | 12 aprobadas |
| [iteracion-1.md](iteracion-1.md) | Iteración 1: fundación técnica (cerrada, `v0.1`) | 21 | 21 aprobadas · 12 criterios de aceptación cumplidos (8 de extremo a extremo, 4 a nivel técnico) |
| [iteracion-2.md](iteracion-2.md) | Iteración 2: identificación animal y ficha (en curso) | 12 | 12 aprobadas (5 con observaciones o tras corrección) |

## Matriz de trazabilidad entre requerimientos y pruebas

Se completa a medida que avanzan las iteraciones. Al cierre del desarrollo cada requerimiento
debe tener al menos una prueba que lo verifique (apartado 1.6.3.11).

| Requerimiento | Descripción breve | Pruebas | Estado |
|---|---|---|---|
| RF-28 | Registrar y consultar sin conexión | PE-07, PE-10 (la aplicación abre sin red); PU-04; PE-17 (registro sin conexión); PE-20 (listado, ficha y fotos reducidas sin señal, en el teléfono); PI-05 verificación 6 (un teléfono nuevo baja las fotos) | ✅ Verificado |
| RF-01 | Registrar un animal con un identificador único: la chapeta | PU-14 (normalización, numeración del predio, unicidad en el teléfono y dentro de la transacción); PI-01 (formato y unicidad en el servicio); PE-17 (aviso con el animal que ya tiene la chapeta) | ✅ Verificado |
| RF-03 | Datos de origen: fechas exacta o estimada, sexo, procedencia y peso | PU-14 (origen, edad aproximada, validaciones); PE-17 (animal comprado con edad aproximada llegó al servicio con fecha estimada) | ✅ Verificado |
| RF-04 | Genealogía con madre y padre, del predio o externos | PU-14 (cada progenitor de una sola forma, sexo correcto); PI-01 (madre de una sola forma en el servicio); PE-17 (madre del predio y padre externo) | ✅ Verificado |
| RF-06 | Localizar un animal por su identificador | PU-16 (búsqueda normalizada, por el inicio, en orden numérico; chapeta no registrada); PE-20 (búsqueda en el teléfono y registro desde una chapeta no registrada) | ✅ Verificado |
| RF-05 | Ficha con foto, identificador, edad, último peso, última vacuna, leche y destino | PU-17 (consolidación de cada dato); PE-20 (ficha en el teléfono) | 🔄 Parcial: vacuna, leche, destino y pesajes se registran en las Iteraciones 3 y 4; la ficha ya los consulta |
| RF-02 | Tres fotografías por animal, actualizables después | PU-15 (tres vistas, registro incompleto, vista principal); PI-05 (subida al servicio de archivos); PE-18 (galería en el computador y cámara en un teléfono Android, con la orientación corregida) | 🔄 Parcial: falta actualizar las fotos desde la ficha (paso 2.4) |
| RNF-12 | Fotografías comprimidas | PU-15 y verificación en Chrome (5 MB → 182 KB y 21 KB); PI-05 (el servicio rechaza más de 1 MB y otros formatos); PE-18 (fotos reales: ~200 KB y ~27 KB; solo la reducida principal queda en el teléfono) | ✅ Verificado |
| RNF-09 | Consultas de la ficha contra el almacenamiento local | PU-04 (consultas por índice simple, compuesto y por rango) | 🔄 Parcial: falta la pantalla de la ficha |
| RNF-04 | La información sin conexión no se pierde ante un cierre inesperado | PU-05 (registro y cola en una sola transacción; fallas simuladas entre escrituras; persistencia tras reabrir); PU-10 (una operación sale de la cola solo con la confirmación del servicio; registros en transmisión recuperados); PU-13 (el cierre de sesión no descarta sin doble confirmación) | 🔄 Parcial: falta la prueba con la aplicación real cerrada a mitad de un registro |
| RF-27 | Registrar el autor y la fecha de creación de cada registro | PU-05 (los fija el repositorio y prevalecen sobre valores falsos); PI-01 (inalterables en el servicio); PI-03 (el servicio rechaza un autor distinto de quien envía); PU-17 y PE-20 (la ficha y cada foto muestran su autor y su fecha, HU-15) | ✅ Verificado |
| RNF-15 | Almacenamiento persistente y aviso cuando se niega | PU-06 (todos los caminos de la solicitud y texto del aviso); PE-12 (Chrome para Windows: el aviso aparece cuando se niega); PE-18 parte 2 (Android: la aplicación instalada obtiene el almacenamiento persistente y no muestra el aviso) | ✅ Verificado |
| RNF-01 | Operación en condiciones de campo | PU-01 (contraste 7:1 en todas las combinaciones de texto) | 🔄 Parcial: falta el tamaño de los controles y la prueba en campo |
| RNF-07 | Acceso condicionado a autenticación | PE-04 (registro abierto cerrado); PU-07 (solo tokens firmados por el servicio); PE-13 (ingreso real); PU-08 y PE-14 (código de desbloqueo en cada apertura) | ✅ Verificado |
| RD-05 | El trabajador no interviene los registros del propietario | PU-08 y PE-14 (identidad confirmada en cada apertura); PU-09 (el teléfono no ofrece la corrección); PI-03 (el servicio la rechaza) | ✅ Verificado |
| RF-26 | El trabajador no corrige registros del propietario y solo corrige los de trabajadores del mismo día | PU-09; PI-03 (incluido el reloj atrasado) | ✅ Verificado |
| RF-24 | Requerir autenticación antes de acceder | PU-07; PE-13 (sin sesión se muestra la pantalla de ingreso, que exige conexión la primera vez) | ✅ Verificado |
| RF-25 | Dos perfiles: propietario y trabajador | PU-07 (perfil firmado y validado); PI-02 (perfil en el token); PE-13 (ambos perfiles con usuarios reales); PU-09 y PI-03 (permisos de cada perfil en el teléfono y en el servicio) | ✅ Verificado |
| RD-03 | Autenticación sin conexión | PU-07 (verificación de la firma sin red, token vencido aceptado); PE-13 (recarga sin conexión sigue identificado) | ✅ Verificado |
| RNF-10 | Navegadores móviles y de escritorio | PE-06, PE-11; PE-18 y PE-19 (aplicación publicada e instalada en un teléfono Android 10 con Chrome) | 🔄 Parcial: falta iPhone (pendiente de diseño) y la prueba en campo |
| RNF-11 | Instalable sin tienda de aplicaciones | PE-11 | ✅ Verificado |
| RNF-13 | Arquitectura modular | PE-02 (estructura por capas y módulos); PU-05 (prueba de arquitectura: una sola vía de escritura) | 🔄 Parcial: se verifica con cada módulo construido |
| RNF-08 | Autoría y fecha de creación inalterables | PU-02 (campos de solo lectura en el tipo); PI-01 (sin privilegio de modificación en el servicio) | ✅ Verificado |
| RNF-06 | Ningún registro puede modificarse ni eliminarse | PI-01 (ningún rol tiene UPDATE ni DELETE); PI-03 (ni el propietario modifica ni elimina) | 🔄 Parcial: falta la corrección y anulación (paso 4.3) |
| RNF-05 | Restaurar la información ante la pérdida del dispositivo | PI-01 (esquema remoto que conserva la copia); PU-11 y PI-04 (un teléfono vacío recupera la información con la carga inicial) | ✅ Verificado |
| RF-29 | Sincronizar lo registrado sin conexión al restablecerse la señal | PU-10 (subida, reintentos, conflictos); PU-11 (bajada incremental); PI-04 (extremo a extremo con el servicio real) | ✅ Verificado |
| RF-30 | Indicar si un registro está sincronizado o pendiente | PU-10 (estados de la Tabla 22 según la respuesta del servicio); PU-12 (textos de la barra y distintivos); PE-15 (barra inferior en el navegador real) | 🔄 Parcial: falta ver el distintivo junto a cada registro en las listas y la ficha (Iteración 2) |
| RD-02 | Identificadores sin contador central | PU-03 (UUID v7: unicidad, orden y dos dispositivos sin coincidencias) | ✅ Verificado |
| RD-01 | Almacenamiento primario en el dispositivo | PE-10 (recursos servidos desde el dispositivo); PU-04 (esquema local de 18 tablas) | ✅ Verificado |
