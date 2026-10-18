/**
 * Punto único de lectura de los valores vigentes: los registros con sus correcciones aplicadas.
 * Especificación: docs/tecnica/26-correccion-y-anulacion.md, sección 6.3
 *
 * Solo lee tablas que participan en las transacciones de registro (las correcciones viajan por la cola), así
 * que también puede usarse dentro de una.
 */
import { aplicarATodos, soloVigentes, type Vigente } from '../dominio/vigente';
import type { EntidadCorregible, RegistroLocal, Uuid } from '../dominio/tipos';
import { consulta } from './repositorio';

async function correccionesDe(ids: readonly Uuid[]) {
  return ids.length === 0 ? [] : consulta.correccion.where('registro_id').anyOf([...ids]).toArray();
}

/** Los registros con valores vigentes y sus marcas de corregido y anulado (para los historiales). */
export async function leerVigentes<T extends EntidadCorregible>(entidad: T, registros: readonly RegistroLocal<T>[]): Promise<Vigente<RegistroLocal<T>>[]> {
  return aplicarATodos(entidad, registros, await correccionesDe(registros.map((r) => r.id)));
}

/** Solo los no anulados, con valores vigentes (para los cálculos). */
export async function vigentes<T extends EntidadCorregible>(entidad: T, registros: readonly RegistroLocal<T>[]): Promise<RegistroLocal<T>[]> {
  return soloVigentes(entidad, registros, await correccionesDe(registros.map((r) => r.id)));
}

/** Un animal con sus datos vigentes; undefined si no está en el teléfono. */
export async function animalVigente(id: Uuid): Promise<RegistroLocal<'animal'> | undefined> {
  const animal = await consulta.animal.get(id);
  return animal ? (await vigentes('animal', [animal]))[0] : undefined;
}

/** Todos los animales con sus datos vigentes (los animales no se anulan). */
export async function animalesVigentes(): Promise<RegistroLocal<'animal'>[]> {
  return vigentes('animal', await consulta.animal.toArray());
}
