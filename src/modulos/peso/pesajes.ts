/**
 * Registro de pesajes y evolución del peso de un animal (CU-08, CU-09, HU-05).
 * Especificación: docs/tecnica/24-pesaje-y-evolucion.md
 */
import { leerParametro } from '../../datos/parametros';
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { animalVigente, leerVigentes } from '../../datos/vigentes';
import type { Vigente } from '../../dominio/vigente';
import { fechaDelPredio } from '../../dominio/fechas';
import {
  compararConAnterior,
  pesoAnterior,
  resumenPeso,
  serieDePeso,
  tramos,
  validarPesaje,
  type ContextoPesaje,
  type ErroresPesaje,
  type FormularioPesaje,
  type PuntoPeso,
  type TramoPeso,
} from '../../dominio/peso';
import type { FechaPredio, RegistroLocal, Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { fechaDeLlegada } from '../destino/destino';

export type PesajeLocal = RegistroLocal<'pesaje'>;

/**
 * El animal y sus pesajes con valores vigentes. `pesajes` excluye los anulados, que no cuentan en ningún
 * cálculo; `todos` los incluye, para mostrarlos marcados (documento técnico 26, sección 6).
 */
async function datosDe(animalId: Uuid): Promise<{ animal: RegistroLocal<'animal'>; pesajes: PesajeLocal[]; todos: Vigente<PesajeLocal>[]; contexto: ContextoPesaje } | null> {
  const animal = await animalVigente(animalId);
  if (!animal) return null;
  const [todos, salidas] = await Promise.all([
    consulta.pesaje.where('animal_id').equals(animalId).toArray().then((r) => leerVigentes('pesaje', r)),
    consulta.salida.where('animal_id').equals(animalId).count(),
  ]);
  const pesajes = todos.filter((v) => v.anulacion === null).map((v) => v.registro);
  return { animal, pesajes, todos, contexto: { llegada: fechaDeLlegada(animal), retirado: salidas > 0 } };
}

/** Lo que necesita el formulario para validar y comparar mientras se escribe (secciones 4 a 6). */
export async function cargarParaPesaje(animalId: Uuid, fecha: FechaPredio) {
  const [datos, usuarios] = await Promise.all([datosDe(animalId), consulta.usuario.toArray()]);
  if (!datos) return null;
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
  return {
    contexto: datos.contexto,
    anterior: pesoAnterior(datos.animal, datos.pesajes, fecha),
    // El más reciente primero, con su autor (sección 5).
    mismoDia: datos.pesajes
      .filter((p) => p.fecha === fecha)
      .sort((a, b) => (a.id < b.id ? 1 : -1))
      .map((p) => ({ pesaje: p, autor: nombres.get(p.autor_id) ?? 'un usuario que ya no está en el predio' })),
  };
}

/** Las dos confirmaciones del formulario (secciones 5 y 6). */
export interface Confirmaciones {
  /** El cambio atípico frente al peso anterior. */
  variacion: boolean;
  /** Otro pesaje en una fecha que ya tiene uno (segunda confirmación pedida por el autor, PE-29). */
  mismoDia: boolean;
}

export const SIN_CONFIRMAR: Confirmaciones = { variacion: false, mismoDia: false };

export type ResultadoPesaje =
  | { ok: true; pesaje: PesajeLocal }
  | { ok: false; errores: ErroresPesaje }
  | { ok: false; requiereConfirmacion: 'variacion' | 'mismo_dia' };

class Detener extends Error {
  constructor(readonly resultado: ResultadoPesaje) {
    super('Pesaje no registrado');
  }
}

/**
 * Registra un pesaje. El animal, el pesaje del mismo día y la variación atípica se verifican otra vez
 * dentro de la transacción; cada uno exige su propia confirmación (secciones 5 y 6).
 *
 * @throws PermisoDenegado si el perfil no puede registrar pesajes (Tabla 27).
 */
export async function registrarPesaje(
  animalId: Uuid,
  formulario: FormularioPesaje,
  usuario: Identidad,
  confirmaciones: Confirmaciones = SIN_CONFIRMAR,
  hoy: FechaPredio = fechaDelPredio(),
): Promise<ResultadoPesaje> {
  if (!puedeCrear(usuario.perfil, 'pesaje')) throw new PermisoDenegado(usuario.perfil, 'pesaje');
  try {
    const pesaje = await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      const datos = await datosDe(animalId);
      if (!datos) throw new Detener({ ok: false, errores: { animal: 'El animal no está en este teléfono' } });
      const v = validarPesaje(formulario, datos.contexto, hoy);
      if (!v.ok) throw new Detener(v);
      if (datos.pesajes.some((p) => p.fecha === v.fecha) && !confirmaciones.mismoDia) throw new Detener({ ok: false, requiereConfirmacion: 'mismo_dia' });
      const comparacion = compararConAnterior(v.peso, v.fecha, pesoAnterior(datos.animal, datos.pesajes, v.fecha));
      if (comparacion?.atipica && !confirmaciones.variacion) throw new Detener({ ok: false, requiereConfirmacion: 'variacion' });
      return tx.crear('pesaje', { animal_id: animalId, fecha: v.fecha, peso: v.peso, metodo: v.metodo });
    });
    return { ok: true, pesaje };
  } catch (error) {
    if (error instanceof Detener) return error.resultado;
    throw error;
  }
}

/** La ganancia diaria esperada, si el propietario ya la definió (sección 8). */
export async function metaDeGanancia(): Promise<number | null> {
  return (await leerParametro('ganancia_diaria_esperada')) ?? null;
}

export interface EvolucionPeso {
  tramos: (TramoPeso & { autor: string | null; vigente: Vigente<PesajeLocal> | null })[];
  /** Los pesajes anulados, visibles pero fuera de la serie (documento técnico 26, sección 6.4). */
  anulados: { vigente: Vigente<PesajeLocal>; autor: string }[];
  resumen: ReturnType<typeof resumenPeso>;
  meta: number | null;
}

/** La serie del animal con sus tramos, autores y resumen (sección 7); null si el animal no está. */
export async function cargarEvolucion(animalId: Uuid): Promise<EvolucionPeso | null> {
  const [datos, usuarios, meta] = await Promise.all([datosDe(animalId), consulta.usuario.toArray(), metaDeGanancia()]);
  if (!datos) return null;
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
  const nombre = (id: Uuid) => nombres.get(id) ?? 'un usuario que ya no está en el predio';
  const porId = new Map(datos.todos.map((v) => [v.registro.id, v]));
  const serie: PuntoPeso[] = serieDePeso(datos.animal, datos.pesajes);
  return {
    tramos: tramos(serie, meta).map((t) => ({
      ...t,
      autor: t.punto.autor_id ? nombre(t.punto.autor_id) : null,
      vigente: t.punto.id ? (porId.get(t.punto.id) ?? null) : null,
    })),
    anulados: datos.todos.filter((v) => v.anulacion !== null).map((v) => ({ vigente: v, autor: nombre(v.original.autor_id) })),
    resumen: resumenPeso(serie),
    meta,
  };
}
