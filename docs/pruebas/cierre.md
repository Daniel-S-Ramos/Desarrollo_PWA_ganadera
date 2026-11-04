# Pruebas de la fase de cierre — Evaluación del prototipo

Pasos 6.0 a 6.7 del [plan](../../PLAN.md) (apartados 1.6.3.7 a 1.6.3.11). Rama `cierre`; al fusionarla se
etiqueta `v1.0`.

**Responsable:** Daniel Santiago Ramos Pintor
**Estado:** evaluación terminada; regresión de la versión 1.0 aprobada (2026-10-28)

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
| PE-39 | Ayuda para recuperar la contraseña, en el navegador real | 6.0b | RF-24 · CU-01 | ✅ |
| PU-36 | Producción de carne: por mes, ciclo completo y resumen del inicio | 6.0c | 2.2.7 · RF-13 · RF-14 · CU-09 · HU-05 | ✅ |
| PI-01 | Esquema remoto: peso de finalización de la ceba (verificación 20) | 6.0c | Tabla 30 | ✅ |
| PE-40 | Producción de carne en el navegador real, propietario y trabajador | 6.0c | 2.2.7 · CU-09 · Tabla 27 | ✅ |
| PU-23.5 · PU-32.3 | Variación atípica de la leche desde 35 %, tomada del parámetro del propietario | R3 | Tabla 30 · RF-22 · CU-06 | ✅ |
| PI-01 | Esquema remoto: parámetros del propietario (verificación 21) | R3 | Tabla 30 | ✅ |
| PI-03 | Políticas: regresión con chapetas libres de la serie de pruebas | R3 | Tabla 27 | ✅ |
| R4 | Conjunto de datos simulados cargado en el servidor | 6.1 | 1.6.3.8 · Tabla 26 | ✅ |
| R6 | Pruebas funcionales · bloque 1 de acceso: 7 de 7; sesión A (consultas con el volumen de la finca): 13 de 13; sesión C con el propietario: CP-53 y CP-54 aprobados | 6.3 | RF-24 a RF-27 · CU-01 · consultas · RNF-02 · RNF-03 | ✅ |
| R7 | Conectividad limitada (sesión B): CP-44, CP-45, CP-47 y CP-48 aprobados | 6.4 | RF-28 a RF-30 · RNF-05 · Tabla 34 | ✅ |
| R9 | Regresión antes de la versión 1.0: 968 automáticas, PI-01 (21), PI-02 (5), PI-03 (11), PI-04 (4) y PI-05 (6) | 6.5 | Todos los requerimientos verificados contra el servicio | ✅ |
| R6 | Repetición de las tareas de la sesión C después de los buscadores: toques 4, 8 y 10 (antes 8, 13 y 16) | Observación del asesor | RNF-03 · CP-53 | ✅ |

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

La prueba manual en el navegador es PE-39 (más abajo).

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

## R3 · Parámetros del propietario (PU-23.5, PU-32.3, PI-01 verificación 21 y PI-03)

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar los dos parámetros de la Tabla 30 que definió el propietario el 2026-10-24: la **variación atípica de la leche** desde 35 % (antes 25 % fijo en el código), que usan la ronda, la producción diaria y el recordatorio de leche baja; y la **ganancia diaria esperada** de 0,5 kg/día (el mínimo del rango de 0,5 a 0,8 que espera), que usan el pesaje, la evolución y la producción de carne |
| Requerimiento | Tabla 30 · 3.10.4.6 · RF-22 · CU-06 · CU-08 · CU-09 |
| Tipo | Unitaria, automática (PU-23.5 y PU-32.3); integración contra Supabase (PI-01 y PI-03) |
| Código | [`leche.ts`](../../src/dominio/leche.ts) (`compararConPromedio` con el umbral como argumento) · [`ronda.ts`](../../src/modulos/leche/ronda.ts) · [`produccion.ts`](../../src/modulos/leche/produccion.ts) · [`recordatorios.ts`](../../src/modulos/recordatorios/recordatorios.ts) · migración [`20261024000200_parametros_del_propietario.sql`](../../supabase/migrations/20261024000200_parametros_del_propietario.sql) · documentos técnicos 22 (sección 6.3), 24 (sección 8) y 30 |
| Resultado obtenido | **963 de 963** automáticas (casos nuevos: 34 % no avisa, 35 % exacto avisa también con decimales binarios, el umbral del parámetro, 8 de 12 litros ya no avisa). **PI-01: 21 de 21 · PI-03: 11 de 11** ([evidencia](evidencias/cierre/PI-01-21-y-PI-03-11-parametros.txt)) |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-24 |

**Observaciones.**

1. **El primer intento de PI-01 falló antes de verificar**: la prueba usaba chapetas fijas de la serie de
   pruebas (Z901 a Z908) y el autor había creado Z901 a mano en PE-40. PI-03 tenía el mismo riesgo (Z911 a
   Z916). Ahora ambas toman chapetas **libres** de la serie Z900–Z999, de la más alta hacia abajo, cada vez que
   corren; siguen sin dejar datos.
2. El propietario aclaró que no pesa a diario: la ganancia diaria es el promedio entre dos pesajes, que se
   compara con la meta cualquiera que sea la frecuencia (documento técnico 34, sección 4).

## R4 · Conjunto de datos simulados (paso 6.1)

| Campo | Contenido |
|---|---|
| Objetivo | Preparar los datos simulados con la estructura y el volumen de la Ganadería JR (1.6.3.8), para las pruebas funcionales y de conectividad |
| Requerimiento | Apartado 1.6.3.8 · Tabla 3 (entregable «conjunto de datos simulados») · apartado 3.8.7 y Tabla 26 |
| Tipo | Preparación de datos; carga contra Supabase |
| Código | Generador [`datos-simulados.mjs`](../../scripts/datos-simulados.mjs) · [`cargar.sql`](../../supabase/datos-simulados/cargar.sql) · [`vaciar.sql`](../../supabase/datos-simulados/vaciar.sql) · especificación [README](../../supabase/datos-simulados/README.md) |
| Decisión | Opción A del autor (2026-10-24): en el proyecto de la finca, que aún no tiene datos reales; se vacía otra vez antes de entregar (R9) |
| Resultado obtenido | Cargado: **70 animales (56 activos), 4.633 ordeños, 175 pesajes, 280 eventos sanitarios, 12 partos, 14 salidas, 83 movimientos económicos, 49 correcciones, 97 destinos, 9 colocaciones de chapeta**, con el catálogo real de 7 medicamentos registrado por el autor ([conteos](evidencias/cierre/R4-conteos-del-servidor.txt)) |
| Estado | ✅ Terminado |
| Fecha | 2026-10-24 |

| # | Paso | Resultado | Evidencia |
|---|---|---|---|
| 1 | Prueba del script contra el servidor dentro de una transacción revertida | Tres errores de tipos corregidos (columnas todas vacías y valores lógicos); al tercer intento cargó todo y, al revertir, quedaron los mismos 24 animales de antes | — |
| 2 | `npm run datos:vaciar` y borrado de los archivos de fotos en el panel | Predio vacío: 0 activos, sin ordeños ni pesajes | [captura](evidencias/cierre/R4-01-predio-vacio.png) |
| 3 | El autor registra el catálogo real desde la aplicación (el catálogo no se carga por SQL) | 7 medicamentos: vacuna, purgas, vitamina y antibiótico | [captura](evidencias/cierre/R4-02-catalogo-real.png) |
| 4 | `npm run datos:cargar` y carga inicial en el navegador del propietario | 56 activos; ronda de hoy 0 de 15; leche 164 L; carne 473,2 kg; 15 pendientes | [captura](evidencias/cierre/R4-03-inicio-con-datos-simulados.png) |

**Observaciones.**

1. Los ordeños llegan hasta la víspera de la carga (23 de octubre): la ronda del día queda para la prueba.
2. Los pesajes van cada 30 a 75 días porque el propietario no pesa a diario; por eso aparecen 11 recordatorios de
   pesaje (más de 30 días, Tabla 30), un resultado esperado del conjunto.
3. Los eventos sanitarios no tienen dosis, para no inventar dosis veterinarias; las fichas no tienen fotos.

## PE-39 · Ayuda para recuperar la contraseña

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar que desde el inicio de sesión se llega a la ayuda para recuperar la contraseña, que nombra al administrador (**Daniel Ramos**, en negrilla, tomado de `VITE_ADMIN_NOMBRE`) y que se vuelve al inicio de sesión |
| Requerimiento | RF-24 · CU-01 · documento técnico 33 · caso CP-04 |
| Tipo | Manual: ventana de incógnito en Chrome del computador y Chrome en un iPhone. Vista previa de la rama `cierre` |
| Resultado obtenido | Aprobada |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-25 |

| # | Acción | Resultado | Evidencia |
|---|---|---|---|
| 1 | Abrir la aplicación sin sesión | Inicio de sesión con el enlace **¿Olvidó su contraseña?** debajo de **Ingresar** | [computador](evidencias/cierre/PE-39-01-inicio-de-sesion.png) · [iPhone](evidencias/cierre/PE-39-04-iphone-inicio-de-sesion.png) |
| 2 | Tocar el enlace | «Comuníquese con **Daniel Ramos**, que es el administrador del sistema. Él le asigna una contraseña nueva en pocos minutos y usted vuelve a ingresar aquí», con el botón **Volver al inicio de sesión** | [computador](evidencias/cierre/PE-39-02-ayuda-daniel-ramos.png) · [iPhone](evidencias/cierre/PE-39-05-iphone-ayuda.webp) |
| 3 | **Volver al inicio de sesión** | De nuevo el inicio de sesión, vacío | [captura](evidencias/cierre/PE-39-03-volver.png) |

**Observaciones.**

1. En el iPhone la ayuda muestra también el aviso «Los datos de este teléfono no están protegidos»: es el aviso de
   almacenamiento no persistente, que se muestra en las pantallas sin sesión (decisión del 2026-10-23: solo antes
   del ingreso). En el computador no aparece porque Chrome concedió el almacenamiento persistente. Es lo esperado.
2. En el computador apareció el aviso «La aplicación quedó guardada en este dispositivo y ya funciona sin
   conexión», propio de la primera visita en una ventana sin datos.

## R6 · Pruebas funcionales (paso 6.3)

Ejecución de los casos del [documento de casos de prueba](casos-de-prueba.md), secciones 4 a 13, sobre la vista
previa de la rama `cierre` con los datos simulados. Criterios de la sección 2 de ese documento.

### Bloque 1 · Acceso y perfiles (CP-01 a CP-07) · 2026-10-25

| Caso | Perfil y dispositivo | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|
| CP-01 | Propietario, Chrome del computador sin datos del sitio | Pidió correo y contraseña; tras definir el código, «Preparando este teléfono» con la barra (21 % → 93 %: usuarios y parámetros, 70 animales, 5.310 registros); al terminar, el inicio con 56 activos, ronda 0 de 15, leche 164 L, carne 473,2 kg y 15 pendientes | ✅ Aprobado con observación 1 | [21 %](evidencias/cierre/CP-01-01-carga-inicial-21.png) · [93 %](evidencias/cierre/CP-01-02-carga-inicial-93.png) · [inicio](evidencias/cierre/CP-01-03-inicio.png) |
| CP-02 | Trabajador, iPhone en modo avión | Pidió solo el código («Hola, Daniel Ramos»); entró sin conexión con los datos: «Sin conexión», 15 pendientes, ordeño 0 de 15 | ✅ Aprobado | [código](evidencias/cierre/CP-02-01-solo-codigo-sin-conexion.png) · [inicio](evidencias/cierre/CP-02-02-inicio-sin-conexion.webp) |
| CP-03 | Propietario, Chrome del computador | Cada intento informó los que quedan («Le queda 1 intento antes de tener que ingresar con su contraseña»); al quinto: «Se superaron los 5 intentos del código. Ingrese con su correo y contraseña» | ✅ Aprobado | [un intento](evidencias/cierre/CP-03-01-queda-un-intento.png) · [cinco](evidencias/cierre/CP-03-02-cinco-intentos.png) |
| CP-04 | Sin sesión | Cubierto por PE-39 (2026-10-25) | ✅ Aprobado | Ver PE-39 |
| CP-05 | Trabajador, iPhone | Inicio con Pendientes y «Ordeño de hoy», sin producción ni Correcciones recientes; ficha de 402 con «Registrar pesaje», «Ver evolución», «Registrar evento» y «Ver historial», y el destino (Ceba) **solo para consultar**, sin cambiarlo ni registrar la salida ni ver costos; la dirección `/produccion-carne` escrita a mano pidió el código y llevó al inicio | ✅ Aprobado con observación 2 | [inicio](evidencias/cierre/CP-05-01-inicio-trabajador.webp) · [ficha](evidencias/cierre/CP-05-02-ficha-402.webp) · [seguimiento](evidencias/cierre/CP-05-03-ficha-402-seguimiento.png) · [ruta](evidencias/cierre/CP-05-04-ruta-escrita.png) · [código](evidencias/cierre/CP-05-05-pide-codigo.png) |
| CP-06 | Propietario, Chrome del computador | Cada pesaje de 402 dice «registrado por José Ramos» o «registrado por Daniel Ramos», y cada evento de 210 «Registrado por» José Ramos, Daniel Ramos o Fernando Pintor; la evolución muestra además la meta de 0,5 kg/día y marca el tramo de 0,4 kg/día «por debajo de la meta» | ✅ Aprobado | [evolución 402](evidencias/cierre/CP-06-01-evolucion-402-autores.png) · [historial 210](evidencias/cierre/CP-06-02-historial-210-autores.png) |
| CP-07 | Trabajador, iPhone en modo avión | Un pesaje de 402 (479 kg, báscula) quedó «1 registro pendiente de enviar · Sin conexión»; al cerrar sesión: «Hay 1 registro sin enviar y no hay conexión. Si cierra la sesión ahora, se perderán», con **Cancelar** (principal) y **Cerrar sesión y descartar los registros**; se canceló y, al volver la señal, «✓ Todo enviado» | ✅ Aprobado con observación 3 | [pendiente](evidencias/cierre/CP-07-01-pesaje-pendiente.webp) · [aviso](evidencias/cierre/CP-07-02-aviso-cerrar-sesion.webp) · [enviado](evidencias/cierre/CP-07-03-enviado-al-reconectar.webp) |

**Observaciones.**

1. **Hallazgo corregido.** Durante la carga inicial la campana de Alertas marcaba **69** recordatorios y al
   terminar bajó a 15: con los datos a medias, la aplicación derivaba recordatorios falsos (por ejemplo, vacas
   «sin ordeño» cuyos ordeños aún no habían llegado). Ahora el contador y la pestaña Alertas esperan a que termine
   la carga inicial; mientras tanto la pestaña dice «Los recordatorios aparecerán cuando termine de prepararse este
   teléfono». El inicio ya no los mostraba durante la carga (muestra «Preparando este teléfono»). Cambio en
   `App.tsx` y `PantallaAlertas.tsx`; 963 de 963 automáticas.
2. Escribir una dirección en la barra recarga la aplicación, por eso pidió el código antes de redirigir: es el
   comportamiento esperado del código de desbloqueo (documento técnico 07). El trabajador ve el destino como dato
   de la ficha (HU-02, RF-05) pero no lo puede cambiar (CU-12 es del propietario, Tabla 27).
3. Sin conexión la aplicación no puede ofrecer «enviar antes de cerrar» (Tabla 31): por eso ofrece cancelar o
   descartar, la variante sin señal del documento técnico 12. El pesaje de 479 kg en 3 días (3,3 kg/día) pidió la
   confirmación de variación atípica y, entre báscula y cinta, la evolución advierte «Métodos distintos: compárese
   con cautela». En el historial sanitario, los síntomas se ven al tocar el evento (CU-05, paso 4); se verifica en
   CP-17.

### Sesión A · Consultas con el volumen de la finca · 2026-10-25

Propietario, Chrome del computador, con los datos simulados. Casos de la sección 17 del documento de casos.

| Caso | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|
| CP-13 | Activos 56, Retirados 14, Todos 70; en Retirados, los motivos Vendidos, Muertos y Pérdida o robo, con los vendidos en «Para venta»; las categorías con su dibujo (Ceba con el filete) | ✅ Aprobado | [activos](evidencias/cierre/CP-13-01-activos.png) · [retirados](evidencias/cierre/CP-13-02-retirados-motivos.png) · [todos](evidencias/cierre/CP-13-03-todos.png) |
| CP-11 | «215» en el buscador: 1 animal activo. Ficha: «Unos 5 años» (aproximada, comprada), peso de compra 411 kg, última vacuna Clostrisan P del 9 de mayo, leche 7,5 litros del 23 de octubre, sin partos, destino Producción de leche, invertido $4.290.000, y la autoría del registro | ✅ Aprobado | [búsqueda](evidencias/cierre/CP-11-01-buscar-215.png) · [ficha](evidencias/cierre/CP-11-02-ficha-215.png) |
| CP-17 | Historial de 210 del más reciente al más antiguo; al tocar el tratamiento del 3 de abril: «Síntomas: Mastitis en un cuarto · Costo: $46.000 · Registrado el 3 de abril de 2026 a las 11:41 a. m.» | ✅ Aprobado | [detalle](evidencias/cierre/CP-17-01-tratamiento-sintomas.png) |
| CP-20 | Vaca 215, promedio de 7 días 5,8 L: con 6 L «Similar a su promedio»; con 5 L (14 % menos) «Por debajo de su promedio»; con 3 L (48 % menos) «⚠ Muy por debajo de su promedio», sin impedir guardar | ✅ Aprobado con observación 1 | [6 L](evidencias/cierre/CP-20-01-similar.png) · [5 L](evidencias/cierre/CP-20-02-por-debajo.png) · [3 L](evidencias/cierre/CP-20-03-muy-por-debajo.png) |
| CP-21 | Vaca 201 por mes: junio 447,5 L (28 de 30 días), julio 472 L (30 de 31 días, 15,7 L por día registrado); septiembre «Sin registro de 201 este mes», con «Ir al mes del ordeño anterior: 13 ago» y «del siguiente: 12 oct»: el secado de 60 días antes del parto del 12 de octubre, sin ceros | ✅ Aprobado con observación 2 | [junio](evidencias/cierre/CP-21-01-201-junio.png) · [julio](evidencias/cierre/CP-21-02-201-julio.png) · [septiembre](evidencias/cierre/CP-21-03-201-septiembre-seca.png) |

**Observaciones.**

1. **Hallazgo en los datos simulados, no en la aplicación.** El ordeño de ayer de la 215 debía ser una baja de más
   del 35 % para que apareciera el recordatorio de leche baja, pero quedó en 7,5 L, por encima de su promedio
   (5,8 L): el generador tomaba la mitad del pico de la vaca y no de su promedio reciente, y la 215 va al final de la
   lactancia. Se corrigió el generador (versión 2: la fila pasa a 2,5 L); el conjunto cargado es la versión 1 y no
   se recargó por una sola fila. Para la evaluación, la baja se provoca registrando hoy 3 L a la 215 en la ronda
   (CP-38).
2. Las instrucciones pedían mirar julio o agosto; el secado de la 201 va del 14 de agosto al 11 de octubre, por eso
   julio aparece completo y septiembre vacío. La aplicación mostraba lo correcto.

**Sesión A, segunda parte (2026-10-25).** Antes de los recordatorios se registró a la 215 con 3 litros en la ronda,
para provocar la baja que la versión 1 de los datos no traía.

| Caso | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|
| CP-22 | Semana del 19 al 25 de octubre (en curso): promedio del hato 11,4 L por día con 14 vacas con registros, ordenadas de 203 (19,7 L por día) a 215 (5,3 L por día); la **214** al final, bajo «Sin registros en el periodo»; el botón «De menor a mayor» | ✅ Aprobado con observación 3 | [lista](evidencias/cierre/CP-22-01-comparacion-semana.png) · [sin registros](evidencias/cierre/CP-22-02-comparacion-sin-registros.png) |
| CP-26 | Octubre (en curso): «+483 kg ganados · 0,6 kg por día · meta 0,5 kg por día · 15 de 31 pesados»; los animales por ganancia diaria (434 con 1 kg por día primero); el 413 vendido en el mes, marcado «Retirado»; «Compárese con cautela: cinta y báscula» en 402 y 425 | ✅ Aprobado | [octubre](evidencias/cierre/CP-26-01-carne-octubre.png) |
| CP-27 | «28 animales en ceba · 1 terminado (desde 500 kg) · +2.751 kg ganados en el predio»; **408** arriba con «Terminado: alcanzó los 500 kg»; 402 «Faltan 21 kg… unos 35 días»; 410 «Faltan 62,6 kg… unos 4 meses · Último pesaje hace 54 días» | ✅ Aprobado con observación 4 | [ciclo](evidencias/cierre/CP-27-01-ciclo-completo.png) |
| CP-35 | 210: invertido $4.264.000 (compra, 3 servicios veterinarios, 10 medicamentos); generado $8.073.975 (4.140,5 litros a $1.950); «Resultado parcial: el animal sigue en el predio» y «La leche se valora al precio del parámetro: es el valor de la producción, no el dinero recibido»; ganancia $3.809.975 | ✅ Aprobado | [210](evidencias/cierre/CP-35-01-consolidado-210.png) |
| CP-36 | 201: «Nació en el predio: no tiene costo de compra, y su resultado no es comparable con el de un animal comprado»; ganancia $9.998.975 | ✅ Aprobado | [201](evidencias/cierre/CP-36-01-consolidado-201.png) |
| CP-37 | 401 (vendido): venta $4.659.000 como ingreso, ganancia $2.274.000. 421 (muerto): «Salió por muerte: no hubo venta, y lo invertido se presenta como pérdida»; «Pérdida por muerte: $2.557.500» | ✅ Aprobado | [401](evidencias/cierre/CP-37-01-consolidado-401.png) · [421](evidencias/cierre/CP-37-02-consolidado-421.png) |
| CP-38 | Tras registrar 3 L a la 215: 16 recordatorios: 11 sin pesaje (416, 435, 410…), 214 sin ordeño desde el 18 de octubre, **215 «3 litros el 25 de octubre de 2026: muy por debajo de su promedio (5,8 litros)»**, 301 y 506 sin registros desde hace 93 días, y la cría 501 sin chapeta («quedan 77 días del plazo») | ✅ Aprobado | [ronda](evidencias/cierre/CP-38-01-ronda-215-3-litros.png) · [alertas](evidencias/cierre/CP-38-02-alertas-pesajes-ordeno.png) · [leche baja](evidencias/cierre/CP-38-03-alertas-leche-baja.png) |
| CP-41 | Correcciones recientes por fecha, con quién, sobre qué registro, el cambio y el motivo: «442 · Pesaje del 21 de octubre de 2026 · Peso en kg: antes 407,3, ahora 307,3 · Error de digitación · José Ramos»; «205 · Ordeño del 19 de septiembre · Litros: antes 140, ahora 14 · Daniel Ramos» | ✅ Aprobado con observación 5 | [lista](evidencias/cierre/CP-41-01-correcciones-recientes.png) · [205](evidencias/cierre/CP-41-02-correccion-205.png) |

**La sesión A queda completa: 13 de 13 casos aprobados.**

3. El documento de casos esperaba la 214 «con pocos registros»; como en la semana no tiene ninguno, la aplicación la
   pone al final bajo «Sin registros en el periodo», que es la regla del documento técnico 28, sección 7. Ninguna
   vaca tiene menos de la mitad de los días (las demás tienen 5 de 7, porque los datos llegan hasta el 23 y la
   semana cuenta hasta hoy).
4. **Hallazgo corregido.** En el ciclo, el 410 decía «peso de compra, 13 de octubre» y «1 de septiembre»: la compra
   fue en octubre de 2025, pero sin el año parecía posterior al pesaje. Ahora las fechas que no son del año en
   curso muestran el año (`PantallaProduccionCarne.tsx`).
5. **Hallazgo corregido (pedido del autor).** En Correcciones recientes, y en el resumen de la producción de leche
   por vaca, el número del animal aparecía como texto y no en la chapeta amarilla que se usa para todos los
   animales. Ahora va en la chapeta (`PantallaCorreccionesRecientes.tsx`, `consultaCorrecciones.ts` con los campos
   `chapeta` y `nombre`, PU-28 ampliada; `PantallaProduccion.tsx`). 963 de 963 automáticas, ejecutadas por el autor.

### Sesión C · Pocos pasos y aprendizaje con una sola sesión (CP-53 y CP-54) · 2026-10-26

| Campo | Contenido |
|---|---|
| Objetivo | Comprobar con una persona de la finca sin experiencia en aplicaciones de gestión que, tras una sola sesión de acompañamiento, registra sin ayuda un ordeño, un pesaje y un evento sanitario (RNF-02), y medir los toques de cada registro (RNF-03) |
| Requerimiento | RNF-02 · RNF-03 · RNF-14 · casos CP-53 y CP-54 |
| Participante | José Ramos Bernal, propietario; experiencia previa con aplicaciones de gestión: **ninguna**. En su propio teléfono y con su cuenta |
| Acompañante | Daniel Ramos |
| Tipo | Manual, con la [hoja de registro](evidencias/cierre/CP-53-54-sesion-c-hoja-completa.docx) llenada durante la sesión ([PDF](evidencias/cierre/CP-53-54-sesion-c-hoja-completa.pdf)) |
| Resultado obtenido | Las tres tareas **sin ayuda**; todos los registros en el servidor a nombre del propietario ([validación](evidencias/cierre/CP-53-54-servidor.txt)) |
| Estado | ✅ CP-54 aprobado · ✅ CP-53 aprobado con observación 1 |
| Fecha | 2026-10-26 |

**Acompañamiento.** Cada tema se mostró una vez, entre 10 y 25 segundos cada uno: ingreso y código (18 s), inicio
(21 s), ronda de dos vacas (19 s), pesaje desde Alertas (14 s), evento desde la ficha (25 s) e indicador (10 s).

| Tarea sin ayuda | Sin ayuda | Tiempo | Toques (referencia) | Observado | Evidencia |
|---|---|---|---|---|---|
| 1 · «Registre que hoy la vaca 207 dio 12 litros» | ✅ Sí | 26 s | 8 (unos 3) | Encontrar la vaca en la lista de la ronda le tomó trabajo | [captura](evidencias/cierre/CP-54-01-tarea1-ordeno-207.png) |
| 2 · «Pese al novillo 435: 420 kilos, con la cinta» | ✅ Sí | 35 s | 13 (unos 7) | Entró por Producción de carne; el 435, sin pesaje en el mes, estaba al final de la lista. Encontrado el animal, el registro fue fácil | [captura](evidencias/cierre/CP-54-02-tarea2-pesaje-435.png) |
| 3 · «Registre que hoy le aplicó la purga al novillo 402» | ✅ Sí | 42 s | 16 (unos 8) | Primero buscó aplicar el medicamento desde el acceso **Medicamentos**; al ver que solo registra el catálogo, fue a Animales, buscó el 402 y registró la purga (Ivermectina, 1,5 ml) | [captura](evidencias/cierre/CP-54-03-tarea3-purga-402.png) |

Además, el propietario tomó por iniciativa propia una foto a la vaca 201 para comprobar que las imágenes se guardan:
el servicio guardó la imagen y su versión reducida ([captura](evidencias/cierre/CP-54-04-foto-201.png)).

**Opinión del propietario** (palabras anotadas por el acompañante):

- «Es fácil hacer el registro gracias a las ilustraciones que tiene la aplicación, es fácil guiarse por esos dibujos;
  el problema es que toma un poco de tiempo buscar el animal en ciertos apartados, ya que no todas las pantallas tienen
  la opción de escribir el número de la chapeta.»
- «El tamaño de los botones, el color de la pantalla y el tamaño de la letra están bien, los puedo leer sin problema.»
- ¿La usaría en el potrero? «Sí, porque es bastante cómoda para escribir.»
- ¿Qué le cambiaría? «Una barra de búsqueda para escribir el número de la chapeta en la mayoría de los apartados de
  producción de carne y leche.»

**Observaciones.**

1. **Los toques fueron unas dos veces la referencia del diseño** (8, 13 y 16 frente a unos 3, 7 y 8). Ningún registro
   necesitó texto libre (solo números y selecciones) y los tres se completaron sin ayuda, por lo que se aprueba CP-53
   con observación: los toques de más se fueron en **ubicar el animal** en pantallas que no tienen buscador (la ronda y
   la producción de carne) y en un **camino equivocado** (el acceso Medicamentos), no en el registro mismo. Se atienden
   con las mejoras pedidas por el propietario (sección siguiente).
2. Según el servidor, la tarea 1 se registró a las 20:04 y las tareas 2 y 3 a las 23:12 y 23:16 de la misma jornada.
3. La hoja se imprimirá para la firma del propietario.

**Mejoras pedidas por el propietario**, implementadas el 2026-10-26 como cambios de presentación y navegación, sin
cambiar reglas (documentos técnicos 15, 18, 22 y 34; PU-16.8 y PU-19.6; 968 de 968 automáticas). Además, el título de
cada pantalla ya no parte una palabra larga («Medicamen-tos» en un teléfono de 375 px): reduce la letra hasta que
quepa.

- Buscador por número de chapeta en la **ronda de ordeño** y en la **producción de carne**, y por nombre en
  **Medicamentos**.
- En **Medicamentos**, un botón **«Aplicar medicamento a un animal»** que lleve a Animales con la guía «Busque y
  seleccione el animal al que desea aplicar algún medicamento», para registrar el evento desde su ficha sin crear otro
  módulo.

### Repetición de las tareas después de las mejoras (2026-11-04)

El asesor observó que las mejoras no se habían comprobado repitiendo las tareas. Se repitieron las tres con el
propietario, en la versión 1.0.

| Campo | Contenido |
|---|---|
| Objetivo | Medir de nuevo los toques y el tiempo de las tres tareas de CP-53 y CP-54 después de incorporar los buscadores y el acceso guiado a los medicamentos |
| Requerimiento | RNF-03 · CP-53 |
| Participante | José Ramos Bernal, propietario, en su teléfono y con su cuenta. Sin acompañamiento ni explicación ese día; no se le mostraron los buscadores ni el botón nuevo |
| Acompañante | Daniel Ramos |
| Animales | Distintos a los de la primera sesión y en una posición parecida en las listas, para que no recordara dónde estaban |
| Resultado obtenido | Las tres tareas **sin ayuda**, usando el buscador; los tres registros en el servidor («Todo enviado») |
| Estado | ✅ CP-53 aprobado; los toques quedaron cerca de la referencia del diseño |

| Tarea sin ayuda | Sin ayuda | Tiempo | Toques (referencia) | Primera sesión | Observado |
|---|---|---|---|---|---|
| 1 · «Registre que hoy la vaca 213 dio 6 litros» | ✅ Sí | 10 s | 4 (unos 3) | 26 s · 8 | Entró por la ronda de ordeño y usó el buscador |
| 2 · «Pese al novillo 440: 345 kilos, con la cinta» | ✅ Sí | 12 s | 8 (unos 7) | 35 s · 13 | Entró por Producción de carne y usó el buscador |
| 3 · «Registre que hoy le aplicó la purga al novillo 419» | ✅ Sí | 15 s | 10 (unos 8) | 42 s · 16 | Fue directo a la pestaña Animales, usó el buscador y registró desde la ficha; no usó el botón de Medicamentos |

Los toques se contaron sin las teclas de los números; según el acompañante, con ellas serían unos tres más.

**Opinión del propietario:** le pareció mucho más fácil con el buscador y se siente mucho más cómodo con la aplicación.

**Observaciones.**

1. La mejora **no puede atribuirse solo a los buscadores**. El propietario ya conocía la aplicación y las tareas, y el
   acompañante observó que parte de la reducción se debió a que entiende mejor su funcionamiento. Lo que sí muestra la
   sesión es que encontró el buscador sin que se lo enseñaran y lo usó en las tres tareas.
2. El acompañante dictó por error «440 kilos» (el número de la chapeta) en la tarea 2. La aplicación lo registró
   mostrando un aumento de 112,4 kg en 31 días (3,6 kg por día), sin advertir que era inusual. El propietario lo
   corrigió a 345 kg con «Corregir o anular», y la corrección quedó en el historial. No cuenta como error del
   participante, pero muestra que la aplicación no advierte un peso muy distinto al anterior.
3. El 419 es una hembra de ceba; la instrucción decía «novillo». No cambia la tarea.

## R7 · Conectividad limitada (paso 6.4)

Sesión B del [documento de casos](casos-de-prueba.md), sección 14, con dos equipos: el trabajador (Daniel Ramos) en
un iPhone en modo avión y el propietario (José Ramos) en Chrome del computador sin conexión. Lo demás de la Tabla 34
está cubierto por PE-32 (chapeta en dos teléfonos), PI-03 (permisos en el servidor), CP-02 y CP-07.

| Caso | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|
| CP-44 · Mismo animal en dos equipos sin señal (Tabla 34, escenario 1) | Sin conexión, el trabajador registró una vitamina (Complejo B, 1,5 ml) al **434** y el propietario un pesaje (472 kg, báscula); cada uno quedó «1 registro pendiente de enviar». Al reconectar, **los dos registros están en los dos equipos**, cada uno con su autor: en el computador, la vitamina «Registrado por Daniel Ramos»; en el iPhone, el pesaje «registrado por José Ramos», con «por debajo de la meta» y «Métodos distintos» | ✅ Aprobado | [iPhone pendiente](evidencias/cierre/CP-44-01-iphone-evento-pendiente.png) · [computador pendiente](evidencias/cierre/CP-44-02-computador-pesaje-pendiente.png) · [computador](evidencias/cierre/CP-44-03-computador-ve-evento-de-daniel.png) · [iPhone](evidencias/cierre/CP-44-04-iphone-ve-pesaje-de-jose.webp) |
| CP-45 · El mismo ordeño en dos equipos sin señal (3.8.6, Tabla 21) | Sin conexión, la vaca **203** con 18 L en el iPhone y 20 L en el computador. Se reconectó primero el iPhone (aceptado su ordeño) y después el computador: su ordeño **no se duplicó ni se perdió**, sino que se convirtió en corrección del aceptado: en Correcciones recientes, «203 · Ordeño del 25 de octubre de 2026 · Litros: antes 18, ahora 20 · Registro duplicado · José Ramos». Las dos rondas quedan con **✓ 20 litros** y «2 de 15» (un solo ordeño) | ✅ Aprobado con observación 1 | [iPhone 18 L](evidencias/cierre/CP-45-01-iphone-18-litros.png) · [computador 20 L](evidencias/cierre/CP-45-02-computador-20-litros.png) · [iPhone enviado](evidencias/cierre/CP-45-03-iphone-enviado.png) · [ronda computador](evidencias/cierre/CP-45-04-computador-ronda-20.png) · [ronda iPhone](evidencias/cierre/CP-45-05-iphone-ronda-20.png) · [corrección](evidencias/cierre/CP-45-06-correccion-18-a-20.png) |
| CP-47 · Conexión cortada a mitad del envío (Tabla 34, escenario 6) | Sin conexión, el propietario completó la ronda: «13 registros pendientes de enviar». Al reconectar empezó «Enviando…» y se cortó la conexión; al final, «✓ Todo enviado» y la ronda con «15 de 15 vacas», **cada vaca una sola vez**. En el servidor hay 15 ordeños de hoy para 15 vacas distintas, todos vigentes | ✅ Aprobado con observación 3 | [13 pendientes](evidencias/cierre/CP-47-01-13-pendientes.png) · [enviando](evidencias/cierre/CP-47-02-enviando.png) · [enviado](evidencias/cierre/CP-47-03-todo-enviado-sin-conexion.png) · [ronda](evidencias/cierre/CP-47-04-ronda-sin-duplicados.png) · [servidor](evidencias/cierre/CP-47-48-servidor.txt) |
| CP-48 · Teléfono dañado con pendientes (Tabla 34, escenario 3; RNF-05) | En el iPhone, sin conexión, un pesaje del **412** (435 kg) quedó pendiente; se borraron los datos de Safari («Borrar historial y datos»: datos de sitios web, 0 bytes). Al entrar de nuevo con conexión, la carga inicial (70 animales y los registros) **recuperó todo lo enviado**: el 434 con el pesaje de José Ramos de CP-44; y el 412 termina en 436,6 kg del 23 de octubre, **sin el pesaje que no alcanzó a enviarse**. En el servidor no hay pesaje del 412 de hoy | ✅ Aprobado con observación 4 | [pendiente](evidencias/cierre/CP-48-01-pesaje-412-pendiente.webp) · [borrar](evidencias/cierre/CP-48-02-borrar-datos.png) · [0 bytes](evidencias/cierre/CP-48-03-datos-0-bytes.png) · [carga](evidencias/cierre/CP-48-04-carga-inicial.webp) · [412](evidencias/cierre/CP-48-05-412-sin-el-pesaje.webp) · [434](evidencias/cierre/CP-48-06-434-recuperado.png) · [servidor](evidencias/cierre/CP-47-48-servidor.txt) |

**Observaciones.**

1. Prevalece el valor que llega **después** (20 L del computador), porque el segundo envío se registra como
   corrección del primero (documento técnico 09; Tabla 21: «el segundo no se descarta, sino que se convierte en una
   corrección sobre el registro aceptado»); el valor desplazado (18 L) y quién registró cada uno quedan a la vista del
   propietario. Un trabajador no habría podido reemplazar a mano un ordeño del propietario, pero aquí el propietario
   es quien envió segundo.
2. **Mejora pedida por el autor.** Al registrar el evento, el aviso de la aplicación anterior del mismo medicamento
   decía la fecha y el autor; el autor pidió que también diga la dosis de esa vez. Ahora dice, por ejemplo, «Última
   aplicación de Complejo B de All Vet a este animal: 26 de febrero de 2026 (hace 8 meses), con 1,5 ml, registrada por
   José Ramos», o «sin dosis registrada». Es un dato del historial, no una recomendación (Tabla 30). Cambio en
   `AvisoRepeticion.tsx` y `eventos.ts`, documento técnico 21 (sección 3) y PU-22.8 ampliada: 964 de 964.
3. Las capturas no permiten asegurar en qué punto exacto se cortó el envío: la conexión se quitó durante «Enviando…» y
   al terminar el indicador decía «✓ Todo enviado · Sin conexión». Lo que el caso debe demostrar se cumple: no hay
   duplicados ni pérdidas, comprobado en el servidor. El corte a mitad de una tanda y el reintento sin duplicar los
   cubren además PU-09 y PU-10 (identificador generado en el teléfono y `on conflict do nothing`, 3.7.8).
4. Tras borrar los datos, Safari informó «Espacio usado (estimado): 0 B» aun con los datos ya descargados: es la
   estimación del navegador, que en iPhone se actualiza tarde; no afecta el funcionamiento.

**La sesión B queda completa: los cuatro escenarios aprobados. Con PE-32, PI-03, CP-02 y CP-07, los siete escenarios
de la Tabla 34 quedan verificados.**

## R9 · Regresión antes de la versión 1.0 (paso 6.5)

| Campo | Contenido |
|---|---|
| Objetivo | Repetir el conjunto automático y las cinco pruebas de integración contra el servicio real después de los últimos cambios (buscadores y botón de medicamentos de la sesión C), antes de fusionar `cierre` en `main` y etiquetar `v1.0` |
| Requerimiento | Todos (regresión) · R9 de la ruta de cierre |
| Tipo | Unitarias automáticas e integración contra Supabase, ejecutadas por el autor en su equipo |
| Decisión | Los datos simulados **se conservan** para la sustentación (decisión del autor, 2026-10-28); se vacían antes del uso real. Las pruebas de integración no los tocan: usan chapetas libres de la serie Z900–Z999 y limpian lo que crean |
| Estado | ✅ Aprobada |
| Fecha | 2026-10-28 |

| Prueba | Comando | Resultado |
|---|---|---|
| Automáticas | `npm test` | **968 de 968** en 43 archivos |
| PI-01 · Esquema remoto | `npm run prueba:pi-01` | **21 de 21** verificaciones aprobadas (las 15 tablas con RLS, sin UPDATE ni DELETE para nadie, unicidades vigentes, parámetros del propietario) |
| PI-02 · Gancho del token | `npm run prueba:pi-02` | **5 de 5** (perfil y nombre en el token; la función solo la ejecuta `supabase_auth_admin`; SECURITY INVOKER) |
| PI-03 · Políticas por perfil | `npm run prueba:pi-03` | **11 de 11** (el trabajador no lee movimientos económicos: 0 filas frente a 85 del propietario; ni el propietario modifica ni elimina) |
| PI-04 · Sincronización de extremo a extremo | `npm run prueba:pi-04` | **4 de 4**; limpieza: 0 registros de prueba restantes |
| PI-05 · Fotografías | `npm run prueba:pi-05` | **6 de 6**; archivos de prueba borrados del almacenamiento y 0 registros restantes |

**Observaciones.**

1. Las cifras de PI-03 (85 movimientos económicos, 184 pesajes, 15 salidas) incluyen los datos simulados que siguen
   cargados y los registros de las sesiones de evaluación; la prueba solo verifica quién puede leerlos.
2. La CLI de Supabase avisó una versión nueva (2.122.0 frente a 2.120.0 instalada). No se actualizó, para no cambiar
   la herramienta con la que se aplicaron las migraciones antes de cerrar la versión.
3. Siguen pendientes, por decisión del autor, el vaciado de los datos simulados, el borrado de sus fotos y la
   eliminación de la cuenta de pruebas, que las pruebas de integración necesitan.

**Publicación de la versión 1.0 (2026-10-28).**

| Paso | Resultado |
|---|---|
| Compilación | `npm run build` sin errores (aviso de paquete de 896 kB, 254 kB comprimido; la división por pantallas queda en R12) |
| Fusión | PR #6 de `cierre` a `main`, commit de fusión `8508987` |
| Etiqueta | `v1.0` anotada y subida a GitHub |
| Producción | Vercel publicó `8508987` desde `main` como **Production**, estado **Ready** (17 s) |
