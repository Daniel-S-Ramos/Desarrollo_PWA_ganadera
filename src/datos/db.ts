/**
 * Esquema de la base de datos local (IndexedDB mediante Dexie).
 * Especificación: docs/tecnica/02-esquema-local.md
 */
import Dexie, { type EntityTable } from 'dexie';
import type {
  Instante,
  NombreTabla,
  Parametro,
  RegistroLocal,
  TablaSincronizable,
  Usuario,
  Uuid,
} from '../dominio/tipos';

/**
 * Entrada de la cola de operaciones pendientes (apartado 3.7.2). Es un artefacto local:
 * describe el estado de este dispositivo y nunca se transmite.
 */
export interface OperacionPendiente {
  /** Autoincremental local: conserva el orden en que se produjeron las operaciones. */
  seq?: number;
  entidad: TablaSincronizable;
  registro_id: Uuid;
  tipo: 'insertar' | 'actualizar';
  intentos: number;
  ultimo_intento: Instante | null;
  creado_en: Instante;
}

/** Cola propia de las imágenes, separada de la de datos (apartado 3.8.5). */
export interface ImagenPendiente {
  seq?: number;
  fotografia_id: Uuid;
  intentos: number;
  ultimo_intento: Instante | null;
}

/**
 * Imágenes de una fotografía guardadas en el dispositivo (docs/tecnica/14-fotografias.md, sección 4.1).
 * Ambas se conservan hasta que se suben; después solo queda la reducida de la vista principal (Tabla 25).
 */
export interface ImagenLocal {
  fotografia_id: Uuid;
  animal_id: Uuid;
  reducida: Blob | null;
  /** Resolución completa, retenida solo hasta que se transmite. */
  completa: Blob | null;
}

/** Valores sueltos de este dispositivo: marca de avance, configuración de desbloqueo, etc. */
export interface Meta {
  clave: string;
  valor: unknown;
}

type TablasLocales = {
  [T in NombreTabla]: EntityTable<RegistroLocal<T>, 'id'>;
};

export class BaseLocal extends Dexie {
  declare animal: TablasLocales['animal'];
  declare fotografia: TablasLocales['fotografia'];
  declare evento_sanitario: TablasLocales['evento_sanitario'];
  declare produccion_leche: TablasLocales['produccion_leche'];
  declare pesaje: TablasLocales['pesaje'];
  declare parto: TablasLocales['parto'];
  declare destino_productivo: TablasLocales['destino_productivo'];
  declare movimiento_economico: TablasLocales['movimiento_economico'];
  declare salida: TablasLocales['salida'];
  declare recordatorio: TablasLocales['recordatorio'];
  declare correccion: TablasLocales['correccion'];
  declare medicamento: TablasLocales['medicamento'];

  declare usuario: EntityTable<Usuario, 'id'>;
  declare parametro: EntityTable<Parametro, 'clave'>;

  declare cola_operaciones: EntityTable<OperacionPendiente, 'seq'>;
  declare cola_imagenes: EntityTable<ImagenPendiente, 'seq'>;
  declare imagen: EntityTable<ImagenLocal, 'fotografia_id'>;
  declare meta: EntityTable<Meta, 'clave'>;

  constructor(nombre = 'ganaderia-jr') {
    super(nombre);

    // Índices del esquema local. Las restricciones de unicidad (chapeta, vaca y fecha) no se
    // declaran aquí sino en el servicio remoto y en la lógica de dominio: localmente deben
    // poder coexistir dos registros en conflicto hasta que el propietario los resuelva
    // (apartado 3.7.3, tercera regla).
    this.version(1).stores({
      animal: 'id, codigo_chapeta, madre_id, padre_id, estado_sync',
      fotografia: 'id, animal_id, [animal_id+tipo], estado_sync',
      evento_sanitario: 'id, animal_id, medicamento_id, [animal_id+medicamento_id], fecha, estado_sync',
      produccion_leche: 'id, animal_id, fecha, [animal_id+fecha], estado_sync',
      pesaje: 'id, animal_id, fecha, estado_sync',
      parto: 'id, madre_id, cria_id, fecha, estado_sync',
      destino_productivo: 'id, animal_id, desde, estado_sync',
      movimiento_economico: 'id, animal_id, concepto, estado_sync',
      salida: 'id, animal_id, estado_sync',
      recordatorio: 'id, tipo, animal_id, estado_sync',
      correccion: 'id, [entidad_afectada+registro_id], registro_id, autor_id, creado_en, estado_sync',
      medicamento: 'id, nombre, estado_sync',

      usuario: 'id',
      parametro: 'clave',

      cola_operaciones: '++seq, registro_id',
      cola_imagenes: '++seq, fotografia_id',
      imagen: 'fotografia_id, animal_id',
      meta: 'clave',
    });
  }
}

export const db = new BaseLocal();

/**
 * Tablas cuyos registros viajan por la cola, en el orden de sus dependencias: un registro
 * siempre aparece después de aquellos a los que apunta. Es el orden de la carga inicial de un
 * dispositivo (apartado 3.7.6).
 */
export const TABLAS_SINCRONIZABLES: readonly TablaSincronizable[] = [
  'medicamento',
  'animal',
  'fotografia',
  'destino_productivo',
  'evento_sanitario',
  'produccion_leche',
  'pesaje',
  'parto',
  'movimiento_economico',
  'salida',
  'recordatorio',
  'correccion',
];
