/**
 * Registro de pesajes y evolución del peso de un animal (CU-08, CU-09, HU-05).
 * Especificación: docs/tecnica/24-pesaje-y-evolucion.md
 */
import { leerParametro } from '../../datos/parametros';
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
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

async function datosDe(animalId: Uuid): Promise<{ animal: RegistroLocal<'animal'>; pesajes: PesajeLocal[]; contexto: ContextoPesaje } | null> {
  const animal = await consulta.animal.get(animalId);
  if (!animal) return null;
  const [pesajes, salidas] = await Promise.all([
    consulta.pesaje.where('animal_id').equals(animalId).toArray(),
    consulta.salida.where('animal_id').equals(animalId).count(),
  ]);
  return { animal, pesajes, contexto: { llegada: fechaDeLlegada(animal), retirado: salidas > 0 } };
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
  tramos: (TramoPeso & { autor: string | null })[];
  resumen: ReturnType<typeof resumenPeso>;
  meta: number | null;
}

/** La serie del animal con sus tramos, autores y resumen (sección 7); null si el animal no está. */
export async function cargarEvolucion(animalId: Uuid): Promise<EvolucionPeso | null> {
  const [datos, usuarios, meta] = await Promise.all([datosDe(animalId), consulta.usuario.toArray(), metaDeGanancia()]);
  if (!datos) return null;
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
  const serie: PuntoPeso[] = serieDePeso(datos.animal, datos.pesajes);
  return {
    tramos: tramos(serie, meta).map((t) => ({
      ...t,
      autor: t.punto.autor_id ? (nombres.get(t.punto.autor_id) ?? 'un usuario que ya no está en el predio') : null,
    })),
    resumen: resumenPeso(serie),
    meta,
  };
}
