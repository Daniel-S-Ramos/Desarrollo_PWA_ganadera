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

## Iteración 1 — Fundación técnica (HU-08, HU-06, HU-07 · 16 puntos)

| Paso | Contenido | Referencia | Estado |
|---|---|---|---|
| 1.1 | Tipos del dominio (entidades y valores admitidos) | Tablas 23 y 24 | ✅ |
| 1.2 | Identificador UUID v7 generado en el dispositivo | 3.7.1 | ✅ |
| 1.3 | Esquema local con Dexie | 3.8.4, Tabla 25 | ⬜ |
| 1.4 | Repositorio local y cola de operaciones en una sola transacción | 3.7.2 | ⬜ |
| 1.5 | Solicitud de almacenamiento persistente | RNF-15, 3.8.7 | ⬜ |
| 1.6 | Esquema remoto en Supabase: tablas, permisos e inmutabilidad de autoría | 3.8.3, 3.9.4 | ⬜ |
| 1.7 | Autenticación: ingreso, perfil en el token, verificación sin red | 3.9.1 | ⬜ |
| 1.8 | Código de desbloqueo local | 3.9.1 | ⬜ |
| 1.9 | Gestor de sesión y permisos, y reglas a nivel de fila | 3.9.2, 3.9.3, Tabla 27 | ⬜ |
| 1.10 | Motor de sincronización: subida, bajada, marca de avance, idempotencia | 3.7.3 – 3.7.8 | ⬜ |
| 1.11 | Indicador de sincronización (contador y marca por registro) | 3.7.4, 3.10.4.5 | ⬜ |
| 1.12 | Cierre de sesión con cola vacía | 3.9.1 | ⬜ |
| 1.13 | Pruebas y verificación de criterios de aceptación de la iteración | 1.6.3.9 | ⬜ |

## Iteración 2 — Identificación animal y ficha (HU-01, HU-02, HU-15 · 15 puntos)

| Paso | Contenido | Estado |
|---|---|---|
| 2.1 | Registrar animal (CU-02) con validación de chapeta única | ⬜ |
| 2.2 | Fotografías: captura, compresión y cola de imágenes | ⬜ |
| 2.3 | Listado de animales y búsqueda por chapeta (CU-03) | ⬜ |
| 2.4 | Ficha del animal con autoría visible (HU-15) | ⬜ |
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
| 6.5 | Despliegue del prototipo en un alojamiento con HTTPS | ⬜ |
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

## Pendientes para el documento

- Agregar a la Tabla 19: TypeScript, react-router y Vitest (no figuran hoy).
- Corregir en 3.8.11 la referencia «los once componentes de la Tabla 19» → Tabla 20.
- Unificar qué casos de uso extiende CU-15 (2.8.6.3 dice CU-04 y CU-08; 2.8.6.5 dice CU-06 y CU-08).

## Temas de estudio para la sustentación

Lógica que conviene repasar a fondo al terminar el desarrollo, porque es probable que el jurado
la pregunte. Cada tema tiene su documento técnico.

| Tema | Por qué es importante | Documento |
|---|---|---|
| Identificador UUID v7 | Sostiene el registro sin conexión entre varios dispositivos (RD-02) y la deduplicación de la sincronización (3.7.8) | [01-identificador-uuidv7.md](docs/tecnica/01-identificador-uuidv7.md) |
