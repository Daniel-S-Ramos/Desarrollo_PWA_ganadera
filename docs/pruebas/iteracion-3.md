# Pruebas de la Iteración 3 — Sanidad, leche y destino

Historias de usuario: HU-03 (registro sanitario), HU-04 (advertencia por repetición de medicamento),
HU-09 (producción de leche), HU-13 (destino productivo). Pasos 3.1 a 3.7 del [plan](../../PLAN.md).
Rama `iteracion-3`. Incluye los criterios heredados de la Iteración 2: HU-02.4 (acceso desde la ficha
al historial sanitario), HU-06.4 (opciones exclusivas del propietario ocultas al trabajador) y la
comprobación en la ficha de la última vacuna, la leche y el destino (HU-02.1).

**Responsable:** Daniel Santiago Ramos Pintor
**Estado:** en curso

## Resumen de resultados

| Id | Prueba | Paso | Requerimiento | Estado |
|---|---|---|---|---|
| PU-19 | Catálogo de medicamentos y parámetros | 3.1 | RF-09 · 3.8.9 · Tablas 27, 30 y 31 | ✅ |
| PI-01 | Esquema remoto: nombre de medicamento sin tildes ni espacios repetidos (verificación 14) | 3.1 | 3.8.9 · RF-09 | ✅ |
| PE-23 | Catálogo de medicamentos en el navegador real | 3.1 | 3.8.9 · Tabla 31 | ✅ |

---

## PU-19 · Catálogo de medicamentos y parámetros

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar la normalización del nombre, la coincidencia exacta (también dentro de la transacción), los parecidos, la validación, el orden del catálogo, la lectura de parámetros y los permisos |
| Requerimiento | RF-09 · apartado 3.8.9 · Tablas 27, 30 y 31 |
| Tipo | Unitaria, automática |
| Código | [`src/dominio/medicamentos.ts`](../../src/dominio/medicamentos.ts) · [`src/modulos/sanidad/catalogo.ts`](../../src/modulos/sanidad/catalogo.ts) · [`src/datos/parametros.ts`](../../src/datos/parametros.ts) · prueba [`catalogo.test.ts`](../../src/modulos/sanidad/catalogo.test.ts) · especificación [documento técnico 18](../tecnica/18-catalogo-de-medicamentos.md), sección 11 |
| Resultado obtenido | **33 de 33 aprobadas**. Total del conjunto automático: **531 de 531** ([informe](resultados/2026-10-13_235603_ec77b66.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-13 |

**Mutaciones.** Ocho, todas detectadas: no quitar las tildes (4 pruebas fallaron), no reducir los
espacios, quitar también la tilde de la ñ, tratar la coincidencia exacta como parecido, aceptar
palabras de menos de tres letras como parecido, no verificar dentro de la transacción, quitar los
límites del intervalo y ordenar sin el tipo.

## PI-01 · Nombre de medicamento sin tildes ni espacios repetidos (verificación 14)

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que el servicio rechaza otra escritura de un nombre ya registrado |
| Código | Migración [`20261013000100_nombre_medicamento_normalizado.sql`](../../supabase/migrations/20261013000100_nombre_medicamento_normalizado.sql) · [`supabase/pruebas/pi-01-esquema.sql`](../../supabase/pruebas/pi-01-esquema.sql), verificación 14 |
| Resultado obtenido | **14 de 14** ([evidencia](evidencias/iteracion-3/PI-01-7-medicamento-normalizado.txt)). Con «Prueba Ivermectina», se rechazan «Prueba Ivermectína» y «  prueba   IVERMECTINA » (23505) y se admite «Prueba Ivermectina 1%» |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-13 |

**Observación.** La verificación 8 insertaba «Ivermectina», que chocaría con el nombre real cuando el
propietario lo registre. Se cambió por «Prueba Ivermectina».

## PE-23 · Catálogo de medicamentos en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar el alta de medicamentos, la coincidencia con otra escritura, los parecidos, el intervalo obligatorio y la llegada al otro dispositivo |
| Requerimiento | 3.8.9 · Tabla 31 · Tabla 30 |
| Tipo | Manual: Chrome en el computador y Chrome en un iPhone, con la dirección de la rama `iteracion-3` |
| Resultado obtenido | Todos los pasos se comportaron como se esperaba |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-13 |

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 1 | Agregar «Prueba Florfenicol» (antibiótico, ml, 2 días) | Agregado | [captura](evidencias/iteracion-3/PE-23-3-catalogo-con-dos-medicamentos.png) |
| 2 | Escribir «prueba florfenicól» | «Ya existe Prueba Florfenicol», con **Usar Prueba Florfenicol** (Tabla 31) | [captura](evidencias/iteracion-3/PE-23-1-nombre-repetido-con-tilde.png) |
| 3 | Escribir «Prueba Florfenicol LA» | «¿Es alguno de estos?» y se puede agregar igual | [captura](evidencias/iteracion-3/PE-23-2-nombre-parecido.png) |
| 4 | Guardar sin intervalo | «Escriba un número entero de días, de 1 a 730», con la ayuda de consultar al veterinario | [captura](evidencias/iteracion-3/PE-23-4-intervalo-obligatorio.png) |
| 5 | Abrir Medicamentos en el iPhone | Los dos medicamentos llegaron; además bajaban las fotos de los animales («8 de 9») | [captura](evidencias/iteracion-3/PE-23-5-iphone-catalogo-sincronizado.jpg) |

**Observaciones.** (1) «Prueba Florfenicol LA» quedó registrado como vacuna, por un toque en el botón
equivocado. Un medicamento no se modifica: el error se enmendará con una corrección (Iteración 4), y
como es de prueba se borrará antes de la evaluación. (2) El espacio usado se mostró como «110 B» y
«4 B» en la primera apertura de la dirección de la rama: es la estimación que entrega el navegador
(`navigator.storage.estimate`), que aún no había medido ese almacenamiento. Se vigila en las próximas
pruebas.
