# 24 · Pesaje y evolución del peso

| | |
|---|---|
| **Componente** | Módulo de peso (Tabla 20) · `src/dominio/peso.ts` · `src/modulos/peso/pesajes.ts` · `src/modulos/peso/PantallaRegistrarPesaje.tsx` · `src/modulos/peso/EvolucionPeso.tsx` |
| **Capa** | Dominio, lógica y presentación |
| **Origen en el documento** | RF-13 · RF-14 · RF-27 · RF-28 · CU-08 (Tabla A8) · CU-09 (Tabla A9) · HU-05 (Tabla B5) · HU-02.4 (heredado) · apartado 3.10.4.4 · Figura 25 · Tablas 24, 27 y 30 |
| **Depende de** | [13 · Registro de un animal](13-registro-de-animal.md) (peso inicial) · [16 · Ficha](16-ficha-del-animal.md), sección 3.1 |
| **Pruebas** | PU-25 · PE-29 |

---

## 1. El problema

En la Ganadería JR el peso «se estima de manera visual» y, cuando se mide, con la cinta ganadera; quince
de los treinta novillos vendidos en el último año se negociaron por apreciación visual (apartado
3.10.4.4). HU-05 pide registrar el peso y consultar su evolución «para decidir su venta con información y
no por apreciación visual».

## 2. El pesaje (Tabla 24)

| Campo | Regla |
|---|---|
| `animal_id` | El animal desde cuya ficha se registra |
| `fecha` | Hoy por defecto (CU-08, paso 2). Sección 4 |
| `peso` | De 1 a 1.500 kg, con un decimal como máximo; coma o punto (el mismo rango del peso inicial, documento 13) |
| `metodo` | **Cinta bovinométrica** o **báscula**, obligatorio y **sin opción preseleccionada** (decisión B) |

El servicio ya exige `peso > 0` y uno de los dos métodos: **no hace falta migración** para el pesaje.

## 3. Acceso (decisión A)

En la ficha, para ambos perfiles (Tabla 27: CU-08 de creación y CU-09 de consulta para el trabajador):

| Botón | Destino |
|---|---|
| **Registrar pesaje** | `/animales/:id/pesaje` |
| **Evolución del peso** | Se despliega en la ficha (como el historial sanitario). Cumple la parte de HU-02.4 sobre la evolución del peso |

## 4. Validaciones

| Regla | Mensaje |
|---|---|
| Se escribe el peso | «Escriba el peso» |
| De 1 a 1.500 con un decimal como máximo | «El peso debe estar entre 1 y 1.500 kg, con un decimal como máximo» |
| Se elige el método | «Elija cómo se pesó» |
| La fecha existe y no es futura | «Escriba una fecha válida» · «La fecha no puede ser posterior a hoy» |
| La fecha no es anterior a la llegada al predio | «El animal llegó al predio el …» (ingreso si fue comprado, nacimiento si nació en él; el peso de compra ya vive en el animal) |
| El animal no está retirado | «Este animal salió del predio» |

El animal se verifica de nuevo **dentro de la transacción** que escribe.

## 5. Dos pesajes el mismo día (decisión C)

Se admiten (por ejemplo, cinta y luego báscula). Al elegir una fecha que ya tiene pesaje se informa, sin
bloquear: «Ya tiene un pesaje de esta fecha: 412 kg (cinta)». Entre dos pesajes del mismo día no se
calcula ganancia diaria.

## 6. Diferencia, ganancia diaria y variación significativa (decisión D, CU-08 3a)

Al escribir el peso se compara con el **último peso anterior a la fecha elegida**: el pesaje más reciente
por fecha (a igual fecha, el registrado después) o, si no hay pesajes, el peso de compra o al nacer con su
fecha (documento 16, sección 3.1).

> 32 kg más que el 3 de octubre (12 días) · 2,7 kg por día

**Se pide confirmación** cuando el cambio es atípico. Umbrales fijados por el autor el 2026-10-15:

| Situación | Atípico si… |
|---|---|
| Pasó al menos un día | La ganancia diaria es **mayor que 2,0 kg/día** o **menor que −2,0 kg/día** |
| El mismo día | La diferencia es **mayor que el 10 %** del peso anterior |
| El peso anterior no tiene fecha (peso inicial sin fecha conocida) | No se compara |

Exactamente 2,0 o −2,0 kg/día no piden confirmación. El aviso:

> ⚠ 80 kg más que el 3 de octubre (8 días): 10 kg por día. ¿Es correcto?
> ☐ Confirmo que el peso es correcto

Con el aviso, **Guardar** queda inhabilitado hasta marcar la casilla, que se desmarca si cambian el peso
o la fecha. La regla se repite al guardar, dentro de la transacción. Los umbrales sirven para detectar
errores de digitación; no son un criterio zootécnico.

**La ganancia diaria** es `(peso − peso anterior) / días`, redondeada a un decimal, con los días de
calendario entre las dos fechas.

## 7. La evolución (decisión E, CU-09)

| Aspecto | Regla |
|---|---|
| Orden | Del más antiguo al más reciente, como una serie (CU-09, paso 3) |
| Primer punto | El **peso de compra** o **al nacer**, señalado así y sin método, si existe |
| Cada pesaje | Fecha, peso, método, autor, cambio en kg, días transcurridos y ganancia diaria; barra proporcional al peso |
| Métodos distintos | Si dos puntos consecutivos son de métodos diferentes, la ganancia entre ellos lleva «métodos distintos: compárese con cautela» (Figura 25). El peso inicial no tiene método y no lleva la nota |
| Mismo día | «Mismo día»: sin ganancia diaria |
| Resumen | Arriba: ganancia total y ganancia diaria promedio desde el primer punto con fecha hasta el último |
| Un solo punto (2a) | Se muestra e indica «Con un solo peso no se puede calcular la ganancia» |
| Sin pesos (2b) | «Este animal no tiene pesajes», con **Registrar el primero** |

La ficha ya presenta como «Último peso» el pesaje más reciente (documento 16, sección 3.1).

## 8. La meta de ganancia diaria (decisión F, Tabla 30)

La ganancia diaria esperada «se definirá con el propietario, según la raza y el plan de alimentación de
cada lote» (Tabla 30); hoy no tiene valor. Se lee del parámetro `ganancia_diaria_esperada`:

- **Sin valor en el teléfono** (situación actual): no se muestra ningún aviso de meta.
- **Con valor**: cuando la ganancia diaria frente al pesaje anterior queda por debajo, aparece en el
  registro, sin bloquear: «Por debajo de la meta de 0,5 kg por día», y la evolución señala esos tramos.

Cuando el propietario dé la cifra, se carga con una migración que inserta el parámetro; la aplicación no
cambia.

## 9. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-13 · HU-05.1** | Peso, fecha y método obligatorios |
| **CU-08, 3a** | Variación atípica con confirmación |
| **CU-08, 4a** | Cancelar descarta el registro |
| **RF-14 · HU-05.2 y 3 · CU-09** | Serie completa con ganancia entre pesajes consecutivos; 2a y 2b |
| **HU-05.4** | Se escribe en la base local y sube con la cola |
| **HU-02.4** | Acceso desde la ficha a la evolución del peso |
| **Figura 25 · 3.10.4.4** | Diferencia y ganancia al escribir; barras; métodos distinguidos; meta cuando exista |

## 10. Pruebas

### PU-25 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Validaciones | Las reglas de la sección 4, todos los errores juntos |
| 2 | Peso anterior | El pesaje más reciente antes de la fecha; si no hay, el peso inicial con su fecha |
| 3 | Variación atípica | Más de 2,0 y menos de −2,0 kg/día piden confirmación; exactamente 2,0 y −2,0 no; mismo día con más de 10 % |
| 4 | Guardar | Sin confirmar un atípico no escribe; confirmado, sí; con autor, pendiente y en la cola |
| 5 | Serie | Orden, peso inicial al principio, cambio, días, ganancia, mismo día, métodos distintos |
| 6 | Resumen | Ganancia total y diaria promedio; un solo punto sin ganancia |
| 7 | Meta | Sin parámetro, ningún aviso; con parámetro, aviso bajo la meta |
| 8 | Transacción y permisos | Animal retirado o inexistente; el trabajador registra |

### PE-29 (manual)

Como **propietario**: pesar un animal de prueba de la serie Z920–Z949 con fecha pasada y luego hoy (ver
diferencia y ganancia), provocar la confirmación con una cifra mal escrita, registrar otro pesaje el mismo
día con el otro método, y consultar la evolución. Como **trabajador**: registrar un pesaje y consultar la
evolución en el otro teléfono.

## Referencias

- Documento de trabajo de grado: RF-13, RF-14, RF-27, RF-28; CU-08 (Tabla A8); CU-09 (Tabla A9); HU-05
  (Tabla B5); apartado 3.10.4.4; Figura 25; Tablas 24, 27 y 30.
