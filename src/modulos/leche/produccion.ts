/**
 * Consulta de la producción de una vaca por periodos (RF-11, CU-07 pasos 1 a 4, HU-04.2).
 * Especificación: docs/tecnica/23-consulta-de-produccion.md
 */
import { consulta } from '../../datos/repositorio';
import { animalesVigentes, vigentes } from '../../datos/vigentes';
import { destinoVigente } from '../../dominio/destino';
import { compararConPromedio, promedioReciente, type Comparacion } from '../../dominio/leche';
import { agregar, diasEntreInclusive, inicioDeSemana, sumarDias, type Agregacion, type FilaPeriodo, type Periodo } from '../../dominio/periodos';
import type { FechaPredio, Uuid } from '../../dominio/tipos';
import { compararChapetas } from '../consulta/listado';

export interface VacaConsultable {
  id: Uuid;
  codigo_chapeta: string;
  retirada: boolean;
}

/** Hembras con algún registro de leche o el destino vigente leche, en orden de chapeta (sección 3). */
export async function vacasConsultables(): Promise<VacaConsultable[]> {
  const [animales, destinos, registros, salidas] = await Promise.all([
    animalesVigentes(),
    consulta.destino_productivo.toArray().then((r) => vigentes('destino_productivo', r)),
    consulta.produccion_leche.toArray().then((r) => vigentes('produccion_leche', r)),
    consulta.salida.toArray(),
  ]);
  const conRegistros = new Set(registros.map((r) => r.animal_id));
  const retiradas = new Set(salidas.map((s) => s.animal_id));
  return animales
    .filter((a) => a.sexo === 'hembra' && (conRegistros.has(a.id) || destinoVigente(destinos.filter((d) => d.animal_id === a.id))?.destino === 'leche'))
    .sort((a, b) => compararChapetas(a.codigo_chapeta, b.codigo_chapeta))
    .map((a) => ({ id: a.id, codigo_chapeta: a.codigo_chapeta, retirada: retiradas.has(a.id) }));
}

/** Los registros de la vaca con sus litros vigentes, sin anulados (documento técnico 26, sección 6.3). */
export async function registrosDe(animalId: Uuid): Promise<{ fecha: FechaPredio; litros: number }[]> {
  const registros = await vigentes('produccion_leche', await consulta.produccion_leche.where('animal_id').equals(animalId).toArray());
  return registros.map((r) => ({ fecha: r.fecha, litros: r.litros }));
}

export interface DiaDeVaca {
  fecha: FechaPredio;
  /** Litros vigentes del día; null si no hay registro (un cero registrado es 0, apartado 3.8.6). */
  litros: number | null;
  /** Frente a su promedio de los días anteriores, como en la ronda (documento 22, sección 6). */
  comparacion: Comparacion | null;
  promedio: { promedio: number; registros: number } | null;
  /** El ordeño más reciente antes de este día, para ir a él cuando el día no tiene registro. */
  anterior: { fecha: FechaPredio; litros: number } | null;
  /** El primero después de este día, para avanzar hasta él. */
  siguiente: { fecha: FechaPredio; litros: number } | null;
}

/**
 * La producción de un día de la vaca (vista diaria, ajustada en PE-34): un día a la vez, con su comparación
 * frente al promedio y los ordeños más cercanos antes y después.
 */
export function diaDeVaca(registros: readonly { fecha: FechaPredio; litros: number }[], fecha: FechaPredio, diasPromedio: number): DiaDeVaca {
  const delDia = registros.find((r) => r.fecha === fecha);
  const promedio = promedioReciente(registros, fecha, diasPromedio);
  const ordenados = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const anterior = [...ordenados].reverse().find((r) => r.fecha < fecha) ?? null;
  const siguiente = ordenados.find((r) => r.fecha > fecha) ?? null;
  return {
    fecha,
    litros: delDia ? delDia.litros : null,
    promedio,
    comparacion: delDia && promedio ? compararConPromedio(delDia.litros, promedio.promedio) : null,
    anterior: anterior && { fecha: anterior.fecha, litros: anterior.litros },
    siguiente: siguiente && { fecha: siguiente.fecha, litros: siguiente.litros },
  };
}

export interface PeriodoDeVaca {
  periodo: Periodo;
  /** Total, promedio por día registrado y días registrados del periodo (documento 23, sección 5). */
  resumen: FilaPeriodo;
  /** Cada día del periodo hasta hoy, del más reciente al más antiguo; null si no tiene registro. */
  dias: { fecha: FechaPredio; litros: number | null }[];
  /** El ordeño más reciente antes del periodo y el primero después, para ir a ellos. */
  anterior: { fecha: FechaPredio; litros: number } | null;
  siguiente: { fecha: FechaPredio; litros: number } | null;
}

/** Una semana o un mes de la vaca, de a uno a la vez (ajuste de PE-34), con todos sus días. */
export function periodoDeVaca(registros: readonly { fecha: FechaPredio; litros: number }[], periodo: Periodo, hoy: FechaPredio): PeriodoDeVaca {
  const [resumen] = agregar([periodo], registros, hoy);
  const porFecha = new Map(registros.map((r) => [r.fecha, r.litros]));
  const dias: PeriodoDeVaca['dias'] = [];
  for (let f = periodo.fin < hoy ? periodo.fin : hoy; f >= periodo.inicio; f = sumarDias(f, -1)) dias.push({ fecha: f, litros: porFecha.get(f) ?? null });
  const ordenados = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const anterior = [...ordenados].reverse().find((r) => r.fecha < periodo.inicio) ?? null;
  const siguiente = ordenados.find((r) => r.fecha > periodo.fin) ?? null;
  return {
    periodo,
    resumen: resumen!,
    dias,
    anterior: anterior && { fecha: anterior.fecha, litros: anterior.litros },
    siguiente: siguiente && { fecha: siguiente.fecha, litros: siguiente.litros },
  };
}

/** Cuántos días, semanas o meses hacia atrás está el periodo que contiene la fecha (0 es el actual). */
export function desplazamientoHasta(agregacion: Agregacion, fecha: FechaPredio, hoy: FechaPredio): number {
  if (agregacion === 'diaria') return 1 - diasEntreInclusive(fecha, hoy);
  if (agregacion === 'semanal') return (1 - diasEntreInclusive(inicioDeSemana(fecha), inicioDeSemana(hoy))) / 7;
  const meses = (f: FechaPredio) => Number(f.slice(0, 4)) * 12 + Number(f.slice(5, 7));
  return meses(fecha) - meses(hoy);
}
