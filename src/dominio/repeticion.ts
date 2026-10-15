/**
 * Advertencia por repetición de un medicamento (RF-09, HU-09, CU-04 5a).
 * Especificación: docs/tecnica/21-advertencia-por-repeticion.md, secciones 2 y 3
 */
import type { FechaPredio, Uuid } from './tipos';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Días de calendario entre dos fechas del predio, sin signo (sección 2). */
export function diasEntre(a: FechaPredio, b: FechaPredio): number {
  return Math.round(Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / MS_POR_DIA);
}

/** «hoy», «ayer», «hace N días», contado desde hoy (sección 3). */
export function describirHace(fecha: FechaPredio, hoy: FechaPredio): string {
  const dias = diasEntre(fecha, hoy);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

type Aplicacion = { id: Uuid; fecha: FechaPredio };

export type Repeticion<T extends Aplicacion> =
  | { nivel: 'ninguno' }
  | { nivel: 'informacion'; aplicacion: T }
  /** posterior: la otra aplicación es de una fecha posterior a la que se registra. */
  | { nivel: 'advertencia'; aplicacion: T; posterior: boolean };

/** La más reciente primero: por fecha y, a igual fecha, la registrada después (mayor UUID v7). */
function masReciente(a: Aplicacion, b: Aplicacion): number {
  return a.fecha !== b.fecha ? (a.fecha < b.fecha ? 1 : -1) : a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/**
 * Compara la fecha nueva con las aplicaciones del mismo medicamento al mismo animal (sección 2).
 * Advierte si alguna está a menos de `intervalo` días, antes o después; si no, informa la más reciente.
 */
export function evaluarRepeticion<T extends Aplicacion>(aplicaciones: readonly T[], fecha: FechaPredio, intervalo: number): Repeticion<T> {
  if (aplicaciones.length === 0) return { nivel: 'ninguno' };
  const cercanas = aplicaciones
    .filter((a) => diasEntre(a.fecha, fecha) < intervalo)
    // La más cercana; a igual distancia, la más reciente.
    .sort((a, b) => diasEntre(a.fecha, fecha) - diasEntre(b.fecha, fecha) || masReciente(a, b));
  const cercana = cercanas[0];
  if (cercana) return { nivel: 'advertencia', aplicacion: cercana, posterior: cercana.fecha > fecha };
  return { nivel: 'informacion', aplicacion: [...aplicaciones].sort(masReciente)[0]! };
}
