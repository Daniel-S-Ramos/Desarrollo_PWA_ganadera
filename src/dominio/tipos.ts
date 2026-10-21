/**
 * Tipos del dominio de la Ganadería JR.
 *
 * Cada tipo corresponde a una entidad del modelo lógico (Tabla 24 del documento) y cada
 * unión de literales a un conjunto de valores admitidos por las restricciones declaradas.
 * Expresarlos como tipos hace que el compilador rechace un valor fuera del dominio antes
 * de que llegue a la base de datos.
 */

// ---------------------------------------------------------------------------
// Valores admitidos
// ---------------------------------------------------------------------------

export const PERFILES = ['propietario', 'trabajador'] as const;
export type Perfil = (typeof PERFILES)[number];

export const SEXOS = ['macho', 'hembra'] as const;
export type Sexo = (typeof SEXOS)[number];

/**
 * Estado de un animal en el inventario. No se almacena: un animal está retirado cuando tiene una
 * salida vigente (no anulada) y activo en caso contrario. Ver docs/tecnica/02-esquema-local.md, sección 6.1.
 */
export const ESTADOS_ANIMAL = ['activo', 'retirado'] as const;
export type EstadoAnimal = (typeof ESTADOS_ANIMAL)[number];

export const TIPOS_FOTOGRAFIA = ['izquierdo', 'derecho', 'frontal'] as const;
export type TipoFotografia = (typeof TIPOS_FOTOGRAFIA)[number];

export const TIPOS_EVENTO_SANITARIO = ['vacuna', 'purga', 'vitamina', 'tratamiento', 'otro'] as const;
export type TipoEventoSanitario = (typeof TIPOS_EVENTO_SANITARIO)[number];

export const TIPOS_MEDICAMENTO = ['vacuna', 'purga', 'vitamina', 'antibiotico', 'otro'] as const;
export type TipoMedicamento = (typeof TIPOS_MEDICAMENTO)[number];

/** Unidades usadas en el predio. ml y cc son equivalentes; se conservan ambas porque las dos se emplean en campo. */
export const UNIDADES_DOSIS = ['ml', 'cc', 'mg', 'dosis'] as const;
export type UnidadDosis = (typeof UNIDADES_DOSIS)[number];

export const METODOS_PESAJE = ['cinta', 'bascula'] as const;
export type MetodoPesaje = (typeof METODOS_PESAJE)[number];

export const RESULTADOS_PARTO = ['cria_viva', 'cria_nacida_muerta', 'aborto'] as const;
export type ResultadoParto = (typeof RESULTADOS_PARTO)[number];

/** RF-18: seis destinos productivos. */
export const DESTINOS = ['reproductor', 'reproductora', 'leche', 'ceba', 'venta', 'sacrificio'] as const;
export type Destino = (typeof DESTINOS)[number];

export const CONCEPTOS_MOVIMIENTO = ['compra', 'servicio_veterinario', 'alimentacion'] as const;
export type ConceptoMovimiento = (typeof CONCEPTOS_MOVIMIENTO)[number];

export const MOTIVOS_SALIDA = ['venta', 'muerte', 'perdida_robo'] as const;
export type MotivoSalida = (typeof MOTIVOS_SALIDA)[number];

/** Apartado 3.8.11: los cinco recordatorios derivados. */
export const TIPOS_RECORDATORIO = [
  'sin_pesaje_reciente',
  'sin_registro_ordeno',
  'produccion_bajo_promedio',
  'sin_registros_recientes',
  'sincronizacion_pendiente',
] as const;
export type TipoRecordatorio = (typeof TIPOS_RECORDATORIO)[number];

export const TIPOS_CORRECCION = ['correccion', 'anulacion'] as const;
export type TipoCorreccion = (typeof TIPOS_CORRECCION)[number];

/** Apartado 3.9.5: cinco motivos; la nota es obligatoria cuando el motivo es «otro». */
export const MOTIVOS_CORRECCION = [
  'error_digitacion',
  'animal_equivocado',
  'fecha_equivocada',
  'registro_duplicado',
  'otro',
] as const;
export type MotivoCorreccion = (typeof MOTIVOS_CORRECCION)[number];

/** Tabla 22: estados de sincronización. Existen solo en la copia local. */
export const ESTADOS_SYNC = ['pendiente', 'en_transmision', 'sincronizado', 'conflicto'] as const;
export type EstadoSync = (typeof ESTADOS_SYNC)[number];

// ---------------------------------------------------------------------------
// Atributos comunes
// ---------------------------------------------------------------------------

/** Fecha calendario del predio en formato AAAA-MM-DD (apartado 3.8.6), nunca un instante. */
export type FechaPredio = string;
/** Instante en formato ISO 8601 con zona horaria. */
export type Instante = string;
/** UUID versión 7 generado en el dispositivo (apartado 3.7.1). */
export type Uuid = string;

/**
 * Atributos que se repiten en todas las tablas por exigencia de las restricciones RD-02 y
 * RD-04: el identificador generado en el dispositivo, el autor y la marca temporal de creación.
 * Ninguno de los tres admite cambios después de la creación.
 */
export interface Auditable {
  readonly id: Uuid;
  readonly autor_id: Uuid;
  readonly creado_en: Instante;
}

/**
 * Atributos que solo existen en el almacenamiento local. `recibido_en` es la marca que el
 * servicio remoto asigna al recibir el registro; se conserva para ordenar versiones
 * (apartado 3.7.3, segunda regla) sin depender del reloj del dispositivo.
 */
export interface AtributosLocales {
  estado_sync: EstadoSync;
  recibido_en?: Instante;
  detalle_conflicto?: string;
}

// ---------------------------------------------------------------------------
// Entidades (Tabla 23)
// ---------------------------------------------------------------------------

export interface Usuario {
  id: Uuid;
  nombre: string;
  perfil: Perfil;
}

export interface Animal extends Auditable {
  /** Único entre todos los animales, activos y retirados. No cambia durante la vida del animal. */
  codigo_chapeta: string;
  sexo: Sexo;
  fecha_nacimiento: FechaPredio | null;
  fecha_nacimiento_exacta: boolean;
  fecha_ingreso: FechaPredio | null;
  procedencia: string | null;
  peso_inicial: number | null;
  /** La madre es una hembra del predio o una externa, nunca las dos cosas a la vez (decisión del 2026-10-12). */
  madre_id: Uuid | null;
  madre_externa: string | null;
  /** El padre es un animal del predio o un reproductor externo, nunca las dos cosas a la vez. */
  padre_id: Uuid | null;
  padre_externo: string | null;
  /**
   * ¿Tiene ya la chapeta física? Se fija al registrar: false para las crías, que reciben su número al
   * nacer y la chapeta después (plazo de 90 días). Ausente equivale a true: los animales registrados
   * antes de este campo (documento técnico 25, sección 7.1).
   */
  chapeta_puesta?: boolean;
}

/** Cuándo se le puso la chapeta física a un animal registrado sin ella. Uno por animal (documento técnico 25, sección 7). */
export interface ColocacionChapeta extends Auditable {
  animal_id: Uuid;
  fecha: FechaPredio;
}

/**
 * Datos de una fotografía. La ruta de la imagen en el servicio de archivos no se almacena: se deduce
 * como `{animal_id}/{id}.webp` (docs/tecnica/05-esquema-remoto.md, sección 2.1).
 */
export interface Fotografia extends Auditable {
  animal_id: Uuid;
  tipo: TipoFotografia;
}

export interface EventoSanitario extends Auditable {
  animal_id: Uuid;
  fecha: FechaPredio;
  tipo: TipoEventoSanitario;
  medicamento_id: Uuid;
  dosis: number | null;
  costo: number | null;
  sintomas: string | null;
}

export interface ProduccionLeche extends Auditable {
  animal_id: Uuid;
  fecha: FechaPredio;
  /** Admite cero: ordeño sin producción. La ausencia de registro es otra cosa. */
  litros: number;
}

export interface Pesaje extends Auditable {
  animal_id: Uuid;
  fecha: FechaPredio;
  peso: number;
  metodo: MetodoPesaje;
}

export interface Parto extends Auditable {
  madre_id: Uuid;
  fecha: FechaPredio;
  resultado: ResultadoParto;
  /** Obligatoria solo cuando el resultado es cría viva. */
  cria_id: Uuid | null;
  observacion: string | null;
}

export interface DestinoProductivo extends Auditable {
  animal_id: Uuid;
  destino: Destino;
  desde: FechaPredio;
}

export interface MovimientoEconomico extends Auditable {
  animal_id: Uuid;
  concepto: ConceptoMovimiento;
  fecha: FechaPredio;
  valor: number;
  descripcion: string | null;
}

export interface Salida extends Auditable {
  animal_id: Uuid;
  fecha: FechaPredio;
  motivo: MotivoSalida;
  peso_venta: number | null;
  valor_venta: number | null;
  comprador: string | null;
  causa_muerte: string | null;
  /**
   * Observación de una pérdida o un robo (CU-13, 3b). Ausente en las salidas registradas antes de la
   * columna (documento técnico 29, sección 4).
   */
  observacion?: string | null;
}

/** Solo se almacena la decisión de posponer; los recordatorios vigentes se derivan. */
export interface RecordatorioPospuesto extends Auditable {
  tipo: TipoRecordatorio;
  animal_id: Uuid | null;
  pospuesto_hasta: FechaPredio;
}

export interface Correccion extends Auditable {
  entidad_afectada: EntidadCorregible;
  registro_id: Uuid;
  tipo: TipoCorreccion;
  campo: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  motivo: MotivoCorreccion;
  nota: string | null;
}

export interface Medicamento extends Auditable {
  nombre: string;
  tipo: TipoMedicamento;
  unidad: UnidadDosis;
  /** Días dentro de los cuales una nueva aplicación dispara la advertencia (RF-09). */
  intervalo_advertencia_dias: number;
}

export interface Parametro {
  clave: string;
  valor: number;
  unidad: string;
  descripcion: string;
}

// ---------------------------------------------------------------------------
// Agrupaciones usadas por la capa de datos y la sincronización
// ---------------------------------------------------------------------------

/** Nombre de cada tabla, idéntico en el esquema local y en el remoto. */
export interface Tablas {
  animal: Animal;
  fotografia: Fotografia;
  evento_sanitario: EventoSanitario;
  produccion_leche: ProduccionLeche;
  pesaje: Pesaje;
  parto: Parto;
  destino_productivo: DestinoProductivo;
  movimiento_economico: MovimientoEconomico;
  salida: Salida;
  recordatorio: RecordatorioPospuesto;
  correccion: Correccion;
  medicamento: Medicamento;
  colocacion_chapeta: ColocacionChapeta;
}

export type NombreTabla = keyof Tablas;

/** Registros que el dispositivo crea y que viajan por la cola de operaciones. */
export type TablaSincronizable = NombreTabla;

/**
 * Tablas cuyos registros pueden corregirse o anularse (apartado 3.9.5). Las correcciones y
 * los recordatorios pospuestos no se corrigen a su vez.
 */
export type EntidadCorregible = Exclude<NombreTabla, 'correccion' | 'recordatorio' | 'colocacion_chapeta'>;

/** Un registro tal como vive en el dispositivo: la entidad más sus atributos locales. */
export type RegistroLocal<T extends NombreTabla> = Tablas[T] & AtributosLocales;

/** Datos que aporta quien registra; el resto lo fija la capa de datos. */
export type DatosNuevos<T extends NombreTabla> = Omit<Tablas[T], keyof Auditable>;
