/**
 * Carga inicial de un teléfono nuevo (apartado 3.7.6).
 * Especificación: docs/tecnica/17-carga-inicial.md
 *
 * Un teléfono está en carga inicial mientras no haya completado su primera bajada de datos. Durante
 * ese tiempo se consulta lo que ya llegó, pero no se registra (sección 2).
 */
import { contarAnimales, leerCargaInicialCompleta, marcarCargaInicialCompleta } from '../datos/sincronizacionLocal';
import type { AvanceDatos } from './bajada';
import type { AvanceFotos } from './bajadaImagenes';

export { contarAnimales, marcarCargaInicialCompleta };

/** ¿Ya llegó la información del predio a este teléfono? Las fotos no cuentan (sección 3). */
export async function cargaInicialCompleta(): Promise<boolean> {
  return (await leerCargaInicialCompleta()) !== undefined;
}

/** Avance de la sincronización en curso, para la pantalla «Preparando este teléfono» (sección 4). */
export interface AvanceCarga {
  datos: AvanceDatos | null;
  fotos: AvanceFotos | null;
}
