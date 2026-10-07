/**
 * Sesión local: la identidad verificada que el teléfono conserva, con o sin red.
 * Especificación: docs/tecnica/06-autenticacion.md, sección 5
 *
 * Es independiente de la sesión de supabase-js. Si el token de refresco deja de ser válido, la
 * biblioteca borra su sesión, pero la sesión local se conserva: el usuario sigue identificado en el
 * teléfono y solo queda suspendida la sincronización (apartado 3.9.1, Tabla 21).
 *
 * No se guarda la contraseña ni ningún verificador de ella.
 */
import type { JWK } from 'jose';
import { borrarMeta, escribirMeta, leerMeta } from '../datos/meta';
import { verificarToken, type Identidad, type ResultadoVerificacion } from './token';

export interface SesionLocal {
  identidad: Identidad;
  /** Último token de acceso recibido del servicio. */
  token: string;
  /** Clave pública del servicio en formato JWK, descargada en el primer ingreso. */
  clave_publica: JWK;
  /** Emisor esperado de los tokens (`iss`). */
  emisor: string;
  /** Última vez que se verificó un token recibido del servicio. */
  verificada_en: string;
}

const CLAVE_META = 'sesion';

/** Verifica el token y, si es válido, lo guarda como sesión local. */
export async function guardarSesionLocal(token: string, clavePublica: JWK, emisor: string): Promise<ResultadoVerificacion> {
  const resultado = await verificarToken(token, clavePublica, emisor);
  if (resultado.valido) {
    const sesion: SesionLocal = {
      identidad: resultado.identidad,
      token,
      clave_publica: clavePublica,
      emisor,
      verificada_en: new Date().toISOString(),
    };
    await escribirMeta(CLAVE_META, sesion);
  }
  return resultado;
}

/**
 * Recupera la identidad al abrir la aplicación, sin red: vuelve a verificar la firma del token
 * guardado con la clave pública guardada. Si la firma no coincide, alguien alteró la sesión
 * guardada y se descarta (sección 6.2).
 */
export async function restaurarSesionLocal(): Promise<Identidad | null> {
  const sesion = await leerMeta<SesionLocal>(CLAVE_META);
  if (!sesion) return null;

  const resultado = await verificarToken(sesion.token, sesion.clave_publica, sesion.emisor);
  if (!resultado.valido) {
    await borrarMeta(CLAVE_META);
    return null;
  }
  return resultado.identidad;
}

/** Reemplaza el token guardado por uno renovado, si su firma es válida con la clave guardada. */
export async function actualizarTokenLocal(token: string): Promise<ResultadoVerificacion | null> {
  const sesion = await leerMeta<SesionLocal>(CLAVE_META);
  if (!sesion) return null;
  return guardarSesionLocal(token, sesion.clave_publica, sesion.emisor);
}

/** Lee la sesión local tal como está guardada, sin verificarla. Uso interno del gestor de sesión. */
export function leerSesionLocal(): Promise<SesionLocal | undefined> {
  return leerMeta<SesionLocal>(CLAVE_META);
}

export function borrarSesionLocal(): Promise<void> {
  return borrarMeta(CLAVE_META);
}
