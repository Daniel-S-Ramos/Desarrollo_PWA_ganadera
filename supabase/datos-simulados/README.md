# Datos simulados de la evaluación

Paso 6.1 del plan (R4 de la ruta de cierre), apartado 1.6.3.8: «datos simulados que reflejen la estructura y el
volumen de información propios de la Ganadería JR». Es un entregable de la Tabla 3.

| Archivo | Qué es |
|---|---|
| [`../../scripts/datos-simulados.mjs`](../../scripts/datos-simulados.mjs) | El generador. Determinista (semilla fija): cada ejecución produce el mismo conjunto |
| [`cargar.sql`](cargar.sql) | Lo que produce el generador. **No se edita a mano** |
| [`vaciar.sql`](vaciar.sql) | Borra los registros del predio y el catálogo; conserva cuentas y parámetros |
| [`casos.json`](casos.json) | Los casos preparados por chapeta (vendidos, bajo la meta, terminados, anulados…), para los casos de prueba |

## Dónde se cargan (decisión del autor, 2026-10-24)

En el proyecto de Supabase de la finca (opción A), porque el propietario aún no registra datos reales. Antes de
entregar la aplicación (R9) se vacía de nuevo con `vaciar.sql` y el propietario empieza desde cero. **Mientras
tanto nadie registra datos reales.**

## Qué contiene

Un año de historia que termina el día de la carga: las fechas se guardan como «días antes de hoy» y el SQL las
resuelve con la fecha del predio. Supuestos del apartado 3.8.7 y la Tabla 26:

| Contenido | Cantidad | Detalle |
|---|---|---|
| Animales | 70 (56 activos) | Chapetas 201–215 vacas, 221–222 novillas, 301 toro, 401–442 ceba, 501–510 crías |
| Vacas en ordeño | 15 | 9 nacidas en el predio y 6 compradas; curva de lactancia; secado de 60 días antes del parto (destino reproductora y de vuelta a leche) |
| Ordeños | 4.633 | Diarios, hasta **ayer** (la ronda de hoy queda por hacer); 3 % de días sin anotar (3.8.6) |
| Ceba | 42 en el año, 28 activos | 14 que ya estaban y 28 comprados; ganan de 0,30 a 0,92 kg/día (9 bajo la meta de 0,5) |
| Pesajes | 175 | **Cada 30 a 75 días**: el propietario no pesa a diario; 85 % con cinta, 15 % con báscula |
| Salidas | 14 | 12 ventas de animales que pasaron de 505 kg (con destino «venta» antes), una muerte (timpanismo) y una pérdida o robo |
| Partos | 12 | 10 crías vivas (con madre, padre del predio o inseminación), un aborto y una cría nacida muerta |
| Colocaciones de chapeta | 9 | La cría más reciente (501) sigue sin chapeta puesta |
| Eventos sanitarios | 280 | Aftosa dos veces al año, purgas cada 100 a 140 días, vitaminas en partos y compras, 18 tratamientos con síntomas. **Sin dosis**: no se inventan dosis veterinarias |
| Movimientos económicos | 83 | Compras, alimentación y servicios veterinarios |
| Correcciones | 49 | 40 litros mal escritos y 6 pesos corregidos por su autor; 3 ordeños anulados y registrados de nuevo |
| Destinos | 97 | Con su historial |

**Autores.** José Ramos (propietario) y los dos trabajadores (Daniel Ramos y Fernando Pintor), con la regla de
la Tabla 27: destinos, salidas y economía solo el propietario. **Sin fotografías** (no se pueden simular): las
fichas muestran «Fotos: 0 de 3».

**Casos preparados para la evaluación:** la vaca 214 sin ordeño en los últimos 5 días y la 215 con una baja de
más del 35 % ayer (recordatorios); animales de ceba bajo la meta y terminados (más de 500 kg); la cría 501 sin chapeta;
animales sin pesaje reciente; vacas compradas y nacidas para el consolidado económico.

## Cómo se cargan

El catálogo de medicamentos **no se carga por SQL**: lo registra el autor en la aplicación con los productos
reales de la finca (al menos una vacuna, una purga, una vitamina y un antibiótico); los eventos simulados los
usan. Pasos (los ejecuta el autor):

1. En cada teléfono y computador, comprobar «✓ Todo enviado» y cerrar la aplicación.
2. `npm run datos:vaciar` (borrado definitivo, con autorización del autor).
3. Panel de Supabase → Storage → `fotografias`: borrar todos los archivos.
4. En el computador: borrar los datos del sitio, entrar como propietario y registrar el catálogo de
   medicamentos; esperar «✓ Todo enviado».
5. `npm run datos:cargar`.
6. En cada teléfono y computador: borrar los datos del sitio y volver a entrar (carga inicial).

El script verifica antes de escribir que estén las cuentas, que haya medicamentos y que el predio esté vacío, y
corre en una sola transacción. Se probó el 2026-10-24 contra el servidor dentro de una transacción revertida.
