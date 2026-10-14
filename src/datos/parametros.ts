/**
 * Lectura de los parámetros de operación (apartado 3.8.9, Tabla 30).
 * Especificación: docs/tecnica/18-catalogo-de-medicamentos.md, sección 8
 *
 * El valor vive en la tabla, que llega del servicio con la bajada: no hay valores por defecto en el
 * código. Si un parámetro no está en el teléfono, quien lo usa decide qué hacer.
 */
import { db } from './db';

export async function leerParametro(clave: string): Promise<number | undefined> {
  return (await db.parametro.get(clave))?.valor;
}
