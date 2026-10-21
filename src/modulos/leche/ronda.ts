/**
 * Ronda de ordeño (CU-06, HU-04): vacas en producción, siguiente vaca, promedio y registro con
 * reemplazo como corrección (apartado 3.8.6).
 * Especificación: docs/tecnica/22-ronda-de-ordeno.md
 */
import { leerParametro } from '../../datos/parametros';
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import { animalVigente, animalesVigentes, contarSalidasVigentes, leerVigentes, salidasVigentes, vigentes } from '../../datos/vigentes';
import { destinoVigente } from '../../dominio/destino';
import { fechaDelPredio } from '../../dominio/fechas';
import { DIAS_PROMEDIO_POR_DEFECTO, promedioReciente, validarOrdeno, type ErroresOrdeno } from '../../dominio/leche';
import type { FechaPredio, Perfil, RegistroLocal, Uuid } from '../../dominio/tipos';
import { PermisoDenegado, puedeCorregir, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { compararChapetas } from '../consulta/listado';

export type OrdenoLocal = RegistroLocal<'produccion_leche'>;

/** El registro que una vaca ya tiene en la fecha, con su valor vigente y su autor (sección 7). */
export interface RegistroExistente {
  registro: OrdenoLocal;
  litros: number;
  autor: string;
  perfilAutor: Perfil | undefined;
  /** El ordeño de ese día fue anulado: la vaca no admite otro registro esa fecha (documento técnico 26, sección 7). */
  anulado: boolean;
}

export interface VacaRonda {
  animal_id: Uuid;
  codigo_chapeta: string;
  existente: RegistroExistente | null;
}

/** ¿Está la vaca en la ronda? Hembra, con destino vigente leche y sin salida (sección 4). */
async function enProduccion(animalId: Uuid): Promise<boolean> {
  const [animal, destinos, salidas] = await Promise.all([
    animalVigente(animalId),
    consulta.destino_productivo.where('animal_id').equals(animalId).toArray().then((r) => vigentes('destino_productivo', r)),
    contarSalidasVigentes(animalId),
  ]);
  return !!animal && animal.sexo === 'hembra' && salidas === 0 && destinoVigente(destinos)?.destino === 'leche';
}

/** Las vacas de la ronda en la fecha, en orden de chapeta, con el registro que ya tengan (secciones 4 y 5). */
export async function cargarRonda(fecha: FechaPredio): Promise<VacaRonda[]> {
  const [animales, destinos, salidas, registros, usuarios] = await Promise.all([
    animalesVigentes(),
    consulta.destino_productivo.toArray().then((r) => vigentes('destino_productivo', r)),
    salidasVigentes(),
    consulta.produccion_leche.where('fecha').equals(fecha).toArray().then((r) => leerVigentes('produccion_leche', r)),
    consulta.usuario.toArray(),
  ]);
  const retirados = new Set(salidas.map((s) => s.animal_id));
  const destinosPorAnimal = new Map<Uuid, typeof destinos>();
  for (const d of destinos) destinosPorAnimal.set(d.animal_id, [...(destinosPorAnimal.get(d.animal_id) ?? []), d]);
  const porAnimal = new Map(registros.map((v) => [v.original.animal_id, v]));
  const personas = new Map(usuarios.map((u) => [u.id, u]));

  return animales
    .filter((a) => a.sexo === 'hembra' && !retirados.has(a.id) && destinoVigente(destinosPorAnimal.get(a.id) ?? [])?.destino === 'leche')
    .sort((a, b) => compararChapetas(a.codigo_chapeta, b.codigo_chapeta))
    .map((a) => {
      const vigente = porAnimal.get(a.id);
      const autor = vigente ? personas.get(vigente.original.autor_id) : undefined;
      return {
        animal_id: a.id,
        codigo_chapeta: a.codigo_chapeta,
        existente: vigente
          ? {
              registro: vigente.original,
              litros: vigente.registro.litros,
              autor: autor?.nombre ?? 'un usuario que ya no está en el predio',
              perfilAutor: autor?.perfil,
              anulado: vigente.anulacion !== null,
            }
          : null,
      };
    });
}

/** La primera vaca sin registro en la fecha; null si la ronda está completa (sección 5). */
export function siguienteVaca(vacas: readonly VacaRonda[]): VacaRonda | null {
  return vacas.find((v) => v.existente === null) ?? null;
}

/** El promedio de la vaca en los días anteriores a la fecha, con valores vigentes (sección 6.2). */
export async function promedioDe(animalId: Uuid, fecha: FechaPredio): Promise<{ dias: number; resultado: { promedio: number; registros: number } | null }> {
  const [registros, parametro] = await Promise.all([consulta.produccion_leche.where('animal_id').equals(animalId).toArray(), leerParametro('dias_promedio_produccion')]);
  const dias = parametro ?? DIAS_PROMEDIO_POR_DEFECTO;
  // Sin anulados y con los litros vigentes (documento técnico 26, sección 6.3).
  const resultado = promedioReciente(
    (await vigentes('produccion_leche', registros)).map((r) => ({ fecha: r.fecha, litros: r.litros })),
    fecha,
    dias,
  );
  return { dias, resultado };
}

/** ¿Puede este usuario reemplazar el registro existente? Es la regla de corrección de 3.9.5 (sección 7). */
export function puedeReemplazar(usuario: Identidad, existente: Pick<RegistroExistente, 'registro' | 'perfilAutor'>, ahora: Date = new Date()): boolean {
  return puedeCorregir(usuario, existente.registro, existente.perfilAutor, ahora);
}

export type ResultadoOrdeno =
  | { ok: true; resultado: 'registrado' | 'reemplazado' | 'sin_cambios' }
  | { ok: false; errores: ErroresOrdeno }
  /** Hay un registro en la fecha y no se confirmó su reemplazo (o apareció al guardar). */
  | { ok: false; requiereConfirmacion: true }
  /** Hay un registro que el usuario no puede reemplazar (CU-06, 3b). */
  | { ok: false; sinPermiso: true };

class Detener extends Error {
  constructor(readonly resultado: ResultadoOrdeno) {
    super('Ordeño no registrado');
  }
}

/**
 * Registra el ordeño de una vaca. Si ya tiene registro en la fecha, el valor nuevo se guarda como una
 * corrección de litros con el motivo «registro duplicado», solo si el usuario confirmó y puede
 * corregirlo (sección 7). Todo se verifica otra vez dentro de la transacción.
 *
 * @throws PermisoDenegado si el perfil no puede registrar producción (Tabla 27).
 */
export async function registrarOrdeno(
  animalId: Uuid,
  fecha: string,
  texto: string,
  usuario: Identidad,
  confirmado = false,
  hoy: FechaPredio = fechaDelPredio(),
  ahora: Date = new Date(),
): Promise<ResultadoOrdeno> {
  if (!puedeCrear(usuario.perfil, 'produccion_leche')) throw new PermisoDenegado(usuario.perfil, 'produccion_leche');
  const validacion = validarOrdeno(texto, fecha, hoy);
  if (!validacion.ok) return validacion;
  const { litros } = validacion;
  // Los usuarios no participan en la transacción: se leen antes, para decidir el permiso dentro.
  const perfiles = new Map((await consulta.usuario.toArray()).map((u) => [u.id, u.perfil]));

  try {
    return await unidadDeTrabajo(usuario.usuario_id, async (tx): Promise<ResultadoOrdeno> => {
      if (!(await enProduccion(animalId))) throw new Detener({ ok: false, errores: { animal: 'Esta vaca ya no está en producción' } });
      const registro = await consulta.produccion_leche.where('[animal_id+fecha]').equals([animalId, fecha]).first();
      if (!registro) {
        await tx.crear('produccion_leche', { animal_id: animalId, fecha, litros });
        return { ok: true, resultado: 'registrado' };
      }
      const [actual] = await leerVigentes('produccion_leche', [registro]);
      if (actual!.anulacion) {
        throw new Detener({ ok: false, errores: { animal: 'El ordeño de esta vaca en esta fecha fue anulado: no admite otro registro ese día' } });
      }
      if (!puedeCorregir(usuario, registro, perfiles.get(registro.autor_id), ahora)) throw new Detener({ ok: false, sinPermiso: true });
      const vigente = actual!.registro.litros;
      if (vigente === litros) return { ok: true, resultado: 'sin_cambios' };
      if (!confirmado) throw new Detener({ ok: false, requiereConfirmacion: true });
      await tx.crear('correccion', {
        entidad_afectada: 'produccion_leche',
        registro_id: registro.id,
        tipo: 'correccion',
        campo: 'litros',
        valor_anterior: String(vigente),
        valor_nuevo: String(litros),
        motivo: 'registro_duplicado',
        nota: null,
      });
      return { ok: true, resultado: 'reemplazado' };
    });
  } catch (error) {
    if (error instanceof Detener) return error.resultado;
    throw error;
  }
}
