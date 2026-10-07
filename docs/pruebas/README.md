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
| [iteracion-1.md](iteracion-1.md) | Iteración 1: fundación técnica (en curso) | 1 | 1 aprobada |

## Matriz de trazabilidad entre requerimientos y pruebas

Se completa a medida que avanzan las iteraciones. Al cierre del desarrollo cada requerimiento
debe tener al menos una prueba que lo verifique (apartado 1.6.3.11).

| Requerimiento | Descripción breve | Pruebas | Estado |
|---|---|---|---|
| RF-28 | Registrar y consultar sin conexión | PE-07, PE-10 (base técnica: la aplicación abre sin red) | 🔄 Parcial: falta registrar y consultar datos |
| RNF-01 | Operación en condiciones de campo | PU-01 (contraste 7:1 en todas las combinaciones de texto) | 🔄 Parcial: falta el tamaño de los controles y la prueba en campo |
| RNF-07 | Acceso condicionado a autenticación | PE-04 (registro abierto cerrado en el servicio) | 🔄 Parcial: falta el inicio de sesión |
| RNF-10 | Navegadores móviles y de escritorio | PE-06, PE-11 | 🔄 Parcial: falta la prueba en un teléfono real |
| RNF-11 | Instalable sin tienda de aplicaciones | PE-11 | ✅ Verificado |
| RNF-13 | Arquitectura modular | PE-02 (estructura por capas y módulos) | 🔄 Parcial: se verifica con cada módulo construido |
| RNF-08 | Autoría y fecha de creación inalterables | PU-02 (campos de solo lectura en el tipo) | 🔄 Parcial: falta la restricción en la base de datos |
| RD-01 | Almacenamiento primario en el dispositivo | PE-10 (recursos servidos desde el dispositivo) | 🔄 Parcial: falta el almacenamiento de datos |
