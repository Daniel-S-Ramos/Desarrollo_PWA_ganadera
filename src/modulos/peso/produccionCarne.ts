/**
 * Producción de carne: los kilos ganados por los animales de ceba, por mes y en su ciclo completo
 * (apartado 2.2.7, RF-13, RF-14, CU-09, HU-05, 3.11.4).
 * Especificación: docs/tecnica/34-produccion-de-carne.md
 *
 * Lee todas las tablas en una sola espera y arma el resultado en memoria (documento 26, sección 10.7).
 */
import { leerParametro } from '../../datos/parametros';
import { consulta } from '../../datos/repositorio';
import { destinoVigente } from '../../dominio/destino';
import type { Periodo } from '../../dominio/periodos';
import { serieDePeso, type PuntoPeso } from '../../dominio/peso';
import { diasEntre } from '../../dominio/repeticion';
import type { FechaPredio, RegistroLocal, Uuid } from '../../dominio/tipos';
import { soloVigentes } from '../../dominio/vigente';
import { compararChapetas } from '../consulta/listado';
import { periodoComparado } from '../leche/comparacion';
import { DIAS_SIN_PESAJE_POR_DEFECTO } from '../salida/salidas';
import { metaDeGanancia } from './pesajes';

const redondear = (v: number) => Math.round(v * 10) / 10;

/** El mes consultado: 0 es el que contiene hoy; −1, el anterior; y así (sección 3). */
export function mesConsultado(hoy: FechaPredio, desplazamiento: number): Periodo {
  return periodoComparado('mensual', hoy, desplazamiento);
}

type Destino = Pick<RegistroLocal<'destino_productivo'>, 'animal_id' | 'destino' | 'desde' | 'creado_en' | 'id'>;
type AnimalPeso = Pick<RegistroLocal<'animal'>, 'id' | 'codigo_chapeta' | 'peso_inicial' | 'fecha_ingreso' | 'fecha_nacimiento'>;
type PesajeCarne = Pick<RegistroLocal<'pesaje'>, 'id' | 'animal_id' | 'fecha' | 'peso' | 'metodo' | 'autor_id'>;

/** ¿Estuvo en ceba en algún momento del mes, según su historial? (sección 5, como el documento 28). */
export function estuvoEnCeba(destinos: readonly Destino[], periodo: Periodo): boolean {
  const alEmpezar = destinoVigente(destinos.filter((d) => d.desde <= periodo.inicio));
  if (alEmpezar?.destino === 'ceba') return true;
  return destinos.some((d) => d.destino === 'ceba' && d.desde > periodo.inicio && d.desde <= periodo.fin);
}

export interface TramoDelMes {
  referencia: PuntoPeso;
  final: PuntoPeso;
  kg: number;
  dias: number;
  gananciaDiaria: number;
  /** Cinta y báscula: compárese con cautela (documento 24, sección 7). */
  metodosDistintos: boolean;
  /** Bajo la ganancia diaria esperada, si el propietario la definió (3.11.4). */
  bajoMeta: boolean;
}

/**
 * El tramo del mes de un animal (sección 4): del peso de referencia al último pesaje del mes. La referencia
 * es el último punto de la serie anterior al primer pesaje del mes o, si no hay, el primer pesaje del mes.
 * `primerPesaje` es el peso cuando el mes tiene un solo pesaje y nada con qué compararlo.
 */
export function tramoDelMes(
  serie: readonly PuntoPeso[],
  periodo: Periodo,
  hoy: FechaPredio,
  meta: number | null,
): { tramo: TramoDelMes | null; primerPesaje: number | null } {
  const fin = periodo.fin < hoy ? periodo.fin : hoy;
  const delMes = serie.filter((p) => p.id !== null && p.fecha !== null && p.fecha >= periodo.inicio && p.fecha <= fin);
  if (delMes.length === 0) return { tramo: null, primerPesaje: null };
  const primero = delMes[0]!;
  const final = delMes.at(-1)!;
  const previos = serie.filter((p) => p.fecha !== null && p.fecha < primero.fecha!);
  const referencia = previos.at(-1) ?? (primero.fecha! < final.fecha! ? primero : null);
  if (!referencia) return { tramo: null, primerPesaje: final.kg };
  const dias = diasEntre(referencia.fecha!, final.fecha!);
  const gananciaDiaria = redondear((final.kg - referencia.kg) / dias);
  return {
    tramo: {
      referencia,
      final,
      kg: redondear(final.kg - referencia.kg),
      dias,
      gananciaDiaria,
      metodosDistintos: referencia.metodo !== null && final.metodo !== null && referencia.metodo !== final.metodo,
      bajoMeta: meta !== null && gananciaDiaria < meta,
    },
    primerPesaje: null,
  };
}

export interface AnimalDelMes {
  id: Uuid;
  codigo_chapeta: string;
  retirado: boolean;
  tramo: TramoDelMes | null;
  primerPesaje: number | null;
}

export interface ProduccionDelMes {
  periodo: Periodo;
  /** Los animales con tramo, en el orden pedido. */
  conTramo: AnimalDelMes[];
  /** Sin pesaje en el mes o con su primer pesaje: siempre al final. */
  sinTramo: AnimalDelMes[];
  /** Suma de los kilos ganados (las pérdidas restan); null sin tramos. */
  kgGanados: number | null;
  /** Promedio de las ganancias diarias de los animales con tramo; null sin tramos. */
  gananciaPromedio: number | null;
  /** Con tramo o con primer pesaje en el mes. */
  pesados: number;
  meta: number | null;
}

/** Mayor ganancia diaria primero; a igual ganancia, más días y después la chapeta (sección 6). */
function porGanancia(a: AnimalDelMes, b: AnimalDelMes): number {
  return b.tramo!.gananciaDiaria - a.tramo!.gananciaDiaria || b.tramo!.dias - a.tramo!.dias || compararChapetas(a.codigo_chapeta, b.codigo_chapeta);
}

interface DatosCarne {
  animales: readonly AnimalPeso[];
  destinos: readonly Destino[];
  pesajes: readonly PesajeCarne[];
  retirados: ReadonlySet<Uuid>;
}

const serieDe = (animal: AnimalPeso, pesajes: readonly PesajeCarne[]) =>
  serieDePeso(
    animal,
    pesajes.filter((p) => p.animal_id === animal.id),
  );

/** La producción de carne de un mes, a partir de los datos ya vigentes y sin anulados (secciones 4 a 6). */
export function produccionDelMes(datos: DatosCarne, periodo: Periodo, hoy: FechaPredio, meta: number | null, orden: 'mayor' | 'menor' = 'mayor'): ProduccionDelMes {
  const animales: AnimalDelMes[] = [];
  for (const a of datos.animales) {
    if (!estuvoEnCeba(datos.destinos.filter((d) => d.animal_id === a.id), periodo)) continue;
    animales.push({ id: a.id, codigo_chapeta: a.codigo_chapeta, retirado: datos.retirados.has(a.id), ...tramoDelMes(serieDe(a, datos.pesajes), periodo, hoy, meta) });
  }
  const conTramo = animales.filter((a) => a.tramo !== null).sort(porGanancia);
  if (orden === 'menor') conTramo.reverse();
  const sinTramo = animales.filter((a) => a.tramo === null).sort((a, b) => compararChapetas(a.codigo_chapeta, b.codigo_chapeta));
  const hay = conTramo.length > 0;
  return {
    periodo,
    conTramo,
    sinTramo,
    kgGanados: hay ? redondear(conTramo.reduce((s, a) => s + a.tramo!.kg, 0)) : null,
    gananciaPromedio: hay ? redondear(conTramo.reduce((s, a) => s + a.tramo!.gananciaDiaria, 0) / conTramo.length) : null,
    pesados: conTramo.length + sinTramo.filter((a) => a.primerPesaje !== null).length,
    meta,
  };
}

// ---------------------------------------------------------------------------
// El ciclo completo (sección 6 bis)
// ---------------------------------------------------------------------------

export interface AnimalCiclo {
  id: Uuid;
  codigo_chapeta: string;
  /** El primer punto de la serie: peso de compra o al nacer, o el primer pesaje; null sin pesos. */
  inicial: PuntoPeso | null;
  /** El último punto de la serie; igual a `inicial` si solo hay uno. */
  ultimo: PuntoPeso | null;
  /** Del inicial al último; null con un solo punto o sin fechas. */
  kg: number | null;
  dias: number | null;
  gananciaDiaria: number | null;
  /** Kilos para el peso de finalización; null sin el parámetro o sin pesos; 0 o menos si ya terminó. */
  falta: number | null;
  terminado: boolean;
  /** Avance del peso inicial al peso de finalización, de 0 a 100; null sin el parámetro o sin pesos. */
  avance: number | null;
  /** Días aproximados para terminar al ritmo del ciclo; null si no se puede estimar. */
  estimacionDias: number | null;
  /** Días desde el último peso, si pasan de `dias_sin_pesaje` (Tabla 30); null si está al día. */
  pesajeViejo: number | null;
}

export interface CicloDeCeba {
  animales: AnimalCiclo[];
  terminados: number;
  /** Suma de los kilos ganados en el ciclo; null si ningún animal tiene dos puntos. */
  kgGanados: number | null;
  pesoFinal: number | null;
}

/** El ciclo de un animal a partir de su serie (sección 6 bis). */
export function cicloDeAnimal(
  serie: readonly PuntoPeso[],
  pesoFinal: number | null,
  diasSinPesaje: number | null,
  hoy: FechaPredio,
): Omit<AnimalCiclo, 'id' | 'codigo_chapeta'> {
  const inicial = serie[0] ?? null;
  const ultimo = serie.at(-1) ?? null;
  const dos = inicial !== null && ultimo !== null && serie.length > 1 && inicial.fecha !== null && ultimo.fecha !== null && inicial.fecha < ultimo.fecha;
  const dias = dos ? diasEntre(inicial.fecha!, ultimo.fecha!) : null;
  const kg = dos ? redondear(ultimo.kg - inicial.kg) : null;
  const gananciaDiaria = dos ? redondear((ultimo.kg - inicial.kg) / dias!) : null;
  const falta = pesoFinal !== null && ultimo !== null ? redondear(pesoFinal - ultimo.kg) : null;
  const terminado = falta !== null && falta <= 0;
  let avance: number | null = null;
  if (pesoFinal !== null && inicial !== null && ultimo !== null) {
    // Sin terminar, el último peso es menor que el final: el avance no pasa de 100.
    avance = terminado ? 100 : inicial.kg >= pesoFinal ? 100 : Math.max(0, Math.round(((ultimo.kg - inicial.kg) / (pesoFinal - inicial.kg)) * 100));
  }
  const estimacionDias = !terminado && falta !== null && gananciaDiaria !== null && gananciaDiaria > 0 ? Math.ceil(falta / ((ultimo!.kg - inicial!.kg) / dias!)) : null;
  const desde = ultimo?.fecha ? diasEntre(ultimo.fecha, hoy) : null;
  return {
    inicial,
    ultimo,
    kg,
    dias,
    gananciaDiaria,
    falta,
    terminado,
    avance,
    estimacionDias,
    pesajeViejo: diasSinPesaje !== null && desde !== null && desde > diasSinPesaje ? desde : null,
  };
}

/** «unos 20 días», «unos 4 meses»: la estimación siempre aproximada (sección 6 bis). */
export function describirEstimacion(dias: number): string {
  if (dias < 60) return dias === 1 ? 'un día' : `unos ${dias} días`;
  return `unos ${Math.round(dias / 30)} meses`;
}

/** El lote de ceba de hoy con su ciclo (sección 6 bis): activos con destino vigente ceba. */
export function cicloDeCeba(datos: DatosCarne, pesoFinal: number | null, diasSinPesaje: number | null, hoy: FechaPredio): CicloDeCeba {
  const animales: AnimalCiclo[] = [];
  for (const a of datos.animales) {
    if (datos.retirados.has(a.id)) continue;
    if (destinoVigente(datos.destinos.filter((d) => d.animal_id === a.id && d.desde <= hoy))?.destino !== 'ceba') continue;
    animales.push({ id: a.id, codigo_chapeta: a.codigo_chapeta, ...cicloDeAnimal(serieDe(a, datos.pesajes), pesoFinal, diasSinPesaje, hoy) });
  }
  // El más pesado primero: los terminados arriba y después los que menos les falta; sin pesos al final.
  animales.sort((a, b) => (b.ultimo?.kg ?? -1) - (a.ultimo?.kg ?? -1) || compararChapetas(a.codigo_chapeta, b.codigo_chapeta));
  const conKg = animales.filter((a) => a.kg !== null);
  return {
    animales,
    terminados: animales.filter((a) => a.terminado).length,
    kgGanados: conKg.length === 0 ? null : redondear(conKg.reduce((s, a) => s + a.kg!, 0)),
    pesoFinal,
  };
}

// ---------------------------------------------------------------------------
// Lectura del teléfono (sección 9)
// ---------------------------------------------------------------------------

async function leerDatos(): Promise<DatosCarne & { meta: number | null; pesoFinal: number | null; diasSinPesaje: number | null }> {
  const [animales, destinos, pesajes, salidas, correcciones, meta, pesoFinal, diasSinPesaje] = await Promise.all([
    consulta.animal.toArray(),
    consulta.destino_productivo.toArray(),
    consulta.pesaje.toArray(),
    consulta.salida.toArray(),
    consulta.correccion.toArray(),
    metaDeGanancia(),
    leerParametro('peso_final_ceba'),
    leerParametro('dias_sin_pesaje'),
  ]);
  return {
    animales: soloVigentes('animal', animales, correcciones),
    destinos: soloVigentes('destino_productivo', destinos, correcciones),
    pesajes: soloVigentes('pesaje', pesajes, correcciones),
    // Retirado: con salida vigente, no anulada (documento técnico 29, sección 7).
    retirados: new Set(soloVigentes('salida', salidas, correcciones).map((s) => s.animal_id)),
    meta,
    pesoFinal: pesoFinal ?? null,
    diasSinPesaje: diasSinPesaje ?? DIAS_SIN_PESAJE_POR_DEFECTO,
  };
}

/** La producción de carne de un mes, leída del teléfono sin conexión. */
export async function cargarProduccionDelMes(desplazamiento: number, hoy: FechaPredio, orden: 'mayor' | 'menor' = 'mayor'): Promise<ProduccionDelMes> {
  const datos = await leerDatos();
  return produccionDelMes(datos, mesConsultado(hoy, desplazamiento), hoy, datos.meta, orden);
}

/** El ciclo del lote de ceba, leído del teléfono sin conexión. */
export async function cargarCicloDeCeba(hoy: FechaPredio): Promise<CicloDeCeba> {
  const datos = await leerDatos();
  return cicloDeCeba(datos, datos.pesoFinal, datos.diasSinPesaje, hoy);
}

/** Meses hacia atrás que el inicio revisa buscando el último mes con pesajes. */
export const MESES_RESUMEN = 12;

export interface ResumenCarne {
  periodo: Periodo;
  kgGanados: number | null;
  pesados: number;
  total: number;
}

/**
 * La mitad «Carne» de la tarjeta del inicio (sección 7): el mes en curso o, si aún no hay pesajes, el último
 * de los doce meses anteriores que los tuvo; null si ninguno.
 */
export function resumenCarne(datos: DatosCarne, hoy: FechaPredio): ResumenCarne | null {
  for (let d = 0; d > -MESES_RESUMEN - 1; d--) {
    const mes = produccionDelMes(datos, mesConsultado(hoy, d), hoy, null);
    if (mes.pesados > 0) return { periodo: mes.periodo, kgGanados: mes.kgGanados, pesados: mes.pesados, total: mes.conTramo.length + mes.sinTramo.length };
  }
  return null;
}

export async function cargarResumenCarne(hoy: FechaPredio): Promise<ResumenCarne | null> {
  return resumenCarne(await leerDatos(), hoy);
}
