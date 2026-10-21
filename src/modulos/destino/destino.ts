/**
 * Destino productivo de un animal: consulta y asignación (CU-12, HU-13).
 * Especificación: docs/tecnica/19-destino-productivo.md
 */
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { animalVigente, contarSalidasVigentes, leerVigentes, vigentes } from '../../datos/vigentes';
import type { Vigente } from '../../dominio/vigente';
import { destinoVigente, historialDestino, validarCambioDestino, type ContextoDestino, type ErroresDestino, type FormularioDestino } from '../../dominio/destino';
import { fechaDelPredio } from '../../dominio/fechas';
import type { FechaPredio, RegistroLocal, Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';

export type RegistroDestinoLocal = RegistroLocal<'destino_productivo'>;

/** Cuándo llegó el animal al predio: su ingreso si fue comprado, su nacimiento si nació en él (sección 4.1). */
export function fechaDeLlegada(animal: Pick<RegistroLocal<'animal'>, 'fecha_ingreso' | 'fecha_nacimiento'>): FechaPredio | null {
  return animal.fecha_ingreso ?? animal.fecha_nacimiento;
}

async function contextoDe(animalId: Uuid): Promise<{ registros: RegistroDestinoLocal[]; contexto: ContextoDestino } | null> {
  // Datos vigentes y destinos sin anular (documento técnico 26, sección 6.3).
  const animal = await animalVigente(animalId);
  if (!animal) return null;
  const [registros, salidas] = await Promise.all([
    consulta.destino_productivo.where('animal_id').equals(animalId).toArray().then((r) => vigentes('destino_productivo', r)),
    contarSalidasVigentes(animalId),
  ]);
  return { registros, contexto: { vigente: destinoVigente(registros), retirado: salidas > 0, llegada: fechaDeLlegada(animal) } };
}

export interface EntradaHistorial {
  registro: RegistroDestinoLocal;
  anterior: RegistroDestinoLocal | null;
  autor: string;
  /** Las marcas de anulado (documento técnico 26, sección 6.4). */
  vigente: Vigente<RegistroDestinoLocal>;
}

/**
 * El historial del animal con el nombre de quien asignó cada destino (HU-13 criterio 4, HU-15). El «anterior»
 * se calcula sin los anulados; los anulados se listan al final, marcados (documento técnico 26, sección 6).
 */
export async function cargarHistorialDestino(animalId: Uuid): Promise<EntradaHistorial[]> {
  const [todos, usuarios] = await Promise.all([
    consulta.destino_productivo.where('animal_id').equals(animalId).toArray().then((r) => leerVigentes('destino_productivo', r)),
    consulta.usuario.toArray(),
  ]);
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
  const autor = (id: Uuid) => nombres.get(id) ?? 'un usuario que ya no está en el predio';
  const porId = new Map(todos.map((v) => [v.registro.id, v]));
  const vigentesDelAnimal = historialDestino(todos.filter((v) => v.anulacion === null).map((v) => v.registro)).map((e) => ({
    ...e,
    autor: autor(e.registro.autor_id),
    vigente: porId.get(e.registro.id)!,
  }));
  const anulados = historialDestino(todos.filter((v) => v.anulacion !== null).map((v) => v.registro)).map((e) => ({
    registro: e.registro,
    anterior: null,
    autor: autor(e.registro.autor_id),
    vigente: porId.get(e.registro.id)!,
  }));
  return [...vigentesDelAnimal, ...anulados];
}

/** El contexto que necesita el formulario para validar mientras se escribe. */
export async function cargarContextoDestino(animalId: Uuid): Promise<ContextoDestino | null> {
  return (await contextoDe(animalId))?.contexto ?? null;
}

export type ResultadoDestino = { ok: true; registro: RegistroDestinoLocal } | { ok: false; errores: ErroresDestino };

class Invalido extends Error {
  constructor(readonly errores: ErroresDestino) {
    super('Cambio de destino inválido');
  }
}

/**
 * Asigna un destino. Las reglas que dependen del vigente se repiten dentro de la transacción, para que
 * dos guardados seguidos no partan de la misma base (sección 4.1).
 *
 * @throws PermisoDenegado si el perfil no es el propietario (Tabla 27).
 */
export async function asignarDestino(
  animalId: Uuid,
  formulario: FormularioDestino,
  usuario: Identidad,
  hoy: FechaPredio = fechaDelPredio(),
): Promise<ResultadoDestino> {
  if (!puedeCrear(usuario.perfil, 'destino_productivo')) throw new PermisoDenegado(usuario.perfil, 'destino_productivo');
  try {
    const registro = await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      const actual = await contextoDe(animalId);
      if (!actual) throw new Invalido({ animal: 'El animal no está en este teléfono' });
      const validacion = validarCambioDestino(formulario, actual.contexto, hoy);
      if (!validacion.ok) throw new Invalido(validacion.errores);
      return tx.crear('destino_productivo', { animal_id: animalId, destino: validacion.destino, desde: validacion.desde });
    });
    return { ok: true, registro };
  } catch (error) {
    if (error instanceof Invalido) return { ok: false, errores: error.errores };
    throw error;
  }
}
