/**
 * Lo que resume la pantalla de inicio: el saludo, la producción (propietario) y el avance de la ronda
 * (trabajador). Rediseño del inicio aprobado por el autor el 2026-10-22.
 */
import { consulta } from '../../datos/repositorio';
import type { FechaPredio, RegistroLocal } from '../../dominio/tipos';
import { soloVigentes } from '../../dominio/vigente';

/** «Buenos días» hasta el mediodía, «Buenas tardes» hasta las 7 de la noche y «Buenas noches» después. */
export function saludo(hora: number): string {
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** El primer nombre, para el saludo: «José Ramos» → «José». */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

export interface ResumenProduccion {
  /** El día resumido: hoy, o el último con ordeños. */
  fecha: FechaPredio;
  esHoy: boolean;
  litros: number;
}

/**
 * Los litros de hoy o, si hoy no hay ordeños, los del último día que los tuvo; null si no hay ninguno.
 * Recibe los ordeños ya vigentes, sin anulados (documento técnico 26, sección 6.3).
 */
export function calcularResumenProduccion(
  ordenos: readonly Pick<RegistroLocal<'produccion_leche'>, 'fecha' | 'litros'>[],
  hoy: FechaPredio,
): ResumenProduccion | null {
  const hastaHoy = ordenos.filter((o) => o.fecha <= hoy);
  if (hastaHoy.length === 0) return null;
  const fecha = hastaHoy.reduce((max, o) => (o.fecha > max ? o.fecha : max), hastaHoy[0]!.fecha);
  const delDia = hastaHoy.filter((o) => o.fecha === fecha);
  const litros = Math.round(delDia.reduce((total, o) => total + o.litros, 0) * 10) / 10;
  return { fecha, esHoy: fecha === hoy, litros };
}

/** Lee el teléfono en una sola espera y resume (documento 26, sección 10.7). */
export async function cargarResumenProduccion(hoy: FechaPredio): Promise<ResumenProduccion | null> {
  const [ordenos, correcciones] = await Promise.all([consulta.produccion_leche.toArray(), consulta.correccion.toArray()]);
  return calcularResumenProduccion(soloVigentes('produccion_leche', ordenos, correcciones), hoy);
}

/** Cuántas vacas de la ronda tienen ordeño en la fecha y cuántas hay. */
export function avanceDeRonda(vacas: readonly { existente: unknown }[]): { registradas: number; total: number } {
  return { registradas: vacas.filter((v) => v.existente !== null).length, total: vacas.length };
}
