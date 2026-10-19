# 27 · Consulta de las correcciones y las anulaciones

| | |
|---|---|
| **Componente** | Módulo de correcciones (Tabla 20) · `src/modulos/correcciones/consultaCorrecciones.ts` · `src/modulos/correcciones/PantallaCorreccionesRecientes.tsx` |
| **Capa** | Lógica y presentación |
| **Origen en el documento** | RF-27 · RF-32 · CU-18, pasos 1 a 4 y flujo 2a (Tabla A18) · HU-17, criterio 5 (Tabla B17) · Tabla 27 · Tabla 28 («Correcciones recientes») · RD-05 |
| **Depende de** | [26 · Corrección, anulación y valor vigente](26-correccion-y-anulacion.md), secciones 2, 3 y 6.4 · [08 · Permisos](08-permisos.md), sección 2 |
| **Pruebas** | PU-29 · PE-33 |

---

## 1. El problema

Desde el paso 4.3a cualquier registro se corrige o se anula dejando constancia del dato anterior, del nuevo,
del motivo, del autor y de la fecha (RF-31). Esa constancia solo sirve si alguien la puede revisar: RF-32
pide que el propietario consulte «quién las hizo, sobre qué registro, qué dato cambió y por qué», y HU-17 lo
exige como criterio 5. Hoy cada corrección se ve solo en la marca **Corregido** del registro afectado, y
para encontrarla hay que saber dónde buscar.

## 2. Quién la ve y cómo se llega (decisiones A y G)

**Solo el propietario** (CU-18, actor principal; Tabla 27: el trabajador, no).

| Acceso | Destino |
|---|---|
| Inicio → **Correcciones recientes**, junto a **Producción de leche** | `/correcciones` |

Al trabajador no se le muestra el botón, y si llegara a la ruta se le devuelve al inicio, como en las demás
rutas restringidas. Las correcciones siguen en su teléfono: sin ellas no podría calcular el valor vigente de
ningún registro (documento 08, sección 2). Ocultar la pantalla es un control de interfaz; el servicio no
tiene nada que proteger aquí, porque la tabla `correccion` se lee por ambos perfiles por diseño.

## 3. Qué muestra cada entrada (decisión B, CU-18 paso 3)

Una entrada por corrección o anulación:

| Parte | Ejemplo | De dónde sale |
|---|---|---|
| **Animal y registro** | «Z921 · Vacuna Prueba Aftosa del 14 de octubre de 2026» · «Z924 · Pesaje del 18 de octubre de 2026» · «Z971 · Datos del animal» · «Medicamento Prueba Florfenicol LA» | El registro afectado y su animal (`animal_id`, o `madre_id` en el parto). El medicamento no pertenece a un animal |
| **Qué cambió** | «Dosis: antes 1, ahora 2,5» · **Anulado** | `campo`, `valor_anterior` y `valor_nuevo`, presentados como en la marca **Corregido** (documento 26, sección 6.4): fechas, opciones, animales y medicamentos por su nombre |
| **Por qué** | «Error de digitación · Se anotó mal en el cuaderno» | `motivo` y `nota` |
| **Quién y cuándo** | «Daniel Ramos · 18 de octubre de 2026 a las 4:18 p. m.» | `autor_id` y `creado_en` |
| **Estado** | ⏳ Pendiente | Solo si la corrección no ha llegado al servicio |

El nombre del registro usa su **valor vigente** (documento 26, sección 6): un evento al que se le corrigió el
medicamento aparece con el medicamento corregido. Si el registro afectado no está en el teléfono (por ejemplo,
la carga inicial no ha terminado), la entrada se muestra con «un registro que no está en este teléfono» y sin
enlace.

## 4. Orden y cantidad (decisión C, CU-18 paso 2)

De la más reciente a la más antigua por `creado_en`, agrupadas por día del predio («Hoy», «Ayer», «14 de
octubre de 2026»). Se muestran **30** y el botón **Ver más** agrega otras 30. Se lee desde el
almacenamiento local, como dice el paso 2: la consulta funciona sin conexión.

## 5. Filtro por autor (decisión D)

Un solo filtro, **Quién**: «Todos» y cada usuario del predio que tenga al menos una corrección, por su
nombre. Al cambiarlo, la lista vuelve a las primeras 30.

## 6. Al tocar una entrada (decisión E, CU-18 paso 4)

Abre el registro sobre el que se aplicó, con su sección desplegada:

| Registro afectado | Destino |
|---|---|
| Evento sanitario | Ficha del animal con el **historial sanitario** abierto (`?sanidad=1`) |
| Pesaje | Ficha con la **evolución del peso** abierta (`?peso=1`, ya existe) |
| Parto | Ficha de la vaca con el **control reproductivo** abierto (`?reproduccion=1`, ya existe) |
| Destino productivo | Ficha con el **historial del destino** abierto (`?destino=1`) |
| Ordeño | **Producción** de esa vaca (`/produccion?vaca=<id>`, ya existe) |
| Datos del animal | Ficha del animal, donde está la marca **Corregido** |
| Medicamento | **Catálogo** de medicamentos |

## 7. Sin correcciones (decisión F, CU-18 2a)

«Todavía no hay correcciones ni anulaciones en el predio.» Con un filtro sin resultados: «Este usuario no ha
hecho correcciones ni anulaciones.»

## 8. Lo que no aparece (decisión H)

Las **resoluciones de conflictos** (documento 26, sección 10) no son correcciones: el registro rechazado nunca
llegó al servicio, y cambiarle el número o unirlo con el correcto lo arregla en el teléfono sin dejar
constancia en `correccion`. Es un límite de la trazabilidad que conviene declarar: el propietario no ve en
esta consulta que un trabajador renumeró un animal en conflicto, aunque sí ve el animal resultante con su
autor. Se anota en el PLAN como pendiente para el documento.

## 9. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-32 · HU-17.5 · CU-18** | Quién, sobre qué registro, qué dato cambió y por qué; de la más reciente a la más antigua; abre el registro |
| **RF-27** | El autor y la fecha de cada corrección |
| **Tabla 27 · RD-05** | Solo el propietario; ruta devuelta al inicio para el trabajador |
| **Tabla 28** | La pantalla «Correcciones recientes» |

## 10. Pruebas

### PU-29 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Contenido | Animal y registro con valor vigente, cambio legible (fechas, opciones, nombres), **Anulado**, motivo, nota, autor y fecha; medicamento sin animal; registro ausente sin enlace |
| 2 | Orden y agrupación | De la más reciente a la más antigua; grupos por día del predio |
| 3 | Cantidad | 30 por página; **Ver más** agrega 30; al final no se ofrece |
| 4 | Filtro | Por autor; la lista de autores solo con quienes tienen correcciones |
| 5 | Destinos | El de cada tabla de la sección 6 |
| 6 | Permisos | El trabajador no tiene la consulta (`puedeUsar`, CU-18) |
| 7 | Vacío | Sin correcciones y con filtro sin resultados |

### PE-33 (manual)

Como **propietario**: abrir **Correcciones recientes** desde Inicio y reconocer las correcciones de PE-31
(dosis de Z921, pesaje anulado, tipo de Prueba Florfenicol LA, peso al nacer de Z971, ordeño de Z931 y el
pesaje que corrigió el trabajador en Z924); filtrar por el trabajador; tocar una de cada tipo y llegar a su
sección. Como **trabajador**: comprobar que no aparece el botón y que la dirección `/correcciones` lo
devuelve a Inicio.

## Referencias

- Documento de trabajo de grado: RF-27, RF-31, RF-32; CU-18 (Tabla A18); HU-17 (Tabla B17); RD-05;
  Tablas 27 y 28; apartado 3.9.5.
