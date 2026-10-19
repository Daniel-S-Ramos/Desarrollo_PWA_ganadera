# 25 · Parto, control reproductivo y chapeta pendiente de poner

| | |
|---|---|
| **Componente** | Módulo de reproducción (Tabla 20) · `src/dominio/reproduccion.ts` · `src/dominio/parentesco.ts` · `src/modulos/reproduccion/partos.ts` · `src/modulos/reproduccion/PantallaRegistrarParto.tsx` · `src/modulos/reproduccion/ControlReproductivo.tsx` · `src/modulos/identificacion/chapetaPendiente.ts` · migración `20261018000100_chapeta_puesta.sql` |
| **Capa** | Datos, dominio, lógica y presentación |
| **Origen en el documento** | RF-04 · RF-16 · RF-17 · RF-27 · RF-28 · CU-10 (Tabla A10, incluye a CU-02) · CU-11 (Tabla A11) · HU-12 (Tabla B12) · HU-02.4 (heredado) · apartados 3.8.8 y 3.8.11 · Tablas 24, 27 y 30 |
| **Depende de** | [13 · Registro de un animal](13-registro-de-animal.md) · [14 · Fotografías](14-fotografias.md) · [16 · Ficha](16-ficha-del-animal.md) |
| **Pruebas** | PU-26 · PI-01 (verificación 15) · PE-30 |

---

## 1. El problema

El propietario «no lleva un registro formal del número de partos, las fechas de estos, ni los intervalos
entre partos»: de quince vacas recuerda los partos de doce y solo la fecha del más reciente, y de los diez
terneros nacidos en el último año ninguno tiene su fecha exacta (apartados 2.2.8 y 2.3.3). HU-12 pide registrar los
partos y su genealogía «para conocer los intervalos entre partos y evitar cruces entre animales
emparentados».

## 2. El parto como evento de la vaca (apartado 3.8.8)

| Campo | Regla |
|---|---|
| `madre_id` | La vaca desde cuya ficha se registra |
| `fecha` | Hoy por defecto (CU-10, paso 2) |
| `resultado` | **Cría viva**, **cría nacida muerta** o **aborto** |
| `cria_id` | El animal nuevo, **si y solo si** el resultado es cría viva (restricción del servicio) |
| `observacion` | Opcional, hasta 300 caracteres (decisión H) |

El intervalo entre partos toma **todos** los partos, cualquiera que haya sido su resultado; la
descendencia lista solo las crías vivas (3.8.8). La tabla `parto` ya existe con estas restricciones.

## 3. Acceso (decisión A)

| Opción | Perfiles | Dónde |
|---|---|---|
| **Registrar parto** | Ambos (Tabla 27: CU-10 de creación para el trabajador) | Ficha de una **hembra** → `/animales/:id/parto` |
| **Control reproductivo** | **Solo el propietario** (CU-11 no se asigna al trabajador) | Ficha de una hembra, desplegado como el historial |

Con el control reproductivo se completa el último acceso de HU-02.4.

## 4. El formulario del parto (decisiones B, D y H)

Una sola pantalla:

1. **La vaca** (fija, con su chapeta), la **fecha** y el **resultado**, con tres botones grandes.
2. Con **cría viva**, la sección de la cría:
   - **Número de la cría**, prellenado con el siguiente número libre (sección 6) y modificable.
   - **Sexo**.
   - **Peso al nacer** (opcional, 1 a 1.500 kg).
   - **Fotografías** (opcionales, la misma sección del registro, documento 14).
   - **Reproductor**: del predio (lista de machos), externo (texto) o desconocido (8a).
   - La madre es la vaca y la fecha de nacimiento es la del parto, **exacta**; el origen es «nació en el
     predio». La cría queda con la **chapeta pendiente de poner** (sección 7).
3. Con **cría nacida muerta** o **aborto**, no hay sección de la cría (4a). El modelo no tiene dónde guardar
   el reproductor de un parto sin cría; si se conoce, se escribe en la observación.
4. **Observación**: abierta con cría nacida muerta o aborto; detrás de **Agregar observación** con cría
   viva.

**Una sola transacción.** El parto, la cría, sus fotografías y la entrada en la cola se crean juntos; si la
cría se rechaza (por ejemplo, el número ya existe), no se guarda nada. El destino de la cría se asigna
después desde su ficha.

### 4.1 Validaciones

| Regla | Mensaje |
|---|---|
| Se elige el resultado | «Elija el resultado del parto» |
| La fecha existe, no es futura ni anterior al nacimiento de la vaca | «Escriba una fecha válida» · «La fecha no puede ser posterior a hoy» · «La vaca nació el …» |
| La vaca es hembra y no está retirada | «Solo se registran partos de una hembra» · «Esta vaca salió del predio» |
| Con cría viva: número y sexo, con las reglas del registro (documento 13) | Los mensajes del registro: formato, «La chapeta … ya está asignada», «Indique si es macho o hembra» |
| Con cría viva y reproductor del predio: que sea macho y esté en el teléfono | «El padre debe ser un macho» |
| La observación no supera 300 caracteres | «Hasta 300 caracteres» |

### 4.2 Otro parto cercano (decisión F)

Si la vaca tiene otro parto a **menos de 240 días** de la fecha (antes o después), se pide confirmación sin
bloquear: «⚠ Z930 tiene un parto del 2 de marzo de 2026, hace 124 días. Una gestación dura unos nueve
meses: ¿no es el mismo parto?», con la casilla **Es otro parto**. Es un umbral para detectar errores, no un
criterio veterinario. Se repite al guardar, dentro de la transacción.

## 5. Cruce entre emparentados (decisión E, CU-10 8b, HU-12.4)

Con cría viva y reproductor **del predio**, se busca en la genealogía registrada si el reproductor es:

| Parentesco con la vaca | Regla |
|---|---|
| Padre / hijo | El reproductor es el padre de la vaca, o la vaca es su madre |
| Hermano o medio hermano | Comparten madre o padre del predio |
| Abuelo / nieto | El reproductor es padre de la madre o del padre de la vaca, o hijo de un hijo de la vaca |

Con reproductor **externo**, se advierte si su nombre, comparado sin mayúsculas, tildes ni espacios
repetidos (documento 18, sección 3), coincide con el padre externo de la vaca.

El aviso nombra el parentesco y pide confirmación explícita:

> ⚠ Z1001 es medio hermano de Z930: los dos son hijos de Z900.
> La revisión usa solo la genealogía registrada en la aplicación.
> ☐ Confirmo el cruce

Sin confirmar, Guardar queda inhabilitado; la regla se repite al guardar. Si hay varios parentescos, se
nombra el más cercano.

## 6. El siguiente número libre (decisión C)

La numeración del predio es 1 a 9999 y, después, una letra sin la O seguida de 1 a 999 (documento 13,
sección 2.1). El siguiente número libre es el que sigue al **mayor de esa secuencia** entre todas las
chapetas del teléfono: después de 1045, 1046; después de 9999, A1; después de A999, B1. Si no hay animales,
1. Como parte del mayor, siempre está libre. Si la secuencia se agotó (Z999), el campo queda vacío para
escribirlo. El campo se puede cambiar.

## 7. Chapeta pendiente de poner (decisiones I a L)

La cría recibe su **número** al nacer, pero la chapeta física se le pone después, cuando el ternero está
más fuerte; **el plazo máximo es de 90 días** (dato del propietario, 2026-10-18).

### 7.1 Cómo se guarda (decisión I) · migración `20261018000100_chapeta_puesta.sql`

| Cambio | Detalle |
|---|---|
| `animal.chapeta_puesta` | `boolean not null default true`. Se fija al registrar: **false** para las crías de un parto y para los nacidos en el predio registrados con «Aún no tiene la chapeta puesta»; true para los demás. Como todo el animal, no cambia |
| Tabla `colocacion_chapeta` | `id`, `autor_id`, `creado_en`, `recibido_en`, `animal_id` (**único**, hacia `animal`), `fecha`. Ambos perfiles insertan y consultan; solo inserciones, como el resto |
| Parámetro `dias_recordar_chapeta` | 90 días |

Una chapeta está **pendiente** si `chapeta_puesta` es false y el animal no tiene registro en
`colocacion_chapeta`. En el teléfono, la tabla nueva se agrega al esquema local (versión 2), a las tablas
que suben y bajan, y a la carga inicial, después de `animal`.

Cambia el modelo de datos del documento (Tabla 24) y los recordatorios del apartado 3.8.11: se anota en
los pendientes para el documento.

### 7.2 Confirmar que ya tiene la chapeta (decisión J)

En la ficha, para ambos perfiles:

> ⚠ **Chapeta pendiente de poner** · número 1046 · nació hace 12 días · quedan 78 días del plazo
> [Ya tiene la chapeta puesta]

El botón pide la **fecha** en que se puso: hoy por defecto, no futura ni anterior al nacimiento. Al guardar,
el aviso desaparece y la ficha muestra «Chapeta puesta el 29 de octubre de 2026 por Daniel Ramos». Si dos
teléfonos lo confirman sin conexión, el servicio admite el primero y el segundo queda en conflicto (la
unicidad), con su causa.

### 7.3 Recordatorio (decisión K)

Hasta que lleguen los recordatorios del predio (paso 5.3, donde será **un sexto tipo**):

| Dónde | Qué |
|---|---|
| **Inicio**, ambos perfiles | La sección **Terneros sin chapeta puesta**, mientras haya alguno: número, días de nacido y plazo, con enlace a su ficha. Los que pasaron los **90 días** van primero y en aviso de atención: «Plazo vencido hace 5 días» |
| **Listado** | Cada uno con la marca «Sin chapeta puesta» |

### 7.4 Terneros registrados sin parto (decisión L)

En el registro de un animal (documento 13), con el origen **Nació en el predio**, aparece la casilla **Aún no
tiene la chapeta puesta**, desmarcada por defecto. Marcada, el animal queda con la chapeta pendiente.

## 8. Control reproductivo (decisión G, CU-11)

| Aspecto | Regla |
|---|---|
| Resumen | «4 partos · intervalo promedio: 13,2 meses» |
| Lista | Del más antiguo al más reciente: fecha, resultado y el intervalo con el anterior en días y meses («392 días · 12,9 meses»). Los partos sin cría viva cuentan |
| Descendencia | Solo las crías vivas, con su número, sexo y enlace a su ficha (paso 5) |
| Sin partos (2a) | «Esta vaca no tiene partos registrados» |
| Un solo parto (4a) | «Con un solo parto no se puede calcular el intervalo» |

Un mes son 30,44 días (365,25 / 12). A igual fecha, dos partos se ordenan por su registro.

## 9. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-16 · HU-12.1 · CU-10** | Fecha, vaca y resultado obligatorios; la cría solo con cría viva |
| **RF-04 · HU-12.2 · CU-10 6 a 8, 8a** | La cría como animal nuevo, con madre y, si se conoce, padre del predio o externo |
| **HU-12.4 · CU-10 8b** | Advertencia de parentesco con confirmación |
| **RF-17 · HU-12.3 · CU-11** | Número de partos e intervalos con todos los resultados; descendencia con las vivas |
| **HU-02.4** | Acceso desde la ficha al control reproductivo |
| **Pedido del propietario** | Número al nacer, chapeta puesta después, con recordatorio y plazo de 90 días |

## 10. Pruebas

### PU-26 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Validaciones | Las reglas de la sección 4.1 |
| 2 | Transacción | Parto y cría juntos; con número repetido no se guarda nada; sin cría con los otros resultados |
| 3 | Cría | Madre, fecha exacta, origen nacido, padre del predio o externo, chapeta pendiente |
| 4 | Parto cercano | Menos de 240 días pide confirmación; 240 o más no |
| 5 | Parentesco | Padre, hijo, hermano, medio hermano, abuelo, nieto; externo con el mismo nombre; sin parentesco |
| 6 | Siguiente número | Después del mayor; 9999 → A1; A999 → B1; sin la O; vacío → 1; Z999 → vacío |
| 7 | Chapeta pendiente | Pendiente hasta confirmar; la fecha no anterior al nacimiento; vence después del día 90; lista de Inicio con vencidos primero |
| 8 | Control reproductivo | Intervalos con todos los partos, promedio, descendencia solo vivas, casos 2a y 4a |
| 9 | Permisos | El trabajador registra partos y confirma chapetas; no tiene CU-11 |

### PI-01 · verificación 15

Con la migración aplicada: una segunda colocación de chapeta del mismo animal se rechaza (23505), y un
animal se inserta con `chapeta_puesta` false.

### PE-30 (manual)

Como **propietario**: en una vaca de prueba, un parto con cría viva y reproductor externo (número
prellenado), luego un aborto; provocar la advertencia de parentesco con un reproductor del predio; ver el
control reproductivo; ver la cría en «Terneros sin chapeta puesta» y confirmar su chapeta. Como
**trabajador**: registrar un parto, confirmar una chapeta y comprobar que no aparece el control reproductivo.

## Referencias

- Documento de trabajo de grado: RF-04, RF-16, RF-17, RF-27, RF-28; CU-02, CU-10 (Tabla A10), CU-11 (Tabla
  A11); HU-02, HU-12 (Tabla B12); apartados 2.2.8, 2.3.3, 3.8.8 y 3.8.11; Tablas 24, 27 y 30.
