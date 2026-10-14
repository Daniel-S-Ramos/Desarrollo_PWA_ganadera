# 17 · Carga inicial de un teléfono nuevo

| | |
|---|---|
| **Componente** | `src/sync/cargaInicial.ts` · avance en `src/sync/motor.ts`, `bajada.ts` y `bajadaImagenes.ts` · `src/ui/componentes/PreparandoTelefono.tsx` |
| **Capa** | Sincronización y presentación |
| **Origen en el documento** | Apartados 3.7.6 y 3.7.7 · RNF-05 · CU-01 · 3.7.3 (tercera regla) |
| **Depende de** | [10 · Bajada](10-sincronizacion-bajada.md) · [13 · Registro de un animal](13-registro-de-animal.md) · [15 · Bajada de imágenes](15-listado-de-animales.md) |
| **Pruebas** | PU-18 · PE-21 |

---

## 1. El problema

El apartado 3.7.6 distingue dos situaciones. La primera, poblar el predio registrando los 55
animales, la resuelve el registro (documento 13). La segunda es la de este documento:

> Configurar un teléfono nuevo, o volver a instalar la aplicación en uno que perdió sus datos. Aquí el
> dispositivo no registra nada sino que recibe el estado completo del predio desde el servicio remoto,
> y es el único momento en que necesita una conexión sostenida.

La descarga ya existe: es la bajada con todas las marcas vacías (documento 10, sección 5), y las
fotos llegan por la bajada de imágenes (documento 15, sección 6). Lo que faltaba es **lo que ve y
puede hacer el usuario mientras tanto**. Antes de este paso, en un teléfono nuevo la aplicación
entraba a un inicio normal y los animales iban apareciendo sin aviso.

## 2. Por qué el registro se bloquea durante la carga (decisión B)

La primera versión del documento 10 permitía registrar durante la carga inicial. Se corrigió
(2026-10-13) porque el registro depende de conocer el inventario completo:

- **La chapeta única** se verifica contra los animales del teléfono (documento 13, sección 2.2). Si se
  registra la chapeta 45 antes de que llegue el animal 45 del servicio, el teléfono la acepta y el
  servicio la rechaza: un conflicto de chapeta (3.7.3, tercera regla), cuya resolución sigue pendiente.
- **La madre y el padre** solo pueden elegirse entre los animales que ya llegaron.

El apartado 3.7.6 dice que en este momento el teléfono «no registra nada» y que hay «una conexión
sostenida»: bloquear el registro unos minutos, en la vivienda, cuesta poco frente a un conflicto.

**La consulta sí se permite.** El listado y las fichas muestran lo que ya llegó, con un aviso de que
la información está incompleta.

## 3. Cuándo un teléfono está en carga inicial (decisión D)

Una marca local en la tabla `meta`, `carga_inicial_completa`, con la fecha en que terminó.

| Situación | Qué pasa |
|---|---|
| Teléfono nuevo, primer ingreso | No hay marca: el teléfono está en carga inicial |
| Termina una sincronización cuya **bajada de datos** se completó | Se guarda la marca. Desde ese momento se puede registrar |
| La bajada de datos se interrumpe (sin red, error) | No se guarda: sigue en carga inicial y continúa en la próxima sincronización |
| Teléfono que ya tenía los datos antes de este paso (el computador y el teléfono de las pruebas) | No tiene la marca: muestra la carga unos segundos, hasta su próxima sincronización, que la guarda |
| Cerrar sesión | La marca se conserva, igual que la información del predio (documento 10, sección 6) |

La marca depende de los **datos**, no de las fotos (decisión C): las fotos no hacen falta para
registrar, y en la red rural pueden tardar más.

## 4. El avance (decisión A)

El motor publica, además de «sincronizando», el avance de la carga:

| Etapa | Qué se cuenta |
|---|---|
| Usuarios y parámetros | Hecho o no |
| Animales | Cuántos han llegado |
| Registros | Cuántas filas de las demás tablas han llegado (fotos, eventos, pesajes…) |
| Fotos de los animales | Cuántas reducidas se han bajado, de cuántas faltan |

**De dónde salen los íconos y las cuentas** (*corrección tras PE-21, 2026-10-13*). La primera versión
los tomaba solo de la sincronización en curso. En la prueba, tras cortar y devolver la conexión, la
pantalla mostraba «○ Animales: 8» (pendiente, con los 8 animales ya en el teléfono) y «Registros: 0»,
porque la sincronización reanudada empieza su cuenta de cero aunque lo descargado sigue guardado. Ahora
las cuentas salen de **lo que hay en el teléfono** y el ícono de cada paso, de esa cuenta más la tabla
que se está descargando en ese momento (función pura `pasosDeCarga`):

| Paso | Hecho | En curso | Pendiente |
|---|---|---|---|
| Usuarios y parámetros | Hay usuarios en el teléfono | Sincronizando, sin usuarios todavía | Ni lo uno ni lo otro |
| Animales | Hay animales en el teléfono (llegan en una sola página), o ya se descargan tablas posteriores | Descargando la tabla de animales | Ni lo uno ni lo otro |
| Registros | Nunca mientras la pantalla se muestra: si se muestra, no han terminado | Descargando las tablas posteriores a los animales | En otro caso |

No se conoce de antemano el total de filas del servicio, así que el avance de los datos se muestra
como una cuenta que crece («Registros: 812…»), no como un porcentaje. El de las fotos sí tiene total,
porque se sabe cuántas faltan antes de empezar a bajarlas.

**El orden.** El apartado 3.7.6 pide primero los datos de referencia: usuarios, parámetros y
medicamentos. Hasta este paso, los usuarios y los parámetros se descargaban al final de la bajada; se
pasan al principio. Los medicamentos ya eran la primera tabla del orden de dependencias.

## 5. La pantalla

Mientras el teléfono está en carga inicial, el inicio muestra **«Preparando este teléfono»** en lugar
de los accesos habituales:

```
Preparando este teléfono

✓ Usuarios y parámetros
✓ Animales: 55
↻ Registros: 812…
○ Fotos de los animales

Mantenga la conexión. Si se corta, la descarga continuará donde quedó.

[Ver los animales que ya llegaron]
```

- **Registrar animal** no aparece. Si se abre `/animales/nuevo` directamente, se explica: «Espere a que
  termine de llegar la información del predio para registrar. Así se evita registrar una chapeta que
  ya existe en otro teléfono.»
- El listado y la ficha funcionan, con el aviso «La información del predio todavía está llegando».
- Al terminar los datos, el inicio vuelve a la normalidad. Si las fotos siguen bajando, la barra
  inferior lo indica («Fotos: 34 de 55»).

**Si se corta la conexión (decisión E):** «Sin conexión: la descarga continuará donde quedó cuando
vuelva la señal.» La reanudación ya existe: cada página aplicada deja su marca firme (documento 10,
sección 2.1), y el motor vuelve a sincronizar al volver la señal (documento 09, sección 2).

## 6. Relación con los requerimientos

| Requerimiento | Cómo lo atiende |
|---|---|
| **3.7.6** | Orden de referencia, animales, registros e imágenes; el teléfono no registra mientras recibe el estado del predio; avance visible |
| **3.7.7 · RNF-05** | Una carga interrumpida se reanuda desde la marca de avance, sin empezar de nuevo |
| **3.7.3, tercera regla** | Se evita el conflicto de chapeta que produciría registrar sin conocer el inventario |

## 7. Pruebas

### PU-18 (automática)

| # | Qué verifica | Criterio de aprobación |
|---|---|---|
| 1 | Marca de carga completa | No existe en un teléfono nuevo; se guarda al completarse la bajada de datos; no se guarda si se interrumpe; se conserva al cerrar sesión |
| 2 | Las fotos no bloquean | Con la bajada de datos completa y fotos pendientes, la carga se da por terminada |
| 3 | Avance | El motor publica las etapas en orden: referencia, animales, registros, fotos con su total |
| 4 | Orden de referencia | Los usuarios y los parámetros se piden antes que las tablas del predio |
| 5 | Reanudación | Una carga interrumpida a mitad no vuelve a pedir lo que ya aplicó |

### PE-21 (manual)

Simular un teléfono nuevo (borrar los datos del sitio de la aplicación, o un perfil nuevo de Chrome),
ingresar con conexión y observar la pantalla de carga hasta que lleguen los animales de prueba y sus
fotos; comprobar que no se puede registrar durante la carga y que sí se puede al terminar; cortar la
conexión a mitad y comprobar que continúa.

## Referencias

- Documento de trabajo de grado: apartados 3.7.3, 3.7.6, 3.7.7 y 3.8.7; RNF-05; CU-01.
