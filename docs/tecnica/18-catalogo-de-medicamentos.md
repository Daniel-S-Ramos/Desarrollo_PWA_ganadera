# 18 · Catálogo de medicamentos y parámetros

| | |
|---|---|
| **Componente** | Módulo de sanidad (Tabla 20) · `src/dominio/medicamentos.ts` · `src/modulos/sanidad/catalogo.ts` · `src/modulos/sanidad/PantallaMedicamentos.tsx` · `src/datos/parametros.ts` |
| **Capa** | Dominio, lógica y presentación |
| **Origen en el documento** | RF-09 · CU-04 · apartado 3.8.9 · Tablas 24, 27, 28, 30 y 31 |
| **Depende de** | [03 · Repositorio](03-repositorio-y-cola.md) · [05 · Esquema remoto](05-esquema-remoto.md) · [08 · Permisos](08-permisos.md) |
| **Lo usan** | El registro sanitario y la advertencia por repetición (pasos 3.3 y 3.4); el promedio de leche (paso 3.6); los recordatorios (Iteración 5) |
| **Pruebas** | PU-19 · PI-01 (verificación 14) · PE-23 |

---

## 1. El problema

El apartado 3.8.9 explica por qué el medicamento es una entidad propia y no un texto dentro de cada
evento sanitario: el requerimiento RF-09 exige advertir cuando un mismo medicamento se aplica dos
veces dentro de un intervalo, y esa comparación no puede depender de cómo se escriba el nombre.

> Si un día se escribe Ivermectina, otro día ivermectina y otro una abreviatura, el sistema no
> reconoce que se trata del mismo producto y la advertencia no aparece. […] Dejarla dependiendo de
> cómo se escriba un nombre equivale a no tenerla.

La advertencia es el control que el prototipo existe para aportar: la caracterización documenta la
muerte de un animal de unos 190 kg tras recibir por segunda vez un medicamento. El catálogo es la
condición para que esa advertencia funcione.

## 2. Qué significa el intervalo de advertencia

Cada medicamento tiene un intervalo en días (`intervalo_advertencia_dias`, 3.8.9). El documento lo
define por su efecto: RF-09 pide advertir cuando se aplica «un mismo medicamento a un animal dentro de
un intervalo previamente definido». Se interpreta así:

> El intervalo es el **mínimo de días que debe pasar entre dos aplicaciones del mismo medicamento al
> mismo animal**. Si una nueva aplicación llega antes, la aplicación advierte, muestra la anterior y
> pide una confirmación explícita (3.10.4.4). No bloquea: puede ser un tratamiento legítimo.

**Por qué esta precisión.** Al reunir el catálogo del predio (2026-10-13), la información disponible
de los productos indicaba el intervalo entre dosis de un **tratamiento** (por ejemplo, «48 horas en el
esquema de dos dosis») o «dosis única». La interpretación anterior traduce directamente el primer caso:
con un tratamiento cada 48 horas, una nueva aplicación antes de 2 días es sospechosa; a los 2 días, no.
Para los productos de **dosis única**, en cambio, el número no se deduce: hay que decidir desde cuándo
una nueva aplicación deja de ser un error, y ese es justamente el caso del animal que murió. Lo define
el propietario con su veterinario (Tabla 30).

**Se cuenta en días porque el evento sanitario registra la fecha y no la hora** (Tabla 24):

| Intervalo del tratamiento | Intervalo de advertencia | Advierte si la nueva aplicación es… |
|---|---|---|
| Cada 24 horas | 1 día | el mismo día |
| Cada 48 horas | 2 días | el mismo día o al día siguiente |
| Cada 72 horas | 3 días | dentro de los 2 días siguientes |
| Cada 12 horas | 1 día | el mismo día: la segunda dosis del día **advierte** y se confirma. Es aceptable porque la advertencia no bloquea |
| Dosis única | Lo que defina el propietario | dentro de ese plazo |

**La última aplicación se muestra siempre, en dos niveles** (precisión del autor, 2026-10-13). Aunque
una nueva aplicación llegue después del intervalo y en teoría sea correcta, quien registra debe saber
cuándo fue la anterior. El intervalo decide el nivel:

| Situación | Lo que se muestra al elegir el medicamento para un animal |
|---|---|
| Nunca se le ha aplicado | Nada especial |
| Ya se le aplicó, **fuera** del intervalo | **Información**, sin bloquear: «Última aplicación de Florfenicol a este animal: 12 de octubre de 2026 (hace 3 días), registrada por Daniel Ramos» |
| Ya se le aplicó, **dentro** del intervalo | **Advertencia** con la misma información; Guardar queda inhabilitado hasta marcar «Confirmo que esta nueva aplicación es correcta» (3.10.4.4) |

Un intervalo más largo es más prudente: más días en los que se exige la confirmación.

El intervalo admite de **1 a 730 días**. Cero no tiene sentido (nunca advertiría) y dos años cubre
cualquier ciclo de vacunación o programa antiparasitario. La comparación exacta (`fecha nueva − fecha
anterior < intervalo`) se especifica con la advertencia, en el paso 3.4.

## 3. El nombre: comparación sin mayúsculas, tildes ni espacios repetidos (decisión A)

| Escrito | Forma de comparación |
|---|---|
| `Ivermectina` · `ivermectina` · ` IVERMECTINA ` | `ivermectina` |
| `Ivermectína` (tilde por error) | `ivermectina` |
| `Ivermectina  1%` (dos espacios) | `ivermectina 1%` |

**La regla:** se quitan los espacios del principio y del final, los espacios repetidos se reducen a uno,
todo pasa a minúsculas y las vocales con tilde o diéresis pasan a su vocal simple (á→a, é→e, í→i, ó→o,
ú→u, ü→u, y sus variantes con acento grave o circunflejo). La **ñ se conserva**: es una letra distinta.

El nombre **se guarda como se escribió** (con su tilde y sus mayúsculas, para mostrarlo bien); la forma
normalizada solo se usa para comparar.

**Hoy el servicio solo ignora las mayúsculas** (índice único sobre `lower(trim(nombre))`, PI-01
verificación 8), así que aceptaría `Ivermectína` como un producto distinto de `Ivermectina`. Una
migración nueva crea la función `normalizar_nombre(text)` con la misma regla, inmutable y sin
extensiones (con `translate` para las vocales), y reemplaza el índice único por uno sobre
`normalizar_nombre(nombre)`. La regla del teléfono y la del servicio son idénticas.

## 4. Nombres parecidos (decisión B)

| Caso | Qué hace la aplicación |
|---|---|
| El nombre normalizado **coincide** con uno del catálogo | No permite crearlo: «Ya existe *Ivermectina*», con el botón **Usar Ivermectina** (Tabla 31) |
| El nombre es **parecido** a otros | Muestra «¿Es alguno de estos?» con los parecidos y permite crearlo igual, porque puede ser otra presentación o concentración (`Ceftiofur` y `Ceftiofur de acción prolongada` son productos distintos) |
| Sin coincidencias | Lo crea |

**Parecido** significa que uno de los dos nombres normalizados contiene al otro (`ceftiofur` dentro de
`ceftiofur de accion prolongada`), o que comparten la primera palabra (`oxitetraciclina` y
`oxitetraciclina la`). Es una ayuda para quien registra, no una regla.

La coincidencia exacta se verifica además **dentro de la transacción** que crea el medicamento, como la
chapeta (documento 13, sección 2.2), para que dos toques rápidos no creen dos entradas.

## 5. Crear un medicamento

| Campo | Regla |
|---|---|
| Nombre | Obligatorio, de 2 a 60 caracteres, sin coincidir con uno existente (sección 3) |
| Tipo | Vacuna, purga, vitamina, antibiótico u otro (3.8.9), con botones |
| Unidad de dosis | ml, cc, mg o dosis (paso 1.1), con botones |
| Intervalo de advertencia | **Obligatorio y sin valor sugerido** (decisión C), entero de 1 a 730 días, con la ayuda «¿Cada cuántos días como mínimo puede repetirse en el mismo animal? Consúltelo con el veterinario.» |

**Quién lo crea:** ambos perfiles (Tabla 27: el trabajador registra eventos sanitarios y la Tabla 31 le
permite incorporar un medicamento sin abandonar el registro; el servicio ya lo permite, documento 08).

**Un medicamento no se modifica.** Un error en el nombre, la unidad o el intervalo se enmienda con una
corrección (Iteración 4), como cualquier registro.

## 6. Dónde se gestiona (decisión D)

- **Dentro del registro sanitario** (paso 3.3, Tabla 31): elegir de la lista o agregar uno nuevo sin
  salir del registro.
- **Una pantalla Medicamentos**, desde el inicio, para ambos perfiles: el catálogo ordenado por tipo y
  nombre, con **Agregar medicamento**. Sirve para cargar el catálogo antes de empezar la evaluación, como
  los animales. La Tabla 28 no la incluye: se anota como pendiente para el documento.

## 7. El catálogo inicial (decisión E)

Lo registra el propietario desde la pantalla Medicamentos, con los productos que usa y los intervalos
que defina con su veterinario. **No se cargan valores desde el diseño** (Tabla 30): el intervalo es una
decisión sanitaria. Tampoco se cargan por SQL, aunque la lista esté disponible: quedarían a nombre de
quien ejecute el script y no de quien los definió (HU-15, RNF-08).

**Catálogo del predio** (2026-10-13), propuesto a partir de la información que reunió el autor con el
propietario. Los tipos los propone el diseño, porque el propietario conoce los productos por el nombre;
la unidad se elige al registrar cada uno, entre las cuatro.

| Medicamento | Tipo | Intervalo de advertencia |
|---|---|---|
| Oxitetraciclina | Antibiótico | 1 día (tratamiento cada 24 h) |
| Oxitetraciclina de larga acción | Antibiótico | **35 días** (dosis única) |
| Florfenicol | Antibiótico | 2 días (cada 48 h) |
| Ceftiofur | Antibiótico | 1 día (cada 24 h; algunos esquemas, 48 h) |
| Ceftiofur de acción prolongada | Antibiótico | 3 días (72 h en metritis; en otras indicaciones, dosis única) |
| Enrofloxacina | Antibiótico | 1 día (cada 24 h) |
| Flunixin meglumina | Otro (antiinflamatorio) | 1 día (cada 24 h; la dosis cada 12 h advierte y se confirma) |
| Sulfadimetoxina | Antibiótico | 1 día (cada 24 h) |
| Ivermectina 1% inyectable | Purga | **35 días** (la referencia para reevaluar es de 28 a 56 días, que no es un mínimo de seguridad) |
| Ivermectina de larga acción | Purga | **35 días** (conviene revisarlo con la ficha técnica del producto) |
| Albendazol oral | Purga | **35 días** (la referencia para reevaluar es de 3 a 4 semanas; margen de seguridad estrecho) |
| Penicilina G procaínica | Antibiótico | 1 día (cada 24 h) |
| Vacuna contra la fiebre aftosa | Vacuna | **35 días** |
| Vacuna contra la brucelosis | Vacuna | **35 días** |

Los intervalos de los productos de varias dosis se deducen del intervalo entre dosis (sección 2) y
deben confirmarse con el uso habitual del predio. Para los seis productos sin un intervalo deducible
(dosis única y vacunas), el autor fijó **35 días** el 2026-10-13. Como la última aplicación se muestra
siempre (sección 2), pasado ese plazo la aplicación sigue informando la fecha anterior, sin exigir
confirmación. Cada valor puede enmendarse con una corrección (Iteración 4) si el veterinario indica otro. Durante las pruebas se usan medicamentos con el prefijo `Prueba` (por ejemplo,
«Prueba antiparasitario»), que se borran antes de la evaluación junto con los animales Z900–Z999.

## 8. Los parámetros (decisión F)

Los parámetros de la Tabla 30 ya están en el servicio (migraciones del paso 1.6 y 1.9) y llegan al
teléfono con la bajada (documento 10, sección 4.1). Este paso agrega solo su lectura:

```ts
leerParametro(clave): Promise<number | undefined>
```

Si un parámetro no está en el teléfono (por ejemplo, antes de la carga inicial), devuelve `undefined` y
quien lo usa decide qué hacer: el promedio de leche (paso 3.6) no se calcula; un recordatorio no se
muestra. **No hay valores por defecto en el código**: el valor vive en la tabla, como dispone el
apartado 3.8.9 («ajustar un criterio no exige modificar el código»). Editarlos desde la aplicación
queda fuera del alcance (3.8.9).

## 9. Riesgo: el mismo medicamento creado en dos teléfonos sin señal

Si dos teléfonos sin conexión crean el mismo medicamento, el servicio acepta el primero y rechaza el
segundo por el índice único. Los eventos sanitarios que usaron el rechazado en ese teléfono quedan
atascados, porque apuntan a un medicamento que el servicio no tiene. Es la misma familia de conflictos
que la chapeta repetida y se resolverá con ella (pendiente de diseño 4.3). La comparación sin tildes ni
espacios reduce la probabilidad, y la pantalla Medicamentos permite cargar el catálogo con conexión
antes de usarlo en campo.

## 10. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-09 · 3.8.9** | Catálogo con un intervalo por medicamento; la advertencia comparará identificadores, no textos |
| **Tabla 31** | Coincidencia → se ofrece el existente; alta sin abandonar el registro |
| **Tabla 30** | El intervalo lo define el propietario con el veterinario; ningún valor sugerido; parámetros en una tabla, no en el código |
| **Tabla 27** | Ambos perfiles crean medicamentos |

## 11. Pruebas

### PU-19 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Normalización | Mayúsculas, tildes, diéresis, espacios repetidos y extremos; la ñ se conserva |
| 2 | Coincidencia exacta | Se detecta y se ofrece el existente; también dentro de la transacción |
| 3 | Parecidos | Contención y primera palabra; no se confunden con la coincidencia exacta |
| 4 | Validación | Nombre de 2 a 60, tipo, unidad, intervalo entero de 1 a 730, todos los errores juntos |
| 5 | Catálogo | Ordenado por tipo y nombre |
| 6 | Parámetros | Lee el valor; `undefined` si no está |
| 7 | Permisos | Ambos perfiles crean medicamentos |

### PI-01, verificación 14

Con `Ivermectina` registrada, el servicio rechaza `Ivermectína` e `  ivermectina ` (23505) y admite
`Ivermectina 1%`.

### PE-23 (manual)

Agregar medicamentos de prueba desde el teléfono; comprobar que un nombre con otra escritura ofrece el
existente, que un nombre parecido muestra la sugerencia y que lo creado llega al otro dispositivo.

## Referencias

- Documento de trabajo de grado: RF-09; CU-04; apartados 3.8.9 y 3.10.4.4; Tablas 24, 27, 28, 30 y 31.

## Ajustes de la sesión C (2026-10-26)

- **Buscador por nombre.** Filtra el catálogo por cualquier parte del nombre, sin distinguir mayúsculas, tildes ni
  espacios repetidos (la forma de comparación de la sección 3; `filtrarPorNombre` en `src/dominio/medicamentos.ts`,
  PU-19.6). Pedido del propietario.
- **«Aplicar medicamento a un animal».** En la sesión, el propietario buscó aplicar la purga desde este acceso. El
  registro sanitario es de la ficha del animal (CU-04, documento 20), así que en lugar de duplicarlo aquí, el botón
  lleva a Animales con la guía «Busque y seleccione el animal al que desea aplicar algún medicamento. En su ficha,
  toque "Registrar evento"»; **Continuar** cierra la guía y deja el cursor en el buscador (documento 15). El botón
  de agregar pasa a llamarse «Agregar medicamento al catálogo», para que no se confunda con aplicar.
