/**
 * Subida de imágenes: vacía la cola de imágenes hacia el servicio de archivos, después de los datos.
 * Especificación: docs/tecnica/14-fotografias.md, sección 6
 */
import { confirmarImagen, imagenesPendientes, registrarIntentoImagen } from '../datos/sincronizacionLocal';
import { rutaImagen } from '../dominio/fotografias';
import type { ResultadoEnvio, ServicioRemoto } from './servicioRemoto';

export type ClaseImagen = 'aceptada' | 'transitoria' | 'sesion' | 'definitiva';

/** Clasificación de las respuestas del servicio de archivos (sección 6.3). */
export function clasificarImagen(resultado: ResultadoEnvio): ClaseImagen {
  if (resultado.ok) return 'aceptada';
  const { codigo, estado = 0, mensaje } = resultado;
  // El archivo ya existe: se había subido y la confirmación se perdió (idempotencia, 3.7.8).
  if (codigo === '409' || /already exists|duplicate/i.test(mensaje)) return 'aceptada';
  if (codigo === '401' || estado === 401 || /jwt/i.test(mensaje)) return 'sesion';
  // Sin respuesta, tiempo agotado o falla del servicio: se reintenta en la próxima sincronización.
  if (estado === 0 || estado >= 500) return 'transitoria';
  return 'definitiva';
}

export interface ResumenImagenes {
  estado: 'completa' | 'detenida' | 'sesion_vencida';
  subidas: number;
  /** Fotografías cuya fila todavía no llegó al servicio. */
  esperando_fotografia: number;
  rechazadas: number;
}

/**
 * Recorre la cola de imágenes en orden. Una imagen solo sube si su fotografía ya está sincronizada
 * (sección 6.2). Se detiene ante una falla transitoria o una sesión vencida; un rechazo definitivo
 * registra el intento y sigue con la siguiente.
 */
export async function subirImagenes(servicio: ServicioRemoto): Promise<ResumenImagenes> {
  const resumen: ResumenImagenes = { estado: 'completa', subidas: 0, esperando_fotografia: 0, rechazadas: 0 };

  for (const { entrada, fotografia, imagen } of await imagenesPendientes()) {
    if (!fotografia || fotografia.estado_sync !== 'sincronizado') {
      resumen.esperando_fotografia++;
      continue;
    }

    const versiones = [
      { ruta: rutaImagen(fotografia.animal_id, fotografia.id, 'completa'), contenido: imagen?.completa ?? null },
      { ruta: rutaImagen(fotografia.animal_id, fotografia.id, 'reducida'), contenido: imagen?.reducida ?? null },
    ];

    let rechazada = false;
    for (const { ruta, contenido } of versiones) {
      if (!contenido) continue;
      const clase = clasificarImagen(await servicio.subirImagen(ruta, contenido));
      if (clase === 'sesion') return { ...resumen, estado: 'sesion_vencida' };
      if (clase === 'transitoria') {
        await registrarIntentoImagen(entrada);
        return { ...resumen, estado: 'detenida' };
      }
      if (clase === 'definitiva') {
        rechazada = true;
        break;
      }
    }

    if (rechazada) {
      await registrarIntentoImagen(entrada);
      resumen.rechazadas++;
    } else {
      await confirmarImagen(entrada, fotografia.animal_id);
      resumen.subidas++;
    }
  }
  return resumen;
}
