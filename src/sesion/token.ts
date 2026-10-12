/**
 * Verificación del token de acceso sin conexión.
 * Especificación: docs/tecnica/06-autenticacion.md, secciones 3 y 6.2
 *
 * El token lo firma el servicio con su clave privada (ES256). Con la clave pública, que el teléfono
 * guarda en el primer ingreso, cualquiera puede comprobar la firma pero nadie puede producirla: si la
 * firma es válida, el perfil que trae el token lo escribió el servidor (apartado 3.9.1).
 */
import { compactVerify, decodeProtectedHeader, importJWK, type JWK } from 'jose';
import { PERFILES, type Perfil, type Uuid } from '../dominio/tipos';

export interface Identidad {
  usuario_id: Uuid;
  perfil: Perfil;
  nombre: string;
  /** Vencimiento del token en milisegundos. Sin red no impide operar (sección 6.2). */
  vence_en: number;
}

export type MotivoRechazo =
  | 'formato_invalido'
  | 'algoritmo_no_admitido'
  | 'clave_distinta'
  | 'firma_invalida'
  | 'emisor_distinto'
  | 'sin_perfil'
  | 'perfil_invalido';

export type ResultadoVerificacion = { valido: true; identidad: Identidad } | { valido: false; motivo: MotivoRechazo };

const ALGORITMO = 'ES256';

/**
 * Verifica la firma del token y extrae la identidad.
 *
 * No rechaza un token vencido: sin conexión, un token vencido sigue diciendo con certeza quién es el
 * usuario y cuál es su perfil (apartado 3.9.1). La caducidad importa al transmitir, y la renueva la
 * sincronización antes de enviar.
 *
 * @param emisorEsperado Emisor (`iss`) que debe traer el token, si se conoce.
 */
export async function verificarToken(
  token: string,
  clavePublica: JWK,
  emisorEsperado?: string,
): Promise<ResultadoVerificacion> {
  let encabezado;
  try {
    encabezado = decodeProtectedHeader(token);
  } catch {
    return { valido: false, motivo: 'formato_invalido' };
  }

  // Solo se admite el algoritmo con que firma el servicio. Aceptar otro abriría la puerta a
  // ataques conocidos de confusión de algoritmo (por ejemplo, «alg: none»).
  if (encabezado.alg !== ALGORITMO) return { valido: false, motivo: 'algoritmo_no_admitido' };
  if (clavePublica.kid !== undefined && encabezado.kid !== clavePublica.kid) {
    return { valido: false, motivo: 'clave_distinta' };
  }

  let contenido: Record<string, unknown>;
  try {
    const clave = await importJWK(clavePublica, ALGORITMO);
    // compactVerify comprueba solo la firma; no aplica el vencimiento.
    const { payload } = await compactVerify(token, clave, { algorithms: [ALGORITMO] });
    contenido = JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
  } catch {
    return { valido: false, motivo: 'firma_invalida' };
  }

  if (emisorEsperado !== undefined && contenido['iss'] !== emisorEsperado) {
    return { valido: false, motivo: 'emisor_distinto' };
  }
  const sub = contenido['sub'];
  const perfil = contenido['perfil'];
  if (typeof sub !== 'string' || sub.length === 0) return { valido: false, motivo: 'formato_invalido' };
  if (perfil === undefined || perfil === null) return { valido: false, motivo: 'sin_perfil' };
  if (!(PERFILES as readonly unknown[]).includes(perfil)) return { valido: false, motivo: 'perfil_invalido' };

  const nombre = contenido['nombre'];
  const exp = contenido['exp'];
  return {
    valido: true,
    identidad: {
      usuario_id: sub,
      perfil: perfil as Perfil,
      nombre: typeof nombre === 'string' ? nombre : '',
      vence_en: typeof exp === 'number' ? exp * 1000 : 0,
    },
  };
}
