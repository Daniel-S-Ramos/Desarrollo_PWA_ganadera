/**
 * Registro de la salida y venta del animal (RF-15, CU-13, HU-11).
 * Especificación: docs/tecnica/29-salida-y-venta.md
 */
import { leerParametro } from '../../datos/parametros';
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { animalVigente, contarSalidasVigentes, leerVigentes, vigentes } from '../../datos/vigentes';
import { fechaDelPredio } from '../../dominio/fechas';
import { validarSalida, type ErroresSalida, type FormularioSalida } from '../../dominio/salida';
import type { FechaPredio, RegistroLocal, Uuid } from '../../dominio/tipos';
import type { Vigente } from '../../dominio/vigente';
import { PermisoDenegado, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { ultimoPeso, type UltimoPeso } from '../consulta/ficha';
import { fechaDeLlegada } from '../destino/destino';

/** Si el parámetro dias_sin_pesaje no está en el teléfono (Tabla 30: 30 días). */
export const DIAS_SIN_PESAJE_POR_DEFECTO = 30;

export interface ContextoSalida {
  animal: RegistroLocal<'animal'>;
  /** Tiene una salida vigente: ya está retirado. */
  retirado: boolean;
  llegada: FechaPredio | null;
  ultimoPeso: UltimoPeso;
  /** Fecha del último pesaje vigente, para el aviso de pesaje reciente (sección 5). */
  ultimoPesaje: FechaPredio | null;
  diasSinPesaje: number;
}

/** Lo que necesita la pantalla para registrar la salida del animal; null si no está en el teléfono. */
export async function cargarParaSalida(animalId: Uuid): Promise<ContextoSalida | null> {
  const [animal, salidas, pesajes, parametro] = await Promise.all([
    animalVigente(animalId),
    consulta.salida.where('animal_id').equals(animalId).toArray().then((r) => leerVigentes('salida', r)),
    consulta.pesaje.where('animal_id').equals(animalId).toArray().then((r) => vigentes('pesaje', r)),
    leerParametro('dias_sin_pesaje'),
  ]);
  if (!animal) return null;
  const retirado = salidas.some((s) => s.anulacion === null);
  const ultimo = [...pesajes].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  return {
    animal,
    retirado,
    llegada: fechaDeLlegada(animal),
    ultimoPeso: ultimoPeso(animal, pesajes),
    ultimoPesaje: ultimo?.fecha ?? null,
    diasSinPesaje: parametro ?? DIAS_SIN_PESAJE_POR_DEFECTO,
  };
}

/** La salida del animal para la ficha, con su marca de corregida o anulada (sección 7); undefined si no tiene. */
export async function salidaDelAnimal(animalId: Uuid): Promise<Vigente<RegistroLocal<'salida'>> | undefined> {
  const salidas = await consulta.salida.where('animal_id').equals(animalId).toArray().then((r) => leerVigentes('salida', r));
  // La vigente primero; si solo hay anuladas, la más reciente, para mostrarla tachada.
  return salidas.find((s) => s.anulacion === null) ?? salidas.sort((a, b) => b.original.creado_en.localeCompare(a.original.creado_en))[0];
}

export type ResultadoSalida = { ok: true; salida: RegistroLocal<'salida'> } | { ok: false; errores: ErroresSalida & { registro?: string } };

class Detener extends Error {
  constructor(readonly errores: ErroresSalida & { registro?: string }) {
    super('Salida no registrada');
  }
}

/**
 * Registra la salida (sección 6). Dentro de la transacción se comprueba que el animal no tenga ya una salida
 * vigente; una anulada no cuenta, como en el servicio (sección 8).
 *
 * @throws PermisoDenegado si el perfil no es el propietario (Tabla 27, RD-05).
 */
export async function registrarSalida(animalId: Uuid, formulario: FormularioSalida, usuario: Identidad, hoy: FechaPredio = fechaDelPredio()): Promise<ResultadoSalida> {
  if (!puedeCrear(usuario.perfil, 'salida')) throw new PermisoDenegado(usuario.perfil, 'salida');
  const contexto = await cargarParaSalida(animalId);
  if (!contexto) return { ok: false, errores: { registro: 'Este animal no está en el teléfono' } };
  const v = validarSalida(formulario, hoy, contexto.llegada);
  if (!v.ok) return { ok: false, errores: v.errores };
  try {
    const salida = await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      if ((await contarSalidasVigentes(animalId)) > 0) throw new Detener({ registro: 'Este animal ya tiene registrada su salida' });
      return tx.crear('salida', { animal_id: animalId, ...v.datos });
    });
    return { ok: true, salida };
  } catch (error) {
    if (error instanceof Detener) return { ok: false, errores: error.errores };
    throw error;
  }
}
