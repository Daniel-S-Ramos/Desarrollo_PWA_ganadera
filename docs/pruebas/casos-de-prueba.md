# Documento de casos de prueba — Evaluación del prototipo

Paso 6.2 del [plan](../../PLAN.md) (R5 de la ruta de cierre), apartado 1.6.3.7: «a partir de los requerimientos
funcionales y no funcionales se diseñaron los casos de prueba, especificando para cada uno las condiciones
iniciales, los datos de entrada, los pasos a ejecutar y el resultado esperado». Es un entregable de la Tabla 3.

**Responsable:** Daniel Santiago Ramos Pintor · **Versión:** 1.0 (2026-10-24)

## 1. Alcance

Se evalúa el prototipo publicado en la rama `cierre` (vista previa de Vercel) contra el servicio de Supabase de
la finca, cargado con el [conjunto de datos simulados](../../supabase/datos-simulados/README.md) (paso 6.1). La
evaluación cubre los 32 requerimientos funcionales, los 15 no funcionales y los 18 casos de uso del documento.

| Nivel | Qué verifica | Dónde se ejecutó o se ejecuta |
|---|---|---|
| Unitarias (1.6.3.9) | Cada componente por separado, con la base local simulada | 963 pruebas automáticas (PU-01 a PU-36), con informe en [`resultados/`](resultados/) |
| Integración (1.6.3.9) | El esquema, los permisos y la sincronización contra el servicio real | PI-01 (esquema, 21 verificaciones), PI-02 (gancho del token), PI-03 (políticas, 11), PI-04 (fotografías) |
| Funcionales (1.6.3.9) | Los flujos completos de registro y consulta, por perfil | **Este documento**, secciones 4 a 13 (R6) |
| Conectividad limitada (1.6.3.10) | El registro y la consulta sin conexión y la sincronización al volver | **Este documento**, sección 14, con los escenarios de la Tabla 34 (R7) |

Las pruebas manuales de cada iteración (PE-01 a PE-40) ya verificaron cada función al construirla. Los casos de
este documento recorren la aplicación terminada, con el volumen de la finca y en el orden en que la usaría el
predio; donde una prueba anterior cubre lo mismo, se cita.

## 2. Criterios de aceptación

| Resultado | Cuándo |
|---|---|
| **Aprobado** | El resultado obtenido coincide con el esperado |
| **Aprobado con observación** | Coincide en lo funcional, con una diferencia menor de presentación o de redacción que no impide la tarea |
| **Fallido** | No coincide, impide la tarea o pierde o altera información |

Un requerimiento se considera **cumplido** cuando todos sus casos están aprobados (con o sin observación). El
grado de cumplimiento del prototipo se calcula en la matriz de trazabilidad (paso 6.6, R8).

## 3. Entorno y datos

| Elemento | Valor |
|---|---|
| Aplicación | Vista previa de la rama `cierre`: `desarrollo-pwa-ganadera-git-cierre-daniel-ramos1.vercel.app` |
| Servicio | Supabase de la finca, con los datos simulados cargados el 2026-10-24 |
| Perfiles | Propietario: José Ramos. Trabajadores: Daniel Ramos y Fernando Pintor |
| Dispositivos | Computador (Chrome) y teléfono (Chrome en Android; Safari o Chrome en iPhone para los casos sin fotos) |
| Datos | 70 animales (56 activos); vacas 201–215; novillas 221–222; toro 301; ceba 401–442; crías 501–510. Detalle por chapeta en [`casos.json`](../../supabase/datos-simulados/casos.json) |

**Casos preparados en los datos** (los usan los pasos):

- Vaca **214**: sin ordeño en los últimos 5 días. Vaca **215**: ayer dio más de 35 % menos que su promedio.
- Vacas compradas 210–215; nacidas en el predio 201–209. Partos en el año de 201 a 212 (206 abortó; la cría de 209
  nació muerta); la cría más reciente, **501**, de la vaca 201, sin chapeta puesta.
- Ceba: **408** pasa de 500 kg (535,2 kg) y sigue activo; **411, 415, 417, 419, 424, 426, 435 y 441** ganan menos de
  0,5 kg/día; vendidos 401, 403–407, 409, 413, 414, 423, 427 y 431; **421** murió (timpanismo); **428** se perdió.
- Correcciones: 40 ordeños con los litros corregidos, 6 pesos corregidos (por ejemplo, el de **413** de hace 77
  días: de 582,9 a 482,9 kg) y 3 ordeños anulados y vueltos a registrar (dos de la vaca **205**, uno de la **210**).
- Eventos sanitarios: dos ciclos de vacunación al año con la vacuna del catálogo real, purgas, vitaminas y
  tratamientos con el antibiótico (sin dosis registrada). Tratamientos con síntomas, por ejemplo la vaca **210** (mastitis, cojera) y el novillo **414** (herida).

**Antes de cada sesión:** comprobar «✓ Todo enviado». Al terminar las pruebas que registran datos, los registros
nuevos quedan en el servicio hasta el vaciado previo a la entrega (R9).

---

## 4. Acceso y perfiles (RF-24 a RF-27 · CU-01 · RNF-07)

### CP-01 · Primer ingreso y código de desbloqueo
- **Requerimiento:** RF-24 · CU-01 (pasos 1 a 4 y 6 a 7) · RNF-07
- **Perfil y condiciones:** Propietario, en un navegador sin datos del sitio, con conexión.
- **Pasos:** 1) Abrir la aplicación. 2) Ingresar correo y contraseña. 3) Definir el código de desbloqueo.
- **Esperado:** pide las credenciales (no hay acceso sin ellas); tras definir el código, prepara el teléfono con la
  barra de avance de la carga inicial y muestra el inicio con «Buenas…, José», la tarjeta Producción y los
  recordatorios. Antes del ingreso solo se ve la pantalla de inicio de sesión.

### CP-02 · Reapertura sin conexión con el código
- **Requerimiento:** CU-01 (paso 5) · RF-28 · Tabla 31 («abre en un dispositivo que ya tiene sesión»)
- **Condiciones:** el dispositivo de CP-01, en modo avión, con la aplicación cerrada.
- **Pasos:** 1) Abrir la aplicación. 2) Escribir el código.
- **Esperado:** pide solo el código, no las credenciales; con el código correcto entra sin conexión y muestra los
  datos del predio.

### CP-03 · Cinco intentos fallidos
- **Requerimiento:** CU-01 · Tabla 31 · documento técnico 07
- **Pasos:** 1) Escribir cinco veces un código equivocado.
- **Esperado:** cada intento informa cuántos quedan; al quinto exige el ingreso completo con correo y contraseña,
  que necesita conexión.

### CP-04 · Ayuda para recuperar la contraseña
- **Requerimiento:** RF-24 · CU-01 · documento técnico 33
- **Pasos:** 1) En el inicio de sesión, tocar «¿Olvidó su contraseña?». 2) Volver.
- **Esperado:** indica comunicarse con **Daniel Ramos**, administrador del sistema, quien asigna una contraseña
  nueva; «Volver» regresa al inicio de sesión. (Lo mismo que PE-39.)

### CP-05 · El trabajador ve solo sus funciones
- **Requerimiento:** RF-25 · Tabla 27 · Tabla 31 («intenta una operación que no tiene habilitada»)
- **Perfil:** Trabajador (Daniel Ramos).
- **Pasos:** 1) Revisar el inicio. 2) Abrir la ficha de 402. 3) Escribir en la barra de direcciones
  `/produccion`, `/produccion-carne`, `/correcciones` y `/animales/<id>/consolidado`.
- **Esperado:** en el inicio ve Pendientes y «Ordeño de hoy», sin tarjeta ni accesos de producción ni Correcciones
  recientes; en la ficha puede registrar sanidad, pesaje y ver la evolución, pero no cambiar el destino, registrar
  la salida ni ver costos; las direcciones escritas a mano lo devuelven al inicio.

### CP-06 · Autoría visible
- **Requerimiento:** RF-27 · RNF-08 · HU-15
- **Pasos:** 1) Abrir la evolución del peso de 402 y el historial sanitario de 210.
- **Esperado:** cada registro muestra quién lo registró (José Ramos, Daniel Ramos o Fernando Pintor).

### CP-07 · Cerrar sesión con pendientes
- **Requerimiento:** CU-01 · Tabla 31 · documento técnico 12
- **Condiciones:** un registro hecho en modo avión (pendiente).
- **Pasos:** 1) Cuenta → Cerrar sesión.
- **Esperado:** dice cuántos registros faltan por enviar y ofrece enviarlos antes; no cierra mientras haya
  pendientes salvo que se confirme expresamente que se descartan.

## 5. Identificación y consulta (RF-01 a RF-06 · CU-02 · CU-03)

### CP-08 · Registrar un animal comprado con sus fotos
- **Requerimiento:** RF-01 · RF-02 · RF-03 · CU-02
- **Perfil y condiciones:** Trabajador, en el teléfono Android, **en modo avión**.
- **Datos:** chapeta **443**, macho, comprado hoy en «Feria de Cáqueza», nacimiento aproximado hace 10 meses,
  peso de compra 250 kg; tres fotos (izquierda, derecha, frente).
- **Pasos:** 1) Registrar animal. 2) Llenar los datos y tomar las tres fotos. 3) Guardar.
- **Esperado:** se guarda sin error y queda **pendiente**; la ficha muestra la foto, la edad aproximada y el peso de
  compra; al volver la conexión se envía (incluidas las fotos) y el indicador pasa a «Todo enviado».

### CP-09 · Chapeta repetida
- **Requerimiento:** RF-01 · CU-02 3a · Tabla 31
- **Datos:** chapeta **201** (ya existe) y **0201** (ceros a la izquierda).
- **Esperado:** antes de guardar advierte que la chapeta ya está asignada, muestra el animal que la tiene y no deja
  continuar hasta corregirla; «0201» se reconoce como la misma 201.

### CP-10 · Registro con fotos incompletas
- **Requerimiento:** RF-02 · Tabla 31 («el animal no permite tomar las tres fotografías»)
- **Datos:** chapeta **444**, solo la foto frontal.
- **Esperado:** se guarda; la ficha señala «Fotos: 1 de 3» con la opción de completarlas después.

### CP-11 · Buscar un animal y consultar su ficha
- **Requerimiento:** RF-05 · RF-06 · CU-03 · RNF-09
- **Datos:** chapeta **215**.
- **Pasos:** 1) Animales → buscar «215». 2) Abrir la ficha.
- **Esperado:** el listado la encuentra al escribir; la ficha presenta identificador, edad (aproximada, porque es
  comprada), último peso si lo tiene, última vacuna (la del ciclo de vacunación, con el nombre del catálogo) con su fecha, la producción de leche más reciente y el
  destino «Producción de leche»; desde la ficha se abren el historial sanitario, el peso y la producción.

### CP-12 · Genealogía de una cría
- **Requerimiento:** RF-04 · CU-10 (cría)
- **Datos:** cría **506** (madre 207).
- **Esperado:** la ficha muestra la madre **207** (enlace a su ficha) y el padre: el toro **301** o la inseminación,
  señalada como reproductor externo.

### CP-13 · Filtros del listado
- **Requerimiento:** RF-06 · CU-03 · documento técnico 15
- **Pasos:** 1) Activos, Retirados y Todos. 2) En Retirados, los motivos. 3) En Activos, la categoría Ceba.
- **Esperado:** las cantidades coinciden con los datos (antes de las pruebas que agregan o retiran animales: 56 activos, 14 retirados, 70 en total); en Retirados aparecen
  12 vendidos, 1 muerto (421) y 1 perdido (428); la categoría Ceba (con el filete) lista los animales de ceba activos.

## 6. Sanidad (RF-07 a RF-09 · CU-04 · CU-05)

### CP-14 · Registrar un evento sanitario
- **Requerimiento:** RF-07 · CU-04
- **Perfil:** Trabajador. **Datos:** novillo **402**, purga del catálogo, costo 5.000.
- **Esperado:** la fecha de hoy viene puesta; el medicamento se escoge del catálogo y la dosis se escribe en su
  unidad; se guarda y aparece primero en el historial de 402 con el autor.

### CP-15 · Advertencia por repetición del medicamento
- **Requerimiento:** RF-09 · CU-04 5a · HU-09 · Tabla 31
- **Datos:** a 402, la misma purga de CP-14, otra vez hoy.
- **Esperado:** antes de guardar muestra la fecha de la aplicación anterior y la última dosis registrada, y exige
  una confirmación explícita; no recomienda dosis.

### CP-16 · Medicamento que no está en el catálogo
- **Requerimiento:** RF-07 · Tabla 31 · documento técnico 18
- **Pasos:** 1) En el registro sanitario, «Agregar un medicamento» con un nombre nuevo. 2) Repetir con un nombre ya
  registrado escrito con otra tilde o mayúsculas.
- **Esperado:** lo agrega sin salir del registro, pidiendo nombre, tipo, unidad e intervalo de advertencia; con el
  nombre repetido ofrece el existente en lugar de crear un duplicado.

### CP-17 · Historial sanitario
- **Requerimiento:** RF-08 · CU-05 · HU-03
- **Datos:** vaca **210**.
- **Esperado:** los eventos del año en orden cronológico (del más reciente al más antiguo), con fecha, tipo,
  medicamento, costo, síntomas (mastitis y cojera) y autor.

## 7. Producción de leche (RF-10 a RF-12 · CU-06 · CU-07)

### CP-18 · Ronda de ordeño de hoy
- **Requerimiento:** RF-10 · CU-06 · HU-04 · RNF-03
- **Perfil:** Trabajador, en el teléfono.
- **Pasos:** 1) Ordeño. 2) Registrar los litros de las 15 vacas, una tras otra.
- **Esperado:** la ronda lista las 15 vacas en producción; cada una muestra su promedio de los últimos 7 días y, al
  escribir, la diferencia en litros y en palabras; al guardar pasa sola a la siguiente; el inicio cuenta el avance.

### CP-19 · Vaca que ya tiene ordeño hoy
- **Requerimiento:** CU-06 3a · Tabla 31 · documento técnico 32
- **Pasos:** 1) Volver a una vaca ya registrada en CP-18 con el perfil propietario e intentar otro valor.
- **Esperado:** advierte el registro existente con su valor y autor, indica que el nuevo lo reemplazará y solo
  guarda tras confirmar, como corrección del anterior (no como segundo ordeño).

### CP-20 · Baja atípica de la leche
- **Requerimiento:** Tabla 30 (variación atípica, 35 %) · documento técnico 22, sección 6.3
- **Datos:** para la vaca **215**, un valor de al menos 35 % menos que su promedio (por ejemplo, la mitad).
- **Esperado:** «Muy por debajo de su promedio» como aviso de atención, sin impedir guardar; con un 25 % menos solo
  dice «Por debajo de su promedio».

### CP-21 · Producción de una vaca por día, semana y mes
- **Requerimiento:** RF-11 · CU-07 (pasos 1 a 4)
- **Perfil:** Propietario. **Datos:** vaca **201** (parto hace 12 días, seca los 60 días anteriores).
- **Esperado:** el día muestra los litros y la comparación con el promedio; la semana y el mes, el total, los días
  registrados y el promedio por día registrado; en los meses del secado no hay registros y no se cuentan como ceros.

### CP-22 · Comparación entre vacas
- **Requerimiento:** RF-12 · CU-07 (pasos 5 y 6, 5a) · HU-10
- **Pasos:** 1) Producción de leche → Comparar. 2) Día, semana y mes. 3) De menor a mayor.
- **Esperado:** las vacas ordenadas por su promedio con el promedio del hato; la **214** marcada con pocos
  registros en la semana; el orden se invierte; tocar una vaca abre su producción diaria.

## 8. Peso y producción de carne (RF-13 · RF-14 · CU-08 · CU-09 · 2.2.7)

### CP-23 · Registrar un pesaje
- **Requerimiento:** RF-13 · CU-08 · HU-05
- **Perfil:** Trabajador. **Datos:** novillo **412**, cinta bovinométrica, peso actual + 3 kg.
- **Esperado:** pide peso, método y fecha (hoy por defecto); muestra la comparación con el peso anterior («Frente
  al pesaje anterior del… : +… kg en … días, … kg por día»); se guarda.

### CP-24 · Variación atípica del peso
- **Requerimiento:** CU-08 · documento técnico 24, sección 6
- **Datos:** a **402**, un peso 100 kg mayor que el último.
- **Esperado:** advierte la variación atípica (más de 2 kg por día) y pide confirmar antes de guardar.

### CP-25 · Evolución del peso
- **Requerimiento:** RF-14 · CU-09 · 3.11.4
- **Datos:** **413** (vendido, con un peso corregido) y **411** (bajo la meta).
- **Esperado:** la serie desde el peso de compra con la ganancia entre pesajes consecutivos; en 413 el pesaje de hace
  77 días vale **482,9 kg** (el corregido, no 582,9); en 411 los tramos bajo 0,5 kg por día marcados por debajo de la
  meta; los tramos entre cinta y báscula, señalados.

### CP-26 · Producción de carne por mes
- **Requerimiento:** 2.2.7 · documento técnico 34 · Tabla 27
- **Perfil:** Propietario.
- **Pasos:** 1) Inicio → Producción → Carne. 2) Revisar el mes en curso. 3) Mes anterior. 4) De menor a mayor.
- **Esperado:** el lote con kilos ganados, ganancia promedio y «X de Y pesados»; cada animal con su tramo; los de
  ganancia menor a 0,5 kg/día con «Bajo lo esperado»; los no pesados en el mes, al final; tocar uno abre su
  evolución.

### CP-27 · Ciclo completo de la ceba
- **Requerimiento:** 2.2.7 · documento técnico 34, sección 6 bis · parámetro `peso_final_ceba`
- **Esperado:** «28 animales en ceba» (o los que haya tras las pruebas); **408** arriba con «Terminado: alcanzó
  los 500 kg»; los demás ordenados por lo que les falta, con la barra y «a este ritmo, unos…»; la nota de último
  pesaje antiguo en los que llevan más de 30 días sin pesar.

## 9. Salida y venta (RF-15 · CU-13)

### CP-28 · Vender un animal terminado
- **Requerimiento:** RF-15 · CU-13 · HU-11
- **Perfil:** Propietario. **Datos:** **408**, venta, peso 536 kg, valor 4.600.000, comprador «Frigorífico de
  Guadalupe».
- **Esperado:** pide peso y valor; tras guardar, 408 pasa a Retirados (vendido), sale de la ronda, de la ceba y de
  los recordatorios, y su ficha muestra la salida.

### CP-29 · Salida por muerte
- **Requerimiento:** RF-15 · CU-13 · Tabla 31
- **Datos:** un animal de ceba bajo la meta (por ejemplo **441**), muerte, causa «Neumonía».
- **Esperado:** al escoger muerte oculta el peso y el valor de venta y pide la causa; el consolidado lo presenta como
  pérdida (ver CP-38).

## 10. Reproducción (RF-16 · RF-17 · CU-10 · CU-11)

### CP-30 · Parto con cría viva
- **Requerimiento:** RF-16 · CU-10 · HU-12
- **Perfil:** Trabajador. **Datos:** vaca **213**, hoy, cría viva hembra, padre el toro 301, chapeta de la cría
  sugerida.
- **Esperado:** pide el resultado antes que la cría; la cría queda en el inventario con madre y padre, **sin chapeta
  puesta**, y aparece el recordatorio de chapeta pendiente.

### CP-31 · Parto sin cría viva y reproductor externo
- **Requerimiento:** RF-16 · CU-10 3a y 3b · Tabla 31
- **Datos:** vaca **214**, cría nacida muerta; luego, en otra prueba, un parto con padre externo «Toro del vecino».
- **Esperado:** con la cría nacida muerta no pide registrar un animal y ofrece una observación; el parto cuenta en el
  control reproductivo; el padre externo se escribe como texto y la ficha de la cría lo señala como externo.

### CP-32 · Control reproductivo
- **Requerimiento:** RF-17 · CU-11
- **Perfil:** Propietario. **Datos:** registrar a la vaca **202** un parto anterior, con fecha de hace 14 meses.
- **Esperado:** el control de 202 muestra dos partos y el intervalo entre ellos (unos 13 meses); el de 206 muestra el
  aborto contado como parto.

## 11. Destino productivo (RF-18 · RF-19 · CU-12)

### CP-33 · Cambiar el destino y consultar el historial
- **Requerimiento:** RF-18 · RF-19 · CU-12 · HU-13
- **Perfil:** Propietario. **Datos:** novilla **222**, de reproductora a producción de leche.
- **Esperado:** el destino nuevo queda vigente y 222 entra a la ronda de ordeño; el historial conserva el anterior
  con su fecha; el historial de la vaca **201** muestra leche → reproductora (secado) → leche.

## 12. Economía (RF-20 · RF-21 · CU-14)

### CP-34 · Registrar un costo
- **Requerimiento:** RF-20 · CU-14
- **Perfil:** Propietario. **Datos:** a **402**, alimentación, 80.000, «Suplemento».
- **Esperado:** se guarda y suma a lo invertido en su consolidado; el trabajador no ve esta opción (CP-05).

### CP-35 · Consolidado de una vaca comprada
- **Requerimiento:** RF-21 · CU-14 · Tabla 31
- **Datos:** vaca **210**.
- **Esperado:** lo invertido (compra, eventos sanitarios con costo, servicios) y lo generado (la leche registrada
  valorada al precio por litro vigente, 1.950), con la advertencia de que es el valor de la producción y no el dinero
  recibido.

### CP-36 · Consolidado de un animal nacido en el predio
- **Datos:** vaca **201**.
- **Esperado:** señala que no tiene costo de compra, para no compararla sin advertencia con una comprada.

### CP-37 · Consolidado de un vendido y de un muerto
- **Datos:** **401** (vendido) y **421** (muerto).
- **Esperado:** 401 con el valor de la venta como ingreso y su resultado; 421 con un resultado de **pérdida**
  equivalente a lo invertido, no como una venta de valor cero.

## 13. Recordatorios y correcciones (RF-22 · RF-23 · RF-31 · RF-32 · CU-15 · CU-17 · CU-18)

### CP-38 · Recordatorios al iniciar
- **Requerimiento:** RF-22 · RF-23 · CU-15 · HU-14
- **Esperado:** el inicio muestra los recordatorios y la pestaña Alertas todos: vaca **214** sin ordeño, vaca **215**
  muy por debajo de su promedio, animales de ceba sin pesaje en más de 30 días, la cría **501** sin chapeta, animales
  sin registros recientes.

### CP-39 · Posponer y atender un recordatorio
- **Requerimiento:** RF-23 · CU-15 · Tabla 31
- **Pasos:** 1) Posponer uno de pesaje por 3 días. 2) Registrar el ordeño de la vaca 214.
- **Esperado:** se ofrecen 1, 3 o 7 días; el pospuesto no vuelve a aparecer en ese plazo; el de 214 desaparece solo al
  registrar su ordeño, sin cerrarlo a mano.

### CP-40 · Corregir como trabajador
- **Requerimiento:** RF-25 · RF-26 · RF-31 · CU-17 · Tabla 31
- **Perfil:** Trabajador. **Datos:** un ordeño que registró hoy (CP-18) y uno de ayer o del propietario.
- **Esperado:** corrige el de hoy dejando el valor anterior, el nuevo y el motivo; en el de ayer o del propietario no
  aparece la opción de corregir.

### CP-41 · Anular como propietario y consultar las correcciones
- **Requerimiento:** RF-31 · RF-32 · CU-17 · CU-18 · RNF-06
- **Perfil:** Propietario.
- **Pasos:** 1) Anular el pesaje de CP-24 con el motivo «error de digitación». 2) Correcciones recientes.
- **Esperado:** el pesaje anulado deja de contar pero sigue visible, marcado; Correcciones recientes muestra quién,
  sobre qué registro, qué cambió y por qué, incluidas las correcciones del conjunto simulado (los litros corregidos
  y los ordeños anulados de la vaca 205).

## 14. Conectividad limitada y sincronización (RF-28 a RF-30 · CU-16 · RNF-04 · RNF-05 · RNF-09 · Tabla 34)

Se ejecutan en el paso 6.4 (R7). «Sin conexión» es el modo avión del teléfono.

### CP-42 · Registrar y consultar sin conexión
- **Requerimiento:** RF-28 · RF-30 · CU-16 · Tabla 31 · Tabla 34 (escenario 2)
- **Pasos:** 1) En modo avión, abrir la ficha de 210, registrar un ordeño (si no tiene el de hoy), un pesaje a 434 y
  posponer un recordatorio. 2) Quitar el modo avión.
- **Esperado:** todo funciona sin mensajes de error; el indicador cuenta los pendientes y cada registro se marca
  pendiente; al volver la conexión se envían solos y el indicador pasa a «Todo enviado».

### CP-43 · Cierre inesperado con pendientes
- **Requerimiento:** RNF-04 · Tabla 31 («la aplicación se cierra antes de terminar un registro»)
- **Pasos:** 1) En modo avión, registrar un evento sanitario. 2) Empezar otro sin guardarlo. 3) Cerrar la aplicación
  a la fuerza (o apagar el teléfono). 4) Volver a abrir.
- **Esperado:** el registro guardado sigue pendiente; el que no se guardó no aparece a medias (el formulario abre
  vacío).

### CP-44 · Dos teléfonos sin señal sobre el mismo animal
- **Requerimiento:** RF-29 · Tabla 34 (escenario 1)
- **Pasos:** 1) Ambos teléfonos en modo avión. 2) El trabajador registra un tratamiento a **434** y el propietario un
  pesaje a **434**. 3) Reconectar los dos.
- **Esperado:** se conservan los dos registros, cada uno con su autor, en ambos teléfonos.

### CP-45 · El mismo ordeño en dos teléfonos sin señal
- **Requerimiento:** RF-29 · 3.8.6 · Tabla 21
- **Pasos:** 1) Ambos en modo avión, registrar el ordeño de hoy de la misma vaca con valores distintos. 2) Reconectar.
- **Esperado:** queda un solo ordeño vigente; el otro valor no se pierde: queda como corrección, visible en
  Correcciones recientes con su autor.

### CP-46 · La misma chapeta en dos teléfonos sin señal
- **Requerimiento:** RF-01 · Tabla 21 · Tabla 34 (escenario 5) · documento técnico 26, sección 10
- **Pasos:** 1) Ambos en modo avión, registrar un animal nuevo con la chapeta **445** (distinto en cada uno).
  2) Reconectar primero uno y luego el otro.
- **Esperado:** el primero se acepta; el segundo queda en conflicto en el teléfono que lo registró, que ofrece
  resolverlo (cambiar el número o unirlo con el existente); nada se pierde.

### CP-47 · Conexión que se corta a mitad del envío
- **Requerimiento:** RF-29 · Tabla 34 (escenario 6) · 3.7.8
- **Pasos:** 1) En modo avión, registrar 10 ordeños o pesajes. 2) Quitar el modo avión y volver a ponerlo apenas
  empiece el envío. 3) Reconectar.
- **Esperado:** lo no enviado sigue pendiente y se reintenta; al terminar no hay registros duplicados.

### CP-48 · Teléfono dañado con pendientes
- **Requerimiento:** RNF-05 · Tabla 34 (escenario 3)
- **Pasos:** 1) En modo avión, registrar un pesaje. 2) Simular el daño: borrar los datos del sitio. 3) Entrar de
  nuevo con conexión.
- **Esperado:** la carga inicial recupera todo lo que ya estaba en el servicio; solo se pierde el pesaje que no
  alcanzó a enviarse.

### CP-49 · Permisos también en el servidor
- **Requerimiento:** RF-26 · Tabla 34 (escenario 4) · 3.9.3
- **Esperado:** cubierto por PI-03 (verificaciones 2, 6 a 10): el servidor rechaza lo que la interfaz no ofrece,
  incluida la corrección de un trabajador sobre un registro de otro día o del propietario.

## 15. Requerimientos no funcionales

### CP-50 · Instalación y almacenamiento persistente
- **Requerimiento:** RNF-11 · RNF-15
- **Pasos:** 1) En Android, instalar la aplicación desde Chrome («Instalar aplicación»). 2) Abrirla desde el ícono.
- **Esperado:** se instala sin tienda de aplicaciones y abre en su propia ventana; el almacenamiento queda
  persistente (en un navegador que lo niegue, la aplicación lo advierte). Cubierto antes por PE-18.

### CP-51 · Teléfono y computador
- **Requerimiento:** RNF-10
- **Esperado:** las mismas pantallas se adaptan al teléfono y al computador sin desplazamiento horizontal.

### CP-52 · Operación en campo
- **Requerimiento:** RNF-01 · 3.10.4.1 · 3.10.4.2
- **Esperado:** controles de al menos 64 px (fichas de filtro de 44 px) y contraste de texto de al menos 7 a 1 en
  todas las pantallas (PU-01 lo verifica en la paleta; se revisa en el teléfono a pleno sol).

### CP-53 · Pocos pasos y poca escritura
- **Requerimiento:** RNF-03
- **Pasos:** contar los toques para registrar un ordeño en la ronda y un pesaje desde la ficha.
- **Esperado:** el ordeño pide solo los litros (la fecha y la vaca vienen puestas) y pasa a la siguiente vaca; el
  pesaje pide peso y método con la fecha de hoy predeterminada; los catálogos son listas de selección.

### CP-54 · Aprendizaje con una sola sesión
- **Requerimiento:** RNF-02
- **Perfil:** una persona sin experiencia en aplicaciones de gestión (el propietario o un trabajador de la finca).
- **Pasos:** 1) Una sesión de acompañamiento de unos 15 minutos: ingreso, ronda de ordeño, pesaje y evento
  sanitario. 2) Sin ayuda, registrar un ordeño, un pesaje y un evento sanitario.
- **Esperado:** completa los tres registros sin ayuda tras la sesión. Se anota el tiempo y las dudas.

### CP-55 · Fotos comprimidas
- **Requerimiento:** RNF-12
- **Esperado:** cada foto de CP-08 se guarda reducida (del orden de 100 kB, en WebP); cubierto por PU-14 y PI-04.

### CP-56 · Inmutabilidad y módulos
- **Requerimiento:** RNF-06 · RNF-08 · RNF-13
- **Esperado:** ningún perfil modifica ni elimina un registro (PI-03, verificación 11; las correcciones son
  registros nuevos, CP-40 y CP-41); el código está organizado por módulos funcionales (`src/modulos/`, Tabla 20).

---

## 16. Relación con los requerimientos

| Requerimiento | Casos |
|---|---|
| RF-01 · RF-02 · RF-03 | CP-08, CP-09, CP-10, CP-46 |
| RF-04 | CP-12, CP-31 |
| RF-05 · RF-06 | CP-11, CP-13 |
| RF-07 · RF-08 · RF-09 | CP-14, CP-15, CP-16, CP-17 |
| RF-10 · RF-11 · RF-12 | CP-18 a CP-22 |
| RF-13 · RF-14 | CP-23 a CP-27 |
| RF-15 | CP-28, CP-29 |
| RF-16 · RF-17 | CP-30, CP-31, CP-32 |
| RF-18 · RF-19 | CP-33 |
| RF-20 · RF-21 | CP-34 a CP-37 |
| RF-22 · RF-23 | CP-38, CP-39 |
| RF-24 a RF-27 | CP-01 a CP-07 |
| RF-28 a RF-30 | CP-02, CP-08, CP-42 a CP-48 |
| RF-31 · RF-32 | CP-19, CP-40, CP-41, CP-45 |
| RNF-01 a RNF-15 | CP-50 a CP-56, CP-11 (RNF-09), CP-43 (RNF-04), CP-48 (RNF-05), CP-01 (RNF-07) |

Los resultados de la ejecución se registran en [`cierre.md`](cierre.md) (R6 y R7) y el contraste final en la matriz
de trazabilidad (R8).
