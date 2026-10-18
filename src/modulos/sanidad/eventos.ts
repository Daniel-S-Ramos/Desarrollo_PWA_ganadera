/**
 * Registro de eventos sanitarios e historial del animal (CU-04, CU-05, HU-03), con la advertencia por
 * repetición (RF-09, HU-09).
 * Especificación: docs/tecnica/20-registro-sanitario.md · docs/tecnica/21-advertencia-por-repeticion.md
 */
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { animalVigente, leerVigentes, vigentes } from '../../datos/vigentes';
import type { Vigente } from '../../dominio/vigente';
import { fechaDelPredio } from '../../dominio/fechas';
import { evaluarRepeticion, type Repeticion } from '../../dominio/repeticion';
import { copiarEvento, ordenarHistorial, ultimaDosis, validarEvento, type ContextoEvento, type ErroresEvento, type FormularioEvento } from '../../dominio/sanidad';
import type { FechaPredio, Perfil, RegistroLocal, UnidadDosis, Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCrear, puedeUsar } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';

export type EventoLocal = RegistroLocal<'evento_sanitario'>;

/** El costo lo ve y lo registra solo el propietario: es información económica (sección 5.2, Tabla 27). */
export function puedeVerCosto(perfil: Perfil): boolean {
  return puedeUsar(perfil, 'CU-14');
}

/** Un medicamento con su tipo, unidad e intervalo vigentes (documento técnico 26, sección 6.3). */
async function medicamentoVigente(id: Uuid): Promise<RegistroLocal<'medicamento'> | undefined> {
  const medicamento = await consulta.medicamento.get(id);
  return medicamento ? (await vigentes('medicamento', [medicamento]))[0] : undefined;
}

async function contextoDe(animalId: Uuid, medicamentoId: Uuid | null): Promise<ContextoEvento | null> {
  const [animal, salidas, medicamento] = await Promise.all([
    animalVigente(animalId),
    consulta.salida.where('animal_id').equals(animalId).count(),
    medicamentoId ? medicamentoVigente(medicamentoId) : Promise.resolve(undefined),
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
  return ultimaDosis(await vigentes('evento_sanitario', await consulta.evento_sanitario.toArray()), medicamentoId);
}

/** El formulario del siguiente animal de una ronda, copiado de un evento; null si no está en el teléfono (sección 7). */
export async function formularioComo(eventoId: Uuid, perfil: Perfil): Promise<FormularioEvento | null> {
  const original = await consulta.evento_sanitario.get(eventoId);
  const evento = original ? (await vigentes('evento_sanitario', [original]))[0] : undefined;
  return evento ? copiarEvento(evento, puedeVerCosto(perfil)) : null;
}

// ---------------------------------------------------------------------------
// Advertencia por repetición: documento técnico 21
// ---------------------------------------------------------------------------

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * El nivel para una fecha y un medicamento. Solo lee tablas que participan en la transacción de
 * registro, para poder repetirse dentro de ella (sección 5).
 */
async function repeticionDe(animalId: Uuid, medicamentoId: Uuid, fecha: FechaPredio): Promise<{ repeticion: Repeticion<EventoLocal>; intervalo: number } | null> {
  const medicamento = await medicamentoVigente(medicamentoId);
  if (!medicamento || !FECHA.test(fecha) || Number.isNaN(Date.parse(fecha))) return null;
  // Sin anulados, con el medicamento y la fecha vigentes (documento técnico 26, sección 6.3).
  const aplicaciones = (await vigentes('evento_sanitario', await consulta.evento_sanitario.where('animal_id').equals(animalId).toArray())).filter(
    (e) => e.medicamento_id === medicamentoId,
  );
  return { repeticion: evaluarRepeticion(aplicaciones, fecha, medicamento.intervalo_advertencia_dias), intervalo: medicamento.intervalo_advertencia_dias };
}

export interface VerificacionRepeticion {
  repeticion: Repeticion<EventoLocal>;
  medicamento: string;
  intervalo: number;
  /** Quién registró la aplicación que se muestra (HU-15). */
  autor: string | null;
}

/** Lo que muestra el aviso al elegir el medicamento y la fecha (secciones 2 y 3); null si falta alguno. */
export async function verificarRepeticion(animalId: Uuid, medicamentoId: Uuid | null, fecha: FechaPredio): Promise<VerificacionRepeticion | null> {
  if (!medicamentoId) return null;
  const resultado = await repeticionDe(animalId, medicamentoId, fecha);
  if (!resultado) return null;
  const { repeticion, intervalo } = resultado;
  const [medicamento, autor] = await Promise.all([
    consulta.medicamento.get(medicamentoId),
    repeticion.nivel === 'ninguno' ? Promise.resolve(undefined) : consulta.usuario.get(repeticion.aplicacion.autor_id),
  ]);
  return {
    repeticion,
    medicamento: medicamento?.nombre ?? '',
    intervalo,
    autor: repeticion.nivel === 'ninguno' ? null : (autor?.nombre ?? 'un usuario que ya no está en el predio'),
  };
}

export type ResultadoEvento =
  | { ok: true; evento: EventoLocal }
  | { ok: false; errores: ErroresEvento }
  /** Hay una aplicación dentro del intervalo y no se confirmó (sección 5). */
  | { ok: false; requiereConfirmacion: true };

class SinConfirmar extends Error {}

class Invalido extends Error {
  constructor(readonly errores: ErroresEvento) {
    super('Evento sanitario inválido');
  }
}

/**
 * Registra un evento sanitario. El animal, el medicamento y la repetición se verifican otra vez dentro
 * de la transacción (documento 20, sección 6; documento 21, sección 5). Con una aplicación del mismo
 * medicamento dentro del intervalo, solo se guarda si el usuario confirmó.
 *
 * @throws PermisoDenegado si el perfil no puede registrar eventos, o si un trabajador envía un costo (sección 5.2).
 */
export async function registrarEvento(
  animalId: Uuid,
  formulario: FormularioEvento,
  usuario: Identidad,
  hoy: FechaPredio = fechaDelPredio(),
  confirmado = false,
): Promise<ResultadoEvento> {
  if (!puedeCrear(usuario.perfil, 'evento_sanitario')) throw new PermisoDenegado(usuario.perfil, 'evento_sanitario');
  if (formulario.costo.trim() !== '' && !puedeVerCosto(usuario.perfil)) throw new PermisoDenegado(usuario.perfil, 'evento_sanitario');
  try {
    const evento = await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      const contexto = await contextoDe(animalId, formulario.medicamento_id);
      if (!contexto) throw new Invalido({ animal: 'El animal no está en este teléfono' });
      const validacion = validarEvento(formulario, contexto, hoy);
      if (!validacion.ok) throw new Invalido(validacion.errores);
      const verificacion = await repeticionDe(animalId, validacion.datos.medicamento_id, validacion.datos.fecha);
      if (verificacion?.repeticion.nivel === 'advertencia' && !confirmado) throw new SinConfirmar();
      return tx.crear('evento_sanitario', { animal_id: animalId, ...validacion.datos });
    });
    return { ok: true, evento };
  } catch (error) {
    if (error instanceof Invalido) return { ok: false, errores: error.errores };
    if (error instanceof SinConfirmar) return { ok: false, requiereConfirmacion: true };
    throw error;
  }
}

export interface EntradaHistorialSanitario {
  /** Con sus valores vigentes. */
  evento: EventoLocal;
  /** Las marcas de corregido y anulado (documento técnico 26, sección 6.4). */
  vigente: Vigente<EventoLocal>;
  medicamento: string;
  unidad: UnidadDosis | undefined;
  autor: string;
}

/** El historial sanitario del animal, del más reciente al más antiguo, con nombres (sección 8). */
export async function cargarHistorialSanitario(animalId: Uuid): Promise<EntradaHistorialSanitario[]> {
  const [eventos, medicamentos, usuarios] = await Promise.all([
    consulta.evento_sanitario.where('animal_id').equals(animalId).toArray().then((r) => leerVigentes('evento_sanitario', r)),
    consulta.medicamento.toArray().then((r) => vigentes('medicamento', r)),
    consulta.usuario.toArray(),
  ]);
  const porId = new Map(medicamentos.map((m) => [m.id, m]));
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
  const porEvento = new Map(eventos.map((v) => [v.registro.id, v]));
  // Los anulados siguen en el historial, marcados (apartado 3.9.5).
  return ordenarHistorial(eventos.map((v) => v.registro)).map((evento) => {
    const medicamento = porId.get(evento.medicamento_id);
    return {
      evento,
      vigente: porEvento.get(evento.id)!,
      medicamento: medicamento?.nombre ?? 'Medicamento que aún no llega al teléfono',
      unidad: medicamento?.unidad,
      autor: nombres.get(evento.autor_id) ?? 'un usuario que ya no está en el predio',
    };
  });
}
