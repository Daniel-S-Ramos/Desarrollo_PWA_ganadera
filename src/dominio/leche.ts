/**
 * Producción de leche: litros, promedio y comparación (RF-10, HU-04, apartado 3.8.6).
 * Especificación: docs/tecnica/22-ronda-de-ordeno.md, sección 6. El valor vigente de los litros, adelantado
 * en el paso 3.5, pasó a la regla general (docs/tecnica/26-correccion-y-anulacion.md, sección 6).
 */
import type { FechaPredio } from './tipos';

export const LITROS_MAXIMO = 60;
/** Si el parámetro dias_promedio_produccion no está en el teléfono (sección 6.2). */
export const DIAS_PROMEDIO_POR_DEFECTO = 7;

const LITROS = /^\d{1,2}([.,]\d)?$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Los litros escritos, de 0 a 60 con un decimal como máximo; null si no es un valor válido. */
export function leerLitros(texto: string): number | null {
  const limpio = texto.trim();
  if (!LITROS.test(limpio)) return null;
  const litros = Number(limpio.replace(',', '.'));
  return litros <= LITROS_MAXIMO ? litros : null;
}

function esFechaValida(texto: string): boolean {
  if (!FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

export type ErroresOrdeno = Partial<Record<'litros' | 'fecha' | 'animal', string>>;

/** Las reglas de la sección 6.1, todos los errores juntos. */
export function validarOrdeno(texto: string, fecha: string, hoy: FechaPredio): { ok: true; litros: number } | { ok: false; errores: ErroresOrdeno } {
  const errores: ErroresOrdeno = {};
  const litros = leerLitros(texto);
  if (texto.trim() === '') errores.litros = 'Escriba los litros';
  else if (litros === null) errores.litros = 'Escriba los litros, de 0 a 60, con un decimal como máximo';
  if (!esFechaValida(fecha)) errores.fecha = 'Escriba una fecha válida';
  else if (fecha > hoy) errores.fecha = 'La fecha no puede ser posterior a hoy';
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, litros: litros! };
}

// ---------------------------------------------------------------------------
// Promedio y comparación: secciones 6.2 y 6.3
// ---------------------------------------------------------------------------

/** La fecha `dias` días antes. */
export function restarDias(fecha: FechaPredio, dias: number): FechaPredio {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

/**
 * El promedio de los `dias` días anteriores a la fecha, sin incluirla, solo sobre los días con
 * registro: un día sin anotar no lo altera, un cero sí (apartado 3.8.6). null si no hay registros.
 */
export function promedioReciente(registros: readonly { fecha: FechaPredio; litros: number }[], fecha: FechaPredio, dias: number): { promedio: number; registros: number } | null {
  const desde = restarDias(fecha, dias);
  const enVentana = registros.filter((r) => r.fecha >= desde && r.fecha < fecha);
  if (enVentana.length === 0) return null;
  return { promedio: enVentana.reduce((suma, r) => suma + r.litros, 0) / enVentana.length, registros: enVentana.length };
}

export interface Comparacion {
  /** «2,5 litros menos que su promedio», «Igual a su promedio». */
  diferencia: string;
  palabras: 'Similar a su promedio' | 'Por debajo de su promedio' | 'Por encima de su promedio' | 'Muy por debajo de su promedio';
  /** Muy por debajo se presenta como aviso de atención, sin bloquear. */
  atencion: boolean;
}

export const UMBRAL_SIMILAR = 0.1;
/**
 * Variación atípica de la producción (Tabla 30): el porcentaje por debajo del promedio desde el cual la
 * vaca se marca «Muy por debajo». Lo fijó el propietario el 2026-10-24 en 35 %; vive en el parámetro
 * `variacion_atipica_leche` y este valor solo se usa si el parámetro aún no está en el teléfono.
 */
export const VARIACION_ATIPICA_POR_DEFECTO = 35;

/** «14,5»: la coma decimal de Colombia. */
export function formatearLitros(valor: number): string {
  return valor.toLocaleString('es-CO', { maximumFractionDigits: 1 });
}

/** La diferencia con el promedio en litros y en palabras (sección 6.3). Umbrales de presentación. */
export function compararConPromedio(litros: number, promedio: number, variacionAtipica: number = VARIACION_ATIPICA_POR_DEFECTO): Comparacion {
  const delta = Math.round((litros - promedio) * 10) / 10;
  const cantidad = `${formatearLitros(Math.abs(delta))} ${Math.abs(delta) === 1 ? 'litro' : 'litros'}`;
  const diferencia = delta === 0 ? 'Igual a su promedio' : `${cantidad} ${delta < 0 ? 'menos' : 'más'} que su promedio`;

  if (promedio === 0) return { diferencia, palabras: litros > 0 ? 'Por encima de su promedio' : 'Similar a su promedio', atencion: false };
  const proporcion = (litros - promedio) / promedio;
  if (Math.abs(proporcion) <= UMBRAL_SIMILAR) return { diferencia, palabras: 'Similar a su promedio', atencion: false };
  // «Desde el 35 %»: el porcentaje exacto ya cuenta (redondeado para no depender de los decimales binarios).
  if (Math.round(proporcion * 1000) / 10 <= -variacionAtipica) return { diferencia, palabras: 'Muy por debajo de su promedio', atencion: true };
  if (proporcion < 0) return { diferencia, palabras: 'Por debajo de su promedio', atencion: false };
  return { diferencia, palabras: 'Por encima de su promedio', atencion: false };
}
