# 16 · Ficha del animal con autoría visible

| | |
|---|---|
| **Componente** | Módulo de consulta (Tabla 20) · `src/modulos/consulta/ficha.ts` · `src/modulos/consulta/PantallaFicha.tsx` · `src/modulos/identificacion/actualizarFotos.ts` |
| **Capa** | Lógica y presentación |
| **Origen en el documento** | RF-02 · RF-05 · RF-27 · CU-03 (paso 4, flujo 4a) · HU-02 (criterio 1) · HU-15 · RNF-08 · apartados 3.9.4, 3.10.3 y 3.10.4.4 · Tablas 25, 27 y 31 |
| **Depende de** | [13 · Registro de un animal](13-registro-de-animal.md) · [14 · Fotografías](14-fotografias.md) · [15 · Listado](15-listado-de-animales.md) |
| **Pruebas** | PU-17 · PE-20 |

---

## 1. El problema

La ficha es, según el apartado 3.10.3, el centro de la navegación: desde ella se abren las consultas y
los registros, y a ella se vuelve después de guardar. El apartado 3.10.4.4 fija su contenido y su
orden:

> La ficha reúne la fotografía y el código de la chapeta en el encabezado, de manera que la
> identificación visual y la numérica se comprueben en el mismo golpe de vista. A continuación vienen
> los seis datos que el propietario enumeró en la primera entrevista, dispuestos en el orden en que
> los pidió. […] Al pie figuran el autor y la fecha de creación de la ficha.

La dificultad es que varios de esos datos (pesajes, vacunas, leche, destino) se registran en las
Iteraciones 3 y 4. La ficha se construye ahora con su **lógica completa**, que consulta esas tablas
(existen en el teléfono desde el paso 1.3), y muestra que no hay datos mientras estén vacías (CU-03,
4a). Cuando las iteraciones siguientes empiecen a guardarlos, la ficha los mostrará sin cambios
(decisión C).

## 2. Contenido y orden

| Zona | Contenido | Origen |
|---|---|---|
| **Encabezado** | Foto reducida de la vista principal · **chapeta** en grande · sexo y edad · distintivo de sincronización · «Retirado» si salió · fotos «3 de 3» con **Ver fotos** | 3.10.4.4, Tabla 22 |
| **Datos del propietario** | Último peso · última vacuna · producción de leche más reciente (solo hembras) · destino productivo | HU-02 criterio 1, entrevista 1, 3.10.4.4 |
| **Origen** | Nació en el predio o comprado; fecha de ingreso y procedencia | RF-03 |
| **Genealogía** | Madre y padre: del predio (con enlace a su ficha), externo (con su nombre) o desconocido | RF-04 |
| **Pie** | «Registrado por Daniel Ramos el 12 de octubre de 2026, 10:33 p. m.» | HU-15, 3.9.4 |

## 3. Cada dato

### 3.1 Último peso: el peso inicial según el origen (decisión A, precisada)

| Situación | Se muestra |
|---|---|
| Hay pesajes (Iteración 4) | El más reciente por fecha: «412 kg · 3 de octubre de 2026» |
| Sin pesajes, animal **comprado** con peso inicial | «180 kg · **peso de compra**, 1 de septiembre de 2026» (fecha de ingreso) |
| Sin pesajes, animal **nacido en el predio** con peso inicial | «32 kg · **peso al nacer**, 2 de octubre de 2026» (fecha de nacimiento) |
| Sin pesajes ni peso inicial | «Sin pesajes registrados» |

**Por qué distinguirlo.** A pedido del autor (2026-10-13): «peso inicial» no le dice al propietario
qué peso es. El origen ya lo determina: en un animal comprado es el peso con el que llegó, y en uno
nacido en el predio, el peso al nacer. El campo sigue siendo uno solo en la base de datos
(`peso_inicial`); su nombre visible se deduce del origen, igual que el origen mismo (documento 13,
sección 3.1). Por coherencia, **el formulario de registro** nombra el campo de la misma forma según el
origen elegido: «Peso de compra (kg)» o «Peso al nacer (kg)».

### 3.2 Última vacuna

El evento sanitario de tipo **vacuna** más reciente por fecha (Iteración 3): «Aftosa · 15 de
septiembre de 2026». Si no hay: «Sin vacunas registradas». Las purgas, vitaminas y tratamientos no
cuentan como vacuna; se verán en el historial sanitario (CU-05).

### 3.3 Producción de leche más reciente (decisión B)

El registro de producción más reciente por fecha (Iteración 3): «14,5 litros · 12 de octubre de 2026».
Si no hay: «Sin registros de leche». **En los machos la fila no aparece**: «sin registros de leche»
sugeriría un dato faltante que no puede existir.

### 3.4 Destino productivo

El destino vigente: el registro de destino más reciente por fecha de inicio (documento 05, sección
5.2), por ejemplo «Leche · desde el 1 de octubre de 2026». Si no hay: «Sin destino asignado». Se
asigna en el paso 3.2 (CU-12, solo el propietario).

### 3.5 Valores corregidos

Las correcciones y anulaciones (CU-17) se construyen en la Iteración 4 y cambiarán el valor vigente
de cada dato. Hasta entonces la ficha muestra el valor registrado. La consolidación se escribe de modo
que el paso 4.3 agregue la aplicación de las correcciones en un solo lugar.

## 4. La autoría (HU-15)

Al pie: «Registrado por **{nombre}** el {fecha y hora}». El nombre se toma de la copia local de los
usuarios (documento 10, sección 4.1); si el autor no estuviera en ella, se muestra «un usuario que ya
no está en el predio» en lugar del identificador. La fecha es `creado_en`, fijada en el teléfono que
registró y que nadie puede alterar (RNF-08, 3.9.4; PI-01 y PI-03).

Cada fotografía muestra también su autoría en **Ver fotos** (decisión G): «Foto de Daniel Ramos, 12
de octubre de 2026». La historia de usuario pide la autoría de **cada dato**; los pesajes, vacunas y
demás la mostrarán en sus historiales.

## 5. Las fotos

### 5.1 Ver las tres vistas (decisión D)

**Ver fotos** abre las tres vistas en orden (izquierdo, derecho, frente). Las versiones **completas**
se descargan del servicio al abrirlas, **solo con conexión**, y no se guardan en el teléfono (Tabla
25: en el teléfono solo queda la reducida principal). Sin señal se muestra la reducida que haya, con
el aviso «Las fotos completas requieren conexión». Una vista sin foto muestra «Sin foto».

### 5.2 Completar o cambiar fotos (decisión E)

- Si faltan vistas, el encabezado lo dice: «Registro fotográfico incompleto: 1 de 3», con el botón
  **Completar fotos** (Tabla 31, CU-02 6a).
- En **Ver fotos**, cada vista tiene **Tomar foto** (si falta) o **Cambiar foto** (si existe).
- Una foto nueva es **un registro nuevo** de fotografía, con la misma captura y compresión del registro
  (documento 14). La anterior no se borra: queda en el historial y la nueva pasa a ser la vigente de
  su vista (la más reciente, documento 05, sección 5.2). La vista principal se recalcula, y la regla de
  retención deja en el teléfono solo la reducida de la nueva principal.
- La pueden usar **ambos perfiles**: agregar una foto es crear un registro, y el trabajador crea en
  CU-02 (Tabla 27). No modifica ni borra nada.

## 6. Navegación (decisión F)

- `/animales/:id`. Se llega desde el listado o desde un enlace de genealogía.
- Al registrar un animal, la confirmación ofrece **Ver la ficha** como acción principal y **Registrar
  otro** como secundaria (3.10.3: «a ella se regresa una vez guardado el dato»).
- Arriba, **Volver al listado**.
- Si el identificador no corresponde a ningún animal del teléfono (un enlace viejo): «Este animal no
  está en este teléfono» y el enlace al listado.

**Lo que queda para después.** Los accesos al historial sanitario, a la evolución del peso y al
control reproductivo (HU-02 criterio 4, CU-05, CU-09, CU-11) se agregan con esas pantallas en las
Iteraciones 3 y 4. No se ponen botones que no lleven a ninguna parte.

## 7. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-05 · HU-02 criterio 1** | Foto, chapeta, edad, último peso, última vacuna, leche y destino, en el orden pedido |
| **HU-15 · RF-27 · RNF-08** | Autor y fecha de creación al pie de la ficha y en cada foto |
| **CU-03, 4a** | Cada dato sin registros lo dice en lugar de quedar vacío |
| **RF-02 · Tabla 31** | Registro fotográfico incompleto señalado; completar y cambiar fotos desde la ficha |
| **RF-28** | Todo sale de la base local; solo las fotos completas requieren conexión |
| **3.10.3** | La ficha es el destino después de registrar |

## 8. Pruebas

### PU-17 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Último peso | El pesaje más reciente; sin pesajes, el peso inicial nombrado como «de compra» o «al nacer» según el origen, con su fecha; sin nada, «Sin pesajes» |
| 2 | Última vacuna | La más reciente de tipo vacuna; las purgas no cuentan |
| 3 | Leche | La más reciente; en machos no se presenta |
| 4 | Destino | El de fecha de inicio más reciente |
| 5 | Genealogía | Madre y padre del predio (con su chapeta), externos o desconocidos |
| 6 | Fotos | Conteo de vistas vigentes, principal, incompleto |
| 7 | Autoría | Nombre del autor y fecha; autor desconocido |
| 8 | Cambiar una foto | Se crea una fotografía nueva; pasa a ser la vigente; la anterior se conserva como registro; la principal se recalcula |
| 9 | Etiqueta del peso en el formulario | «Peso de compra» o «Peso al nacer» según el origen |

### PE-20 (manual, en el teléfono, con el listado)

Abrir fichas de Z920 a Z928; ver las fotos completas con conexión y la reducida sin señal; completar
las fotos de Z924 (que solo tiene el frente) y comprobar que el listado cambia a la nueva principal;
comprobar la autoría y el peso «de compra» o «al nacer».

## Referencias

- Documento de trabajo de grado: RF-02 a RF-05, RF-27; CU-03 (Tabla A3); HU-02 (Tabla B2); HU-15
  (Tabla B15); RNF-08; apartados 3.9.4, 3.10.3 y 3.10.4.4; Tablas 25, 27 y 31; primera entrevista.
