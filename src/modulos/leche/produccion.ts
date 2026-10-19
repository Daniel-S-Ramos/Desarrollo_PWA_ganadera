/**
 * Consulta de la producción de una vaca por periodos (RF-11, CU-07 pasos 1 a 4, HU-04.2).
 * Especificación: docs/tecnica/23-consulta-de-produccion.md
 */
import { consulta } from '../../datos/repositorio';
import { animalesVigentes, vigentes } from '../../datos/vigentes';
import { destinoVigente } from '../../dominio/destino';
import { compararConPromedio, promedioReciente, type Comparacion } from '../../dominio/leche';
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
