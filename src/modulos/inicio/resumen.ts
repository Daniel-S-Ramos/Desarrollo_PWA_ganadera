/**
 * Lo que resume la pantalla de inicio: el saludo, la producción (propietario) y el avance de la ronda
 * (trabajador). Rediseño del inicio aprobado por el autor el 2026-10-22.
 */
import { consulta } from '../../datos/repositorio';
import { sumarDias } from '../../dominio/periodos';
import type { FechaPredio, RegistroLocal } from '../../dominio/tipos';
import type { TipoDeRecordatorio } from '../recordatorios/recordatorios';
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
  /** Los litros de los 7 días que terminan en `fecha`, del más antiguo al más reciente (0 si no hubo ordeños): la altura de cada cantina. */
  serie: number[];
  /** Litros de `fecha` menos los del día anterior; null si el día anterior no tuvo ordeños. */
  diferencia: number | null;
}

/** Días de la mini gráfica de la tarjeta de producción. */
export const DIAS_SERIE = 7;

const redondear = (litros: number) => Math.round(litros * 10) / 10;

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
  const porDia = new Map<FechaPredio, number>();
  for (const o of hastaHoy) porDia.set(o.fecha, (porDia.get(o.fecha) ?? 0) + o.litros);
  const litros = redondear(porDia.get(fecha)!);
  const serie = Array.from({ length: DIAS_SERIE }, (_, i) => porDia.get(sumarDias(fecha, i - DIAS_SERIE + 1)) ?? 0);
  const anterior = porDia.get(sumarDias(fecha, -1));
  return { fecha, esHoy: fecha === hoy, litros, serie, diferencia: anterior === undefined ? null : redondear(litros - anterior) };
}

/** Nombre corto de cada tipo de recordatorio, en singular y plural, para el desglose de la tarjeta de pendientes. */
const NOMBRE_CORTO: Record<TipoDeRecordatorio, [string, string]> = {
  sin_registro_ordeno: ['ordeño', 'ordeños'],
  sin_pesaje_reciente: ['pesaje', 'pesajes'],
  produccion_bajo_promedio: ['leche baja', 'leche baja'],
  sin_registros_recientes: ['sin registros', 'sin registros'],
  sincronizacion_pendiente: ['envío', 'envíos'],
  chapeta_pendiente: ['chapeta', 'chapetas'],
};

/** «3 ordeños · 1 pesaje»: los dos grupos con más recordatorios, en el orden de los grupos si empatan. */
export function desglosePendientes(grupos: readonly { tipo: TipoDeRecordatorio; recordatorios: readonly unknown[] }[]): string {
  return [...grupos]
    .filter((g) => g.recordatorios.length > 0)
    .sort((a, b) => b.recordatorios.length - a.recordatorios.length)
    .slice(0, 2)
    .map((g) => `${g.recordatorios.length} ${NOMBRE_CORTO[g.tipo][g.recordatorios.length === 1 ? 0 : 1]}`)
    .join(' · ');
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
