/**
 * Fecha calendario del predio (apartado 3.8.6): el día en Colombia al que pertenece un instante.
 * El ordeño de las 2 de la madrugada pertenece a ese día, no al anterior ni al siguiente según el
 * desfase con el tiempo universal.
 */
import type { FechaPredio } from './tipos';

const ZONA_DEL_PREDIO = 'America/Bogota';
// en-CA produce el formato AAAA-MM-DD.
const formato = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_DEL_PREDIO, year: 'numeric', month: '2-digit', day: '2-digit' });

export function fechaDelPredio(instante: Date | string | number = new Date()): FechaPredio {
  return formato.format(new Date(instante));
}

// La fecha del predio es un día calendario, no un instante: se interpreta en UTC para que ninguna
// zona horaria la corra al día anterior.
const formatoLargo = new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });

/** «2021-03-04» → «4 de marzo de 2021». */
export function formatearFecha(fecha: FechaPredio): string {
  return formatoLargo.format(new Date(`${fecha}T00:00:00Z`));
}
