/**
 * Consulta de la producción de una vaca por periodos (RF-11, CU-07 pasos 1 a 4, HU-04.2).
 * Especificación: docs/tecnica/23-consulta-de-produccion.md
 */
import { consulta } from '../../datos/repositorio';
import { animalesVigentes, vigentes } from '../../datos/vigentes';
import { destinoVigente } from '../../dominio/destino';
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
