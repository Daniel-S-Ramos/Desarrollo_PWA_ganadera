/**
 * Pesaje: validación, peso anterior, variación atípica, serie y ganancia (RF-13, RF-14, CU-08, CU-09).
 * Especificación: docs/tecnica/24-pesaje-y-evolucion.md, secciones 4 a 8
 */
import { formatearFecha } from './fechas';
import { nombrePesoInicial, origenDe } from './origen';
import { diasEntre } from './repeticion';
import type { Animal, FechaPredio, MetodoPesaje, Pesaje, Uuid } from './tipos';

export const PESO_MINIMO = 1;
export const PESO_MAXIMO = 1500;
/** Umbrales de la variación atípica, fijados por el autor el 2026-10-15 (sección 6). */
export const GANANCIA_DIARIA_MAXIMA = 2;
export const GANANCIA_DIARIA_MINIMA = -2;
export const VARIACION_MISMO_DIA = 0.1;

export const NOMBRE_METODO: Record<MetodoPesaje, string> = { cinta: 'Cinta bovinométrica', bascula: 'Báscula' };

const PESO = /^\d{1,4}([.,]\d)?$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(texto: string): boolean {
  if (!FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

/** El peso escrito, de 1 a 1.500 kg con un decimal como máximo; null si no es válido. */
export function leerPeso(texto: string): number | null {
  const limpio = texto.trim();
  if (!PESO.test(limpio)) return null;
  const peso = Number(limpio.replace(',', '.'));
  return peso >= PESO_MINIMO && peso <= PESO_MAXIMO ? peso : null;
}

export interface FormularioPesaje {
  peso: string;
  metodo: MetodoPesaje | null;
  fecha: string;
}

export interface ContextoPesaje {
  /** Ingreso si fue comprado, nacimiento si nació en el predio; null si no se conoce. */
  llegada: FechaPredio | null;
  retirado: boolean;
}

export type ErroresPesaje = Partial<Record<'peso' | 'metodo' | 'fecha' | 'animal', string>>;

/** Las reglas de la sección 4; todos los errores juntos. */
export function validarPesaje(
  f: FormularioPesaje,
  contexto: ContextoPesaje,
  hoy: FechaPredio,
): { ok: true; peso: number; metodo: MetodoPesaje; fecha: FechaPredio } | { ok: false; errores: ErroresPesaje } {
  const errores: ErroresPesaje = {};
  if (contexto.retirado) errores.animal = 'Este animal salió del predio';
  const peso = leerPeso(f.peso);
  if (f.peso.trim() === '') errores.peso = 'Escriba el peso';
  else if (peso === null) errores.peso = 'El peso debe estar entre 1 y 1.500 kg, con un decimal como máximo';
  if (!f.metodo) errores.metodo = 'Elija cómo se pesó';
  if (!esFechaValida(f.fecha)) errores.fecha = 'Escriba una fecha válida';
  else if (f.fecha > hoy) errores.fecha = 'La fecha no puede ser posterior a hoy';
  else if (contexto.llegada && f.fecha < contexto.llegada) errores.fecha = `El animal llegó al predio el ${formatearFecha(contexto.llegada)}`;
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, peso: peso!, metodo: f.metodo!, fecha: f.fecha };
}

// ---------------------------------------------------------------------------
// La serie: el peso inicial y los pesajes (secciones 6 y 7)
// ---------------------------------------------------------------------------

/** Un punto de la serie: un pesaje o el peso de compra o al nacer. */
export interface PuntoPeso {
  /** El id del pesaje; null para el peso inicial. */
  id: Uuid | null;
  fecha: FechaPredio | null;
  kg: number;
  /** null para el peso inicial, que no tiene método. */
  metodo: MetodoPesaje | null;
  etiqueta: 'Pesaje' | 'Peso de compra' | 'Peso al nacer' | 'Peso inicial';
  autor_id: Uuid | null;
}

type AnimalConPeso = Pick<Animal, 'peso_inicial' | 'fecha_ingreso' | 'fecha_nacimiento'>;
type PesajeSerie = Pick<Pesaje, 'id' | 'fecha' | 'peso' | 'metodo' | 'autor_id'>;

/** El peso inicial como punto de la serie, o null si el animal no tiene. */
export function puntoInicial(animal: AnimalConPeso): PuntoPeso | null {
  if (animal.peso_inicial === null) return null;
  const comprado = origenDe(animal) === 'comprado';
  const nombre = nombrePesoInicial(comprado ? 'comprado' : 'nacido');
  return {
    id: null,
    fecha: comprado ? animal.fecha_ingreso : animal.fecha_nacimiento,
    kg: animal.peso_inicial,
    metodo: null,
    etiqueta: nombre === 'peso de compra' ? 'Peso de compra' : 'Peso al nacer',
    autor_id: null,
  };
}

/** Los pesajes del más antiguo al más reciente; a igual fecha, el registrado antes primero. */
function cronologico(a: PesajeSerie, b: PesajeSerie): number {
  return a.fecha !== b.fecha ? (a.fecha < b.fecha ? -1 : 1) : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** La serie completa: el peso inicial primero y los pesajes en orden (sección 7). */
export function serieDePeso(animal: AnimalConPeso, pesajes: readonly PesajeSerie[]): PuntoPeso[] {
  const inicial = puntoInicial(animal);
  const puntos = [...pesajes].sort(cronologico).map(
    (p): PuntoPeso => ({ id: p.id, fecha: p.fecha, kg: p.peso, metodo: p.metodo, etiqueta: 'Pesaje', autor_id: p.autor_id }),
  );
  return inicial ? [inicial, ...puntos] : puntos;
}

/**
 * El último peso anterior o del mismo día que la fecha: el pesaje más reciente (a igual fecha, el
 * registrado después) o, sin pesajes, el peso inicial (sección 6).
 */
export function pesoAnterior(animal: AnimalConPeso, pesajes: readonly PesajeSerie[], fecha: FechaPredio): PuntoPeso | null {
  const previos = serieDePeso(animal, pesajes.filter((p) => p.fecha <= fecha)).filter((p) => p.id !== null);
  const inicial = puntoInicial(animal);
  // El peso inicial tampoco puede ser de una fecha posterior (PE-29: un pesaje del 30 de septiembre se
  // comparaba con la compra del 1 de octubre, «(1 día)»).
  return previos.at(-1) ?? (inicial && (inicial.fecha === null || inicial.fecha <= fecha) ? inicial : null);
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}

export interface Comparacion {
  diferencia: number;
  dias: number;
  /** null el mismo día. */
  gananciaDiaria: number | null;
  atipica: boolean;
}

/**
 * La diferencia con el peso anterior y si es atípica (sección 6): más de 2,0 o menos de −2,0 kg/día, o
 * más de 10 % el mismo día. null si no hay peso anterior con fecha.
 */
export function compararConAnterior(peso: number, fecha: FechaPredio, anterior: PuntoPeso | null): Comparacion | null {
  if (!anterior || anterior.fecha === null) return null;
  const diferencia = redondear(peso - anterior.kg);
  const dias = diasEntre(anterior.fecha, fecha);
  if (dias === 0) return { diferencia, dias, gananciaDiaria: null, atipica: Math.abs(peso - anterior.kg) > anterior.kg * VARIACION_MISMO_DIA };
  const exacta = (peso - anterior.kg) / dias;
  return { diferencia, dias, gananciaDiaria: redondear(exacta), atipica: exacta > GANANCIA_DIARIA_MAXIMA || exacta < GANANCIA_DIARIA_MINIMA };
}

/** «−3» con el signo menos tipográfico, «+10», «0». */
function conSigno(valor: number): string {
  return valor === 0 ? '0' : `${valor > 0 ? '+' : '−'}${formatearKg(Math.abs(valor))}`;
}

/**
 * «Frente al peso de compra del 1 de octubre de 2026 (1.000 kg): +10 kg en 10 días, 1 kg por día». Nombra
 * con qué se compara y cuánto pesaba: «10 kg más que el 1 de octubre» no se entendía (PE-29).
 */
export function describirComparacion(c: Comparacion, anterior: PuntoPeso): string {
  const referencia = anterior.id === null ? anterior.etiqueta.toLowerCase() : 'pesaje anterior';
  const base = `Frente al ${referencia} del ${formatearFecha(anterior.fecha!)} (${formatearKg(anterior.kg)} kg): ${conSigno(c.diferencia)} kg`;
  if (c.gananciaDiaria === null) return `${base}, el mismo día`;
  return `${base} en ${c.dias === 1 ? '1 día' : `${c.dias} días`}, ${conSigno(c.gananciaDiaria)} kg por día`;
}

/** 412,5: la coma decimal de Colombia. */
export function formatearKg(valor: number): string {
  return valor.toLocaleString('es-CO', { maximumFractionDigits: 1 });
}

export interface TramoPeso {
  punto: PuntoPeso;
  /** Frente al punto anterior; null en el primero. */
  cambio: number | null;
  dias: number | null;
  gananciaDiaria: number | null;
  metodosDistintos: boolean;
  bajoMeta: boolean;
}

/** Cada punto con su cambio frente al anterior (sección 7); `meta` es la ganancia diaria esperada, si existe. */
export function tramos(serie: readonly PuntoPeso[], meta: number | null): TramoPeso[] {
  return serie.map((punto, i) => {
    const previo = i > 0 ? serie[i - 1]! : null;
    if (!previo) return { punto, cambio: null, dias: null, gananciaDiaria: null, metodosDistintos: false, bajoMeta: false };
    const dias = previo.fecha && punto.fecha ? diasEntre(previo.fecha, punto.fecha) : null;
    const cambio = redondear(punto.kg - previo.kg);
    const gananciaDiaria = dias ? redondear((punto.kg - previo.kg) / dias) : null;
    return {
      punto,
      cambio,
      dias,
      gananciaDiaria,
      metodosDistintos: previo.metodo !== null && punto.metodo !== null && previo.metodo !== punto.metodo,
      bajoMeta: meta !== null && gananciaDiaria !== null && gananciaDiaria < meta,
    };
  });
}

/** Ganancia total y diaria promedio desde el primer punto con fecha hasta el último (sección 7). */
export function resumenPeso(serie: readonly PuntoPeso[]): { total: number; dias: number; gananciaDiaria: number | null } | null {
  const conFecha = serie.filter((p) => p.fecha !== null);
  if (conFecha.length < 2) return null;
  const [primero, ultimo] = [conFecha[0]!, conFecha.at(-1)!];
  const dias = diasEntre(primero.fecha!, ultimo.fecha!);
  const total = redondear(ultimo.kg - primero.kg);
  return { total, dias, gananciaDiaria: dias === 0 ? null : redondear((ultimo.kg - primero.kg) / dias) };
}
