/**
 * Resolver un conflicto de chapeta, de medicamento o de chapeta puesta (Tabla 21, regla del propietario
 * del 2026-10-13). Especificación: docs/tecnica/26-correccion-y-anulacion.md, sección 10
 */
import { consulta } from '../../datos/repositorio';
import {
  cambiarNumero,
  descartarColocacion,
  previsualizarUnion,
  ResolucionDetenida,
  unirAnimal,
  unirMedicamento,
  type Movimiento,
} from '../../datos/resolucionConflictos';
import { contarSalidasVigentes, vigentes } from '../../datos/vigentes';
import { listarConflictos } from '../../datos/sincronizacionLocal';
import { normalizarNombre } from '../../dominio/medicamentos';
import type { NombreTabla, RegistroLocal, Uuid } from '../../dominio/tipos';
import { PermisoDenegado } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { buscarPorChapeta, errorDeChapeta, normalizarChapeta, type AnimalConChapeta } from '../identificacion/registroAnimal';

export type { Movimiento } from '../../datos/resolucionConflictos';

/**
 * Quién resuelve (decisión del autor del 2026-10-18, documento 26, sección 10): el propietario, cualquiera; el
 * trabajador, los registros que él creó. El registro rechazado solo existe en el teléfono donde se creó, así
 * que «presentarlo al propietario» (Tabla 21) dejaría sin solución los del teléfono del trabajador.
 */
export function puedeResolver(usuario: Identidad, autorId: Uuid): boolean {
  return usuario.perfil === 'propietario' || usuario.usuario_id === autorId;
}

async function exigirPermiso(usuario: Identidad, tabla: 'animal' | 'medicamento' | 'colocacion_chapeta', id: Uuid): Promise<void> {
  const registro = await (consulta[tabla] as unknown as { get: (id: Uuid) => Promise<{ autor_id: Uuid } | undefined> }).get(id);
  if (registro && !puedeResolver(usuario, registro.autor_id)) throw new PermisoDenegado(usuario.perfil, tabla);
}

export type Resultado = { ok: true } | { ok: false; error: string };

async function intentar(trabajo: () => Promise<unknown>): Promise<Resultado> {
  try {
    await trabajo();
    return { ok: true };
  } catch (error) {
    if (error instanceof ResolucionDetenida) return { ok: false, error: error.causa };
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Chapeta repetida: sección 10.1
// ---------------------------------------------------------------------------

export interface ConflictoDeChapeta {
  /** Quién registró el animal en conflicto: decide quién puede resolverlo. */
  autor_id: Uuid;
  /** El animal que ya tiene el número en el servicio; null si todavía no llegó a este teléfono. */
  existente: AnimalConChapeta | null;
  /** Lo que pasaría al animal existente al unir. */
  plan: Movimiento[];
}

/** El animal en conflicto frente al que ya tiene su número. undefined si no está en conflicto. */
export async function cargarConflictoDeChapeta(animalId: Uuid): Promise<ConflictoDeChapeta | undefined> {
  const animal = await consulta.animal.get(animalId);
  if (!animal || animal.estado_sync !== 'conflicto') return undefined;
  const candidatos = await consulta.animal.where('codigo_chapeta').equals(animal.codigo_chapeta).toArray();
  const otro = candidatos.find((a) => a.id !== animalId && a.estado_sync === 'sincronizado');
  if (!otro) return { autor_id: animal.autor_id, existente: null, plan: [] };
  // No con buscarPorChapeta: devuelve el primero con ese número, que puede ser el duplicado.
  const [[vigente], salidas, autor] = await Promise.all([
    vigentes('animal', [otro]),
    contarSalidasVigentes(otro.id),
    consulta.usuario.get(otro.autor_id),
  ]);
  return {
    autor_id: animal.autor_id,
    existente: { animal: vigente ?? otro, autor: autor?.nombre ?? null, retirado: salidas > 0 },
    plan: await previsualizarUnion('animal', animalId, otro.id),
  };
}

/** Valida el número nuevo como en el registro (formato y que no exista). null si sirve. */
export async function errorDeNumeroNuevo(texto: string, actual: string): Promise<string | null> {
  const numero = normalizarChapeta(texto);
  const formato = errorDeChapeta(numero);
  if (formato) return formato;
  if (numero === actual) return 'Escriba un número distinto al que está repetido';
  const otro = await buscarPorChapeta(numero);
  if (otro) return `Ya hay un animal con el número ${numero}`;
  return null;
}

/** «Son animales distintos: cambiar el número». */
export async function resolverCambiandoNumero(animalId: Uuid, texto: string, usuario: Identidad): Promise<Resultado> {
  await exigirPermiso(usuario, 'animal', animalId);
  const animal = await consulta.animal.get(animalId);
  if (!animal) return { ok: false, error: 'Este animal no está en el teléfono.' };
  const error = await errorDeNumeroNuevo(texto, animal.codigo_chapeta);
  if (error) return { ok: false, error };
  return intentar(() => cambiarNumero(animalId, normalizarChapeta(texto)));
}

/** «Es el mismo animal: unir». */
export async function resolverUniendo(animalId: Uuid, correctoId: Uuid, usuario: Identidad): Promise<Resultado> {
  await exigirPermiso(usuario, 'animal', animalId);
  return intentar(() => unirAnimal(animalId, correctoId));
}

// ---------------------------------------------------------------------------
// Medicamento repetido: sección 10.2
// ---------------------------------------------------------------------------

/** El medicamento registrado con el mismo nombre (sin tildes ni mayúsculas), o undefined. */
export async function medicamentoExistente(duplicado: Pick<RegistroLocal<'medicamento'>, 'id' | 'nombre'>): Promise<RegistroLocal<'medicamento'> | undefined> {
  const nombre = normalizarNombre(duplicado.nombre);
  return (await consulta.medicamento.toArray()).find((m) => m.id !== duplicado.id && m.estado_sync === 'sincronizado' && normalizarNombre(m.nombre) === nombre);
}

/** «Usar el que ya existe». */
export async function resolverMedicamento(duplicadoId: Uuid, usuario: Identidad): Promise<Resultado> {
  await exigirPermiso(usuario, 'medicamento', duplicadoId);
  const duplicado = await consulta.medicamento.get(duplicadoId);
  const existente = duplicado && (await medicamentoExistente(duplicado));
  if (!existente) return { ok: false, error: 'El medicamento registrado todavía no llegó a este teléfono.' };
  return intentar(() => unirMedicamento(duplicadoId, existente.id));
}

// ---------------------------------------------------------------------------
// Chapeta puesta repetida: sección 10.3
// ---------------------------------------------------------------------------

/** «Descartar»: la fecha que vale es la que recibió primero el servicio. */
export async function resolverColocacion(id: Uuid, usuario: Identidad): Promise<Resultado> {
  await exigirPermiso(usuario, 'colocacion_chapeta', id);
  return intentar(() => descartarColocacion(id));
}

// ---------------------------------------------------------------------------
// Presentación
// ---------------------------------------------------------------------------

const NOMBRE_TABLA: Partial<Record<NombreTabla, [string, string]>> = {
  fotografia: ['fotografía', 'fotografías'],
  evento_sanitario: ['evento sanitario', 'eventos sanitarios'],
  produccion_leche: ['ordeño', 'ordeños'],
  pesaje: ['pesaje', 'pesajes'],
  parto: ['parto', 'partos'],
  destino_productivo: ['destino', 'destinos'],
  colocacion_chapeta: ['chapeta puesta', 'chapetas puestas'],
  movimiento_economico: ['movimiento económico', 'movimientos económicos'],
  salida: ['salida', 'salidas'],
  recordatorio: ['recordatorio pospuesto', 'recordatorios pospuestos'],
  animal: ['cría', 'crías'],
  correccion: ['corrección', 'correcciones'],
};

/** «2 pesajes, 1 fotografía»: lo que se pasa o se descarta, agrupado por tabla. */
export function describirMovimientos(plan: readonly Movimiento[], accion: Movimiento['accion']): string {
  const cuentas = new Map<NombreTabla, number>();
  for (const m of plan) if (m.accion === accion) cuentas.set(m.tabla, (cuentas.get(m.tabla) ?? 0) + 1);
  return [...cuentas]
    .map(([tabla, n]) => {
      const [uno, varios] = NOMBRE_TABLA[tabla] ?? [tabla, tabla];
      return `${n} ${n === 1 ? uno : varios}`;
    })
    .join(', ');
}

// ---------------------------------------------------------------------------
// Registros en conflicto: sección 10.6
// ---------------------------------------------------------------------------

export interface ConflictoListado {
  id: Uuid;
  tabla: NombreTabla;
  /** «Animal Z980», «Medicamento Prueba oxitetraciclina», «Pesaje de Z921». */
  titulo: string;
  causa: string;
  /** Dónde se resuelve o se revisa; null si el registro no pertenece a un animal ni al catálogo. */
  destino: { a: string; texto: string } | null;
  /** Si este usuario puede resolverlo; si no, se muestra con la nota de quién lo resuelve. */
  puedeResolver: boolean;
}

const CAMPO_ANIMAL: Partial<Record<NombreTabla, string>> = { parto: 'madre_id' };

/** Los conflictos de este teléfono, con qué son, por qué y adónde ir para resolverlos (decisiones A a D). */
export async function cargarConflictos(usuario: Identidad): Promise<ConflictoListado[]> {
  const [lista, animales] = await Promise.all([listarConflictos(), consulta.animal.toArray()]);
  const chapetas = new Map(animales.map((a) => [a.id, a.codigo_chapeta]));
  const fichaDe = (animalId: unknown) => {
    const codigo = typeof animalId === 'string' ? chapetas.get(animalId) : undefined;
    return codigo ? { a: `/animales/${animalId as string}`, texto: `Ir a la ficha de ${codigo}`, codigo } : null;
  };

  const resultado: ConflictoListado[] = [];
  for (const { tabla, registro } of lista) {
    const base = {
      id: registro.id,
      tabla,
      causa: registro.detalle_conflicto ?? 'Ya existe un registro igual en el servicio.',
      puedeResolver: puedeResolver(usuario, registro.autor_id),
    };
    if (tabla === 'animal') {
      resultado.push({ ...base, titulo: `Animal ${String(registro['codigo_chapeta'])}`, destino: { a: `/animales/${registro.id}`, texto: 'Ir a la ficha' } });
      continue;
    }
    if (tabla === 'medicamento') {
      resultado.push({ ...base, titulo: `Medicamento ${String(registro['nombre'])}`, destino: { a: '/medicamentos', texto: 'Ir al catálogo' } });
      continue;
    }
    // Una corrección se revisa en la ficha del animal del registro que corrige.
    let animalId = registro[CAMPO_ANIMAL[tabla] ?? 'animal_id'];
    if (tabla === 'correccion') {
      const entidad = registro['entidad_afectada'] as NombreTabla;
      const afectado = (await (consulta[entidad] as unknown as { get: (id: Uuid) => Promise<Record<string, unknown> | undefined> }).get(registro['registro_id'] as Uuid)) ?? {};
      animalId = entidad === 'animal' ? registro['registro_id'] : afectado[CAMPO_ANIMAL[entidad] ?? 'animal_id'];
    }
    const ficha = fichaDe(animalId);
    const [nombre] = NOMBRE_TABLA[tabla] ?? [tabla];
    const titulo = `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}${ficha ? ` de ${ficha.codigo}` : ''}`;
    resultado.push({ ...base, titulo, destino: ficha ? { a: ficha.a, texto: ficha.texto } : null });
  }
  return resultado;
}
