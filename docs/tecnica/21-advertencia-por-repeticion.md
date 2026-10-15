# 21 · Advertencia por repetición de un medicamento

| | |
|---|---|
| **Componente** | Módulo sanitario (Tabla 20) · `src/dominio/repeticion.ts` · `src/modulos/sanidad/eventos.ts` · `src/modulos/sanidad/AvisoRepeticion.tsx` · `src/modulos/sanidad/PantallaRegistrarEvento.tsx` |
| **Capa** | Dominio, lógica y presentación |
| **Origen en el documento** | RF-09 · CU-04, pasos 5 y 5a (Tabla A4) · HU-09 (Tabla B9) · apartado 3.10.4.4 · Figura 19 · Tablas 30 y 31 |
| **Depende de** | [18 · Catálogo de medicamentos](18-catalogo-de-medicamentos.md), sección 2 · [20 · Registro sanitario](20-registro-sanitario.md) |
| **Pruebas** | PU-22 · PE-26 |

---

## 1. El problema

El registro sanitario «responde al episodio de duplicación de dosis que le costó la vida a un animal en
2024» (apartado 3.10.4.4). La caracterización encontró que «el riesgo real en el ámbito sanitario no
es olvidar una aplicación sino repetirla». RF-09 pide advertir «cuando se intente registrar la
aplicación de un mismo medicamento a un animal dentro de un intervalo previamente definido», y HU-09
que el registro «solo continúa tras la confirmación explícita del usuario».

El intervalo de cada medicamento ya existe en el catálogo (documento 18, sección 2), y ya se acordó
que la última aplicación se muestra siempre, en dos niveles. Este documento fija la comparación, los
textos, la confirmación y la verificación al guardar.

## 2. Con qué aplicación se compara (decisión A)

Se consideran las aplicaciones **del mismo medicamento al mismo animal** que hay en el teléfono. Los
demás animales y los demás medicamentos no cuentan.

La fecha de un evento puede ser pasada (documento 20, sección 6), así que puede existir una aplicación
**posterior** a la que se registra. Por eso se compara con la **más cercana a la fecha elegida, antes o
después**:

> distancia = | fecha nueva − fecha de la otra aplicación |, en días
> **advertencia** si distancia < intervalo del medicamento

| Situación | Nivel | Aplicación que se muestra |
|---|---|---|
| Sin aplicaciones de ese medicamento al animal | Ninguno: «Sin aplicaciones anteriores…» (sección 6) | — |
| Alguna a menos de `intervalo` días de la fecha elegida | **Advertencia** | La más cercana; a igual distancia, la más reciente |
| Todas a `intervalo` días o más | **Información** | La más reciente por fecha (a igual fecha, la registrada después) |

**Límites, con un intervalo de 35 días:** el mismo día (distancia 0) advierte; a 34 días advierte; a
35 días solo informa. Con un intervalo de 2 días (tratamiento cada 48 horas): el mismo día y el día
siguiente advierten; dos días después, informa. Es la tabla del documento 18, sección 2.

Las fechas se restan como días del calendario del predio, sin horas (el evento registra la fecha, Tabla
24).

## 3. Lo que se muestra (decisión B)

Aparece debajo del medicamento elegido, en el lugar que el documento 20 dejó reservado, y se recalcula
al cambiar el medicamento o la fecha.

**Información** (aviso neutro, no bloquea):

> Última aplicación de **Prueba Aftosa** a este animal: **12 de octubre de 2026** (hace 3 días),
> registrada por Daniel Ramos · ✓ Enviado

**Advertencia** (aviso de atención, como pide la Figura 19):

> ⚠ **Prueba Aftosa ya se aplicó a Z920 el 12 de octubre de 2026** (hace 3 días), registrada por Daniel
> Ramos · ✓ Enviado.
> El intervalo de este medicamento es de 35 días.
> ☐ Confirmo que esta nueva aplicación es correcta

| Elemento | Regla |
|---|---|
| «Hace» | Desde hoy: «hoy», «ayer», «hace N días»; si la otra aplicación es posterior a hoy no puede ocurrir (las fechas no son futuras) |
| Si la otra es posterior a la fecha elegida | «… se aplicó a Z920 el 20 de octubre de 2026, después de la fecha que está registrando» |
| Autor | Nombre de quien la registró (HU-15); si ya no está en el teléfono, «un usuario que ya no está en el predio» |
| Estado | El distintivo de sincronización de esa aplicación (Tabla 22): Pendiente, Enviado o Conflicto |
| Animal | La chapeta, para que no haya duda de a cuál se refiere (Figura 19) |

## 4. La confirmación (decisiones C y E)

- Con advertencia, **Guardar evento queda inhabilitado** hasta marcar la casilla (Figura 19, HU-09.3).
- La casilla **se desmarca** al cambiar el medicamento o la fecha: la advertencia confirmada ya no es la
  misma.
- En la ronda (documento 20, sección 7), cada animal tiene su verificación y su casilla; la copia del
  evento anterior no trae la confirmación.
- **La confirmación no se almacena.** El documento exige confirmar, no registrarlo, y la Tabla 24 no
  tiene ese campo. En el historial, el evento queda junto a la aplicación anterior, y la repetición se
  ve. No hace falta migración.

## 5. Verificación al guardar (decisión D)

`registrarEvento` recibe `confirmado: boolean`. Dentro de la misma transacción que crea el evento se
vuelven a leer las aplicaciones y se recalcula el nivel:

| Nivel al guardar | Confirmado | Resultado |
|---|---|---|
| Ninguno o información | — | Se guarda |
| Advertencia | Sí | Se guarda |
| Advertencia | No | **No se guarda**: devuelve la advertencia para que la pantalla la muestre y pida confirmar |

Cubre el caso en que, mientras el usuario llenaba el formulario, llegó por sincronización una aplicación
dentro del intervalo (registrada en otro teléfono): la pantalla se actualiza sola porque observa la base
local, y si aun así se pulsa Guardar sin confirmar, la transacción lo rechaza.

## 6. La nota al pie (decisión F, Figura 19)

| Momento | Texto |
|---|---|
| Al elegir el medicamento, siempre | «La verificación se hace con los registros que hay en este teléfono.» |
| Sin aplicaciones anteriores | «Sin aplicaciones anteriores de Prueba Aftosa a este animal en este teléfono.» |
| Durante la carga inicial (documento 17) | Se agrega: «La información del predio todavía está llegando: puede haber aplicaciones que aún no aparecen.» |

Declararlo «evita que el usuario atribuya a la aplicación una certeza que no está en condiciones de
ofrecer» (apartado 3.10.4.4).

## 7. Anulaciones (decisión G)

Cuando existan las correcciones (CU-17, Iteración 4), un evento anulado no contará para la
advertencia ni para la información. Queda anotado para ese paso.

## 8. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-09 · HU-09.1** | Se verifican las aplicaciones del mismo medicamento al animal, con el intervalo del catálogo |
| **HU-09.2 · CU-04 5a** | La advertencia muestra la fecha de la aplicación anterior, el autor y su estado |
| **HU-09.3 · Figura 19** | Guardar inhabilitado hasta la confirmación explícita; verificación repetida al guardar |
| **HU-09.4** | Todo se calcula con la base local |
| **Documento 18, sección 2** | La última aplicación se muestra siempre, en dos niveles |
| **3.10.4.4** | La nota declara que la verificación depende de lo que el teléfono ha recibido |

## 9. Pruebas

### PU-22 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Niveles | Sin aplicaciones, ninguno; dentro del intervalo, advertencia; fuera, información |
| 2 | Límites | Distancia 0 e `intervalo − 1` advierten; `intervalo` informa (con 35 y con 2 días) |
| 3 | Posterior a la fecha | Una aplicación posterior dentro del intervalo advierte y se señala como posterior |
| 4 | Cuál se muestra | Advertencia: la más cercana; información: la más reciente; empates por UUID |
| 5 | Aislamiento | Otros animales y otros medicamentos no cuentan |
| 6 | Guardar | Con advertencia y sin confirmar no se guarda nada y devuelve la advertencia; confirmado se guarda |
| 7 | Transacción | Una aplicación que llega entre la vista y el guardado se detecta al guardar |
| 8 | «Hace» y textos | Hoy, ayer, hace N días; autor y medicamento en el aviso |

### PE-26 (manual)

Como **propietario**: en Z920, Prueba Aftosa otra vez el mismo día (advertencia y Guardar inhabilitado
hasta confirmar; al cambiar la fecha la casilla se desmarca); con una fecha 40 días después (solo
información); un medicamento de prueba de 2 días aplicado el día siguiente (advertencia) y a los dos
días (información). Como **trabajador**, registrar Prueba Aftosa a Z921 y comprobar que el aviso
nombra la aplicación del propietario con su autor y su estado.

## Referencias

- Documento de trabajo de grado: RF-09; CU-04 (Tabla A4); HU-09 (Tabla B9); HU-15; apartado 3.10.4.4;
  Figura 19; Tablas 22, 24, 30 y 31.
