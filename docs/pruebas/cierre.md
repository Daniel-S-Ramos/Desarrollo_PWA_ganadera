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
   (documento 26). Queda como posible mejora ofrecerlo también en la producción diaria.
2. Se registraron 20 litros en lugar de los 12 sugeridos; no cambia el resultado.
3. No se probó un ordeño duplicado desde dos teléfonos con un anulado de por medio (la búsqueda real del ordeño
   vigente): lo cubren PU-10.12 con el servicio simulado y la regla del disparador en PI-01.
