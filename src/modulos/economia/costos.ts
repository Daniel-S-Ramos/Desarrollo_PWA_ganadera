/**
 * Registro de los costos por animal: compra, servicio veterinario y alimentación (RF-20, HU-16.1).
 * Especificación: docs/tecnica/31-consolidado-economico.md, secciones 3 y 4
 */
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { animalVigente, vigentes } from '../../datos/vigentes';
import { validarCosto, type ErroresCosto, type FormularioCosto, type LimitesCosto } from '../../dominio/economia';
import { fechaDelPredio } from '../../dominio/fechas';
import { origenDe } from '../../dominio/origen';
import type { FechaPredio, RegistroLocal, Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { fechaDeLlegada } from '../destino/destino';

export interface ContextoCosto extends Omit<LimitesCosto, 'hoy'> {
  animal: RegistroLocal<'animal'>;
}

/** Lo que necesita el formulario; null si el animal no está en el teléfono. */
export async function cargarParaCosto(animalId: Uuid): Promise<ContextoCosto | null> {
  const [animal, movimientos, salidas] = await Promise.all([
    animalVigente(animalId),
    consulta.movimiento_economico.where('animal_id').equals(animalId).toArray().then((r) => vigentes('movimiento_economico', r)),
    consulta.salida.where('animal_id').equals(animalId).toArray().then((r) => vigentes('salida', r)),
  ]);
  if (!animal) return null;
  return {
    animal,
    llegada: fechaDeLlegada(animal),
    salida: salidas[0]?.fecha ?? null,
    admiteCompra: origenDe(animal) === 'comprado' && !movimientos.some((m) => m.concepto === 'compra'),
  };
}

export type ResultadoCosto = { ok: true; costo: RegistroLocal<'movimiento_economico'> } | { ok: false; errores: ErroresCosto & { registro?: string } };

class Detener extends Error {
  constructor(readonly errores: ErroresCosto & { registro?: string }) {
    super('Costo no registrado');
  }
}

/**
 * Registra el costo (sección 3). Dentro de la transacción se comprueba que una compra no encuentre otra vigente
 * (sección 4).
 *
 * @throws PermisoDenegado si el perfil no es el propietario (Tabla 27).
 */
export async function registrarCosto(animalId: Uuid, formulario: FormularioCosto, usuario: Identidad, hoy: FechaPredio = fechaDelPredio()): Promise<ResultadoCosto> {
  if (!puedeCrear(usuario.perfil, 'movimiento_economico')) throw new PermisoDenegado(usuario.perfil, 'movimiento_economico');
  const contexto = await cargarParaCosto(animalId);
  if (!contexto) return { ok: false, errores: { registro: 'Este animal no está en el teléfono' } };
  const v = validarCosto(formulario, { ...contexto, hoy });
  if (!v.ok) return { ok: false, errores: v.errores };
  try {
    const costo = await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      if (v.datos.concepto === 'compra') {
        const compras = await consulta.movimiento_economico.where('animal_id').equals(animalId).toArray().then((r) => vigentes('movimiento_economico', r));
        if (compras.some((m) => m.concepto === 'compra')) throw new Detener({ registro: 'Este animal ya tiene registrada su compra' });
      }
      return tx.crear('movimiento_economico', { animal_id: animalId, ...v.datos });
    });
    return { ok: true, costo };
  } catch (error) {
    if (error instanceof Detener) return { ok: false, errores: error.errores };
    throw error;
  }
}
