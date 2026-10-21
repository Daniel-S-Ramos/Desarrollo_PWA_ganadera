/**
 * Qué campos se corrigen en cada registro, cómo se escriben y cómo se validan (decisión A).
 * Especificación: docs/tecnica/26-correccion-y-anulacion.md, secciones 2 y 3
 *
 * Los valores de una corrección se guardan como texto (`valor_anterior`, `valor_nuevo`): números con punto
 * decimal, fechas AAAA-MM-DD, identificadores tal cual y el valor vacío como texto vacío.
 */
import { formatearFecha } from './fechas';
import { leerLitros } from './leche';
import { NOMBRE_TIPO } from './medicamentos';
import { leerPeso, NOMBRE_METODO } from './peso';
import { leerCosto, NOMBRE_TIPO_EVENTO } from './sanidad';
import {
  METODOS_PESAJE,
  SEXOS,
  TIPOS_EVENTO_SANITARIO,
  TIPOS_MEDICAMENTO,
  UNIDADES_DOSIS,
  type EntidadCorregible,
  type FechaPredio,
} from './tipos';


export type TipoCampo = 'numero' | 'entero' | 'fecha' | 'texto' | 'enum' | 'booleano' | 'animal' | 'medicamento';

export interface CampoCorregible {
  etiqueta: string;
  tipo: TipoCampo;
  /** Admite quedar vacío. */
  vacio: boolean;
  /** Para 'enum': valor y nombre visible. */
  opciones?: readonly (readonly [string, string])[];
  /** Para 'animal': el sexo que debe tener. */
  sexo?: 'hembra' | 'macho';
  /** Solo el propietario lo corrige (el costo, documento 20, sección 5.2). */
  soloPropietario?: boolean;
  /** Para 'fecha': de qué fecha no puede ser anterior (sección 3). */
  minimo?: 'nacimiento' | 'llegada';
  /** Validación del valor ya convertido; devuelve el mensaje o null. */
  validar?: (valor: number | string) => string | null;
  maximoTexto?: number;
}

const enumDe = (valores: readonly string[], nombres?: Record<string, string>) => valores.map((v) => [v, nombres?.[v] ?? v] as const);

/** Los campos corregibles por tabla (sección 3). Destino productivo: solo se anula. */
export const CAMPOS_CORREGIBLES: Record<EntidadCorregible, Readonly<Record<string, CampoCorregible>>> = {
  evento_sanitario: {
    fecha: { etiqueta: 'Fecha', tipo: 'fecha', vacio: false, minimo: 'nacimiento' },
    tipo: { etiqueta: 'Tipo de evento', tipo: 'enum', vacio: false, opciones: enumDe(TIPOS_EVENTO_SANITARIO, NOMBRE_TIPO_EVENTO) },
    medicamento_id: { etiqueta: 'Medicamento', tipo: 'medicamento', vacio: false },
    dosis: {
      etiqueta: 'Dosis',
      tipo: 'numero',
      vacio: true,
      validar: (v) => (Number(v) > 0 && Number(v) <= 9999 ? null : 'La dosis debe ser mayor que 0 y hasta 9.999'),
    },
    costo: { etiqueta: 'Costo', tipo: 'entero', vacio: true, soloPropietario: true, validar: (v) => (Number(v) <= 10_000_000 ? null : 'Escriba el costo en pesos, sin decimales, hasta 10.000.000') },
    sintomas: { etiqueta: 'Síntomas', tipo: 'texto', vacio: true, maximoTexto: 300 },
  },
  produccion_leche: {
    litros: { etiqueta: 'Litros', tipo: 'numero', vacio: false },
  },
  pesaje: {
    peso: { etiqueta: 'Peso en kg', tipo: 'numero', vacio: false },
    metodo: { etiqueta: 'Método', tipo: 'enum', vacio: false, opciones: enumDe(METODOS_PESAJE, NOMBRE_METODO) },
    fecha: { etiqueta: 'Fecha', tipo: 'fecha', vacio: false, minimo: 'llegada' },
  },
  parto: {
    fecha: { etiqueta: 'Fecha del parto', tipo: 'fecha', vacio: false, minimo: 'nacimiento' },
    observacion: { etiqueta: 'Observación', tipo: 'texto', vacio: true, maximoTexto: 300 },
  },
  destino_productivo: {},
  animal: {
    sexo: { etiqueta: 'Sexo', tipo: 'enum', vacio: false, opciones: enumDe(SEXOS, { hembra: 'Hembra', macho: 'Macho' }) },
    fecha_nacimiento: { etiqueta: 'Fecha de nacimiento', tipo: 'fecha', vacio: true },
    fecha_nacimiento_exacta: { etiqueta: 'Fecha de nacimiento exacta', tipo: 'booleano', vacio: false },
    fecha_ingreso: { etiqueta: 'Fecha de ingreso', tipo: 'fecha', vacio: true },
    procedencia: { etiqueta: 'Procedencia', tipo: 'texto', vacio: true, maximoTexto: 100 },
    peso_inicial: { etiqueta: 'Peso inicial en kg', tipo: 'numero', vacio: true },
    madre_id: { etiqueta: 'Madre del predio', tipo: 'animal', vacio: true, sexo: 'hembra' },
    madre_externa: { etiqueta: 'Madre externa', tipo: 'texto', vacio: true, maximoTexto: 100 },
    padre_id: { etiqueta: 'Padre del predio', tipo: 'animal', vacio: true, sexo: 'macho' },
    padre_externo: { etiqueta: 'Reproductor externo', tipo: 'texto', vacio: true, maximoTexto: 100 },
  },
  medicamento: {
    tipo: { etiqueta: 'Tipo', tipo: 'enum', vacio: false, opciones: enumDe(TIPOS_MEDICAMENTO, NOMBRE_TIPO) },
    unidad: { etiqueta: 'Unidad de dosis', tipo: 'enum', vacio: false, opciones: enumDe(UNIDADES_DOSIS) },
    intervalo_advertencia_dias: {
      etiqueta: 'Intervalo de advertencia, en días',
      tipo: 'entero',
      vacio: false,
      validar: (v) => (Number(v) >= 1 && Number(v) <= 730 ? null : 'Escriba un número entero de días, de 1 a 730'),
    },
  },
  fotografia: {},
  // Documento técnico 29, sección 8: el motivo no se corrige; si está mal, la salida se anula.
  salida: {
    fecha: { etiqueta: 'Fecha de salida', tipo: 'fecha', vacio: false, minimo: 'llegada' },
    peso_venta: { etiqueta: 'Peso de venta en kg', tipo: 'numero', vacio: true },
    valor_venta: {
      etiqueta: 'Valor recibido',
      tipo: 'entero',
      vacio: true,
      soloPropietario: true,
      validar: (v) => (Number(v) > 0 && Number(v) <= 100_000_000 ? null : 'Escriba el valor en pesos, sin decimales, hasta 100.000.000'),
    },
    comprador: { etiqueta: 'Comprador', tipo: 'texto', vacio: true, maximoTexto: 100 },
    causa_muerte: { etiqueta: 'Causa de la muerte', tipo: 'texto', vacio: true, maximoTexto: 300 },
    observacion: { etiqueta: 'Observación', tipo: 'texto', vacio: true, maximoTexto: 300 },
  },
  // Documento técnico 31, sección 5: el concepto no se corrige; si está mal, el costo se anula.
  movimiento_economico: {
    fecha: { etiqueta: 'Fecha', tipo: 'fecha', vacio: false, minimo: 'llegada' },
    valor: {
      etiqueta: 'Valor',
      tipo: 'entero',
      vacio: false,
      soloPropietario: true,
      validar: (v) => (Number(v) > 0 && Number(v) <= 100_000_000 ? null : 'Escriba el valor en pesos, sin decimales, hasta 100.000.000'),
    },
    descripcion: { etiqueta: 'Descripción', tipo: 'texto', vacio: true, maximoTexto: 300 },
  },
};

/** Animal y medicamento solo se corrigen; los demás también se anulan (sección 3). */
export function seAnula(entidad: EntidadCorregible): boolean {
  return !['animal', 'medicamento', 'fotografia'].includes(entidad);
}

// ---------------------------------------------------------------------------
// Conversión entre el valor del registro y el texto de la corrección
// ---------------------------------------------------------------------------

/** El valor de un campo como texto de corrección. */
export function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

/** El texto de una corrección como valor del campo. */
export function desdeTexto(campo: CampoCorregible, texto: string | null): unknown {
  if (texto === null || texto === '') return campo.tipo === 'booleano' ? false : null;
  if (campo.tipo === 'numero' || campo.tipo === 'entero') return Number(texto);
  if (campo.tipo === 'booleano') return texto === 'true';
  return texto;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(texto: string): boolean {
  if (!FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

export interface ContextoValor {
  hoy: FechaPredio;
  /** El límite inferior de una fecha, con su nombre: «El animal nació el …». */
  limite?: { fecha: FechaPredio; mensaje: (fecha: string) => string } | null;
  /** El sexo vigente de cada animal, para madre y padre. */
  sexoDe?: (id: string) => 'hembra' | 'macho' | undefined;
  /** Si el medicamento está en el catálogo. */
  existeMedicamento?: (id: string) => boolean;
}

/**
 * Valida el valor nuevo escrito como en el registro original y lo devuelve en forma de texto de
 * corrección (sección 2).
 */
export function validarValor(entidad: EntidadCorregible, nombre: string, campo: CampoCorregible, escrito: string, ctx: ContextoValor): { ok: true; texto: string } | { ok: false; error: string } {
  const limpio = escrito.trim();
  if (limpio === '') return campo.vacio ? { ok: true, texto: '' } : { ok: false, error: `Escriba ${campo.etiqueta.toLowerCase()}` };

  switch (campo.tipo) {
    case 'numero': {
      const numero =
        entidad === 'produccion_leche' ? leerLitros(limpio) : nombre === 'peso' || nombre === 'peso_inicial' || nombre === 'peso_venta' ? leerPeso(limpio) : Number(limpio.replace(',', '.'));
      if (numero === null || Number.isNaN(numero)) {
        return { ok: false, error: entidad === 'produccion_leche' ? 'Escriba los litros, de 0 a 60, con un decimal como máximo' : 'El peso debe estar entre 1 y 1.500 kg, con un decimal como máximo' };
      }
      const error = campo.validar?.(numero);
      return error ? { ok: false, error } : { ok: true, texto: String(numero) };
    }
    case 'entero': {
      const numero = nombre === 'costo' ? leerCosto(limpio) : /^\d+$/.test(limpio) ? Number(limpio) : null;
      if (numero === null) return { ok: false, error: campo.validar?.(Number.NaN) ?? 'Escriba un número entero' };
      const error = campo.validar?.(numero);
      return error ? { ok: false, error } : { ok: true, texto: String(numero) };
    }
    case 'fecha': {
      if (!esFechaValida(limpio)) return { ok: false, error: 'Escriba una fecha válida' };
      if (limpio > ctx.hoy) return { ok: false, error: 'La fecha no puede ser posterior a hoy' };
      if (ctx.limite && limpio < ctx.limite.fecha) return { ok: false, error: ctx.limite.mensaje(formatearFecha(ctx.limite.fecha)) };
      return { ok: true, texto: limpio };
    }
    case 'texto':
      return campo.maximoTexto && limpio.length > campo.maximoTexto ? { ok: false, error: `Hasta ${campo.maximoTexto} caracteres` } : { ok: true, texto: limpio };
    case 'enum':
      return campo.opciones?.some(([v]) => v === limpio) ? { ok: true, texto: limpio } : { ok: false, error: `Elija ${campo.etiqueta.toLowerCase()}` };
    case 'booleano':
      return limpio === 'true' || limpio === 'false' ? { ok: true, texto: limpio } : { ok: false, error: 'Elija sí o no' };
    case 'animal': {
      const sexo = ctx.sexoDe?.(limpio);
      if (!sexo) return { ok: false, error: 'El animal elegido no está en este teléfono' };
      if (campo.sexo && sexo !== campo.sexo) return { ok: false, error: campo.sexo === 'hembra' ? 'La madre debe ser una hembra' : 'El padre debe ser un macho' };
      return { ok: true, texto: limpio };
    }
    case 'medicamento':
      return ctx.existeMedicamento?.(limpio) ? { ok: true, texto: limpio } : { ok: false, error: 'Elija un medicamento del catálogo' };
  }
}

/** Los nombres con que se muestran los animales (chapeta) y los medicamentos de un valor corregido. */
export interface NombresDeReferencia {
  animales: ReadonlyMap<string, string>;
  medicamentos: ReadonlyMap<string, string>;
}

/** Un valor de corrección, legible: fechas, opciones, animales y medicamentos por su nombre (sección 6.4). */
export function valorLegible(campo: CampoCorregible | undefined, texto: string | null, nombres: NombresDeReferencia): string {
  if (texto === null || texto === '') return 'vacío';
  if (!campo) return texto;
  const valor = desdeTexto(campo, texto);
  switch (campo.tipo) {
    case 'fecha':
      return formatearFecha(String(valor));
    case 'enum':
      return campo.opciones?.find(([v]) => v === valor)?.[1] ?? String(valor);
    case 'booleano':
      return valor ? 'Sí' : 'No';
    case 'animal':
      return nombres.animales.get(String(valor)) ?? 'un animal que no está en el teléfono';
    case 'medicamento':
      return nombres.medicamentos.get(String(valor)) ?? 'un medicamento que no está en el teléfono';
    case 'numero':
    case 'entero':
      return Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 2 });
    default:
      return String(valor);
  }
}
