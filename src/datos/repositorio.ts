/**
 * Repositorio local: única vía de escritura sobre el almacenamiento del dispositivo (Tabla 20).
 * Especificación: docs/tecnica/03-repositorio-y-cola.md
 *
 * Cada registro se guarda junto con su entrada en la cola de operaciones dentro de una sola
 * transacción (apartado 3.7.2): o quedan las dos escrituras o no queda ninguna, aunque la
 * aplicación se cierre de golpe (RNF-04).
 */
import type { EntityTable, Table } from 'dexie';
import type { DatosNuevos, NombreTabla, Parametro, RegistroLocal, Usuario, Uuid } from '../dominio/tipos';
import { db, TABLAS_SINCRONIZABLES, type OperacionPendiente } from './db';
import { avisarGuardadoLocal } from './eventos';

// Lo que otras capas pueden conocer del esquema sin importar la base de datos (prueba de arquitectura de PU-05).
export { TABLAS_SINCRONIZABLES, type OperacionPendiente } from './db';
import { uuidv7 } from './uuidv7';

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/** Lo que puede hacerse dentro de una unidad de trabajo. */
export interface Transaccion {
  /**
   * Crea un registro y su entrada en la cola. Quien registra aporta solo los datos del hecho;
   * el identificador, el autor, la fecha de creación y el estado los fija el repositorio.
   */
  crear<T extends NombreTabla>(tabla: T, datos: DatosNuevos<T>): Promise<RegistroLocal<T>>;
  /**
   * Guarda las dos versiones de la imagen de una fotografía ya creada en esta transacción y la pone
   * en la cola de imágenes (docs/tecnica/14-fotografias.md, sección 5).
   */
  guardarImagen(fotografia: RegistroLocal<'fotografia'>, imagenes: { completa: Blob; reducida: Blob }): Promise<void>;
}

/**
 * Ejecuta varias escrituras como una sola transacción: si cualquiera falla, no queda ninguna,
 * ni sus entradas en la cola. La promesa se resuelve solo cuando la transacción terminó, que es
 * el único momento en que la operación puede darse por hecha (Tabla 21).
 *
 * @param autor Usuario que registra. Debe llegar ya autorizado por el gestor de permisos.
 */
export async function unidadDeTrabajo<R>(autor: Uuid, trabajo: (tx: Transaccion) => Promise<R>): Promise<R> {
  const tablas = [...TABLAS_SINCRONIZABLES.map((t) => tablaDe(t)), db.cola_operaciones, db.imagen, db.cola_imagenes];

  const resultado = await db.transaction('rw', tablas, async () => {
    const tx: Transaccion = {
      async crear<T extends NombreTabla>(tabla: T, datos: DatosNuevos<T>) {
        const ahora = new Date().toISOString();
        // El orden de las propiedades hace que los campos que fija el repositorio prevalezcan
        // sobre cualquier valor que llegara mezclado en los datos.
        const registro = {
          ...datos,
          id: uuidv7(),
          autor_id: autor,
          creado_en: ahora,
          estado_sync: 'pendiente',
        } as unknown as RegistroLocal<T>;

        await tablaDe(tabla).add(registro);
        await db.cola_operaciones.add({
          entidad: tabla,
          registro_id: registro.id,
          tipo: 'insertar',
          intentos: 0,
          ultimo_intento: null,
          creado_en: ahora,
        });
        return registro;
      },

      async guardarImagen(fotografia, imagenes) {
        await db.imagen.add({
          fotografia_id: fotografia.id,
          animal_id: fotografia.animal_id,
          completa: imagenes.completa,
          reducida: imagenes.reducida,
        });
        await db.cola_imagenes.add({ fotografia_id: fotografia.id, intentos: 0, ultimo_intento: null });
      },
    };
    return trabajo(tx);
  });
  // Solo después de confirmada la transacción: lo guardado ya está a salvo y puede enviarse.
  avisarGuardadoLocal();
  return resultado;
}

/** Tabla del esquema por su nombre, con el tipo general que admite cualquier registro. */
function tablaDe(tabla: NombreTabla): Table<unknown, Uuid> {
  return db[tabla] as unknown as Table<unknown, Uuid>;
}

/** Crea un único registro. Equivale a una unidad de trabajo con una sola escritura. */
export function crear<T extends NombreTabla>(tabla: T, datos: DatosNuevos<T>, autor: Uuid): Promise<RegistroLocal<T>> {
  return unidadDeTrabajo(autor, (tx) => tx.crear(tabla, datos));
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/**
 * Una tabla en modo de solo lectura: conserva las consultas por índice de Dexie y no ofrece
 * ningún método de escritura. Un módulo que intente escribir por aquí no compila.
 */
export type TablaConsulta<T, K extends keyof T> = Pick<
  EntityTable<T, K>,
  | 'get'
  | 'bulkGet'
  | 'where'
  | 'filter'
  | 'orderBy'
  | 'reverse'
  | 'limit'
  | 'offset'
  | 'count'
  | 'each'
  | 'toArray'
  | 'toCollection'
>;

type Consultas = { readonly [T in NombreTabla]: TablaConsulta<RegistroLocal<T>, 'id'> } & {
  readonly usuario: TablaConsulta<Usuario, 'id'>;
  readonly parametro: TablaConsulta<Parametro, 'clave'>;
};

/** Tablas del predio para consultar desde los módulos y las pantallas. */
export const consulta: Consultas = {
  animal: db.animal,
  fotografia: db.fotografia,
  evento_sanitario: db.evento_sanitario,
  produccion_leche: db.produccion_leche,
  pesaje: db.pesaje,
  parto: db.parto,
  destino_productivo: db.destino_productivo,
  movimiento_economico: db.movimiento_economico,
  salida: db.salida,
  recordatorio: db.recordatorio,
  correccion: db.correccion,
  medicamento: db.medicamento,
  usuario: db.usuario,
  parametro: db.parametro,
};

// ---------------------------------------------------------------------------
// Cola de operaciones
// ---------------------------------------------------------------------------

/** Número de operaciones que esperan conexión. Lo muestra el contador de la barra inferior. */
export function contarPendientes(): Promise<number> {
  return db.cola_operaciones.count();
}

/** Fotografías cuya imagen espera conexión. Se cuentan aparte de los registros (documento 14, sección 8.2). */
export function contarImagenesPendientes(): Promise<number> {
  return db.cola_imagenes.count();
}

/** Imagen reducida de una fotografía guardada en el teléfono, si la hay. */
export async function imagenReducida(fotografiaId: Uuid): Promise<Blob | null> {
  return (await db.imagen.get(fotografiaId))?.reducida ?? null;
}

/** Operaciones pendientes en el orden en que se produjeron. Las consume el motor de sincronización. */
export function operacionesPendientes(): Promise<OperacionPendiente[]> {
  return db.cola_operaciones.orderBy('seq').toArray();
}
