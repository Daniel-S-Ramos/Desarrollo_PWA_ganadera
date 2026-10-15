/**
 * Registro de eventos sanitarios e historial del animal (CU-04, CU-05, HU-03).
 * Especificación: docs/tecnica/20-registro-sanitario.md
 */
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { fechaDelPredio } from '../../dominio/fechas';
import { copiarEvento, ordenarHistorial, ultimaDosis, validarEvento, type ContextoEvento, type ErroresEvento, type FormularioEvento } from '../../dominio/sanidad';
import type { FechaPredio, Perfil, RegistroLocal, UnidadDosis, Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCrear, puedeUsar } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';

export type EventoLocal = RegistroLocal<'evento_sanitario'>;

/** El costo lo ve y lo registra solo el propietario: es información económica (sección 5.2, Tabla 27). */
export function puedeVerCosto(perfil: Perfil): boolean {
  return puedeUsar(perfil, 'CU-14');
}

async function contextoDe(animalId: Uuid, medicamentoId: Uuid | null): Promise<ContextoEvento | null> {
  const [animal, salidas, medicamento] = await Promise.all([
    consulta.animal.get(animalId),
    consulta.salida.where('animal_id').equals(animalId).count(),
    medicamentoId ? consulta.medicamento.get(medicamentoId) : Promise.resolve(undefined),
  ]);
  if (!animal) return null;
  return { nacimiento: animal.fecha_nacimiento, retirado: salidas > 0, medicamentoExiste: !!medicamento };
}

/** El contexto con que el formulario valida mientras se escribe; null si el animal no está en el teléfono. */
export function cargarContextoEvento(animalId: Uuid, medicamentoId: Uuid | null): Promise<ContextoEvento | null> {
  return contextoDe(animalId, medicamentoId);
}

/** La última dosis de un medicamento en el predio, para precargar el campo (sección 5.1). */
export async function ultimaDosisDe(medicamentoId: Uuid): Promise<number | null> {
  return ultimaDosis(await consulta.evento_sanitario.toArray(), medicamentoId);
}

/** El formulario del siguiente animal de una ronda, copiado de un evento; null si no está en el teléfono (sección 7). */
export async function formularioComo(eventoId: Uuid, perfil: Perfil): Promise<FormularioEvento | null> {
  const evento = await consulta.evento_sanitario.get(eventoId);
  return evento ? copiarEvento(evento, puedeVerCosto(perfil)) : null;
}

export type ResultadoEvento = { ok: true; evento: EventoLocal } | { ok: false; errores: ErroresEvento };

class Invalido extends Error {
  constructor(readonly errores: ErroresEvento) {
    super('Evento sanitario inválido');
  }
}

/**
 * Registra un evento sanitario. El animal y el medicamento se verifican otra vez dentro de la
 * transacción (sección 6).
 *
 * @throws PermisoDenegado si el perfil no puede registrar eventos, o si un trabajador envía un costo (sección 5.2).
 */
export async function registrarEvento(
  animalId: Uuid,
  formulario: FormularioEvento,
  usuario: Identidad,
  hoy: FechaPredio = fechaDelPredio(),
): Promise<ResultadoEvento> {
  if (!puedeCrear(usuario.perfil, 'evento_sanitario')) throw new PermisoDenegado(usuario.perfil, 'evento_sanitario');
  if (formulario.costo.trim() !== '' && !puedeVerCosto(usuario.perfil)) throw new PermisoDenegado(usuario.perfil, 'evento_sanitario');
  try {
    const evento = await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      const contexto = await contextoDe(animalId, formulario.medicamento_id);
      if (!contexto) throw new Invalido({ animal: 'El animal no está en este teléfono' });
      const validacion = validarEvento(formulario, contexto, hoy);
      if (!validacion.ok) throw new Invalido(validacion.errores);
      return tx.crear('evento_sanitario', { animal_id: animalId, ...validacion.datos });
    });
    return { ok: true, evento };
  } catch (error) {
    if (error instanceof Invalido) return { ok: false, errores: error.errores };
    throw error;
  }
}

export interface EntradaHistorialSanitario {
  evento: EventoLocal;
  medicamento: string;
  unidad: UnidadDosis | undefined;
  autor: string;
}

/** El historial sanitario del animal, del más reciente al más antiguo, con nombres (sección 8). */
export async function cargarHistorialSanitario(animalId: Uuid): Promise<EntradaHistorialSanitario[]> {
  const [eventos, medicamentos, usuarios] = await Promise.all([
    consulta.evento_sanitario.where('animal_id').equals(animalId).toArray(),
    consulta.medicamento.toArray(),
    consulta.usuario.toArray(),
  ]);
  const porId = new Map(medicamentos.map((m) => [m.id, m]));
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
  return ordenarHistorial(eventos).map((evento) => {
    const medicamento = porId.get(evento.medicamento_id);
    return {
      evento,
      medicamento: medicamento?.nombre ?? 'Medicamento que aún no llega al teléfono',
      unidad: medicamento?.unidad,
      autor: nombres.get(evento.autor_id) ?? 'un usuario que ya no está en el predio',
    };
  });
}
