/**
 * Gestor de permisos del teléfono (Tabla 27, apartados 3.9.2 y 3.9.3).
 * Especificación: docs/tecnica/08-permisos.md, sección 7
 *
 * Decide qué pantallas y acciones ve cada perfil y rechaza una escritura no permitida antes de
 * hacerla. No es la garantía de seguridad: esa la dan las políticas del servicio, que vuelven a
 * decidir cada operación cuando sube (migración 20261007000200_politicas_rls.sql).
 */
import { crear } from '../datos/repositorio';
import { fechaDelPredio } from '../dominio/fechas';
import type { DatosNuevos, NombreTabla, Perfil, RegistroLocal } from '../dominio/tipos';
import type { Identidad } from './token';

// ---------------------------------------------------------------------------
// Funciones: Tabla 27
// ---------------------------------------------------------------------------

export type CasoDeUso =
  | 'CU-01' | 'CU-02' | 'CU-03' | 'CU-04' | 'CU-05' | 'CU-06' | 'CU-07' | 'CU-08' | 'CU-09'
  | 'CU-10' | 'CU-11' | 'CU-12' | 'CU-13' | 'CU-14' | 'CU-15' | 'CU-16' | 'CU-17' | 'CU-18';

/** Casos de uso habilitados para el trabajador. El propietario tiene todos. */
const CASOS_DEL_TRABAJADOR: ReadonlySet<CasoDeUso> = new Set<CasoDeUso>([
  'CU-01', // Iniciar sesión
  'CU-02', // Registrar un animal (solo creación)
  'CU-03', // Consultar la ficha (solo consulta)
  'CU-04', // Registrar un evento sanitario (solo creación)
  'CU-05', // Consultar el historial sanitario (solo consulta)
  'CU-06', // Registrar la producción de leche (solo creación)
  'CU-08', // Registrar el pesaje (solo creación)
  'CU-09', // Consultar la evolución del peso (solo consulta)
  'CU-10', // Registrar un parto (solo creación)
  'CU-15', // Atender recordatorios (solo consulta)
  'CU-16', // Sincronizar (automático)
  'CU-17', // Corregir o anular (con la regla de puedeCorregir)
]);

/** ¿Se muestra esta pantalla o acción al perfil? */
export function puedeUsar(perfil: Perfil, casoDeUso: CasoDeUso): boolean {
  return perfil === 'propietario' || CASOS_DEL_TRABAJADOR.has(casoDeUso);
}

// ---------------------------------------------------------------------------
// Escritura: sección 3
// ---------------------------------------------------------------------------

/** Tablas en las que solo el propietario inserta. En las demás insertan ambos perfiles. */
const SOLO_PROPIETARIO: ReadonlySet<NombreTabla> = new Set<NombreTabla>([
  'destino_productivo',
  'salida',
  'movimiento_economico',
  'recordatorio',
]);

/**
 * ¿Puede el perfil insertar en esta tabla? Para `correccion` responde si puede corregir en general;
 * si puede corregir un registro concreto lo decide puedeCorregir.
 */
export function puedeCrear(perfil: Perfil, tabla: NombreTabla): boolean {
  return perfil === 'propietario' || !SOLO_PROPIETARIO.has(tabla);
}

// ---------------------------------------------------------------------------
// Corrección: sección 4
// ---------------------------------------------------------------------------

/**
 * ¿Se muestra «corregir» en este registro? El propietario corrige cualquiera. El trabajador, solo
 * los creados por un trabajador y en la misma fecha del predio (3.9.5).
 *
 * @param perfilDelAutor Perfil de quien creó el registro, según la copia local de los usuarios.
 */
export function puedeCorregir(
  usuario: Identidad,
  registro: Pick<RegistroLocal<NombreTabla>, 'creado_en'>,
  perfilDelAutor: Perfil | undefined,
  ahora: Date = new Date(),
): boolean {
  if (usuario.perfil === 'propietario') return true;
  return perfilDelAutor === 'trabajador' && fechaDelPredio(registro.creado_en) === fechaDelPredio(ahora);
}

// ---------------------------------------------------------------------------
// Escritura autorizada
// ---------------------------------------------------------------------------

export class PermisoDenegado extends Error {
  constructor(perfil: Perfil, tabla: NombreTabla) {
    super(`El perfil ${perfil} no puede registrar en ${tabla}`);
    this.name = 'PermisoDenegado';
  }
}

/**
 * Crea un registro solo si el perfil lo permite. Si no, lo rechaza antes de escribir (Tabla 31:
 * «si la operación llegara a intentarse, es rechazada antes de escribirse y también en el servicio»).
 */
export function crearAutorizado<T extends NombreTabla>(
  usuario: Identidad,
  tabla: T,
  datos: DatosNuevos<T>,
): Promise<RegistroLocal<T>> {
  if (!puedeCrear(usuario.perfil, tabla)) return Promise.reject(new PermisoDenegado(usuario.perfil, tabla));
  return crear(tabla, datos, usuario.usuario_id);
}
