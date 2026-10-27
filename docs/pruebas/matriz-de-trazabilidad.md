# Matriz de trazabilidad entre requerimientos y pruebas

Paso 6.6 del [plan](../../PLAN.md) (R8 de la ruta de cierre), apartado 1.6.3.11: «se contrastaron las pruebas
ejecutadas con los requerimientos definidos en la primera fase, con el fin de determinar el grado de cumplimiento
alcanzado por el prototipo». Es un entregable de la Tabla 3.

**Responsable:** Daniel Santiago Ramos Pintor · **Corte:** 2026-10-26 (con la sesión C)

## 1. Fuentes

| Nivel | Pruebas | Resultado | Dónde |
|---|---|---|---|
| Unitarias, automáticas | **964** en 36 grupos (PU-01 a PU-36) | 964 de 964 aprobadas | [Informe del 2026-10-25](resultados/2026-10-25_021625_5173101.md) |
| Integración, contra Supabase | PI-01 (esquema, 21 verificaciones), PI-02 (gancho del token), PI-03 (políticas, 11), PI-04 (sincronización de extremo a extremo), PI-05 (fotografías) | Todas aprobadas | Documentos de cada iteración y [`cierre.md`](cierre.md) |
| Manuales, en el navegador real | PE-01 a PE-40, una por paso del desarrollo | Todas aprobadas | [`fase-0-entorno.md`](fase-0-entorno.md), [`iteracion-1.md`](iteracion-1.md) a [`iteracion-5.md`](iteracion-5.md), [`cierre.md`](cierre.md) |
| Funcionales y de conectividad, con los datos simulados | CP-01 a CP-56 del [documento de casos](casos-de-prueba.md): 26 ejecutados en la evaluación (incluida la sesión C con el propietario) y el resto cubiertos por su PE (sección 17) | 26 de 26 aprobados | [`cierre.md`](cierre.md), R6 y R7 |

Notación de la columna CP: **✅** ejecutado y aprobado en la evaluación; *cub.* cubierto por una PE anterior sin cambios
de lógica (casos de prueba, sección 17).

## 2. Requerimientos funcionales

| Req. | Prioridad | Qué exige | Documento técnico | Automáticas | Integración | Manuales | Funcionales de cierre | Estado |
|---|---|---|---|---|---|---|---|---|
| RF-01 | Imprescindible | Registrar un animal con chapeta única | 13 | PU-14 (87) | PI-01 v5 y v12 | PE-17, PE-32 | CP-09 *cub.*, CP-46 *cub.* | ✅ Cumplido |
| RF-02 | Imprescindible | Tres fotografías y actualizarlas | 14, 16 | PU-15 (38) | PI-05 | PE-18, PE-20 | CP-08 *cub.*, CP-10 *cub.* | ✅ Cumplido |
| RF-03 | Imprescindible | Datos de origen; fecha exacta o estimada | 13 | PU-14 | PI-01 v7 | PE-17 | CP-11 ✅, CP-08 *cub.* | ✅ Cumplido |
| RF-04 | Importante | Genealogía, padre externo | 13, 25 | PU-14, PU-26 (40) | PI-01 v13 | PE-17, PE-30 | CP-12 *cub.* | ✅ Cumplido |
| RF-05 | Imprescindible | Ficha del animal completa | 16 | PU-17 (23) | — | PE-20 | CP-11 ✅ | ✅ Cumplido |
| RF-06 | Imprescindible | Localizar por la chapeta | 15 | PU-16 (54) | PI-05 v6 | PE-20 | CP-11 ✅, CP-13 ✅ | ✅ Cumplido |
| RF-07 | Imprescindible | Registrar un evento sanitario | 20 | PU-21 (25) | — | PE-25 | CP-14 *cub.*, CP-44 ✅ | ✅ Cumplido |
| RF-08 | Imprescindible | Historial sanitario cronológico | 20 | PU-21 | — | PE-25 | CP-17 ✅, CP-06 ✅ | ✅ Cumplido |
| RF-09 | Importante | Advertir la repetición de un medicamento | 18, 21 | PU-19 (33), PU-22 (23) | PI-01 v8 y v14 | PE-23, PE-26 | CP-15 *cub.* (y la dosis anterior, sesión B) | ✅ Cumplido |
| RF-10 | Imprescindible | Producción diaria por vaca | 22, 32 | PU-23 (46), PU-10 (19) | PI-01 v6 y v19 | PE-27, PE-38 | CP-20 ✅, CP-45 ✅, CP-47 ✅ | ✅ Cumplido |
| RF-11 | Imprescindible | Producción diaria, semanal y mensual | 23 | PU-24 (24) | — | PE-28 | CP-21 ✅ | ✅ Cumplido |
| RF-12 | Importante | Comparar vacas en un periodo | 28 | PU-30 (15) | — | PE-34 | CP-22 ✅ | ✅ Cumplido |
| RF-13 | Imprescindible | Registrar el peso con fecha y método | 24, 34 | PU-25 (37), PU-36 (35) | PI-01 v7 | PE-29, PE-40 | CP-07 ✅, CP-44 ✅ | ✅ Cumplido |
| RF-14 | Imprescindible | Evolución del peso y ganancia | 24, 34 | PU-25, PU-36 | — | PE-29, PE-40 | CP-06 ✅, CP-26 ✅, CP-27 ✅ | ✅ Cumplido |
| RF-15 | Importante | Salida y venta con peso y valor | 29 | PU-31 (18) | PI-01 v16 y v17 | PE-35 | CP-13 ✅, CP-37 ✅ | ✅ Cumplido |
| RF-16 | Importante | Registrar un parto y la cría | 25 | PU-26 | PI-01 v15 | PE-30 | CP-30 *cub.*, CP-31 *cub.* | ✅ Cumplido |
| RF-17 | Importante | Partos e intervalos de cada vaca | 25 | PU-26 | — | PE-30 | CP-32 *cub.* | ✅ Cumplido |
| RF-18 | Importante | Asignar el destino productivo | 19 | PU-20 (29) | PI-03 v2 y v3 | PE-24 | CP-33 *cub.*, CP-05 ✅ | ✅ Cumplido |
| RF-19 | Deseable | Historial de los destinos | 19 | PU-20 | — | PE-24 | CP-33 *cub.*, CP-21 ✅ (secado) | ✅ Cumplido |
| RF-20 | Deseable | Costos por animal | 29, 31 | PU-31, PU-33 (18) | PI-01 v9 y v18 | PE-37 | CP-34 *cub.*, CP-35 ✅ | ✅ Cumplido |
| RF-21 | Deseable | Consolidado invertido y generado | 31 | PU-33 | PI-03 v4 | PE-37 | CP-35 ✅, CP-36 ✅, CP-37 ✅ | ✅ Cumplido |
| RF-22 | Importante | Recordatorios derivados | 30 | PU-32 (21) | — | PE-36 | CP-38 ✅ | ✅ Cumplido |
| RF-23 | Importante | Recordatorios al iniciar y posponerlos | 30 | PU-32, PU-34 (9) | — | PE-36 | CP-38 ✅, CP-39 *cub.* | ✅ Cumplido |
| RF-24 | Imprescindible | Autenticación antes de acceder | 06, 33 | PU-07 (15), PU-35 (5) | PI-02 | PE-04, PE-13, PE-39 | CP-01 ✅, CP-03 ✅, CP-04 ✅ | ✅ Cumplido |
| RF-25 | Imprescindible | Dos perfiles | 06, 08 | PU-07, PU-09 (39) | PI-02, PI-03 | PE-13 | CP-05 ✅ | ✅ Cumplido |
| RF-26 | Imprescindible | El trabajador no enmienda al propietario ni otro día | 08, 26 | PU-09, PU-27 (34) | PI-03 v6 a v8 | PE-31 | CP-40 *cub.*, CP-49 (PI-03) | ✅ Cumplido |
| RF-27 | Importante | Autor y fecha de cada registro | 08, 13, 16 | PU-09, PU-17 | PI-01 v3, PI-03 v1 | PE-20 | CP-06 ✅ | ✅ Cumplido |
| RF-28 | Imprescindible | Registrar y consultar sin conexión | 02, 03, 13–31 | PU-04 (53), PU-05 (14) | — | PE-10, PE-17, PE-22 | CP-02 ✅, CP-07 ✅, CP-44 ✅, CP-42 *cub.* | ✅ Cumplido |
| RF-29 | Imprescindible | Sincronizar al volver la conexión | 09, 10 | PU-10, PU-11 (12) | PI-04 | PE-15, PE-21 | CP-44 ✅, CP-45 ✅, CP-47 ✅, CP-48 ✅ | ✅ Cumplido |
| RF-30 | Imprescindible | Indicar si está sincronizado | 09, 11 | PU-12 (27) | — | PE-15 | CP-07 ✅, CP-47 ✅ | ✅ Cumplido |
| RF-31 | Imprescindible | Corregir o anular con un registro nuevo | 22, 26 | PU-23, PU-27, PU-28 (28) | PI-01 v17 a v19 | PE-31, PE-38 | CP-41 ✅, CP-45 ✅ | ✅ Cumplido |
| RF-32 | Importante | Consultar las correcciones | 27 | PU-29 (12) | — | PE-33 | CP-41 ✅ | ✅ Cumplido |

## 3. Requerimientos no funcionales

| Req. | Prioridad | Qué exige | Evidencia | Estado |
|---|---|---|---|---|
| RNF-01 | Imprescindible | Controles para el campo | PU-01 (18, contraste ≥ 7:1 de la paleta); controles de 64 px (3.10.4.2) revisados pantalla por pantalla en el rediseño; CP-52 *cub.* | ✅ Cumplido |
| RNF-02 | Importante | Registrar tras una sola sesión de acompañamiento | CP-54 ✅: el propietario, sin experiencia previa en aplicaciones de gestión, hizo las tres tareas sin ayuda tras una sesión de unos 2 minutos de demostración (sesión C, 2026-10-26) | ✅ Cumplido |
| RNF-03 | Imprescindible | Pocos pasos, listas y valores predeterminados | Por diseño: la ronda pide solo los litros y pasa sola a la siguiente vaca (PE-27, CP-45); fecha de hoy predeterminada; catálogos como listas (PE-23, PE-25). CP-53 ✅ con observación: ningún registro necesitó texto libre; los toques (8, 13 y 16) fueron unas dos veces la referencia por ubicar el animal en pantallas sin buscador, que se agregó a pedido del propietario | ✅ Cumplido con observación |
| RNF-04 | Imprescindible | No perder lo registrado sin conexión | PU-05 (escritura y cola en una transacción), PU-13 (14); PE-16, PE-22; CP-07 ✅, CP-43 *cub.* | ✅ Cumplido |
| RNF-05 | Importante | Restaurar ante la pérdida del dispositivo | PU-11, PU-18 (14); PI-04; PE-21; CP-48 ✅ | ✅ Cumplido |
| RNF-06 | Imprescindible | Ningún registro se modifica ni elimina | PI-01 v2, PI-03 v11 (ni el propietario modifica ni elimina); PU-27; CP-41 ✅ | ✅ Cumplido |
| RNF-07 | Imprescindible | Acceso condicionado a la autenticación | PU-07; PI-03 v9 y v10; PE-04 (registro abierto deshabilitado), PE-13; CP-01 ✅ | ✅ Cumplido |
| RNF-08 | Importante | Autor y marca temporal permanentes | PI-01 v3 (la fecha de recepción la fija el servicio); PU-17; CP-06 ✅ | ✅ Cumplido |
| RNF-09 | Imprescindible | Ficha resuelta en el dispositivo | PU-04, PU-16, PU-17; PE-20; CP-02 ✅ (sin conexión), CP-11 ✅ | ✅ Cumplido |
| RNF-10 | Imprescindible | Teléfono de gama media y computador | PE-06, PE-11; la evaluación usó computador, iPhone y Android; CP-51 *cub.* | ✅ Cumplido |
| RNF-11 | Imprescindible | Instalable sin tienda | PE-08, PE-11; CP-50 *cub.* | ✅ Cumplido |
| RNF-12 | Importante | Fotos comprimidas | PU-15; PI-05; PE-18; CP-55 *cub.* | ✅ Cumplido |
| RNF-13 | Importante | Módulos independientes | PE-02 (estructura por capas, Tabla 20); `src/modulos/` por ámbito funcional; CP-56 *cub.* | ✅ Cumplido |
| RNF-14 | Imprescindible | Cubrir todos los imprescindibles | Los 18 RF imprescindibles y los 10 RNF imprescindibles cumplidos | ✅ Cumplido |
| RNF-15 | Imprescindible | Almacenamiento persistente y aviso si se niega | PU-06 (19); PE-12, PE-18 (Android lo concede al instalar); PE-39 obs. 1 (el aviso en Safari) | ✅ Cumplido |

## 4. Grado de cumplimiento

| Grupo | Total | Cumplidos | Pendientes | Grado |
|---|---|---|---|---|
| Requerimientos funcionales | 32 | **32** | 0 | **100 %** |
| Requerimientos no funcionales | 15 | **15** | 0 | **100 %** |
| **Todos** | **47** | **47** | **0** | **100 %** |

| Prioridad (Tabla 10) | Total | Cumplidos | Pendientes |
|---|---|---|---|
| Imprescindibles | 28 | 28 | — |
| Importantes | 16 | 16 | — |
| Deseables | 3 | 3 | — |

Los tres requerimientos que quedaron pendientes al primer corte (RNF-02, RNF-03 y RNF-14) se cumplieron con la sesión C
del 2026-10-26: el propietario, sin experiencia en aplicaciones de gestión, registró un ordeño, un pesaje y un evento
sanitario sin ayuda tras una sola sesión de acompañamiento, sin escribir texto libre. RNF-03 queda con una observación:
los toques fueron unas dos veces la referencia por ubicar al animal, lo que motivó agregar buscadores.

## 5. Hallazgos de la evaluación

Defectos encontrados al ejecutar los casos, todos corregidos y con su prueba:

| Caso | Hallazgo | Corrección |
|---|---|---|
| CP-01 | Durante la carga inicial, la campana de Alertas contaba recordatorios falsos (69 en lugar de 15) | El contador y la pestaña esperan a que termine la carga |
| CP-20 | En los datos simulados, la «baja» de la vaca 215 quedó por encima de su promedio | Generador corregido (versión 2); la baja se provocó registrándola en la ronda |
| CP-27 | Fechas del ciclo de ceba sin el año: una compra del año anterior parecía posterior a un pesaje | El año se muestra cuando no es el actual |
| Sesión A | El número del animal en Correcciones recientes y en la producción por vaca no iba en la chapeta | Chapeta amarilla en ambos |
| Sesión B | Pedido del autor: el aviso del medicamento debía decir la dosis de la vez anterior | Agregada como dato del historial (Tabla 30), PU-22.8 |
| Sesión C | El propietario tardó en ubicar al animal en la ronda y en la producción de carne, y buscó aplicar el medicamento desde el acceso Medicamentos | Buscadores por chapeta (y por nombre en Medicamentos) y botón «Aplicar medicamento a un animal» que lleva a Animales con una guía |

## 6. Relación con el documento

Esta matriz alimenta el capítulo 4 (R10). Las precisiones que el documento necesita para coincidir con lo
construido están en «Pendientes para el documento» del plan (R11).
