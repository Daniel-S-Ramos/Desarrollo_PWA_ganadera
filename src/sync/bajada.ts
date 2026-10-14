/**
 * Bajada: trae lo que el servicio recibió desde la última marca de avance, tabla por tabla.
 * Especificación: docs/tecnica/10-sincronizacion-bajada.md y 17-carga-inicial.md, sección 4
 */
import { TABLAS_SINCRONIZABLES } from '../datos/repositorio';
import { aplicarPagina, leerMarca, reemplazarParametros, reemplazarUsuarios } from '../datos/sincronizacionLocal';
import type { Desde, ServicioRemoto } from './servicioRemoto';

export const TAMANO_PAGINA = 1_000;
/** Margen de solapamiento (documento 10, sección 3). */
export const MARGEN_MS = 2 * 60 * 1_000;

export interface ResumenBajada {
  filas: number;
}

/** Avance de la bajada de datos, para la pantalla de carga inicial (documento 17, sección 4). */
export interface AvanceDatos {
  referencia: boolean;
  /** Filas de animal recibidas en esta bajada. */
  animales: number;
  /** Filas de las demás tablas recibidas en esta bajada. */
  registros: number;
}

/** Inicio de la descarga de una tabla: la marca menos el margen, o todo si no hay marca. */
export function desdeLaMarca(marca: string | undefined): Desde {
  if (!marca) return { tipo: 'inicio' };
  return { tipo: 'despues_de', recibido_en: new Date(Date.parse(marca) - MARGEN_MS).toISOString() };
}

/**
 * Descarga primero los datos de referencia (usuarios y parámetros, 3.7.6) y después las tablas del
 * predio en el orden de sus dependencias. Cada página se aplica junto con su marca en una transacción
 * local; si una consulta falla, lo ya aplicado queda firme y el error se propaga.
 */
export async function bajar(servicio: ServicioRemoto, alAvanzar: (avance: AvanceDatos) => void = () => {}): Promise<ResumenBajada> {
  const avance: AvanceDatos = { referencia: false, animales: 0, registros: 0 };

  await reemplazarUsuarios(await servicio.usuarios());
  await reemplazarParametros(await servicio.parametros());
  avance.referencia = true;
  alAvanzar({ ...avance });

  for (const tabla of TABLAS_SINCRONIZABLES) {
    let desde = desdeLaMarca(await leerMarca(tabla));
    for (;;) {
      const pagina = await servicio.consultar(tabla, desde, TAMANO_PAGINA);
      await aplicarPagina(tabla, pagina);
      if (tabla === 'animal') avance.animales += pagina.length;
      else avance.registros += pagina.length;
      if (pagina.length > 0) alAvanzar({ ...avance });
      if (pagina.length < TAMANO_PAGINA) break;
      // Las páginas siguientes se encadenan por la última fila, sin margen (sección 3.3).
      const ultima = pagina[pagina.length - 1]!;
      desde = { tipo: 'cursor', recibido_en: ultima.recibido_en, id: ultima.id };
    }
  }

  return { filas: avance.animales + avance.registros };
}
