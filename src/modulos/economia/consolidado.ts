/**
 * Consolidado económico de un animal: lo invertido, lo generado y el resultado (RF-21, CU-14, HU-16, 3.8.12).
 * Especificación: docs/tecnica/31-consolidado-economico.md, secciones 6 y 7
 *
 * Lee todas las tablas en una sola espera y calcula en memoria (documento 26, sección 10.7).
 */
import { consulta } from '../../datos/repositorio';
import { NOMBRE_CONCEPTO, PRECIO_LITRO_POR_DEFECTO } from '../../dominio/economia';
import { origenDe } from '../../dominio/origen';
import type { ConceptoMovimiento, FechaPredio, MotivoSalida, RegistroLocal, Uuid } from '../../dominio/tipos';
import { aplicarATodos, soloVigentes, type Vigente } from '../../dominio/vigente';

export type ConceptoInvertido = ConceptoMovimiento | 'medicamentos';

export interface LineaInvertido {
  concepto: ConceptoInvertido;
  total: number;
  registros: number;
}

export interface EntradaDetalle {
  fecha: FechaPredio;
  /** «Compra», «Medicamento: Prueba Aftosa», «Venta». */
  concepto: string;
  valor: number;
  clase: 'costo' | 'ingreso';
  /** Los costos registrados como movimiento: con su marca y su corrección (sección 5). */
  movimiento?: Vigente<RegistroLocal<'movimiento_economico'>>;
}

export interface Consolidado {
  invertido: LineaInvertido[];
  totalInvertido: number;
  leche: { litros: number; ordenos: number; precio: number; total: number } | null;
  venta: number | null;
  totalGenerado: number;
  /** Generado menos invertido. */
  resultado: number;
  /** Cómo salió del predio; null si sigue en él (4a). */
  salida: MotivoSalida | null;
  /** Avisos de la sección 6, en orden. */
  avisos: string[];
  /** Precio por litro de ejemplo, porque el parámetro no está en el teléfono. */
  precioDeEjemplo: boolean;
  detalle: EntradaDetalle[];
}

const ORDEN_INVERTIDO: ConceptoInvertido[] = ['compra', 'servicio_veterinario', 'alimentacion', 'medicamentos'];

export interface DatosConsolidado {
  animal: Pick<RegistroLocal<'animal'>, 'fecha_ingreso'>;
  movimientos: readonly Vigente<RegistroLocal<'movimiento_economico'>>[];
  eventos: readonly Pick<RegistroLocal<'evento_sanitario'>, 'fecha' | 'costo' | 'medicamento_id'>[];
  ordenos: readonly Pick<RegistroLocal<'produccion_leche'>, 'litros'>[];
  salida: Pick<RegistroLocal<'salida'>, 'fecha' | 'motivo' | 'valor_venta'> | null;
  /** Precio por litro del parámetro; null si no está en el teléfono. */
  precio: number | null;
  nombreMedicamento: (id: Uuid) => string;
}

/** El cálculo puro (sección 6), con datos ya vigentes y sin anulados. */
export function calcularConsolidado(d: DatosConsolidado): Consolidado {
  const movimientos = d.movimientos.filter((m) => m.anulacion === null).map((m) => m.registro);
  const conCosto = d.eventos.filter((e) => e.costo !== null && e.costo > 0);
  const invertido: LineaInvertido[] = ORDEN_INVERTIDO.map((concepto) => {
    const registros = concepto === 'medicamentos' ? conCosto.map((e) => e.costo!) : movimientos.filter((m) => m.concepto === concepto).map((m) => m.valor);
    return { concepto, total: registros.reduce((s, v) => s + v, 0), registros: registros.length };
  }).filter((l) => l.registros > 0);
  const totalInvertido = invertido.reduce((s, l) => s + l.total, 0);

  const precio = d.precio ?? PRECIO_LITRO_POR_DEFECTO;
  const litros = Math.round(d.ordenos.reduce((s, o) => s + o.litros, 0) * 10) / 10;
  const leche = d.ordenos.length > 0 ? { litros, ordenos: d.ordenos.length, precio, total: Math.round(litros * precio) } : null;
  const venta = d.salida?.motivo === 'venta' ? d.salida.valor_venta : null;
  const totalGenerado = (leche?.total ?? 0) + (venta ?? 0);

  const avisos: string[] = [];
  if (totalInvertido === 0) avisos.push('No tiene costos registrados: el resultado no es representativo.');
  if (origenDe(d.animal) === 'nacido') avisos.push('Nació en el predio: no tiene costo de compra, y su resultado no es comparable con el de un animal comprado.');
  if (!d.salida) avisos.push('Resultado parcial: el animal sigue en el predio.');
  else if (d.salida.motivo !== 'venta') avisos.push(`Salió por ${d.salida.motivo === 'muerte' ? 'muerte' : 'pérdida o robo'}: no hubo venta, y lo invertido se presenta como pérdida.`);
  const sinCosto = d.eventos.length - conCosto.length;
  if (sinCosto > 0) avisos.push(sinCosto === 1 ? '1 evento sanitario no tiene costo registrado y no se incluye.' : `${sinCosto} eventos sanitarios no tienen costo registrado y no se incluyen.`);
  if (leche) avisos.push(`La leche se valora al precio ${d.precio === null ? 'de ejemplo' : 'del parámetro'}: es el valor de la producción, no el dinero recibido.`);
  avisos.push('No incluye costos por lote ni otros gastos que no se registraron para este animal.');

  const detalle: EntradaDetalle[] = [
    ...d.movimientos.filter((m) => m.anulacion === null).map((m): EntradaDetalle => ({ fecha: m.registro.fecha, concepto: NOMBRE_CONCEPTO[m.registro.concepto], valor: m.registro.valor, clase: 'costo', movimiento: m })),
    ...conCosto.map((e): EntradaDetalle => ({ fecha: e.fecha, concepto: `Medicamento: ${d.nombreMedicamento(e.medicamento_id)}`, valor: e.costo!, clase: 'costo' })),
    ...(venta !== null && d.salida ? [{ fecha: d.salida.fecha, concepto: 'Venta', valor: venta, clase: 'ingreso' as const }] : []),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return {
    invertido,
    totalInvertido,
    leche,
    venta,
    totalGenerado,
    resultado: totalGenerado - totalInvertido,
    salida: d.salida?.motivo ?? null,
    avisos,
    precioDeEjemplo: d.precio === null,
    detalle,
  };
}

/**
 * Cómo se presenta el resultado (sección 6). Una muerte o una pérdida se presenta siempre como pérdida, aunque no
 * haya costos (PE-37: «Ganancia: $0» en un animal muerto confundía).
 */
export function rotuloResultado(c: Pick<Consolidado, 'resultado' | 'salida'>): { clase: 'ganancia' | 'perdida' | 'neutro'; texto: string } {
  if (c.salida === 'muerte') return { clase: 'perdida', texto: 'Pérdida por muerte' };
  if (c.salida === 'perdida_robo') return { clase: 'perdida', texto: 'Pérdida por pérdida o robo' };
  if (c.resultado < 0) return { clase: 'perdida', texto: 'Pérdida' };
  if (c.resultado === 0) return { clase: 'neutro', texto: 'Sin ganancia ni pérdida' };
  return { clase: 'ganancia', texto: 'Ganancia' };
}

/** Lee el teléfono y calcula (sección 7); null si el animal no está. */
export async function cargarConsolidado(animalId: Uuid): Promise<Consolidado | null> {
  const [animal, movimientos, eventos, ordenos, salidas, correcciones, medicamentos, parametro] = await Promise.all([
    consulta.animal.get(animalId),
    consulta.movimiento_economico.where('animal_id').equals(animalId).toArray(),
    consulta.evento_sanitario.where('animal_id').equals(animalId).toArray(),
    consulta.produccion_leche.where('animal_id').equals(animalId).toArray(),
    consulta.salida.where('animal_id').equals(animalId).toArray(),
    consulta.correccion.toArray(),
    consulta.medicamento.toArray(),
    consulta.parametro.get('precio_litro_leche'),
  ]);
  if (!animal) return null;
  const [vigente] = soloVigentes('animal', [animal], correcciones);
  const nombres = new Map(soloVigentes('medicamento', medicamentos, correcciones).map((m) => [m.id, m.nombre]));
  return calcularConsolidado({
    animal: vigente ?? animal,
    movimientos: aplicarATodos('movimiento_economico', movimientos, correcciones),
    eventos: soloVigentes('evento_sanitario', eventos, correcciones),
    ordenos: soloVigentes('produccion_leche', ordenos, correcciones),
    salida: soloVigentes('salida', salidas, correcciones)[0] ?? null,
    precio: parametro?.valor ?? null,
    nombreMedicamento: (id) => nombres.get(id) ?? 'un medicamento que no está en el teléfono',
  });
}
