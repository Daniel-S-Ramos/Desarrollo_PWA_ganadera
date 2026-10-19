/**
 * Comparación de la producción de leche entre vacas en un mismo periodo (RF-12, CU-07 pasos 5 y 6, HU-10).
 * Especificación: docs/tecnica/28-comparacion-entre-vacas.md
 *
 * Lee todas las tablas en una sola espera y arma la comparación en memoria (documento 26, sección 10.7).
 */
import { consulta } from '../../datos/repositorio';
import { destinoVigente } from '../../dominio/destino';
import { agregar, periodosDeVentana, TAMANO_VENTANA, type Periodo } from '../../dominio/periodos';
import type { FechaPredio, RegistroLocal, Uuid } from '../../dominio/tipos';
import { soloVigentes } from '../../dominio/vigente';
import { compararChapetas } from '../consulta/listado';

/** Día, semana o mes; el día es el de uso diario del propietario y el que abre (PE-34). */
export type TipoPeriodo = 'diaria' | 'semanal' | 'mensual';

/**
 * El periodo comparado: 0 es el que contiene hoy; −1, el anterior; y así (sección 3). Se apoya en las
 * ventanas del documento 23 para que las semanas y los meses sean los mismos de la consulta por vaca.
 */
export function periodoComparado(tipo: TipoPeriodo, hoy: FechaPredio, desplazamiento: number): Periodo {
  const atras = Math.max(0, -desplazamiento);
  const n = TAMANO_VENTANA[tipo];
  return periodosDeVentana(tipo, hoy, -Math.floor(atras / n))[atras % n]!;
}

export interface VacaComparada {
  id: Uuid;
  codigo_chapeta: string;
  retirada: boolean;
  /** null sin registros en el periodo. */
  promedio: number | null;
  total: number | null;
  diasRegistrados: number;
  diasDelPeriodo: number;
  /** Registro en menos de la mitad de los días (sección 7). */
  pocosRegistros: boolean;
}

export interface Comparacion {
  periodo: Periodo;
  /** Las vacas con registros, en el orden pedido. */
  conRegistros: VacaComparada[];
  /** Las que entran pero no tienen registros: siempre al final (sección 7). */
  sinRegistros: VacaComparada[];
  /** Promedio de los promedios de las vacas con registros; null si no hay ninguna (sección 5). */
  promedioDelHato: number | null;
  /** Con menos de dos vacas con registros la comparación no es posible (CU-07, 5a). */
  posible: boolean;
}

type Destino = Pick<RegistroLocal<'destino_productivo'>, 'animal_id' | 'destino' | 'desde' | 'creado_en' | 'id'>;

/** ¿Estuvo en Producción de leche en algún momento del periodo, según su historial? (sección 4). */
export function estuvoEnLeche(destinos: readonly Destino[], periodo: Periodo): boolean {
  const alEmpezar = destinoVigente(destinos.filter((d) => d.desde <= periodo.inicio));
  if (alEmpezar?.destino === 'leche') return true;
  return destinos.some((d) => d.destino === 'leche' && d.desde > periodo.inicio && d.desde <= periodo.fin);
}

const redondear = (v: number) => Math.round(v * 10) / 10;

/** Ordena de mayor a menor promedio; a igual promedio, más días primero y después la chapeta (sección 5). */
function compararPorProduccion(a: VacaComparada, b: VacaComparada): number {
  return b.promedio! - a.promedio! || b.diasRegistrados - a.diasRegistrados || compararChapetas(a.codigo_chapeta, b.codigo_chapeta);
}

/** La comparación pura, a partir de los datos ya vigentes y sin anulados (secciones 4 a 7). */
export function compararVacas(
  datos: {
    hembras: readonly Pick<RegistroLocal<'animal'>, 'id' | 'codigo_chapeta'>[];
    destinos: readonly Destino[];
    ordenos: readonly Pick<RegistroLocal<'produccion_leche'>, 'animal_id' | 'fecha' | 'litros'>[];
    retiradas: ReadonlySet<Uuid>;
  },
  periodo: Periodo,
  hoy: FechaPredio,
  orden: 'mayor' | 'menor' = 'mayor',
): Comparacion {
  const vacas: VacaComparada[] = [];
  for (const h of datos.hembras) {
    const ordenos = datos.ordenos.filter((o) => o.animal_id === h.id);
    const [fila] = agregar([periodo], ordenos, hoy);
    const entra = fila!.diasRegistrados > 0 || estuvoEnLeche(datos.destinos.filter((d) => d.animal_id === h.id), periodo);
    if (!entra) continue;
    vacas.push({
      id: h.id,
      codigo_chapeta: h.codigo_chapeta,
      retirada: datos.retiradas.has(h.id),
      promedio: fila!.promedio,
      total: fila!.total,
      diasRegistrados: fila!.diasRegistrados,
      diasDelPeriodo: fila!.diasDelPeriodo,
      pocosRegistros: fila!.diasRegistrados > 0 && fila!.diasRegistrados * 2 < fila!.diasDelPeriodo,
    });
  }
  const conRegistros = vacas.filter((v) => v.promedio !== null).sort(compararPorProduccion);
  if (orden === 'menor') conRegistros.reverse();
  const sinRegistros = vacas.filter((v) => v.promedio === null).sort((a, b) => compararChapetas(a.codigo_chapeta, b.codigo_chapeta));
  const promedioDelHato = conRegistros.length === 0 ? null : redondear(conRegistros.reduce((s, v) => s + v.promedio!, 0) / conRegistros.length);
  return { periodo, conRegistros, sinRegistros, promedioDelHato, posible: conRegistros.length >= 2 };
}

/** Lee el teléfono y compara (sección 9): valores vigentes, sin anulados, sin conexión. */
export async function cargarComparacion(tipo: TipoPeriodo, desplazamiento: number, hoy: FechaPredio, orden: 'mayor' | 'menor' = 'mayor'): Promise<Comparacion> {
  const [animales, destinos, ordenos, salidas, correcciones] = await Promise.all([
    consulta.animal.toArray(),
    consulta.destino_productivo.toArray(),
    consulta.produccion_leche.toArray(),
    consulta.salida.toArray(),
    consulta.correccion.toArray(),
  ]);
  const hembras = soloVigentes('animal', animales, correcciones).filter((a) => a.sexo === 'hembra');
  return compararVacas(
    {
      hembras,
      destinos: soloVigentes('destino_productivo', destinos, correcciones),
      ordenos: soloVigentes('produccion_leche', ordenos, correcciones),
      retiradas: new Set(salidas.map((s) => s.animal_id)),
    },
    periodoComparado(tipo, hoy, desplazamiento),
    hoy,
    orden,
  );
}
