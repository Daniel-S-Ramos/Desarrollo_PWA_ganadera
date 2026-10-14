# 13 · Registro de un animal

| | |
|---|---|
| **Componente** | Registro de animales · `src/modulos/identificacion/registroAnimal.ts` · `src/modulos/identificacion/PantallaRegistrarAnimal.tsx` |
| **Capa** | Lógica (módulo de identificación, Tabla 20) y presentación |
| **Origen en el documento** | CU-02 (Tabla A2) · HU-01 (Tabla B1) · RF-01, RF-03, RF-04, RF-27, RF-28 · apartados 3.7.3 (tercera regla), 3.8.8, 3.8.10, 3.10.1, 3.10.4.2, 3.10.4.3 · Tabla 31 |
| **Depende de** | [02 · Esquema local](02-esquema-local.md) · [03 · Repositorio y cola](03-repositorio-y-cola.md) · [08 · Permisos](08-permisos.md) · [09 · Subida](09-sincronizacion-subida.md) |
| **Pruebas** | PU-14 · PI-01 (verificación 12) · PE-17 |

---

## 1. El problema

El registro del animal es el punto de entrada de toda la información del predio (HU-01): ningún
evento sanitario, productivo o reproductivo puede consignarse sobre un animal que no existe. Y el
apartado 3.8.10 le da a la chapeta el papel de un documento de identidad:

> Se asigna cuando el animal ingresa, lo acompaña durante toda su vida y no se reutiliza en ningún
> otro ejemplar, de manera que si la chapeta física se pierde se repone una nueva con el mismo número.

De ahí salen las tres exigencias de este componente:

1. **La chapeta es única entre todos los animales, activos y retirados** (CU-02 paso 4, HU-01
   criterios 1 y 2), porque reutilizar el número de un animal vendido confundiría dos historiales.
2. **La ficha no se modifica después** (servidor de solo inserciones, documento 05). Lo que no se
   capture al registrar solo podrá agregarse como corrección (3.9.5). Por eso el formulario debe
   pedir bien los datos desde el principio.
3. **Todo funciona sin conexión** (HU-01 criterio 5, RF-28).

Las fotografías (CU-02 paso 6, HU-01 criterios 3 y 4) son el paso 2.2. En este paso el animal se
guarda sin ellas, que es justamente el flujo alternativo 6a.

## 2. La chapeta

### 2.1 La numeración del predio y la normalización (decisión A, revisada)

El 2026-10-12, durante la prueba PE-17, el propietario definió cómo numerará su ganado:

> Los números del **1 al 9999**, en orden. Después, una **letra seguida de un número del 1 al 999**:
> A1 … A999, luego B1 … B999, y así sucesivamente. **No usará la letra O**, que se confunde con el cero.

La primera versión de esta regla conservaba los ceros a la izquierda (`045` ≠ `45`), suponiendo que
el número se imprimía con ellos. Con la numeración del propietario **los ceros no significan nada**:
`01` y `1` son la misma chapeta, y aceptar las dos crearía dos animales para un mismo número.

**Normalización.** Antes de comparar y de guardar, lo escrito se convierte en la forma oficial:

| Regla | Ejemplo | Razón |
|---|---|---|
| Se quitan los espacios y los guiones | `" A-1 "` → `A1` | Un espacio o un guion accidental crearía un segundo animal |
| Las letras pasan a mayúsculas | `a1` → `A1` | Es la misma chapeta |
| **Se quitan los ceros a la izquierda del número** | `01` → `1` · `A015` → `A15` | En la numeración del predio no significan nada |

**Formato.** Después de normalizar, el código debe ser:

| Forma | Expresión | Ejemplos válidos | Ejemplos rechazados |
|---|---|---|---|
| Un número del 1 al 9999 | `[1-9][0-9]{0,3}` | `1`, `45`, `9999` | `0`, `10000` |
| Una letra (A–Z sin O ni Ñ) y un número del 1 al 999 | `[A-NP-Z][1-9][0-9]{0,2}` | `A1`, `I5`, `Z999` | `O1`, `A0`, `A1000`, `AB1`, `1A` |

Lo que no cumpla el formato se rechaza con un mensaje que lo explica: *«Use un número del 1 al
9999, o una letra seguida de un número del 1 al 999 (por ejemplo, A15)»*. Si empieza por O, el
mensaje pregunta si se quiso escribir un cero. Nada se quita en silencio salvo lo de la tabla de
normalización, porque cambiaría lo que el usuario cree haber escrito.

El código se guarda **ya normalizado**: es la única forma de que la restricción de unicidad del
servidor, que compara texto exacto, coincida con la verificación del teléfono.

### 2.4 Serie reservada para pruebas: Z900 a Z999

Las pruebas que escriben en el servicio real (PI-01, PI-03, PI-04 y las manuales como PE-17) usan
chapetas de la serie **Z900 a Z999**. El predio tardaría décadas en llegar a ella: antes van 9.999
números y 24 letras de 999. Usar `1` o `2` en una prueba ocuparía números que el propietario va a
usar de verdad, y el servidor no admite borrados desde la aplicación. Antes de la evaluación, un
script borra del servicio los animales de esa serie (pendiente 6.x del PLAN).

| Chapetas | Uso |
|---|---|
| Z901 – Z919 | PI-01 y PI-03 (se revierten al terminar) |
| Z920 – Z949 | Pruebas manuales (PE-17 y siguientes) |
| Z950 – Z999 | PI-04 (se borra con la limpieza de la cuenta de prueba) |

### 2.2 Unicidad en dos niveles

| Nivel | Cuándo | Qué pasa si la chapeta ya existe |
|---|---|---|
| **1. En el formulario** (CU-02 paso 4) | Mientras se escribe la chapeta | Se muestra el animal que ya la tiene y el botón Guardar se inhabilita (Tabla 31) |
| **2. Al guardar, dentro de la transacción** | En la misma transacción que crea el animal | La transacción se aborta: no se crea el animal ni su entrada en la cola |
| **3. En el servidor** | Cuando el registro llega (restricción `unique`) | El motor de sincronización lo marca **En conflicto** con la causa «El código de chapeta ya está asignado a otro animal» (documento 09) |

**¿Por qué verificar dos veces en el teléfono?** La primera verificación ocurre antes de que el
usuario pulse Guardar, y entre ese momento y la escritura puede pasar algo: un doble toque que
lanza dos guardados, o una sincronización que trae del servicio un animal con esa chapeta. La
segunda verificación se hace **dentro de la transacción de escritura**. IndexedDB ejecuta en serie
las transacciones de escritura sobre una misma tabla, así que si dos guardados compiten, el segundo
encuentra el animal que creó el primero y se aborta.

**El límite que no se puede eliminar.** El teléfono solo puede comparar con lo que tiene. Si dos
teléfonos sin señal registran la misma chapeta, ambos lo aceptan, y el servidor rechaza el que
llegue segundo (3.7.3, tercera regla). La resolución de ese conflicto (corregir el código o anular
el duplicado) es un pendiente de diseño que se consultará con el propietario (decisión E).

### 2.3 Qué se muestra cuando la chapeta está repetida

La Tabla 31 exige mostrar **el animal que ya tiene el código**, para que el usuario distinga entre
un error de digitación y un animal que ya estaba registrado:

> ⚠ **La chapeta 45 ya está asignada.**
> Hembra · nacida el 4 de marzo de 2021 · registrada por José Ramos
> *Retirada del predio* (solo si tiene una salida)

La consulta mira todos los animales del teléfono, también los retirados: un animal está retirado
cuando tiene una salida (documento 02, sección 6.1), y su chapeta sigue ocupada.

## 3. El origen del animal (decisión B)

RF-03 pide «fecha de ingreso o de nacimiento, indicando si esta última es exacta o estimada». En
lugar de presentar los dos campos a la vez, el formulario pregunta primero el origen con dos botones
grandes (3.10.1, segundo criterio), y según la respuesta pide solo lo que aplica:

| Campo | Nacido en el predio | Comprado |
|---|---|---|
| `fecha_nacimiento` | **Obligatoria**. Hoy por defecto | Opcional: como fecha o como **edad aproximada** |
| `fecha_nacimiento_exacta` | `true` por defecto; puede marcarse «fecha aproximada» | `false` si se da la edad; elegible si se da la fecha (estimada por defecto) |
| `fecha_ingreso` | Vacía | **Obligatoria**. Hoy por defecto |
| `procedencia` | Vacía | Opcional, hasta 100 caracteres (finca, vendedor, municipio) |

### 3.1 El origen no se almacena: se deduce

No se agrega una columna de origen. **Un animal sin fecha de ingreso nació en el predio**, porque
un animal comprado siempre la tiene. Es la misma idea del estado retirado (documento 02, sección
6.1): un dato que se puede deducir no se guarda, porque guardarlo abre la posibilidad de que se
contradiga con los demás.

### 3.2 Edad aproximada

En la entrevista el propietario contó que de un animal comprado conoce «la edad aproximada». Pedirle
una fecha de nacimiento que no conoce lo obligaría a inventarla. El formulario le permite escribir
la edad tal como la sabe, **en meses o en años**, y la convierte:

```
fecha_nacimiento = fecha del predio de hoy − edad
fecha_nacimiento_exacta = false
```

La resta de meses conserva el día; si ese día no existe en el mes de llegada (31 de marzo menos un
mes), se toma el último día del mes (28 o 29 de febrero). La edad admite de 0 a 300 meses (25 años).

Con `fecha_nacimiento_exacta = false`, la ficha (paso 2.4) presentará la edad como aproximada
(3.8.10, Tabla 31): «unos 18 meses» y no «18 meses».

### 3.3 Validaciones

| Regla | Mensaje |
|---|---|
| El sexo es obligatorio | «Indique si es macho o hembra» |
| Ninguna fecha es posterior a hoy (fecha del predio, America/Bogota) | «La fecha no puede ser posterior a hoy» |
| El nacimiento no es posterior al ingreso | «La fecha de nacimiento no puede ser posterior a la de ingreso» |
| El peso inicial, si se da, es mayor que 0 y como máximo 1.500 kg | «El peso debe estar entre 1 y 1.500 kg» |

El peso inicial es opcional: de una cría recién nacida casi nunca se conoce. El tope de 1.500 kg
no es una regla del predio sino una protección contra errores de digitación (15000 en vez de 150).

## 4. La genealogía (decisión C)

RF-04 pide la madre y el padre «cuando se conozcan, admitiendo que el padre sea un reproductor
externo al predio». Va en una sección plegada «Genealogía (opcional)», para no alargar el registro
cuando no se conoce:

| Campo | Opciones | Regla |
|---|---|---|
| **Madre** | Desconocida · del predio · externa | Una hembra registrada, o un nombre o referencia en texto (hasta 100 caracteres), **nunca las dos cosas** |
| **Padre** | Desconocido · del predio · externo | Un macho registrado, o un nombre o referencia en texto (hasta 100 caracteres), **nunca las dos cosas** (3.8.8) |

**La madre externa** se agregó durante la prueba PE-17 (2026-10-12), a pedido del propietario: un
animal comprado puede tener una madre conocida que nunca perteneció al predio. El documento solo
previó el padre externo (RF-04, 3.8.8), así que el modelo suma la columna `madre_externa` con la
misma regla que `padre_externo` (pendiente para el documento: RF-04 y Tabla 24).

La lista de animales incluye también los retirados, marcados como tales: la madre de un animal
puede haberse vendido o muerto, y el propietario la recuerda. Si no hay ninguna hembra (o ningún
macho) registrado, la lista se inhabilita y lo dice: *«No hay hembras registradas en este
teléfono.»*

Los animales se ordenan **como números y no como texto**: 9 antes que 10, y A2 antes que A10. Los
números van antes que las letras, que es el orden en que el propietario los asigna.

**Por qué ahora y no en la Iteración 4.** RF-04 se asoció a la historia de partos, pero la ficha
no se modifica: si la genealogía no se captura al registrar, en la carga de los 55 animales se
perdería la madre de los nacidos en el predio, que sí se conoce. El registro de partos (CU-10)
reutilizará esta misma función con la madre ya fijada (CU-10 incluye a CU-02, 2.8.6.5).

## 5. Lo que queda fuera de este paso

| Qué | Dónde |
|---|---|
| Las tres fotografías | Paso 2.2 (el formulario recibe ahí su sección de fotografías) |
| El destino productivo inicial (CU-12, solo el propietario) | Paso 3.2, en el mismo formulario y en la misma transacción (decisión D) |
| La resolución de un conflicto de chapeta | Pendiente de diseño; se consulta con el propietario (decisión E) |
| El listado y la ficha | Pasos 2.3 y 2.4 |

## 6. La función de registro

```ts
registrarAnimal(formulario, autor): Promise<
  | { ok: true; animal: RegistroLocal<'animal'> }
  | { ok: false; errores: ErroresFormulario }          // validación (sección 3.3 y 4)
  | { ok: false; chapetaAsignada: AnimalConChapeta }   // verificación dentro de la transacción
>
```

1. **Normaliza** la chapeta y **valida** el formulario completo con funciones puras, sin tocar la
   base de datos. Si hay errores, los devuelve todos juntos, uno por campo.
2. **Convierte** el formulario en los datos de la Tabla 24: la edad en fecha, el origen en fechas
   vacías o llenas, la genealogía en `madre_id` o `madre_externa` y en `padre_id` o `padre_externo`.
3. Abre una **unidad de trabajo** (documento 03) y dentro de ella:
   - Vuelve a buscar la chapeta. Si ya existe, aborta la transacción.
   - Verifica que la madre y el padre del predio existan y tengan el sexo correcto.
   - Crea el animal. El repositorio le asigna identificador, autor, fecha de creación y estado
     pendiente, y crea su entrada en la cola.
4. Antes de todo, la función consulta al gestor de permisos (`puedeCrear(perfil, 'animal')`,
   documento 08) y rechaza con `PermisoDenegado` sin escribir. No usa `crearAutorizado` porque
   necesita una unidad de trabajo con la verificación de la chapeta, no una escritura suelta.
5. La lectura del autor del animal existente, para mostrarlo, se hace **después** de abortar la
   transacción: la tabla de usuarios no forma parte de las transacciones de escritura.

La validación (paso 1) y la escritura (paso 3) están separadas para que la validación pueda
probarse sin base de datos y para que la pantalla la reutilice mientras el usuario escribe.

## 7. La pantalla

Sigue los criterios del apartado 3.10:

- **Una sola pantalla** (3.10.1, primer criterio), en el orden en que se necesitan los datos:
  chapeta, sexo, origen con sus fechas, peso, genealogía plegada.
- **Botones en lugar de escritura** para el sexo, el origen y la unidad de la edad; **hoy** como
  fecha por defecto (3.10.1, segundo criterio).
- La chapeta en tamaño grande (3.10.4.3) y con teclado alfanumérico; el peso y la edad con teclado
  numérico.
- **Guardar animal** relleno en verde; **Cancelar** con fondo claro (3.10.4.2). Los errores
  aparecen debajo de cada campo al intentar guardar, o al salir de él si ya se escribió algo, nunca
  mientras se escribe. Un campo **vacío** no se señala antes de intentar guardar: en PE-17 el aviso
  «Escriba el número de la chapeta» aparecía apenas el campo perdía el foco, antes de que el usuario
  hiciera nada (ajuste del 2026-10-12).
- **Al guardar**: «Animal 45 registrado», con el distintivo *Pendiente* si aún no se envió (Tabla
  22), y dos acciones: **Registrar otro** (útil para la carga inicial) y **Volver al inicio**. La
  ficha llegará en el paso 2.4 y entonces el regreso será a ella (3.10.3).
- **Cancelar** (CU-02, 7a): si ya se escribió algo, pide confirmación «¿Descartar los datos de este
  animal?». No se guardan borradores: si la aplicación se cierra a mitad del registro, al volver el
  formulario aparece vacío (Tabla 31).
- **Sin conexión** el registro se completa igual y sin ningún mensaje de error (Tabla 31).

### 7.1 Navegación

Este es el primer paso con más de una pantalla de trabajo, así que entra `react-router` (ya
instalado desde la Fase 0): `/` para el inicio y `/animales/nuevo` para el registro. El Service
Worker sirve `index.html` para cualquier ruta, de modo que abrir `/animales/nuevo` funciona sin
conexión.

En la pantalla de inicio aparece el acceso **Registrar animal**, para ambos perfiles (Tabla 27).

## 8. Defensa en el servidor

La normalización la aplica el teléfono, pero el servicio no debe aceptar algo que el teléfono nunca
enviaría (3.9.3: el teléfono oculta y rechaza, el servicio decide). La restricción del servicio usa
la misma expresión que el teléfono.

Se llegó a ella en dos migraciones, ambas del 2026-10-12:

| Migración | Contenido |
|---|---|
| `20261012000100_formato_chapeta.sql` | Primera versión: letras, dígitos y guiones, hasta 20 caracteres (`^[A-Z0-9-]{1,20}$`) |
| `20261012000200_chapeta_del_predio_y_madre_externa.sql` | Numeración del predio, tras la consulta con el propietario en PE-17, y la columna `madre_externa` |

```sql
alter table public.animal
  drop constraint animal_codigo_chapeta_formato,
  add constraint animal_codigo_chapeta_formato check (codigo_chapeta ~ '^([1-9][0-9]{0,3}|[A-NP-Z][1-9][0-9]{0,2})$'),
  add column madre_externa text,
  add constraint animal_madre_una_sola_forma check (madre_id is null or madre_externa is null);
```

La primera migración no se edita porque ya estaba aplicada (las migraciones aplicadas no se
modifican, `supabase/migrations/README.md`). Al aplicar la segunda no había animales reales en el
servicio, y las pruebas PI-01, PI-03 y PI-04 pasaron a usar la serie Z900–Z999 (sección 2.4).

## 9. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-01 · HU-01 criterios 1 y 2** | Chapeta obligatoria, normalizada y única en tres niveles; si está repetida se informa la causa y se impide continuar |
| **RF-03** | Origen con fechas, exactitud, sexo, procedencia y peso inicial |
| **RF-04** | Madre y padre opcionales, cada uno del predio o externo |
| **RF-27** | El repositorio fija autor y fecha de creación |
| **RF-28 · HU-01 criterio 5** | Todo se valida y se guarda en el teléfono |
| **Tabla 31** | Muestra el animal que ya tiene la chapeta; admite fecha estimada; no guarda borradores; sin mensajes de error al registrar sin conexión |

## 10. Pruebas

### PU-14 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Chapeta | Quita espacios, guiones y ceros a la izquierda, pasa a mayúsculas (`01` = `1`, `a-01` = `A1`); admite 1–9999 y letra + 1–999; rechaza la O, la Ñ, las tildes, el cero, dos letras y lo que sale de rango |
| 2 | Origen | Nacido: exige fecha de nacimiento y deja vacíos ingreso y procedencia. Comprado: exige fecha de ingreso |
| 3 | Edad aproximada | Meses y años se convierten en fecha con `exacta = false`; fin de mes (31 de marzo − 1 mes = 28 o 29 de febrero) |
| 4 | Validaciones | Fechas futuras, nacimiento posterior al ingreso, sexo vacío, peso fuera de rango; todos los errores juntos |
| 5 | Genealogía | Madre hembra, padre macho; cada uno del predio o externo, nunca ambos; inexistentes se rechazan; la lista se ordena como números |
| 6 | Chapeta repetida | Se detecta en un animal activo y en uno retirado; la consulta devuelve los datos para mostrarlo |
| 7 | Verificación dentro de la transacción | Dos registros simultáneos con la misma chapeta: queda un animal y una entrada en la cola |
| 8 | Registro correcto | Animal guardado con la chapeta normalizada, pendiente, con autor, y su entrada en la cola |
| 9 | Permisos | Ambos perfiles pueden registrar (CU-02) |

Cada grupo se valida con mutaciones, como en la Iteración 1.

### PI-01, verificaciones 12 y 13

- **12.** El servicio rechaza una chapeta en minúscula, con espacio, con cero inicial, con la letra
  O, el cero, dos letras y los valores fuera de rango, y admite `Z905`.
- **13.** El servicio rechaza un animal con madre del predio y madre externa a la vez.

### PE-17 (manual)

Con chapetas de la serie Z920–Z949 (sección 2.4).

1. Como **trabajador** y **sin conexión**, registrar un animal comprado con edad aproximada. Debe
   guardarse sin mensajes de error y quedar *Pendiente* (criterios heredados HU-06.1 y HU-07.1;
   HU-01 criterio 5).
2. Intentar registrar otro animal con la misma chapeta escrita con ceros, espacios o en minúsculas
   (`z0920`). Debe mostrar el animal que ya la tiene e impedir guardar (HU-01 criterio 2).
3. Registrar un animal nacido en el predio con madre del predio o externa y padre externo.
4. Empezar un registro, cerrar la aplicación y volver a abrirla: el formulario debe aparecer vacío.
5. Volver la conexión: los registros deben enviarse y llegar al servicio con la chapeta normalizada.

## Referencias

- Documento de trabajo de grado: CU-02 (Tabla A2); HU-01 (Tabla B1); RF-01, RF-03, RF-04, RF-27,
  RF-28; apartados 3.7.3, 3.8.8, 3.8.10, 3.9.3, 3.10.1 – 3.10.4.3; Tablas 22, 24, 27 y 31.
