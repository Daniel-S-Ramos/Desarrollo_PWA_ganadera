/**
 * Recuperación de la contraseña por correo: pedir el enlace y crear la contraseña nueva.
 * Especificación: docs/tecnica/33-recuperar-contrasena.md, secciones 3, 4 y 7
 *
 * Las llamadas al servicio llegan como parámetro (`ServicioRecuperacion`), de modo que las reglas y los
 * mensajes se verifican sin red. En la aplicación las atiende un cliente aparte que no guarda sesión
 * (servicios/recuperacionSupabase.ts, sección 4.1).
 */

/** La ruta que abre el enlace del correo (sección 4). */
export const RUTA_NUEVA_CONTRASENA = '/restablecer-contrasena';
/** El mínimo del servicio de autenticación (sección 6). */
export const LARGO_MINIMO_CONTRASENA = 6;

export const MENSAJES_RECUPERACION = {
  sinConexion: 'Necesita conexión a internet para recuperar la contraseña. Busque un lugar con señal e intente de nuevo.',
  correoInvalido: 'Escriba un correo válido.',
  enviado:
    'Le enviamos un correo con un enlace para crear una contraseña nueva. Revise su bandeja de entrada y también la carpeta de correo no deseado. Si en unos minutos no le llega, comuníquese con el administrador del sistema para que lo ayude.',
  limite: 'Ya se enviaron varios correos en poco tiempo. Espere unos minutos o comuníquese con el administrador del sistema.',
  errorEnvio: 'No fue posible enviar el correo. Intente de nuevo o comuníquese con el administrador del sistema.',
  corta: `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
  noCoinciden: 'Las dos contraseñas no coinciden.',
  igual: 'La contraseña nueva debe ser distinta de la anterior.',
  guardada: 'Contraseña actualizada. Ya puede ingresar con su contraseña nueva.',
  enlaceVencido: 'El enlace venció o ya se usó. Pida uno nuevo desde «¿Olvidó su contraseña?».',
  errorGuardar: 'No fue posible guardar la contraseña. Intente de nuevo o comuníquese con el administrador del sistema.',
} as const;

/** Un error del servicio de autenticación, con lo que interesa para elegir el mensaje. */
export interface ErrorServicio {
  status?: number;
  code?: string;
}

/** Lo que la recuperación necesita del servicio de autenticación. */
export interface ServicioRecuperacion {
  pedirEnlace(correo: string, destino: string): Promise<{ error: ErrorServicio | null }>;
  verificarEnlace(tokenHash: string): Promise<{ error: ErrorServicio | null }>;
  cambiarContrasena(contrasena: string): Promise<{ error: ErrorServicio | null }>;
  /** Cierra la sesión temporal de la recuperación (no la de la aplicación). */
  cerrar(): Promise<void>;
}

const FORMA_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** El correo recortado, o null si no tiene forma de correo (sección 3). */
export function leerCorreo(texto: string): string | null {
  const correo = texto.trim();
  return FORMA_CORREO.test(correo) ? correo : null;
}

/** Una falla que no es una respuesta del servicio: la red se cayó a mitad del pedido. */
const sinRespuesta = (error: ErrorServicio) => error.status === undefined || error.status === 0;

export type ResultadoEnvio = { ok: true; mensaje: string } | { ok: false; mensaje: string };

/**
 * Pide el enlace (sección 3). Sin conexión no llama al servicio. El mensaje de enviado es el mismo exista o no
 * la cuenta: el servicio ya responde igual, y así nadie averigua qué correos están registrados.
 */
export async function pedirEnlace(texto: string, enLinea: boolean, origen: string, servicio: ServicioRecuperacion): Promise<ResultadoEnvio> {
  if (!enLinea) return { ok: false, mensaje: MENSAJES_RECUPERACION.sinConexion };
  const correo = leerCorreo(texto);
  if (!correo) return { ok: false, mensaje: MENSAJES_RECUPERACION.correoInvalido };
  const { error } = await servicio.pedirEnlace(correo, `${origen}${RUTA_NUEVA_CONTRASENA}`);
  if (!error) return { ok: true, mensaje: MENSAJES_RECUPERACION.enviado };
  if (error.status === 429) return { ok: false, mensaje: MENSAJES_RECUPERACION.limite };
  return { ok: false, mensaje: sinRespuesta(error) ? MENSAJES_RECUPERACION.sinConexion : MENSAJES_RECUPERACION.errorEnvio };
}

/** El código de un solo uso del enlace (`token_hash` con `type=recovery`), o null si falta o es de otro tipo (sección 4.1). */
export function leerEnlace(busqueda: string): string | null {
  const parametros = new URLSearchParams(busqueda);
  const tokenHash = parametros.get('token_hash');
  return tokenHash && parametros.get('type') === 'recovery' ? tokenHash : null;
}

/** La regla de la contraseña nueva (sección 4): el mínimo del servicio y que las dos coincidan. */
export function validarNuevaContrasena(contrasena: string, repetida: string): string | null {
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) return MENSAJES_RECUPERACION.corta;
  if (contrasena !== repetida) return MENSAJES_RECUPERACION.noCoinciden;
  return null;
}

export type ResultadoGuardar = { ok: true; mensaje: string } | { ok: false; mensaje: string; vencido: boolean };

/**
 * Verifica el enlace y, solo si es válido, cambia la contraseña (sección 4.1). Al final cierra la sesión temporal
 * de la recuperación, haya salido bien o no: la sesión de la aplicación en el teléfono no se toca.
 */
export async function guardarNuevaContrasena(
  tokenHash: string | null,
  contrasena: string,
  repetida: string,
  enLinea: boolean,
  servicio: ServicioRecuperacion,
): Promise<ResultadoGuardar> {
  if (!tokenHash) return { ok: false, mensaje: MENSAJES_RECUPERACION.enlaceVencido, vencido: true };
  const invalida = validarNuevaContrasena(contrasena, repetida);
  if (invalida) return { ok: false, mensaje: invalida, vencido: false };
  if (!enLinea) return { ok: false, mensaje: MENSAJES_RECUPERACION.sinConexion, vencido: false };
  try {
    const verificacion = await servicio.verificarEnlace(tokenHash);
    if (verificacion.error) {
      if (sinRespuesta(verificacion.error)) return { ok: false, mensaje: MENSAJES_RECUPERACION.sinConexion, vencido: false };
      return { ok: false, mensaje: MENSAJES_RECUPERACION.enlaceVencido, vencido: true };
    }
    const cambio = await servicio.cambiarContrasena(contrasena);
    if (!cambio.error) return { ok: true, mensaje: MENSAJES_RECUPERACION.guardada };
    if (cambio.error.code === 'same_password') return { ok: false, mensaje: MENSAJES_RECUPERACION.igual, vencido: false };
    if (cambio.error.code === 'weak_password') return { ok: false, mensaje: MENSAJES_RECUPERACION.corta, vencido: false };
    return { ok: false, mensaje: MENSAJES_RECUPERACION.errorGuardar, vencido: false };
  } finally {
    await servicio.cerrar();
  }
}
