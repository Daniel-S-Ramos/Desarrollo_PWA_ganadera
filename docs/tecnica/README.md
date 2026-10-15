# Documentación técnica

Explica cómo funciona por dentro cada componente del prototipo, con el problema que resuelve,
las alternativas consideradas, el algoritmo, los casos límite y su relación con el diseño del
capítulo 3 del documento de trabajo de grado.

Cada documento se escribe **antes** de implementar el componente, como especificación, y se
actualiza si la implementación obliga a cambiar algo.

| # | Componente | Paso | Origen en el documento |
|---|---|---|---|
| 01 | [Identificador de los registros: UUID versión 7](01-identificador-uuidv7.md) | 1.2 | 3.7.1 · RD-02 |
| 02 | [Esquema local: la base de datos del dispositivo](02-esquema-local.md) | 1.3 | RD-01 · 3.8.4 · Tabla 25 |
| 03 | [Repositorio local y cola de operaciones](03-repositorio-y-cola.md) | 1.4 | 3.7.2 · RNF-04 · Tabla 20 |
| 04 | [Almacenamiento persistente](04-almacenamiento-persistente.md) | 1.5 | RNF-15 · 3.8.7 |
| 05 | [Esquema remoto: la base de datos del servicio](05-esquema-remoto.md) | 1.6 | 3.8.3 · 3.7.8 · RNF-06 |
| 06 | [Autenticación con conexión y sin ella](06-autenticacion.md) | 1.7 | 3.9.1 · RF-24 · RD-03 |
| 07 | [Código de desbloqueo](07-codigo-de-desbloqueo.md) | 1.8 | 3.9.1 · RD-05 · Tabla 31 |
| 08 | [Permisos por perfil](08-permisos.md) | 1.9 | 3.9.2 · 3.9.3 · 3.9.5 · Tabla 27 |
| 09 | [Sincronización (parte 1): subida y conflictos](09-sincronizacion-subida.md) | 1.10 | 3.7.2 – 3.7.5 · 3.7.8 · 3.8.6 |
| 10 | [Sincronización (parte 2): bajada y carga inicial](10-sincronizacion-bajada.md) | 1.10 | 3.7.5 – 3.7.8 |
| 11 | [Indicador de sincronización](11-indicador-de-sincronizacion.md) | 1.11 | 3.7.4 · 3.10.4.5 · RF-30 |
| 12 | [Cierre de sesión con la cola vacía](12-cierre-de-sesion.md) | 1.12 | 3.9.1 · Tabla 31 |
| 13 | [Registro de un animal](13-registro-de-animal.md) | 2.1 | CU-02 · HU-01 · 3.8.10 · Tabla 31 |
| 14 | [Fotografías: captura, compresión y cola de imágenes](14-fotografias.md) | 2.2 | RF-02 · RNF-12 · 3.8.5 · Tabla 25 |
| 15 | [Listado de animales, búsqueda por chapeta y bajada de imágenes](15-listado-de-animales.md) | 2.3 | RF-06 · CU-03 · 3.11.1 · Tabla 25 |
| 16 | [Ficha del animal con autoría visible](16-ficha-del-animal.md) | 2.4 | RF-05 · HU-02 · HU-15 · 3.10.4.4 |
| 17 | [Carga inicial de un teléfono nuevo](17-carga-inicial.md) | 2.5 | 3.7.6 · 3.7.7 · RNF-05 |
| 18 | [Catálogo de medicamentos y parámetros](18-catalogo-de-medicamentos.md) | 3.1 | RF-09 · 3.8.9 · Tablas 30 y 31 |
| 19 | [Destino productivo y su historial](19-destino-productivo.md) | 3.2 | RF-18 · CU-12 · HU-13 · HU-06.4 |
| 20 | [Registro sanitario e historial](20-registro-sanitario.md) | 3.3 | RF-07 · RF-08 · CU-04 · CU-05 · HU-03 |
| 21 | [Advertencia por repetición de un medicamento](21-advertencia-por-repeticion.md) | 3.4 | RF-09 · CU-04 5a · HU-09 · Figura 19 |
