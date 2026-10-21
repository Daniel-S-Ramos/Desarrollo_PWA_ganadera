/**
 * Chapeta pendiente de poner: quién la tiene pendiente, el recordatorio y la confirmación.
 * Especificación: docs/tecnica/25-parto-y-control-reproductivo.md, sección 7
 */
import { leerParametro } from '../../datos/parametros';
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { animalVigente, animalesVigentes, salidasVigentes } from '../../datos/vigentes';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { diasEntre } from '../../dominio/repeticion';
import type { Animal, FechaPredio, RegistroLocal, Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';

/** Plazo máximo del propietario, si el parámetro no estuviera en el teléfono (sección 7.1). */
export const DIAS_CHAPETA_POR_DEFECTO = 90;

/** ¿Se registró sin la chapeta puesta? Ausente es true: los animales anteriores a este campo. */
export function registradoSinChapeta(animal: Pick<Animal, 'chapeta_puesta'>): boolean {
  return animal.chapeta_puesta === false;
}

/** Los animales con la chapeta pendiente: registrados sin ella y sin colocación (sección 7.1). */
export function idsConChapetaPendiente(
  animales: readonly (Pick<Animal, 'chapeta_puesta'> & { id: Uuid })[],
  colocaciones: readonly { animal_id: Uuid }[],
  retirados: ReadonlySet<Uuid> = new Set(),
): Set<Uuid> {
  const colocadas = new Set(colocaciones.map((c) => c.animal_id));
  return new Set(animales.filter((a) => registradoSinChapeta(a) && !colocadas.has(a.id) && !retirados.has(a.id)).map((a) => a.id));
}

export interface TerneroSinChapeta {
  id: Uuid;
  codigo_chapeta: string;
  /** Días de nacido; null si no se conoce el nacimiento. */
  dias: number | null;
  /** Días que quedan del plazo; negativo si ya pasó. null sin nacimiento. */
  quedan: number | null;
  vencido: boolean;
}

/** Ordena: los vencidos primero, del más atrasado al menos; luego por días de nacido; luego por número. */
function prioridad(a: TerneroSinChapeta, b: TerneroSinChapeta): number {
  if (a.vencido !== b.vencido) return a.vencido ? -1 : 1;
  return (b.dias ?? -1) - (a.dias ?? -1) || a.codigo_chapeta.localeCompare(b.codigo_chapeta, 'es', { numeric: true });
}

/** El recordatorio de Inicio: los terneros sin chapeta puesta, con su plazo (sección 7.3). */
export function ternerosSinChapeta(
  animales: readonly (Pick<Animal, 'chapeta_puesta' | 'codigo_chapeta' | 'fecha_nacimiento'> & { id: Uuid })[],
  colocaciones: readonly { animal_id: Uuid }[],
  retirados: ReadonlySet<Uuid>,
  hoy: FechaPredio,
  plazo: number,
): TerneroSinChapeta[] {
  const pendientes = idsConChapetaPendiente(animales, colocaciones, retirados);
  return animales
    .filter((a) => pendientes.has(a.id))
    .map((a) => {
      const dias = a.fecha_nacimiento ? diasEntre(a.fecha_nacimiento, hoy) : null;
      const quedan = dias === null ? null : plazo - dias;
      return { id: a.id, codigo_chapeta: a.codigo_chapeta, dias, quedan, vencido: quedan !== null && quedan < 0 };
    })
    .sort(prioridad);
}

export async function plazoDeChapeta(): Promise<number> {
  return (await leerParametro('dias_recordar_chapeta')) ?? DIAS_CHAPETA_POR_DEFECTO;
}

/** Los terneros sin chapeta puesta del teléfono, para Inicio. */
export async function cargarTernerosSinChapeta(hoy: FechaPredio = fechaDelPredio()): Promise<TerneroSinChapeta[]> {
  const [animales, colocaciones, salidas, plazo] = await Promise.all([
    animalesVigentes(),
    consulta.colocacion_chapeta.toArray(),
    salidasVigentes(),
    plazoDeChapeta(),
  ]);
  return ternerosSinChapeta(animales, colocaciones, new Set(salidas.map((s) => s.animal_id)), hoy, plazo);
}

export type EstadoChapeta =
  | { estado: 'no_aplica' }
  | { estado: 'pendiente'; dias: number | null; quedan: number | null; vencido: boolean }
  | { estado: 'puesta'; colocacion: RegistroLocal<'colocacion_chapeta'>; autor: string; repetida?: RegistroLocal<'colocacion_chapeta'> };

/** El estado de la chapeta de un animal, para su ficha (sección 7.2). */
export async function estadoDeChapeta(animalId: Uuid, hoy: FechaPredio = fechaDelPredio()): Promise<EstadoChapeta> {
  const animal = await animalVigente(animalId);
  if (!animal || !registradoSinChapeta(animal)) return { estado: 'no_aplica' };
  const colocaciones = await consulta.colocacion_chapeta.where('animal_id').equals(animalId).toArray();
  // La que vale es la que aceptó el servicio; la rechazada por repetida se ofrece para descartar (documento 26, sección 10.3).
  const repetida = colocaciones.find((c) => c.estado_sync === 'conflicto');
  const colocacion = colocaciones.find((c) => c.estado_sync !== 'conflicto') ?? repetida;
  if (colocacion) {
    const autor = await consulta.usuario.get(colocacion.autor_id);
    return { estado: 'puesta', colocacion, autor: autor?.nombre ?? 'un usuario que ya no está en el predio', ...(repetida ? { repetida } : {}) };
  }
  const [ternero] = ternerosSinChapeta([animal], [], new Set(), hoy, await plazoDeChapeta());
  return { estado: 'pendiente', dias: ternero?.dias ?? null, quedan: ternero?.quedan ?? null, vencido: ternero?.vencido ?? false };
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(texto: string): boolean {
  if (!FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

/** La fecha en que se puso la chapeta: válida, no futura ni anterior al nacimiento (sección 7.2). */
export function errorDeFechaColocacion(fecha: string, nacimiento: FechaPredio | null, hoy: FechaPredio): string | null {
  if (!esFechaValida(fecha)) return 'Escriba una fecha válida';
  if (fecha > hoy) return 'La fecha no puede ser posterior a hoy';
  if (nacimiento && fecha < nacimiento) return `El animal nació el ${formatearFecha(nacimiento)}`;
  return null;
}

export type ResultadoColocacion = { ok: true } | { ok: false; error: string };

class Rechazo extends Error {}

/**
 * Registra que el animal ya tiene la chapeta puesta. Ambos perfiles (decisión J). Dentro de la
 * transacción se comprueba que siga pendiente.
 */
export async function confirmarChapetaPuesta(animalId: Uuid, fecha: string, usuario: Identidad, hoy: FechaPredio = fechaDelPredio()): Promise<ResultadoColocacion> {
  if (!puedeCrear(usuario.perfil, 'colocacion_chapeta')) throw new PermisoDenegado(usuario.perfil, 'colocacion_chapeta');
  try {
    await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      const animal = await animalVigente(animalId);
      if (!animal) throw new Rechazo('El animal no está en este teléfono');
      if (!registradoSinChapeta(animal)) throw new Rechazo('Este animal se registró con la chapeta puesta');
      if (await consulta.colocacion_chapeta.where('animal_id').equals(animalId).count()) throw new Rechazo('Ya se registró que tiene la chapeta puesta');
      const error = errorDeFechaColocacion(fecha, animal.fecha_nacimiento, hoy);
      if (error) throw new Rechazo(error);
      await tx.crear('colocacion_chapeta', { animal_id: animalId, fecha });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Rechazo) return { ok: false, error: error.message };
    throw error;
  }
}
