/**
 * Ingreso con el servicio de autenticación y renovación del token.
 * Especificación: docs/tecnica/06-autenticacion.md, secciones 6.1 y 6.3
 */
import { decodeProtectedHeader, type JWK } from 'jose';
import { contarPendientes } from '../datos/repositorio';
import { supabase } from '../servicios/supabase';
import { bloquear, borrarCodigo, olvidarUsuarioAnterior, verificarReingreso, type UsuarioAnterior } from './desbloqueo';
import { actualizarTokenLocal, borrarSesionLocal, guardarSesionLocal } from './sesionLocal';
import { verificarToken, type Identidad } from './token';

const URL_SERVICIO = import.meta.env.VITE_SUPABASE_URL;
const CLAVE_PUBLICABLE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
/** Emisor que el servicio de autenticación de Supabase escribe en sus tokens. */
const EMISOR = `${URL_SERVICIO}/auth/v1`;

export type ResultadoIngreso =
  | { ok: true; identidad: Identidad }
  | { ok: false; motivo: 'sin_conexion' | 'credenciales' | 'sin_perfil' | 'error' }
  | { ok: false; motivo: 'otro_usuario_con_pendientes'; anterior: UsuarioAnterior; pendientes: number };

/** Descarga la clave pública con que el servicio firma los tokens y elige la que corresponde al token. */
async function obtenerClavePublica(token: string): Promise<JWK | null> {
  const { kid } = decodeProtectedHeader(token);
  const respuesta = await fetch(`${URL_SERVICIO}/auth/v1/.well-known/jwks.json`, {
    headers: { apikey: CLAVE_PUBLICABLE },
  });
  if (!respuesta.ok) return null;
  const { keys } = (await respuesta.json()) as { keys: JWK[] };
  return keys.find((clave) => clave.kid === kid) ?? null;
}

/**
 * Primer ingreso en el dispositivo (sección 6.1). Requiere conexión: verifica las credenciales con
 * el servicio, descarga su clave pública y guarda la sesión local verificada.
 */
export async function iniciarSesion(correo: string, contrasena: string): Promise<ResultadoIngreso> {
  if (!navigator.onLine) return { ok: false, motivo: 'sin_conexion' };

  const { data, error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena });
  if (error || !data.session) {
    // Mensaje genérico ante credenciales incorrectas: no se revela si falló el correo o la contraseña.
    if (error?.code === 'invalid_credentials' || error?.status === 400) return { ok: false, motivo: 'credenciales' };
    return { ok: false, motivo: navigator.onLine ? 'error' : 'sin_conexion' };
  }

  const token = data.session.access_token;
  try {
    const clave = await obtenerClavePublica(token);
    if (!clave) throw new Error('No se encontró la clave pública del token');

    const verificacion = await verificarToken(token, clave, EMISOR);
    if (!verificacion.valido) {
      await supabase.auth.signOut({ scope: 'local' });
      const sinPerfil = verificacion.motivo === 'sin_perfil' || verificacion.motivo === 'perfil_invalido';
      return { ok: false, motivo: sinPerfil ? 'sin_perfil' : 'error' };
    }

    // Con pendientes de una sesión bloqueada, solo su dueño puede volver a ingresar
    // (docs/tecnica/07-codigo-de-desbloqueo.md, sección 6).
    const reingreso = await verificarReingreso(verificacion.identidad.usuario_id);
    if (!reingreso.permitido) {
      await supabase.auth.signOut({ scope: 'local' });
      return { ok: false, motivo: 'otro_usuario_con_pendientes', anterior: reingreso.anterior, pendientes: reingreso.pendientes };
    }

    const resultado = await guardarSesionLocal(token, clave, EMISOR);
    if (!resultado.valido) throw new Error('El token dejó de ser válido al guardarlo');
    await olvidarUsuarioAnterior();
    // Tras cada ingreso con credenciales se define un código nuevo (documento técnico 07, sección 3.1).
    await borrarCodigo();
    return { ok: true, identidad: resultado.identidad };
  } catch {
    await supabase.auth.signOut({ scope: 'local' });
    return { ok: false, motivo: 'error' };
  }
}

/**
 * Mantiene la sesión local al día con los tokens que renueva supabase-js mientras hay conexión
 * (sección 6.3). Si el servicio rotó su clave de firma, descarga la nueva.
 * Devuelve la función para dejar de escuchar.
 */
export function escucharRenovaciones(alActualizar: (identidad: Identidad) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
    if (!sesion || (evento !== 'TOKEN_REFRESHED' && evento !== 'SIGNED_IN')) return;
    void (async () => {
      let resultado = await actualizarTokenLocal(sesion.access_token);
      if (resultado && !resultado.valido && resultado.motivo === 'clave_distinta') {
        const clave = await obtenerClavePublica(sesion.access_token);
        if (clave) resultado = await guardarSesionLocal(sesion.access_token, clave, EMISOR);
      }
      if (resultado?.valido) alActualizar(resultado.identidad);
    })();
  });
  return () => data.subscription.unsubscribe();
}

export type ResultadoCierre = { ok: true } | { ok: false; pendientes: number };

/**
 * Cierre de sesión preliminar: solo procede con la cola vacía. La experiencia completa (ofrecer
 * sincronizar o confirmar el descarte) se construye en el paso 1.12 (apartado 3.9.1).
 */
export async function cerrarSesion(): Promise<ResultadoCierre> {
  const pendientes = await contarPendientes();
  if (pendientes > 0) return { ok: false, pendientes };
  await supabase.auth.signOut({ scope: 'local' });
  await borrarCodigo();
  await borrarSesionLocal();
  return { ok: true };
}

/**
 * «Olvidé mi código» y quinto intento fallido: borra el código y la sesión local y exige un ingreso
 * completo. Si hay pendientes, solo el mismo usuario podrá volver a ingresar
 * (docs/tecnica/07-codigo-de-desbloqueo.md, secciones 3.3 y 6).
 */
export async function salirPorBloqueo(): Promise<void> {
  await bloquear();
  await supabase.auth.signOut({ scope: 'local' });
}

/** Cierra la sesión de supabase-js en este dispositivo. Se usa tras un bloqueo por intentos fallidos. */
export async function cerrarSesionServicio(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}
