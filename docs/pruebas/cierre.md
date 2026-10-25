# Pruebas de la fase de cierre — Evaluación del prototipo

Pasos 6.0 a 6.7 del [plan](../../PLAN.md) (apartados 1.6.3.7 a 1.6.3.11). Rama `cierre`; al fusionarla se
etiqueta `v1.0`.

**Responsable:** Daniel Santiago Ramos Pintor
**Estado:** en curso

## Resumen de resultados

| Id | Prueba | Paso | Requerimiento | Estado |
|---|---|---|---|---|
| PU-23 | Ronda de ordeño: un solo ordeño vigente por vaca y día (apartado 10) | 6.0 | RF-10 · CU-06 · CU-17 1a | ✅ |
| PU-10 | Subida: el ordeño duplicado frente a un anulado (apartado 12) | 6.0 | RF-10 · 3.8.6 · Tabla 21 | ✅ |
| PI-01 | Esquema remoto: un solo ordeño vigente por vaca y día (verificación 19) | 6.0 | Tabla 24 | ✅ |
| PE-38 | Anular un ordeño y registrar otro el mismo día, en el navegador real | 6.0 | CU-06 · CU-17 · Tabla 27 | ✅ |
| PU-34 | Resumen del inicio: saludo, producción del día, avance de la ronda, desglose de pendientes | Rediseño | RF-23 · 3.10.4 | ✅ |
| PU-12.7 | Barra de avance de la carga inicial | Rediseño | 3.7.6 · documento 17 | ✅ |
| PU-16.7 | Cantidad de animales por estado en el listado | Rediseño | RF-06 · CU-03 | ✅ |
| PU-35 | Contacto del administrador para recuperar la contraseña | 6.0b | RF-24 · CU-01 | ✅ |
| PE-39 | Ayuda para recuperar la contraseña, en el navegador real | 6.0b | RF-24 · CU-01 | ⬜ Faltan las capturas |
| PU-36 | Producción de carne: por mes, ciclo completo y resumen del inicio | 6.0c | 2.2.7 · RF-13 · RF-14 · CU-09 · HU-05 | ✅ |
| PI-01 | Esquema remoto: peso de finalización de la ceba (verificación 20) | 6.0c | Tabla 30 | ✅ |
| PE-40 | Producción de carne en el navegador real, propietario y trabajador | 6.0c | 2.2.7 · CU-09 · Tabla 27 | ✅ |

---

## PU-23 y PU-10 · Un solo ordeño vigente por vaca y día

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que el ordeño anulado deja la vaca pendiente en la ronda, que con el anterior anulado se registra otro, que con un anulado y uno vigente la ronda y el reemplazo usan el vigente, que la ronda se entera de la anulación, y que en la subida el duplicado se convierte en corrección del ordeño **vigente** (un ordeño con los litros corregidos sigue vigente) y frente a un anulado se acepta como ordeño |
| Requerimiento | RF-10 · CU-06 (pasos 3 a 5, 3a) · CU-17, 1a · apartado 3.8.6 · Tabla 21 |
| Tipo | Unitaria, automática; la consulta en vivo se observa como en la pantalla |
| Código | [`ronda.ts`](../../src/modulos/leche/ronda.ts) · [`servicioSimulado.ts`](../../src/test/servicioSimulado.ts) (la misma regla del disparador) · pruebas [`ronda.test.ts`](../../src/modulos/leche/ronda.test.ts) (PU-23.10), [`subida.test.ts`](../../src/sync/subida.test.ts) (PU-10.12) y [`consultasEnVivo.test.ts`](../../src/datos/consultasEnVivo.test.ts) (PU-27.9, la ronda) · especificación [documento técnico 32](../tecnica/32-ordeno-vigente-unico.md), sección 7 |
| Resultado obtenido | **PU-23.10: 3 de 3 · PU-10.12: 3 de 3 · PU-27.9: 17 de 17** (caso de la ronda agregado). Total del conjunto automático: **904 de 904** ([informe](resultados/2026-10-21_193530_80e93aa.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-21 |

**Mutaciones.** Seis. Cinco detectadas a la primera: la ronda con los anulados, el anulado que cuenta al
registrar, solo el primer ordeño del día, el reemplazo sobre el registro equivocado y el simulado contando los
anulados. **Una sobrevivió:** el simulado tomaba cualquier corrección como anulación; se agregó el caso de un
ordeño con los litros corregidos, que sigue vigente. Al cierre, 6 de 6.

La búsqueda del ordeño vigente contra Supabase (`buscarOrdeno`, documento 32, sección 4) no tiene prueba
automática porque usa el cliente real; la regla la fija el disparador (PI-01) y la imita el servicio simulado.

## PI-01 · Un solo ordeño vigente por vaca y día (verificación 19)

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar la migración del paso: el segundo ordeño vigente se rechaza (23505), el reenvío se ignora, anulado el primero se admite otro y un tercero, con el segundo vigente, se rechaza |
| Código | Migración [`20261022000100_ordeno_vigente_unico.sql`](../../supabase/migrations/20261022000100_ordeno_vigente_unico.sql) · [`supabase/pruebas/pi-01-esquema.sql`](../../supabase/pruebas/pi-01-esquema.sql), verificación 19 (la 6 sigue aprobada) |
| Resultado obtenido | **19 de 19** ([evidencia](evidencias/cierre/PI-01-12-ordeno-vigente-unico.txt)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-22 |

## PE-38 · Anular un ordeño y registrar otro el mismo día

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario que, anulado el ordeño de una vaca, la ronda la vuelve a ofrecer y admite otro ese día, con la anulación en Correcciones recientes; y como trabajador que recibe el ordeño nuevo |
| Requerimiento | CU-06 · CU-17 · RF-10 · RF-32 · Tabla 27 |
| Tipo | Manual: propietario en Chrome del computador; trabajador en Chrome de un iPhone. Dirección de la rama `cierre` (commit 80e93aa) |
| Resultado obtenido | Aprobada. Las instrucciones iniciales mandaban anular desde la producción diaria, que no tiene ese enlace; se corrigieron (observación 1) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-21 |

| # | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Propietario | Ordeño de Z920 en la ronda del 21 de octubre | Producción diaria: «Z920 · 13 litros» | [captura](evidencias/cierre/PE-38-01-z920-13-litros-antes.png) |
| 2 | Propietario | En la ronda, Z920 → **Corregir o anular este ordeño** → **Anular el registro** | Aviso nuevo: «La vaca volverá a quedar pendiente en la ronda del 21 de octubre de 2026. Si el error es la cantidad, corrija los litros en lugar de anular» | [captura](evidencias/cierre/PE-38-02-anular-aviso-nuevo.png) |
| 3 | Propietario | Volver a la ronda | Z920 **Sin registro**, con el formulario; «Vacas en producción · 1 de 5» | [captura](evidencias/cierre/PE-38-03-z920-sin-registro.png) |
| 4 | Propietario | Registrar 20 litros | «✓ Z920: 20 litros registrados»; 2 de 5. Al volver a Z920, «Ya hay un registro… 20 litros», con el reemplazo y el enlace sobre el ordeño nuevo | [registrado](evidencias/cierre/PE-38-04-z920-20-litros-registrados.png) · [vigente](evidencias/cierre/PE-38-05-z920-registro-vigente.png) |
| 5 | Propietario | **Correcciones recientes** | «Z920 · Ordeño del 21 de octubre de 2026 · Anulado», con el motivo y el autor | [captura](evidencias/cierre/PE-38-06-correcciones-recientes-anulado.png) |
| 6 | Propietario | Esperar la sincronización | «✓ Todo enviado»: el servicio admitió el ordeño nuevo junto al anulado (disparador) | [captura](evidencias/cierre/PE-38-07-todo-enviado.png) |
| 7 | Trabajador | Ronda del 21 de octubre en el iPhone | Z920 con **20 litros** registrados por José Ramos, sin poder reemplazarlos; ✓ 20 litros en la lista | [Z920](evidencias/cierre/PE-38-08-trabajador-z920-20-litros.webp) · [lista](evidencias/cierre/PE-38-09-trabajador-ronda.png) |

**Observaciones.**

1. **Las instrucciones de la prueba estaban mal, no la aplicación.** Se pidió anular desde la producción diaria,
   que no tiene **Corregir o anular**; el enlace está en la ronda, dentro del aviso de la vaca con registro
   (documento 26). Se consideró ofrecerlo también en la producción diaria; el autor decidió dejarlo como está
   (2026-10-21).
2. Se registraron 20 litros en lugar de los 12 sugeridos; no cambia el resultado.
3. No se probó un ordeño duplicado desde dos teléfonos con un anulado de por medio (la búsqueda real del ordeño
   vigente): lo cubren PU-10.12 con el servicio simulado y la regla del disparador en PI-01.

## Rediseño visual · PU-34, PU-12.7 y PU-16.7

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar la lógica que agregó el rediseño visual (2026-10-22 a 2026-10-24): el saludo y el primer nombre, la producción del día con la serie de 7 días y la diferencia con el día anterior, el avance de la ronda y el desglose de pendientes (PU-34); el porcentaje de la barra de la carga inicial (PU-12.7); la cantidad de animales activos, retirados y todos del listado (PU-16.7) |
| Requerimiento | RF-23 · RF-06 · CU-03 · 3.7.6 · 3.10.4 |
| Tipo | Unitaria, automática. Lo visual (colores, controles de 64 px, contraste de 7 a 1) lo revisó el autor pantalla por pantalla en la vista previa de la rama |
| Código | [`resumen.ts`](../../src/modulos/inicio/resumen.ts) ([pruebas](../../src/modulos/inicio/resumen.test.ts)) · barra de la carga inicial (PU-12, grupo 7) · [`listado.ts`](../../src/modulos/consulta/listado.ts) (PU-16, grupo «Cuántos animales hay en cada estado») |
| Resultado obtenido | **PU-34: 9 de 9 · PU-12.7: 2 de 2 · PU-16.7: 1 de 1** ([informe](resultados/2026-10-24_200913_799c5cf.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-24 |

El rediseño no cambió reglas del negocio: son cambios de presentación aprobados por el autor (PLAN.md,
decisiones del 2026-10-22 y 2026-10-23). El panel de categorías se aclaró de #eef5ef a #f3f8f4 para llegar a
7,01 a 1 (PU-01).

## PU-35 · Contacto del administrador para recuperar la contraseña

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que el mensaje de ayuda nombra al administrador que define `VITE_ADMIN_NOMBRE` y que, sin nombre, sigue siendo comprensible; y que un teléfono, si se configura, se normaliza para llamar y para WhatsApp |
| Requerimiento | RF-24 · CU-01 · documento técnico 33 |
| Tipo | Unitaria, automática |
| Código | [`administrador.ts`](../../src/sesion/administrador.ts) · [pruebas](../../src/sesion/administrador.test.ts) |
| Resultado obtenido | **5 de 5** ([informe](resultados/2026-10-24_200913_799c5cf.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-24 |

**PE-39 queda pendiente:** faltan las capturas de la pantalla «¿Olvidó su contraseña?» en la vista previa, con
el nombre **Daniel Ramos** en negrilla.

## PU-36 · Producción de carne

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar la producción de carne de los animales de ceba: el mes calendario y su navegación; qué animales entran según el historial de destinos; el tramo de cada animal (referencia, peso final, kilos, días y ganancia); un tramo por mes; cinta y báscula; la meta de ganancia; el lote; el orden; el valor vigente; el resumen del inicio con su último registro; los permisos; y el ciclo completo hasta el peso de finalización, con lo que falta, el avance, la estimación y el pesaje viejo |
| Requerimiento | Apartado 2.2.7 · RF-13 · RF-14 · CU-09 · HU-05 · 3.11.4 · Tablas 27 y 30 |
| Tipo | Unitaria, automática, con la base local simulada |
| Código | [`produccionCarne.ts`](../../src/modulos/peso/produccionCarne.ts) · [pruebas](../../src/modulos/peso/produccionCarne.test.ts) · especificación [documento técnico 34](../tecnica/34-produccion-de-carne.md), sección 12 |
| Resultado obtenido | **35 de 35**. Total del conjunto automático: **959 de 959** ([informe](resultados/2026-10-24_200913_799c5cf.md)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-24 |

**Mutaciones.** Treinta y cuatro. Treinta y tres detectadas a la primera. **Una sobrevivió:** quitar el tope de
100 % del avance; era equivalente, porque un animal sin terminar pesa menos que el peso final y su avance no
puede pasar de 100. Se quitó el tope del código. Al cierre, 33 de 33.

## PI-01 · Peso de finalización de la ceba (verificación 20)

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que la migración del paso cargó el parámetro `peso_final_ceba` con 500 kg |
| Código | Migración [`20261024000100_peso_final_ceba.sql`](../../supabase/migrations/20261024000100_peso_final_ceba.sql) · [`pi-01-esquema.sql`](../../supabase/pruebas/pi-01-esquema.sql), verificación 20 |
| Resultado obtenido | **20 de 20** (salida de la consola entregada por el autor el 2026-10-24) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-24 |

## PE-40 · Producción de carne en el navegador real

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar como propietario la tarjeta «Producción» del inicio y sus dos destinos, la vista por mes, el mes anterior, el ciclo completo, el paso a la evolución del peso y el filete en el listado; y como trabajador que no ve la producción |
| Requerimiento | Apartado 2.2.7 · CU-09 · HU-05 · Tabla 27 · documento técnico 34 |
| Tipo | Manual: propietario en el navegador del computador; trabajador en un iPhone. Vista previa de la rama `cierre` (commits 3f6f66c a 799c5cf) |
| Datos | Animales de prueba Z900, Z901, Z902 y Z970 con destino ceba desde octubre; Z900 comprado el 10 de octubre con 190 kg y pesado el 24 con 510 kg; Z902 con un solo peso de 230 kg |
| Resultado obtenido | Aprobada. Durante la prueba el autor pidió ajustes de presentación, que se hicieron antes de las capturas finales (observación 1) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-24 |

| # | Perfil | Acción | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Propietario | Abrir el inicio | Tarjeta **Producción** al lado de Pendientes: Leche «25 L · Último ordeño: 21 de octubre de 2026» y Carne «320 kg · Último registro: hoy»; accesos **Producción de leche** y **Producción de carne** | [captura](evidencias/cierre/PE-40-01-inicio-propietario-produccion.png) |
| 2 | Propietario | Tocar **Carne** → **Por mes** | Octubre (en curso): «+320 kg ganados · 22,9 kg por día · 1 de 4 pesados»; Z900 con su tramo; Z901, Z902 y Z970 bajo «Sin pesaje este mes» | [captura](evidencias/cierre/PE-40-02-por-mes-octubre.png) |
| 3 | Propietario | **← Mes anterior** | Septiembre: «No hubo animales en ceba en este mes», con **Ver el mes anterior** (los animales entraron a ceba en octubre) | [captura](evidencias/cierre/PE-40-03-septiembre-sin-ceba.png) |
| 4 | Propietario | **Ciclo completo** | «4 animales en ceba · 1 terminado (desde 500 kg) · +320 kg»; Z900 «Terminado: alcanzó los 500 kg»; Z902 «Un solo peso registrado: 230 kg · Faltan 270 kg para los 500 kg» | [captura](evidencias/cierre/PE-40-04-ciclo-completo.png) |
| 5 | Propietario | Tocar Z900 | Ficha con la **evolución del peso** abierta: 190 kg (compra) → 510 kg, «+320 kg en 14 días» | [captura](evidencias/cierre/PE-40-05-z900-evolucion.png) |
| 6 | Propietario | Listado de animales | La ficha **Ceba** con el filete; los animales de prueba con destino Ceba | [categorías](evidencias/cierre/PE-40-06-listado-ceba-filete.png) · [animales](evidencias/cierre/PE-40-07-listado-ceba-z900.png) |
| 7 | Trabajador | Abrir el inicio en el iPhone | Pendientes y **Ordeño de hoy**; sin tarjeta ni accesos de producción | [captura](evidencias/cierre/PE-40-08-trabajador-sin-produccion.jpg) |

**Observaciones.**

1. **Ajustes pedidos por el autor durante la prueba**, todos de presentación:
   - la tarjeta «Producción» va al lado de Pendientes, con dibujo, valor y fecha del último registro, según un
     modelo del inicio que entregó el autor (documento 34, sección 7);
   - el filete se redibujó al estilo del emoji de WhatsApp;
   - Medicamentos con el mismo tamaño que los demás accesos;
   - el nombre del letrero de cada pantalla, centrado.
2. **Datos de prueba poco realistas:** Z900 sube 320 kg en 14 días (22,9 kg por día). La aplicación lo calcula
   bien; al registrar ese pesaje, la aplicación pide confirmar la variación atípica (más de 2 kg por día,
   documento 24).
3. El autor preguntó si el trabajador debía ver la producción de carne y decidió dejarla solo para el
   propietario, como la de leche (Tabla 27, decisión G del documento 34). El trabajador sigue registrando
   pesajes y viendo la evolución en la ficha.
4. La marca «Bajo lo esperado» no se vio porque el parámetro `ganancia_diaria_esperada` no está cargado: es un
   parámetro de la Tabla 30 que falta definir con el propietario (PLAN.md, ruta de cierre). La cubre PU-36.5.
