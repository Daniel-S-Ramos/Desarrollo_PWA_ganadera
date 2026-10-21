# 30 · Recordatorios derivados y posponer

| | |
|---|---|
| **Componente** | Módulo de recordatorios (Tabla 20) · `src/modulos/recordatorios/recordatorios.ts` · `src/modulos/recordatorios/SeccionRecordatorios.tsx` |
| **Capa** | Dominio, lógica y presentación |
| **Origen en el documento** | RF-22 · RF-23 · RF-28 · CU-15, pasos 1 a 7 y flujos 1a, 6a y 6b (Tabla A15) · HU-14 (Tabla B14) · apartados 3.8.11 y 3.10.4 · Tabla 24 (fila `recordatorio`) · Tabla 27 · Tabla 30 |
| **Depende de** | [25 · Chapeta pendiente](25-parto-y-control-reproductivo.md), sección 7 · [22 · Ronda](22-ronda-de-ordeno.md), sección 6 (comparación con el promedio) · [26 · Valor vigente](26-correccion-y-anulacion.md), secciones 6 y 10.7 · [29 · Salida](29-salida-y-venta.md), sección 7 |
| **Pruebas** | PU-32 · PE-36 |

---

## 1. El problema

La caracterización del primer objetivo estableció que en el predio se anota uno de cada diez días de ordeño y
que el pesaje con frecuencia no llega a registrarse. RF-22 pide recordatorios derivados de la información ya
registrada que señalen esos vacíos, las desviaciones de la producción y lo pendiente de transmitir; RF-23,
presentarlos al iniciar la aplicación y poder posponerlos.

El apartado 3.8.11 fija la idea central: **los recordatorios no se almacenan, se derivan**. La aplicación los
calcula con lo que ya tiene en el teléfono, sin proceso remoto ni conexión; dos teléfonos con la misma
información muestran la misma lista, sin duplicados; y un recordatorio desaparece solo en cuanto se registra el
dato que lo originaba, aunque lo registre otra persona en otro teléfono. Lo único que se guarda es la decisión de
posponer.

## 2. Dónde y para quién (decisión A)

Una sección **Recordatorios** arriba en Inicio (3.10.4: «lo primero que el propietario vea al abrir la
aplicación»), para **ambos perfiles**: CU-15 nombra al trabajador como actor secundario con permisos de
consulta. **Solo el propietario pospone**: la tabla `recordatorio` es de inserción exclusiva del propietario
(Tabla 27; política del servicio y `puedeCrear`). El trabajador ve los recordatorios y puede ir al registro que
los resuelve.

Sin recordatorios vigentes, la sección no aparece y Inicio se ve como hoy (CU-15, 1a).

## 3. Las reglas (decisión B, apartado 3.8.11, Tabla 30)

«Más de N días» significa que entre la fecha de referencia y hoy (fechas del predio) hay **más de N días**: con
N = 3, un último ordeño del 17 no avisa el 20 (3 días) y sí el 21 (4 días).

| # | Tipo | Condición | Desde cuándo | Parámetro (valor de ejemplo) |
|---|---|---|---|---|
| 1 | `sin_pesaje_reciente` | Animal activo con destino vigente **Ceba**, sin pesaje vigente en más de N días | El último pesaje; si nunca se pesó, su llegada (nacimiento o ingreso) | `dias_sin_pesaje` (30) |
| 2 | `sin_registro_ordeno` | Vaca activa con destino vigente **Producción de leche**, sin ordeño vigente en más de N días | El último ordeño; si no tiene, el día en que pasó a leche | `dias_sin_ordeno` (3) |
| 3 | `produccion_bajo_promedio` | Vaca activa en leche cuyo ordeño más reciente, de los últimos `dias_sin_ordeno` días, está **muy por debajo de su promedio** (más de 25 % por debajo; documento 22, sección 6.3) | La fecha de ese ordeño | `dias_promedio_produccion` (7) para el promedio |
| 4 | `sin_registros_recientes` | Animal activo sin ningún registro vigente en más de N días | El último registro de cualquier clase (evento sanitario, ordeño, pesaje, parto como madre, destino, fotografía, chapeta puesta); si no tiene, el día en que se registró el animal | `dias_sin_registros` (90) |
| 5 | `sincronizacion_pendiente` | El registro más antiguo de la cola de **este teléfono** lleva más de N días sin enviarse | La creación de ese registro | `dias_sin_transmitir` (3) |
| 6 | Chapeta pendiente | La regla del documento 25, sección 7 (sin cambios) | El nacimiento | `dias_recordar_chapeta` (90) |

Precisiones:

- **Activo** es sin salida vigente (documento 29, sección 7). Un animal retirado no genera recordatorios.
- Todo se calcula con **valores vigentes** y sin registros anulados (documento 26, sección 6): un ordeño anulado
  no cuenta como ordeño, y un destino anulado no cuenta como destino.
- La regla 3 usa la misma comparación de la ronda, con el mismo umbral de presentación. La Tabla 30 deja la
  «variación atípica» para definirla con el propietario; cuando la defina, se ajustará aquí.
- La regla 3 no avisa sobre un ordeño viejo: si la vaca no tiene ordeño en los últimos días, ya avisa la regla 2.
- La regla 5 es la única que no se refiere a un animal, y depende de la cola de cada teléfono: es lo único que
  dos teléfonos con la misma información pueden mostrar distinto, porque la cola es local.
- Si falta un parámetro en el teléfono (carga inicial incompleta), se usa el valor de ejemplo de la Tabla 30.

## 4. Terneros sin chapeta (decisión C)

El recordatorio del paso 4.2 se integra en esta sección como **sexto tipo**, con su texto actual («nació hace 25
días · quedan 65 días del plazo»). **No se pospone**: el plazo de 90 días ya es la tolerancia, y el servicio no
admite ese tipo en `recordatorio` sin otra migración. Desaparece al confirmar la chapeta, como hoy.

## 5. Qué muestra cada uno (decisión D, CU-15 pasos 3 a 5)

| Tipo | Texto | Al tocarlo |
|---|---|---|
| Sin pesaje reciente | «**Z925** · Sin pesaje desde el 17 de septiembre (33 días)» o «… nunca se ha pesado (llegó el …)» | Registrar pesaje del animal |
| Sin registro de ordeño | «**Z921** · Sin ordeño registrado desde el 14 de octubre (6 días)» | Ronda de ordeño de hoy |
| Producción bajo el promedio | «**Z921** · 8 litros el 14 de octubre: muy por debajo de su promedio (12 litros)» | Producción de esa vaca |
| Sin registros recientes | «**Z933** · Sin ningún registro desde el 15 de julio (97 días)» | Ficha del animal |
| Sincronización pendiente | «Hay registros sin enviar desde el 16 de octubre (4 días). Conéctese a una red con señal.» | Sin destino: es una instrucción |
| Chapeta pendiente | El de hoy | Ficha del animal |

## 6. Orden y cantidad (decisión E)

Agrupados por tipo, en el orden de la sección 3 (de 1 a 6), cada grupo con su título y su número («Sin pesaje
reciente · 3»). Dentro de cada tipo, del más antiguo al más reciente, porque el que lleva más tiempo es el más
urgente. Cada grupo muestra **5** y el botón **Ver todos (12)** despliega el resto: la primera vez, con un hato de
55 animales sin historial, la regla 4 podría tapar la pantalla.

## 7. Posponer (decisión F, CU-15 pasos 6 y 7, HU-14.4)

Cada recordatorio (salvo la chapeta) tiene **Posponer**, que ofrece **1 día**, **3 días** y **7 días** (Tabla 30).
Se guarda en `recordatorio`: el tipo, el animal (vacío en la sincronización pendiente) y `pospuesto_hasta` = hoy +
el plazo, con su cola, como cualquier registro.

- Un recordatorio está **pospuesto** mientras exista una decisión de posponer de su tipo y su animal con
  `pospuesto_hasta` posterior a hoy. Si hay varias, vale la que llega más lejos.
- La decisión es del predio: llega a todos los teléfonos con la sincronización, y el recordatorio deja de verse
  en todos durante el plazo.
- Al vencer el plazo, si la condición persiste, vuelve. Si antes se registra el dato, desaparece igual: posponer
  no impide que la regla deje de cumplirse.
- La decisión de posponer no se corrige ni se anula: si se pospuso de más, el propietario simplemente registra el
  dato o espera el plazo. El servidor exige que `pospuesto_hasta` sea posterior al día de creación (Tabla 24).

## 8. Cuándo se calcula (decisión G, HU-14.1 y 14.3)

Siempre que la aplicación está abierta: la sección usa una consulta en vivo, que vuelve a calcular cuando cambia
cualquier tabla que leyó. Por eso un recordatorio desaparece en cuanto se guarda el dato, aunque llegue de otro
teléfono (6a y 6b). La consulta lee todas las tablas en una sola espera y arma la lista en memoria (documento 26,
sección 10.7).

## 9. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-22 · HU-14.1** | Seis reglas derivadas de lo registrado, en el teléfono y sin conexión |
| **RF-23 · HU-14.2 · CU-15 pasos 1 a 5** | En Inicio, arriba, con el animal, el motivo, desde cuándo y el acceso al registro |
| **HU-14.3 · CU-15 6a y 6b** | Desaparece al registrar el dato, también desde otro teléfono |
| **HU-14.4 · CU-15 pasos 6 y 7** | Posponer por 1, 3 o 7 días; solo se guarda esa decisión |
| **3.8.11 · Tabla 30** | Los cinco tipos con sus parámetros, más la chapeta del paso 4.2 |
| **Tabla 27** | Ambos perfiles los ven; solo el propietario pospone |

## 10. Pruebas

### PU-32 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Sin pesaje reciente | Solo ceba vigente; el día exacto del umbral no avisa, el siguiente sí; nunca pesado desde la llegada |
| 2 | Sin registro de ordeño | Solo leche vigente; borde del umbral; sin ordeños, desde que pasó a leche; el anulado no cuenta |
| 3 | Producción bajo el promedio | Muy por debajo avisa; por debajo no; un ordeño viejo no |
| 4 | Sin registros recientes | Cualquier registro lo reinicia; sin registros, desde la creación del animal |
| 5 | Sincronización pendiente | El más antiguo de la cola; borde del umbral |
| 6 | Exclusiones | Retirados fuera; valores vigentes; parámetros por defecto |
| 7 | Posponer | Oculta durante el plazo; vuelve al vencer; vale el más lejano; por tipo y animal; solo el propietario |
| 8 | Orden y grupos | Por tipo y del más antiguo al más reciente |
| 9 | Consulta en vivo | Desaparece al registrar el dato y al posponer |

### PE-36 (manual)

Como **propietario**: ver los recordatorios de los animales de prueba agrupados en Inicio; resolver uno de ordeño
registrando la ronda y otro de pesaje registrando el peso, y ver que desaparecen; posponer otro por 1 día y ver
que se oculta; ir desde un recordatorio a su registro. Como **trabajador**: ver los mismos recordatorios (incluido
el pospuesto, ya oculto) sin la opción de posponer.

## Referencias

- Documento de trabajo de grado: RF-22, RF-23, RF-28; CU-15 (Tabla A15); HU-14 (Tabla B14); apartados 3.8.11 y
  3.10.4; Tablas 24, 27 y 30.
