/**
 * Código de desbloqueo: cerradura del dispositivo (segunda capa del apartado 3.9.1).
 * Especificación: docs/tecnica/07-codigo-de-desbloqueo.md
 *
 * El código se guarda derivado con PBKDF2 (sal aleatoria, 600.000 iteraciones, SHA-256), nunca en
 * claro. Se verifica sin red. Tras cinco intentos fallidos se borran el código y la sesión local y se
 * exige un ingreso completo, que requiere conexión (Tabla 31).
 */
import { contarImagenesPendientes, contarPendientes, contarRegistrosPendientes } from '../datos/repositorio';
import { borrarMeta, escribirMeta, leerMeta } from '../datos/meta';
import { borrarSesionLocal, leerSesionLocal } from './sesionLocal';
import type { Uuid } from '../dominio/tipos';

/** Iteraciones de PBKDF2-HMAC-SHA-256 recomendadas por OWASP. */
export const ITERACIONES = 600_000;
export const INTENTOS_PERMITIDOS = 5;

const CLAVE_DESBLOQUEO = 'desbloqueo';
const CLAVE_USUARIO_ANTERIOR = 'usuario_anterior';

interface ConfiguracionDesbloqueo {
  /** Sal aleatoria de 16 bytes, en base64. */
  sal: string;
  iteraciones: number;
  /** Resultado de la derivación (256 bits), en base64. */
  derivado: string;
  intentos_fallidos: number;
}

/** Usuario dueño de la sesión borrada por bloqueo, conservado solo mientras haya pendientes (sección 6). */
export interface UsuarioAnterior {
  usuario_id: Uuid;
  nombre: string;
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

export type ValidacionCodigo = 'valido' | 'formato' | 'trivial';

/** Un código válido tiene de 4 a 6 dígitos y no es trivial (sección 5). */
export function validarCodigo(codigo: string): ValidacionCodigo {
  if (!/^\d{4,6}$/.test(codigo)) return 'formato';
  return esTrivial(codigo) ? 'trivial' : 'valido';
}

/** Todos los dígitos iguales, o una secuencia ascendente o descendente. */
function esTrivial(codigo: string): boolean {
  const digitos = [...codigo].map(Number);
  const pasos = digitos.slice(1).map((d, i) => d - digitos[i]!);
  return pasos.every((p) => p === 0) || pasos.every((p) => p === 1) || pasos.every((p) => p === -1);
}

// ---------------------------------------------------------------------------
// Derivación
// ---------------------------------------------------------------------------

async function derivar(codigo: string, sal: Uint8Array, iteraciones: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(codigo), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteraciones },
    material,
    256,
  );
  return new Uint8Array(bits);
}

/** Compara todos los bytes sin detenerse en el primero distinto (sección 4.3). */
function igualesEnTiempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i]! ^ b[i]!;
  return diferencia === 0;
}

const aBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------

/**
 * Define el código del usuario de la sesión actual. Se llama tras cada ingreso con credenciales.
 * @param iteraciones Solo las pruebas usan un valor distinto, para ser rápidas.
 */
export async function definirCodigo(codigo: string, iteraciones = ITERACIONES): Promise<void> {
  if (validarCodigo(codigo) !== 'valido') throw new Error('El código debe tener de 4 a 6 dígitos y no ser trivial');
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const configuracion: ConfiguracionDesbloqueo = {
    sal: aBase64(sal),
    iteraciones,
    derivado: aBase64(await derivar(codigo, sal, iteraciones)),
    intentos_fallidos: 0,
  };
  await escribirMeta(CLAVE_DESBLOQUEO, configuracion);
}

export async function hayCodigoDefinido(): Promise<boolean> {
  return (await leerMeta<ConfiguracionDesbloqueo>(CLAVE_DESBLOQUEO)) !== undefined;
}

export type ResultadoDesbloqueo =
  | { resultado: 'correcto' }
  | { resultado: 'incorrecto'; restantes: number }
  | { resultado: 'bloqueado' }
  | { resultado: 'sin_codigo' };

/** Verifica el código sin red. Al quinto error bloquea: borra el código y la sesión local. */
export async function verificarCodigo(codigo: string): Promise<ResultadoDesbloqueo> {
  const configuracion = await leerMeta<ConfiguracionDesbloqueo>(CLAVE_DESBLOQUEO);
  if (!configuracion) return { resultado: 'sin_codigo' };

  const calculado = await derivar(codigo, deBase64(configuracion.sal), configuracion.iteraciones);
  if (igualesEnTiempoConstante(calculado, deBase64(configuracion.derivado))) {
    if (configuracion.intentos_fallidos > 0) await escribirMeta(CLAVE_DESBLOQUEO, { ...configuracion, intentos_fallidos: 0 });
    return { resultado: 'correcto' };
  }

  const intentos = configuracion.intentos_fallidos + 1;
  if (intentos >= INTENTOS_PERMITIDOS) {
    await bloquear();
    return { resultado: 'bloqueado' };
  }
  await escribirMeta(CLAVE_DESBLOQUEO, { ...configuracion, intentos_fallidos: intentos });
  return { resultado: 'incorrecto', restantes: INTENTOS_PERMITIDOS - intentos };
}

/**
 * Borra el código y la sesión local y exige un ingreso completo. Lo usan el quinto intento fallido y
 * «Olvidé mi código». Si hay pendientes, conserva quién era el dueño de la sesión (sección 6).
 */
export async function bloquear(): Promise<void> {
  const sesion = await leerSesionLocal();
  // Cualquier cosa sin enviar, también una foto: su dueño debe poder volver a enviarla.
  if (sesion && (await contarPendientes()) + (await contarImagenesPendientes()) > 0) {
    const anterior: UsuarioAnterior = { usuario_id: sesion.identidad.usuario_id, nombre: sesion.identidad.nombre };
    await escribirMeta(CLAVE_USUARIO_ANTERIOR, anterior);
  }
  await borrarMeta(CLAVE_DESBLOQUEO);
  await borrarSesionLocal();
}

/** Borra el código sin bloquear. Lo usa el cierre de sesión normal, que ya exige la cola vacía. */
export function borrarCodigo(): Promise<void> {
  return borrarMeta(CLAVE_DESBLOQUEO);
}

export type ResultadoReingreso =
  | { permitido: true }
  | { permitido: false; anterior: UsuarioAnterior; pendientes: number; imagenes: number };

/**
 * Mientras haya pendientes de una sesión bloqueada, solo su dueño puede volver a ingresar
 * (sección 6). Sin pendientes, cualquiera puede, y se descarta el dato del usuario anterior.
 */
export async function verificarReingreso(usuarioId: Uuid): Promise<ResultadoReingreso> {
  const [pendientes, imagenes] = await Promise.all([contarRegistrosPendientes(), contarImagenesPendientes()]);
  const anterior = await leerMeta<UsuarioAnterior>(CLAVE_USUARIO_ANTERIOR);

  if (pendientes + imagenes === 0) {
    if (anterior) await borrarMeta(CLAVE_USUARIO_ANTERIOR);
    return { permitido: true };
  }
  if (!anterior || anterior.usuario_id === usuarioId) return { permitido: true };
  return { permitido: false, anterior, pendientes, imagenes };
}

/** Descarta el dato del usuario anterior una vez que su dueño volvió a ingresar. */
export function olvidarUsuarioAnterior(): Promise<void> {
  return borrarMeta(CLAVE_USUARIO_ANTERIOR);
}
