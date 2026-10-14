/**
 * Bajada de imágenes: trae las reducidas de las fotografías principales registradas en otros
 * teléfonos. Especificación: docs/tecnica/15-listado-de-animales.md, sección 6
 */
import { anotarDescargaFallida, guardarImagenBajada, imagenesPorBajar } from '../datos/sincronizacionLocal';
import { rutaImagen } from '../dominio/fotografias';
import type { ResultadoDescarga, ServicioRemoto } from './servicioRemoto';

export type ClaseDescarga = 'recibida' | 'no_existe' | 'transitoria' | 'sesion';

/** Clasificación de las respuestas del servicio de archivos al descargar (sección 6.4). */
export function clasificarDescarga(resultado: ResultadoDescarga): ClaseDescarga {
  if (resultado.ok) return 'recibida';
  const { codigo, estado = 0, mensaje } = resultado;
  if (codigo === '401' || estado === 401 || /jwt/i.test(mensaje)) return 'sesion';
  if (estado === 0 || estado >= 500) return 'transitoria';
  // 404 («Object not found») o cualquier otro rechazo: se anota y se reintenta pasada 1 hora.
  return 'no_existe';
}

export interface ResumenBajadaImagenes {
  estado: 'completa' | 'detenida' | 'sesion_vencida';
  bajadas: number;
  no_disponibles: number;
}

/** Avance de la bajada de fotos, para la pantalla de carga inicial (documento 17, sección 4). */
export interface AvanceFotos {
  bajadas: number;
  total: number;
}

export async function bajarImagenes(
  servicio: ServicioRemoto,
  ahora: Date = new Date(),
  alAvanzar: (avance: AvanceFotos) => void = () => {},
): Promise<ResumenBajadaImagenes> {
  const resumen: ResumenBajadaImagenes = { estado: 'completa', bajadas: 0, no_disponibles: 0 };
  const faltantes = await imagenesPorBajar(ahora);
  // A diferencia de los datos, de las fotos sí se sabe el total antes de empezar.
  if (faltantes.length > 0) alAvanzar({ bajadas: 0, total: faltantes.length });

  for (const { animal_id, fotografia_id } of faltantes) {
    const resultado = await servicio.descargarImagen(rutaImagen(animal_id, fotografia_id, 'reducida'));
    switch (clasificarDescarga(resultado)) {
      case 'recibida':
        await guardarImagenBajada(animal_id, fotografia_id, (resultado as { imagen: Blob }).imagen);
        resumen.bajadas++;
        alAvanzar({ bajadas: resumen.bajadas, total: faltantes.length });
        break;
      case 'no_existe':
        await anotarDescargaFallida(fotografia_id, ahora);
        resumen.no_disponibles++;
        break;
      case 'transitoria':
        return { ...resumen, estado: 'detenida' };
      case 'sesion':
        return { ...resumen, estado: 'sesion_vencida' };
    }
  }
  return resumen;
}
