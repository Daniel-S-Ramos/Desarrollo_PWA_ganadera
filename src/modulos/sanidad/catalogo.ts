/**
 * Catálogo de medicamentos del predio (apartado 3.8.9, Tabla 31).
 * Especificación: docs/tecnica/18-catalogo-de-medicamentos.md, secciones 4 a 6
 */
import { consulta, unidadDeTrabajo } from '../../datos/repositorio';
import {
  compararMedicamentos,
  normalizarNombre,
  sonParecidos,
  validarMedicamento,
  type ErroresMedicamento,
  type FormularioMedicamento,
} from '../../dominio/medicamentos';
import type { RegistroLocal } from '../../dominio/tipos';
import { PermisoDenegado, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';

export type MedicamentoLocal = RegistroLocal<'medicamento'>;

/** El catálogo ordenado por tipo y nombre. */
export async function listarCatalogo(): Promise<MedicamentoLocal[]> {
  return (await consulta.medicamento.toArray()).sort(compararMedicamentos);
}

/** Lo que el catálogo ya tiene parecido a un nombre: la coincidencia exacta y los parecidos (sección 4). */
export function buscarCoincidencias(
  nombre: string,
  catalogo: readonly MedicamentoLocal[],
): { exacta: MedicamentoLocal | null; parecidos: MedicamentoLocal[] } {
  const buscado = normalizarNombre(nombre);
  if (buscado.length === 0) return { exacta: null, parecidos: [] };
  return {
    exacta: catalogo.find((m) => normalizarNombre(m.nombre) === buscado) ?? null,
    parecidos: catalogo.filter((m) => sonParecidos(m.nombre, nombre)),
  };
}

export type ResultadoMedicamento =
  | { ok: true; medicamento: MedicamentoLocal }
  | { ok: false; errores: ErroresMedicamento }
  | { ok: false; existente: MedicamentoLocal };

class YaExiste extends Error {
  constructor(readonly existente: MedicamentoLocal) {
    super('El medicamento ya existe');
  }
}

/**
 * Crea un medicamento. La coincidencia exacta se verifica otra vez dentro de la transacción, para que
 * dos toques rápidos no creen dos entradas (sección 4).
 *
 * @throws PermisoDenegado si el perfil no puede crear medicamentos (Tabla 27).
 */
export async function crearMedicamento(formulario: FormularioMedicamento, usuario: Identidad): Promise<ResultadoMedicamento> {
  if (!puedeCrear(usuario.perfil, 'medicamento')) throw new PermisoDenegado(usuario.perfil, 'medicamento');
  const validacion = validarMedicamento(formulario);
  if (!validacion.ok) return validacion;
  const { datos } = validacion;

  try {
    const medicamento = await unidadDeTrabajo(usuario.usuario_id, async (tx) => {
      const { exacta } = buscarCoincidencias(datos.nombre, await consulta.medicamento.toArray());
      if (exacta) throw new YaExiste(exacta);
      return tx.crear('medicamento', datos);
    });
    return { ok: true, medicamento };
  } catch (error) {
    if (error instanceof YaExiste) return { ok: false, existente: error.existente };
    throw error;
  }
}
