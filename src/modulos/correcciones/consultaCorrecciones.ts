/**
 * Consulta de las correcciones y las anulaciones del predio (CU-18, RF-32, HU-17.5).
 * Especificación: docs/tecnica/27-consulta-de-correcciones.md
 *
 * Lee todas las tablas al principio, en una sola espera, y arma la consulta en memoria: así la consulta en vivo
 * de la pantalla vigila todas las tablas que usa (documento 26, sección 10.7).
 */
import { consulta } from '../../datos/repositorio';
import { CAMPOS_CORREGIBLES, valorLegible, type NombresDeReferencia } from '../../dominio/camposCorregibles';
import { NOMBRE_DESTINO } from '../../dominio/destino';
import { fechaDelPredio, formatearFecha, formatearInstante } from '../../dominio/fechas';
import { sumarDias } from '../../dominio/periodos';
import { NOMBRE_TIPO_EVENTO } from '../../dominio/sanidad';
import type { EntidadCorregible, EstadoSync, FechaPredio, NombreTabla, RegistroLocal, Uuid } from '../../dominio/tipos';
import { aplicarATodos } from '../../dominio/vigente';
import { NOMBRE_MOTIVO } from './correcciones';

/** Cuántas entradas se muestran de una vez; «Ver más» agrega otras tantas (sección 4). */
export const POR_PAGINA = 30;

export interface EntradaCorreccion {
  id: Uuid;
  /** «Z921 · Vacuna Prueba Aftosa del 14 de octubre de 2026», «Medicamento Prueba Florfenicol LA». */
  titulo: string;
  /** La chapeta del animal del registro, si tiene; la pantalla la muestra en la chapeta amarilla. */
  chapeta: string | null;
  /** El título sin la chapeta: «Pesaje del 21 de octubre de 2026». */
  nombre: string;
  /** «Dosis: antes 1, ahora 2,5» o «Anulado». */
  cambio: string;
  anulacion: boolean;
  /** «Error de digitación · Se anotó mal en el cuaderno». */
  motivo: string;
  autor_id: Uuid;
  autor: string;
  /** «18 de octubre de 2026 a las 4:18 p. m.». */
  cuando: string;
  /** Su estado de envío: la pantalla muestra el distintivo si aún no llegó al servicio. */
  estado_sync: EstadoSync;
  /** Dónde abrir el registro (sección 6); null si el registro no está en el teléfono. */
  destino: string | null;
}

export interface GrupoDelDia {
  dia: FechaPredio;
  /** «Hoy», «Ayer» o la fecha. */
  etiqueta: string;
  entradas: EntradaCorreccion[];
}

export interface CorreccionesRecientes {
  grupos: GrupoDelDia[];
  /** Hay más entradas que las mostradas: se ofrece «Ver más». */
  hayMas: boolean;
  /** Para el filtro «Quién»: solo los usuarios con al menos una corrección, por nombre (sección 5). */
  autores: { id: Uuid; nombre: string }[];
  /** Cuántas hay en el predio, sin filtro: distingue «sin correcciones» de «este usuario no tiene» (sección 7). */
  totalDelPredio: number;
}

const SIN_AUTOR = 'un usuario que ya no está en el predio';

/** El animal al que pertenece un registro: `madre_id` en el parto, el propio id en el animal. */
function animalDe(tabla: NombreTabla, registro: Record<string, unknown>): Uuid | null {
  if (tabla === 'animal') return registro['id'] as Uuid;
  const id = registro[tabla === 'parto' ? 'madre_id' : 'animal_id'];
  return typeof id === 'string' ? id : null;
}

/** Cómo se nombra el registro afectado, sin el animal (sección 3). */
function nombreDelRegistro(tabla: NombreTabla, r: Record<string, unknown>, medicamentos: ReadonlyMap<string, string>): string {
  const fecha = (campo: string) => formatearFecha(String(r[campo]));
  switch (tabla) {
    case 'evento_sanitario': {
      const tipo = NOMBRE_TIPO_EVENTO[r['tipo'] as keyof typeof NOMBRE_TIPO_EVENTO] ?? 'Evento sanitario';
      const medicamento = medicamentos.get(String(r['medicamento_id']));
      return `${tipo}${medicamento ? ` ${medicamento}` : ''} del ${fecha('fecha')}`;
    }
    case 'pesaje':
      return `Pesaje del ${fecha('fecha')}`;
    case 'produccion_leche':
      return `Ordeño del ${fecha('fecha')}`;
    case 'parto':
      return `Parto del ${fecha('fecha')}`;
    case 'destino_productivo':
      return `Destino ${NOMBRE_DESTINO[r['destino'] as keyof typeof NOMBRE_DESTINO] ?? ''} desde el ${fecha('desde')}`.replace('  ', ' ');
    case 'animal':
      return 'Datos del animal';
    case 'salida':
      return `Salida del ${fecha('fecha')}`;
    case 'movimiento_economico':
      return `Movimiento económico del ${fecha('fecha')}`;
    case 'fotografia':
      return 'Fotografía';
    default:
      return 'Registro';
  }
}

/** Adónde lleva tocar la entrada, con la sección del registro abierta (sección 6). */
export function destinoDe(tabla: NombreTabla, registro: Record<string, unknown>): string | null {
  if (tabla === 'medicamento') return '/medicamentos';
  const animal = animalDe(tabla, registro);
  if (!animal) return null;
  const seccion: Partial<Record<NombreTabla, string>> = {
    evento_sanitario: '?sanidad=1',
    pesaje: '?peso=1',
    parto: '?reproduccion=1',
    destino_productivo: '?destino=1',
  };
  if (tabla === 'produccion_leche') return `/produccion?vaca=${animal}`;
  return `/animales/${animal}${seccion[tabla] ?? ''}`;
}

/** «Hoy», «Ayer» o la fecha. */
export function etiquetaDelDia(dia: FechaPredio, hoy: FechaPredio): string {
  if (dia === hoy) return 'Hoy';
  if (dia === sumarDias(hoy, -1)) return 'Ayer';
  return formatearFecha(dia);
}

/**
 * Las correcciones y las anulaciones del predio, de la más reciente a la más antigua, agrupadas por día
 * (secciones 3 a 5).
 *
 * @param autor Filtro «Quién»; null es «Todos».
 * @param cantidad Cuántas mostrar: POR_PAGINA, y otras tantas con cada «Ver más».
 */
export async function cargarCorreccionesRecientes(autor: Uuid | null, cantidad: number = POR_PAGINA, hoy: FechaPredio = fechaDelPredio()): Promise<CorreccionesRecientes> {
  const [correcciones, usuarios, animales, medicamentos, eventos, pesajes, ordenos, partos, destinos, salidas, movimientos] = await Promise.all([
    consulta.correccion.toArray(),
    consulta.usuario.toArray(),
    consulta.animal.toArray(),
    consulta.medicamento.toArray(),
    consulta.evento_sanitario.toArray(),
    consulta.pesaje.toArray(),
    consulta.produccion_leche.toArray(),
    consulta.parto.toArray(),
    consulta.destino_productivo.toArray(),
    consulta.salida.toArray(),
    consulta.movimiento_economico.toArray(),
  ]);
  const registrosPorTabla: Partial<Record<EntidadCorregible, readonly { id: Uuid }[]>> = {
    animal: animales,
    medicamento: medicamentos,
    evento_sanitario: eventos,
    pesaje: pesajes,
    produccion_leche: ordenos,
    parto: partos,
    destino_productivo: destinos,
    salida: salidas,
    movimiento_economico: movimientos,
  };
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
  const referencia: NombresDeReferencia = {
    animales: new Map(animales.map((a) => [a.id, a.codigo_chapeta])),
    medicamentos: new Map(medicamentos.map((m) => [m.id, m.nombre])),
  };

  const autores = [...new Set(correcciones.map((c) => c.autor_id))]
    .map((id) => ({ id, nombre: nombres.get(id) ?? SIN_AUTOR }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const ordenadas = correcciones
    .filter((c) => autor === null || c.autor_id === autor)
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en) || b.id.localeCompare(a.id));
  const visibles = ordenadas.slice(0, cantidad);

  const grupos: GrupoDelDia[] = [];
  for (const c of visibles) {
    const entrada = describir(c, registrosPorTabla, correcciones, referencia, nombres);
    const dia = fechaDelPredio(c.creado_en);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.dia === dia) ultimo.entradas.push(entrada);
    else grupos.push({ dia, etiqueta: etiquetaDelDia(dia, hoy), entradas: [entrada] });
  }
  return { grupos, hayMas: ordenadas.length > visibles.length, autores, totalDelPredio: correcciones.length };
}

function describir(
  c: RegistroLocal<'correccion'>,
  registrosPorTabla: Partial<Record<EntidadCorregible, readonly { id: Uuid }[]>>,
  correcciones: readonly RegistroLocal<'correccion'>[],
  referencia: NombresDeReferencia,
  nombres: ReadonlyMap<Uuid, string>,
): EntradaCorreccion {
  const tabla = c.entidad_afectada;
  const original = registrosPorTabla[tabla]?.find((r) => r.id === c.registro_id);
  // El registro con sus valores vigentes: un evento con el medicamento corregido se nombra con el nuevo.
  const registro = original ? (aplicarATodos(tabla, [original], correcciones)[0]!.registro as unknown as Record<string, unknown>) : null;

  let titulo = 'Un registro que no está en este teléfono';
  let chapeta: string | null = null;
  let nombre = titulo;
  if (registro && tabla === 'medicamento') nombre = titulo = `Medicamento ${String(registro['nombre'])}`;
  else if (registro) {
    const animal = animalDe(tabla, registro);
    chapeta = (animal ? referencia.animales.get(animal) : undefined) ?? null;
    nombre = nombreDelRegistro(tabla, registro, referencia.medicamentos);
    titulo = chapeta ? `${chapeta} · ${nombre}` : nombre;
  }

  const anulacion = c.tipo === 'anulacion';
  const campo = c.campo ? (CAMPOS_CORREGIBLES[tabla] as Record<string, Parameters<typeof valorLegible>[0]>)[c.campo] : undefined;
  const cambio = anulacion
    ? 'Anulado'
    : `${campo?.etiqueta ?? c.campo ?? 'Campo'}: antes ${valorLegible(campo, c.valor_anterior, referencia)}, ahora ${valorLegible(campo, c.valor_nuevo, referencia)}`;

  return {
    id: c.id,
    titulo,
    chapeta,
    nombre,
    cambio,
    anulacion,
    motivo: `${NOMBRE_MOTIVO[c.motivo]}${c.nota ? ` · ${c.nota}` : ''}`,
    autor_id: c.autor_id,
    autor: nombres.get(c.autor_id) ?? SIN_AUTOR,
    cuando: formatearInstante(c.creado_en),
    estado_sync: c.estado_sync,
    destino: registro ? destinoDe(tabla, registro) : null,
  };
}
