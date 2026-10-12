/**
 * Valores propios del dispositivo guardados en la tabla meta (documento técnico 02, sección 4.3):
 * la sesión local, la configuración del código de desbloqueo, la marca de avance.
 * No son información del predio, así que no pasan por la cola de operaciones.
 */
import { db } from './db';

export async function leerMeta<T>(clave: string): Promise<T | undefined> {
  return (await db.meta.get(clave))?.valor as T | undefined;
}

export async function escribirMeta(clave: string, valor: unknown): Promise<void> {
  await db.meta.put({ clave, valor });
}

export async function borrarMeta(clave: string): Promise<void> {
  await db.meta.delete(clave);
}
