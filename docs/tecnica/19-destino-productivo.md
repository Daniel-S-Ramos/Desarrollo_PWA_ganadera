# 19 · Destino productivo y su historial

| | |
|---|---|
| **Componente** | Módulo de destino (Tabla 20) · `src/dominio/destino.ts` · `src/modulos/destino/destino.ts` · `src/modulos/destino/CambiarDestino.tsx` · `src/modulos/destino/HistorialDestino.tsx` · filtro en `src/modulos/consulta/listado.ts` |
| **Capa** | Dominio, lógica y presentación |
| **Origen en el documento** | RF-18 · RF-19 · RF-27 · RF-28 · CU-12 · HU-13 · HU-06 (criterio 4, heredado) · apartados 3.10.3 y 3.10.4.4 · Tablas 24 y 27 |
| **Depende de** | [08 · Permisos](08-permisos.md) · [13 · Registro de un animal](13-registro-de-animal.md) · [15 · Listado](15-listado-de-animales.md) · [16 · Ficha](16-ficha-del-animal.md) |
| **Pruebas** | PU-20 · PE-24 |

---

## 1. El problema

El caso de uso CU-12 permite al propietario «establecer para qué finalidad se destina un animal dentro
del predio y conservar el registro de los cambios que esa decisión experimente». HU-13 agrega que el
destino «condiciona qué animales aparecen en las consultas comparativas de producción» (paso 3.6), y el
apartado 3.10.4.4 que el propietario lo necesita junto a cada dato: «un peso no significa lo mismo en una
vaca en producción que en un animal de ceba».

Con el servidor de solo inserciones (documento 05), **cambiar el destino es agregar un registro nuevo**:
el destino vigente es el más reciente y los anteriores forman el historial. No se modifica nada.

## 2. Destino vigente e historial

| Concepto | Regla |
|---|---|
| **Destino vigente** | El registro de `destino_productivo` del animal con la fecha `desde` más reciente; a igual fecha, el registrado después (mayor UUID v7). Es la regla que ya usa la ficha (documento 16, sección 3.4) |
| **Historial** | Todos los registros del animal, del más reciente al más antiguo, cada uno con su destino, su fecha `desde`, quién lo asignó y cuándo (HU-15) |
| **Cambio** | Cada registro, salvo el primero, es un cambio: el anterior es el que reemplazó (HU-13 criterio 3) |
| **Asignación inicial** | El primer registro no es un cambio (CU-12, 3a): el historial lo muestra como «Inicial» |

Los seis destinos (RF-18) se presentan con su nombre en el lenguaje del predio: Reproductor,
Reproductora, **Producción de leche**, Ceba, Venta y Sacrificio.

## 3. Quién hace qué (decisión A, y criterio heredado HU-06.4)

| Acción | Propietario | Trabajador |
|---|---|---|
| Ver el destino vigente en la ficha y en el listado | ✓ | ✓ (HU-02.1) |
| Filtrar el listado por destino | ✓ | ✓ (consultar) |
| Cambiar el destino | ✓ | — (no se le muestra) |
| Ver el historial | ✓ | — (no se le muestra; es parte de CU-12) |
| Asignar el destino al registrar un animal | ✓ | — (la sección no se le muestra) |

Para el trabajador, las opciones **no se muestran** (Tabla 31: «la opción no se presenta en la
interfaz»), no se muestran deshabilitadas. Si la operación llegara a intentarse, el teléfono la rechaza
antes de escribir (`PermisoDenegado`) y el servicio también (PI-03, verificación 2). **Son las primeras
opciones exclusivas del propietario en la interfaz**, con lo que se verifica en pantalla el criterio 4 de
HU-06, heredado de la Iteración 1.

## 4. Cambiar el destino

Desde la ficha (CU-12, paso 1), **Cambiar destino** muestra:

1. El destino vigente (o «Sin destino asignado»).
2. Los seis destinos como botones grandes (3.10.1).
3. La fecha desde la que rige, hoy por defecto (decisión B).
4. Al pulsar **Guardar**, si ya había un destino, la confirmación (CU-12, paso 4):
   > El destino **Producción de leche** (desde el 1 de octubre de 2026) será reemplazado por **Ceba**.
   > [Confirmar] · [Cancelar]

   Si es el primero, se registra sin confirmación (CU-12, 3a). **Cancelar** no cambia nada (5a).

### 4.1 Validaciones

| Regla | Mensaje | Razón |
|---|---|---|
| Se elige un destino | «Elija el destino» | — |
| Distinto del vigente (decisión C) | «Ya tiene ese destino» | Un registro igual no sería un cambio |
| La fecha no es futura | «La fecha no puede ser posterior a hoy» | — |
| La fecha **no es anterior al destino vigente** (decisión B) | «Debe ser desde el 1 de octubre de 2026 o después, la fecha del destino actual» | El vigente es el más reciente: un registro con fecha anterior no lo reemplazaría y quedaría escondido en el historial |
| La fecha no es anterior a la llegada del animal al predio | «El animal llegó al predio el …» | La fecha de ingreso, o la de nacimiento si nació en el predio. Si no se conoce ninguna, no se valida |
| El animal no está retirado (decisión D) | «Este animal salió del predio» | Un animal retirado no tiene destino en el predio. La salida se registra en la Iteración 5; la regla queda lista |

La fecha admite días pasados para cargar el destino de los animales que ya están en el predio («esta
vaca está en producción desde marzo»).

**Verificación dentro de la transacción.** Igual que la chapeta (documento 13, sección 2.2): al guardar,
dentro de la misma transacción, se vuelve a calcular el vigente y se repiten las reglas que dependen de
él (distinto del vigente y fecha no anterior), para que dos guardados seguidos no dejen dos cambios con
la misma base.

## 5. El destino al registrar un animal (decisión E)

El formulario de registro (documento 13) gana una sección opcional **Destino productivo**, solo para el
propietario, con los seis destinos y la fecha (hoy por defecto, no anterior a la llegada del animal). Si
se elige, el destino se crea **en la misma transacción** que el animal: si el animal se rechaza, no queda
destino. Es la asignación inicial (CU-12, 3a). Cumple la decisión D del paso 2.1.

## 6. El filtro del listado (decisión F)

Debajo del buscador, fichas pulsables (3.10.4.4): **Todos · Reproductor · Reproductora · Producción de
leche · Ceba · Venta · Sacrificio · Sin destino**, para ambos perfiles. Se combinan con el buscador y con
el filtro de estado (documento 15, sección 3). Cada fila del listado muestra también su destino vigente
(«Hembra · 3 años · Producción de leche»), para que el filtro se entienda.

## 7. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **RF-18 · HU-13 criterio 1** | Seis destinos |
| **HU-13 criterio 2 · HU-02.1** | El vigente en la ficha y en el listado |
| **RF-19 · HU-13 criterios 3 y 4** | Cada cambio es un registro con su fecha; el historial los muestra todos con el anterior que reemplazó |
| **CU-12** | Confirmación con el destino reemplazado; primera asignación sin cambio; cancelar no modifica |
| **Tabla 27 · HU-06.4** | Solo el propietario cambia y consulta el historial; al trabajador no se le muestran las opciones |
| **3.10.4.4** | Filtro por destino con fichas pulsables |

## 8. Pruebas

### PU-20 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Vigente | El de `desde` más reciente; a igual fecha, el registrado después; sin registros, ninguno |
| 2 | Historial | Del más reciente al más antiguo, con el anterior de cada cambio y el inicial señalado |
| 3 | Validaciones | Las seis reglas de la sección 4.1, todos los errores juntos |
| 4 | Asignar | Crea el registro con autor, pendiente y en la cola; la confirmación nombra el reemplazado |
| 5 | Transacción | Dos asignaciones seguidas con la misma base: la segunda se valida contra la primera |
| 6 | Registro con destino | El animal y su destino en una transacción; si el animal se rechaza, no queda destino |
| 7 | Permisos | El trabajador no puede asignar (`PermisoDenegado`), ni al registrar un animal |
| 8 | Filtro | Por destino y sin destino, combinado con el buscador |

### PE-24 (manual)

Como **propietario**: asignar el primer destino a un animal de prueba, cambiarlo con la confirmación,
ver el historial, asignarlo al registrar otro animal y filtrar el listado. Como **trabajador**: comprobar
que no aparecen Cambiar destino, Historial ni la sección de destino en el registro, y que sí ve el destino
vigente (HU-06.4).

## Referencias

- Documento de trabajo de grado: RF-18, RF-19, RF-27, RF-28; CU-12 (Tabla A12); HU-13 (Tabla B13);
  HU-06 (Tabla B6); apartados 3.10.1, 3.10.3 y 3.10.4.4; Tablas 24, 27 y 31.
