/**
 * Destino productivo: vigente, historial y validación de un cambio (RF-18, RF-19, CU-12).
 * Especificación: docs/tecnica/19-destino-productivo.md, secciones 2 y 4.1
 */
import { formatearFecha } from './fechas';
import { DESTINOS, type Destino, type DestinoProductivo, type FechaPredio } from './tipos';

/** El destino en el lenguaje del predio (RF-18). */
export const NOMBRE_DESTINO: Record<Destino, string> = {
  reproductor: 'Reproductor',
  reproductora: 'Reproductora',
  leche: 'Producción de leche',
  ceba: 'Ceba',
  venta: 'Venta',
  sacrificio: 'Sacrificio',
};

type RegistroDestino = Pick<DestinoProductivo, 'id' | 'destino' | 'desde'>;

/** Del más reciente al más antiguo: por fecha desde y, a igual fecha, por el registrado después. */
function delMasReciente(a: RegistroDestino, b: RegistroDestino): number {
  return a.desde !== b.desde ? (a.desde < b.desde ? 1 : -1) : a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/** El destino vigente: el más reciente (sección 2). */
export function destinoVigente<T extends RegistroDestino>(registros: readonly T[]): T | null {
  return [...registros].sort(delMasReciente)[0] ?? null;
}

/**
 * El historial, del más reciente al más antiguo. Cada entrada lleva el destino que reemplazó; la más
 * antigua no reemplazó a ninguno: es la asignación inicial (CU-12, 3a).
 */
export function historialDestino<T extends RegistroDestino>(registros: readonly T[]): { registro: T; anterior: T | null }[] {
  const ordenados = [...registros].sort(delMasReciente);
  return ordenados.map((registro, i) => ({ registro, anterior: ordenados[i + 1] ?? null }));
}

export interface FormularioDestino {
  destino: Destino | null;
  desde: FechaPredio;
}

/** Lo que la validación necesita saber del animal (sección 4.1). */
export interface ContextoDestino {
  vigente: RegistroDestino | null;
  retirado: boolean;
  /** Fecha de ingreso, o de nacimiento si nació en el predio; null si no se conoce. */
  llegada: FechaPredio | null;
}

export type ErroresDestino = Partial<Record<'destino' | 'desde' | 'animal', string>>;

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Que exista: «2026-02-30» no es una fecha, aunque Date la convierta en el 2 de marzo (PU-20). */
function esFechaValida(texto: string): boolean {
  if (!FORMATO_FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

/** Las seis reglas de la sección 4.1; devuelve todos los errores juntos. */
export function validarCambioDestino(
  f: FormularioDestino,
  contexto: ContextoDestino,
  hoy: FechaPredio,
): { ok: true; destino: Destino; desde: FechaPredio } | { ok: false; errores: ErroresDestino } {
  const errores: ErroresDestino = {};
  if (contexto.retirado) errores.animal = 'Este animal salió del predio';

  if (!f.destino || !DESTINOS.includes(f.destino)) errores.destino = 'Elija el destino';
  else if (contexto.vigente?.destino === f.destino) errores.destino = 'Ya tiene ese destino';

  if (!esFechaValida(f.desde)) errores.desde = 'Escriba una fecha válida';
  else if (f.desde > hoy) errores.desde = 'La fecha no puede ser posterior a hoy';
  else if (contexto.vigente && f.desde < contexto.vigente.desde) {
    errores.desde = `Debe ser desde el ${formatearFecha(contexto.vigente.desde)} o después, la fecha del destino actual`;
  } else if (contexto.llegada && f.desde < contexto.llegada) {
    errores.desde = `El animal llegó al predio el ${formatearFecha(contexto.llegada)}`;
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, destino: f.destino!, desde: f.desde };
}
