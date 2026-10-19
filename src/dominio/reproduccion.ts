/**
 * Parto y control reproductivo: validación, parto cercano, intervalos y descendencia (RF-16, RF-17).
 * Especificación: docs/tecnica/25-parto-y-control-reproductivo.md, secciones 2, 4 y 8
 */
import { formatearFecha } from './fechas';
import { diasEntre } from './repeticion';
import type { FechaPredio, Parto, ResultadoParto, Uuid } from './tipos';

export const NOMBRE_RESULTADO: Record<ResultadoParto, string> = {
  cria_viva: 'Cría viva',
  cria_nacida_muerta: 'Cría nacida muerta',
  aborto: 'Aborto',
};

/** Menos días que estos entre dos partos de la vaca piden confirmación (sección 4.2). */
export const DIAS_PARTO_CERCANO = 240;
export const LARGO_OBSERVACION = 300;
/** Días de un mes promedio: 365,25 / 12 (sección 8). */
export const DIAS_POR_MES = 30.44;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(texto: string): boolean {
  if (!FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

export interface FormularioParto {
  resultado: ResultadoParto | null;
  fecha: string;
  observacion: string;
}

export interface ContextoParto {
  esHembra: boolean;
  retirada: boolean;
  nacimientoVaca: FechaPredio | null;
}

export type ErroresParto = Partial<Record<'resultado' | 'fecha' | 'observacion' | 'vaca', string>>;

/** Las reglas del parto en sí (sección 4.1); las de la cría son las del registro de animales. */
export function validarParto(
  f: FormularioParto,
  contexto: ContextoParto,
  hoy: FechaPredio,
): { ok: true; resultado: ResultadoParto; fecha: FechaPredio; observacion: string | null } | { ok: false; errores: ErroresParto } {
  const errores: ErroresParto = {};
  if (!contexto.esHembra) errores.vaca = 'Solo se registran partos de una hembra';
  else if (contexto.retirada) errores.vaca = 'Esta vaca salió del predio';
  if (!f.resultado) errores.resultado = 'Elija el resultado del parto';
  if (!esFechaValida(f.fecha)) errores.fecha = 'Escriba una fecha válida';
  else if (f.fecha > hoy) errores.fecha = 'La fecha no puede ser posterior a hoy';
  else if (contexto.nacimientoVaca && f.fecha < contexto.nacimientoVaca) errores.fecha = `La vaca nació el ${formatearFecha(contexto.nacimientoVaca)}`;
  const observacion = f.observacion.trim();
  if (observacion.length > LARGO_OBSERVACION) errores.observacion = `Hasta ${LARGO_OBSERVACION} caracteres`;
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, resultado: f.resultado!, fecha: f.fecha, observacion: observacion === '' ? null : observacion };
}

/** El parto de la vaca más cercano a la fecha, si está a menos de 240 días, antes o después (sección 4.2). */
export function partoCercano<T extends Pick<Parto, 'fecha'> & { id: Uuid }>(partos: readonly T[], fecha: FechaPredio): (T & { dias: number }) | null {
  const cercanos = partos
    .map((p) => ({ ...p, dias: diasEntre(p.fecha, fecha) }))
    .filter((p) => p.dias < DIAS_PARTO_CERCANO)
    .sort((a, b) => a.dias - b.dias || (a.id < b.id ? 1 : -1));
  return cercanos[0] ?? null;
}

/** Del más antiguo al más reciente; a igual fecha, por su registro (sección 8). */
function cronologico(a: Pick<Parto, 'fecha'> & { id: Uuid }, b: Pick<Parto, 'fecha'> & { id: Uuid }): number {
  return a.fecha !== b.fecha ? (a.fecha < b.fecha ? -1 : 1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export interface TramoReproductivo<T> {
  parto: T;
  /** Días desde el parto anterior; null en el primero. */
  intervaloDias: number | null;
  intervaloMeses: number | null;
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/**
 * El control reproductivo (CU-11): los partos en orden con el intervalo desde el anterior, contando
 * todos los resultados, y el promedio de los intervalos (sección 8).
 */
export function controlReproductivo<T extends Pick<Parto, 'fecha' | 'resultado' | 'cria_id'> & { id: Uuid }>(partos: readonly T[]) {
  const ordenados = [...partos].sort(cronologico);
  const tramos: TramoReproductivo<T>[] = ordenados.map((parto, i) => {
    const previo = i > 0 ? ordenados[i - 1]! : null;
    const dias = previo ? diasEntre(previo.fecha, parto.fecha) : null;
    return { parto, intervaloDias: dias, intervaloMeses: dias === null ? null : redondear(dias / DIAS_POR_MES) };
  });
  const intervalos = tramos.flatMap((t) => (t.intervaloDias === null ? [] : [t.intervaloDias]));
  return {
    total: ordenados.length,
    tramos,
    promedioMeses: intervalos.length === 0 ? null : redondear(intervalos.reduce((s, d) => s + d, 0) / intervalos.length / DIAS_POR_MES),
    /** Solo las crías nacidas vivas (3.8.8). */
    descendencia: ordenados.filter((p) => p.resultado === 'cria_viva' && p.cria_id !== null).map((p) => p.cria_id!),
  };
}
