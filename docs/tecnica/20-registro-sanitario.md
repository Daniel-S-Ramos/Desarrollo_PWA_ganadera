# 20 · Registro sanitario e historial

| | |
|---|---|
| **Componente** | Módulo sanitario (Tabla 20) · `src/dominio/sanidad.ts` · `src/modulos/sanidad/eventos.ts` · `src/modulos/sanidad/PantallaRegistrarEvento.tsx` · `src/modulos/sanidad/HistorialSanitario.tsx` |
| **Capa** | Dominio, lógica y presentación |
| **Origen en el documento** | RF-07 · RF-08 · RF-27 · RF-28 · CU-04 (Tabla A4) · CU-05 (Tabla A5) · HU-03 (Tabla B3) · HU-02 (criterios 1 y 4, heredados) · apartados 3.8.9, 3.8.12 y 3.10.4.4 · Figura 19 · Tablas 24, 27, 30 y 31 |
| **Depende de** | [08 · Permisos](08-permisos.md) · [16 · Ficha](16-ficha-del-animal.md) · [18 · Catálogo de medicamentos](18-catalogo-de-medicamentos.md) |
| **Lo completa** | Paso 3.4: advertencia por repetición (CU-04, pasos 5 y 5a; HU-09) |
| **Pruebas** | PU-21 · PE-25 |

---

## 1. El problema

La caracterización del predio encontró que «solo dos de cada diez aplicaciones quedan anotadas»,
porque el registro depende de que haya un cuaderno a la mano (Tabla 32). HU-03 pide registrar el evento
«en el momento en que lo aplico», en el potrero, y RF-08 consultar después el historial completo del
animal «ordenado cronológicamente», para que el propietario «pueda acreditarlo ante un tercero»
(CU-05, postcondición).

Este paso construye el registro y el historial. La advertencia por repetición (RF-09) se agrega en el
paso 3.4 sobre el mismo formulario: entre la elección del medicamento y el guardado queda reservado el
lugar donde aparecerá la última aplicación (documento 18, sección 2).

## 2. El evento sanitario (Tabla 24)

| Campo | Obligatorio | Regla |
|---|---|---|
| `animal_id` | Sí | El animal desde cuya ficha se registra (HU-03.3) |
| `fecha` | Sí | Hoy por defecto (CU-04, paso 2). Sección 6 |
| `tipo` | Sí | Vacuna, Purga, Vitamina, Tratamiento u Otro. Sección 4 |
| `medicamento_id` | Sí | Del catálogo (CU-04, paso 3). Sección 4 |
| `dosis` | No | Mayor que 0 y hasta 9.999, con decimales, en la unidad del medicamento. Sección 5.1 |
| `costo` | No | Pesos enteros, de 0 a 10.000.000. Solo el propietario. Sección 5.2 |
| `sintomas` | No | Hasta 300 caracteres. Sección 5.3 |

El esquema del servicio ya admite estos campos (`dosis >= 0`, `costo >= 0`); los límites superiores y
el mínimo de la dosis son del formulario. **No hace falta migración.**

## 3. Dónde se registra (decisión A)

En la ficha, el botón **Registrar evento sanitario**, para ambos perfiles (Tabla 27: el trabajador
tiene CU-04 con permisos de creación). Abre la pantalla `/animales/:id/evento-sanitario`, con el
animal ya identificado arriba (chapeta, foto y sexo), para que nunca haya duda de a cuál se le registra.

## 4. Tipo y medicamento (decisión C)

Se sigue el orden del CU-04, paso 3: **primero el tipo**, con cinco botones grandes, y el tipo filtra
la lista del catálogo:

| Tipo de evento | Medicamentos que se listan |
|---|---|
| Vacuna | Vacunas |
| Purga | Purgas |
| Vitamina | Vitaminas |
| Tratamiento | Antibióticos y «otro» |
| Otro | Todo el catálogo |

Debajo de la lista, **Ver todo el catálogo** muestra los demás, por si se aplica un producto con un
tipo distinto del habitual (una vitamina como parte de un tratamiento). **Se guarda el tipo que eligió
el usuario**, no el del medicamento: describe lo que se hizo.

La lista muestra nombre y unidad, en el orden del catálogo (documento 18, sección 6), con un buscador
que filtra por nombre normalizado.

**El medicamento no está en el catálogo** (CU-04, 3a y 3b; Tabla 31). **Agregar un medicamento**
despliega el formulario del catálogo (documento 18) dentro de la misma pantalla, con el tipo
propuesto según el tipo de evento (Tratamiento → Antibiótico). Al guardarlo queda elegido. Si el nombre
coincide con uno existente, se ofrece **Usar …**, como en la pantalla Medicamentos.

## 5. Dosis, costo y síntomas

### 5.1 Dosis (decisión D)

La unidad del medicamento aparece junto al campo («ml»). Al elegir el medicamento, el campo se
**precarga con la última dosis registrada de ese medicamento en el predio**, en cualquier animal, con
la nota:

> Tomada del último registro de este medicamento: revísela.

Si el medicamento nunca se ha registrado, el campo queda vacío. Es lo que fijan la Figura 19 y la
Tabla 30: la aplicación «recupera la última dosis registrada y no formula recomendación alguna». Si
el usuario borra el campo, el evento se guarda sin dosis (HU-03.2).

«La última» es el evento más reciente por fecha y, a igual fecha, el registrado después (documento 01,
sección de historial), entre los que tienen dosis.

### 5.2 Costo (decisión E)

El costo de **esta aplicación**, no el del frasco, en pesos enteros, mostrado con separador de miles.
Es la única fuente del costo de medicamentos del consolidado económico (apartado 3.8.12, Iteración 5).

**Solo lo ve el propietario**: el campo en el formulario y el valor en el historial. La información
económica es exclusiva de su perfil (Tabla 27: CU-13 y CU-14). El trabajador registra el evento sin
costo; si el propietario quiere anotarlo después, lo hace con una corrección (CU-17, Iteración 4).

Si el trabajador intentara enviar un costo, el teléfono lo rechaza antes de escribir
(`PermisoDenegado`). Es una regla de la interfaz y del teléfono, como el resto de la Tabla 27; el
servicio admite la columna para ambos perfiles.

### 5.3 Síntomas (decisión F)

Texto libre, **Síntomas observados (opcional)**, hasta 300 caracteres. Se muestra para todos los tipos;
con **Tratamiento** el campo aparece abierto, y con los demás tipos detrás de **Agregar síntomas**,
porque en una vacunación casi nunca se usa.

## 6. Validaciones (decisión G)

| Regla | Mensaje |
|---|---|
| Se elige el tipo | «Elija el tipo de evento» |
| Se elige el medicamento | «Elija el medicamento» |
| La fecha existe | «Escriba una fecha válida» |
| La fecha no es futura | «La fecha no puede ser posterior a hoy» |
| La fecha no es anterior al nacimiento, si se conoce | «El animal nació el …» |
| La dosis, si se escribe, está entre 0 y 9.999 sin incluir el 0 | «La dosis debe ser mayor que 0 y hasta 9.999» |
| El costo, si se escribe, es un entero de 0 a 10.000.000 | «Escriba el costo en pesos, sin decimales» |
| Los síntomas no superan 300 caracteres | «Hasta 300 caracteres» |
| El animal no está retirado | «Este animal salió del predio» |

**La fecha sí puede ser anterior al ingreso.** Un animal comprado puede llegar con las vacunas que le
aplicó el vendedor, y registrarlas sirve a la trazabilidad que exige el ICA (apartado 1.1). En cambio,
nada puede aplicarse antes del nacimiento. Si el nacimiento es aproximado, la regla se aplica igual:
una fecha aproximada anterior al nacimiento estimado indica un error de escritura en uno de los dos.

El medicamento y el animal se verifican de nuevo **dentro de la transacción** (que existan, que el
animal no esté retirado), como en los pasos anteriores.

## 7. Aplicar lo mismo a otro animal (decisión B)

En un ciclo de vacunación se aplica el mismo producto a muchos animales el mismo día. Después de
guardar, la confirmación ofrece:

1. **Aplicar lo mismo a otro animal**: un campo de chapeta con la búsqueda del listado (documento 15).
   Al elegir el animal, se abre su formulario **con el tipo, el medicamento, la fecha y la dosis ya
   puestos** (y el costo, para el propietario). Los síntomas no se copian: son de cada animal.
2. **Ver la ficha** del animal recién registrado.

La pantalla lleva la cuenta de la ronda («Aftosa aplicada a 3 animales: Z920, Z921, Z923») mientras
el usuario siga en ella. Cada registro es un evento independiente, con su propia transacción. Si el
siguiente animal ya recibió ese medicamento, la advertencia del paso 3.4 lo mostrará.

Técnicamente, el formulario del siguiente animal recibe el identificador del evento anterior
(`?como=<id>`) y copia sus campos; si ese evento no está en el teléfono, el formulario se abre vacío.

## 8. Historial sanitario (decisión H, CU-05)

En la ficha, el botón **Historial sanitario**, para ambos perfiles. Cierra el criterio 4 de HU-02,
heredado de la Iteración 2.

| Aspecto | Regla |
|---|---|
| Orden | Del más reciente al más antiguo por fecha; a igual fecha, el registrado después (documento 01) |
| Cada fila | Fecha, tipo, medicamento, dosis con unidad («5 ml»), autor y estado de sincronización (CU-05, paso 3) |
| Detalle | Al tocar una fila: síntomas, costo (solo el propietario) y cuándo se registró (CU-05, paso 4; HU-15) |
| Sin eventos | «Este animal no tiene eventos sanitarios», con **Registrar el primero** (CU-05, 2a) |
| Sin conexión | Se lee del teléfono: el historial se conserva íntegro (apartado 3.8.7) |

La **última vacuna** de la ficha (documento 16, sección 3.2) lee estos mismos eventos y empieza a
mostrar datos reales: el evento de tipo Vacuna más reciente, con su medicamento y su fecha.

## 9. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-07 · HU-03.1 y 2** | Fecha, tipo y medicamento obligatorios; dosis, costo y síntomas opcionales |
| **HU-03.3** | El evento se registra desde la ficha de un animal identificado |
| **RF-08 · HU-03.4 · CU-05** | Historial completo, del más reciente al más antiguo, con detalle |
| **HU-03.5** | Todo se escribe en el teléfono y sube con la cola (documento 05) |
| **CU-04, 3a y 3b · Tabla 31** | Agregar un medicamento sin salir del registro; el duplicado ofrece el existente |
| **Figura 19 · Tabla 30** | La dosis se precarga con la última registrada, sin recomendación |
| **3.8.12** | El costo del medicamento vive solo en el evento |
| **Tabla 27** | Ambos perfiles registran y consultan; el costo, solo el propietario |
| **HU-02.1 y 4** | Última vacuna real en la ficha y acceso al historial |

## 10. Pruebas

### PU-21 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Validaciones | Las reglas de la sección 6, todos los errores juntos; fecha anterior al ingreso admitida |
| 2 | Filtro por tipo | Cada tipo lista los medicamentos de la sección 4; «ver todo» lista el catálogo completo |
| 3 | Dosis precargada | La última con dosis del medicamento en el predio, por fecha y a igual fecha la registrada después; sin registros, vacía |
| 4 | Registrar | Crea el evento con autor, pendiente y en la cola; un error no escribe nada |
| 5 | Transacción | Animal retirado o medicamento inexistente se rechazan dentro de la transacción |
| 6 | Costo y permisos | El trabajador registra sin costo; con costo, `PermisoDenegado` |
| 7 | Aplicar a otro animal | Copia tipo, medicamento, fecha, dosis y costo; no copia los síntomas |
| 8 | Historial | Orden, dosis con unidad, autor; la última vacuna de la ficha toma el evento de tipo vacuna más reciente |

### PE-25 (manual)

Como **propietario**: registrar una vacuna a un animal de prueba y aplicarla a otros dos con **Aplicar
lo mismo a otro animal**; registrar un tratamiento con síntomas y costo; agregar un medicamento desde
el registro; consultar el historial y la última vacuna en la ficha. Como **trabajador**: registrar un
evento sin ver el campo de costo, consultar el historial sin ver el costo, y comprobar que los eventos
del propietario llegaron. Animales de la serie Z920–Z949 y medicamentos con el prefijo «Prueba».

## Referencias

- Documento de trabajo de grado: RF-07, RF-08, RF-27, RF-28; CU-04 (Tabla A4); CU-05 (Tabla A5); HU-02
  (Tabla B2); HU-03 (Tabla B3); apartados 3.8.7, 3.8.9, 3.8.12 y 3.10.4.4; Figura 19; Tablas 24, 27,
  30, 31 y 32.
