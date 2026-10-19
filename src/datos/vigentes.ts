/**
 * Punto único de lectura de los valores vigentes: los registros con sus correcciones aplicadas.
 * Especificación: docs/tecnica/26-correccion-y-anulacion.md, sección 6.3
 *
 * Solo lee tablas que participan en las transacciones de registro (las correcciones viajan por la cola), así
 * que también puede usarse dentro de una.
 *
 * Las funciones encadenan las promesas de Dexie con `then` en lugar de anidar funciones `async`: dentro de
 * una consulta en vivo (useLiveQuery), Dexie sigue qué tablas se leen solo mientras no se pierda su contexto,
 * y tres funciones `async` anidadas lo perdían. La pantalla dejaba de enterarse de los cambios leídos
 * después: confirmar la chapeta o descartar un conflicto parecía no hacer nada hasta el segundo clic (PE-32).
 */
import { aplicarATodos, soloVigentes, type Vigente } from '../dominio/vigente';
import type { Correccion, EntidadCorregible, RegistroLocal, Uuid } from '../dominio/tipos';
import { consulta } from './repositorio';

/** Siempre una promesa de Dexie, también sin registros: así no se pierde el contexto de la consulta en vivo. */
function correccionesDe(ids: readonly Uuid[]): Promise<RegistroLocal<'correccion'>[]> {
  return consulta.correccion.where('registro_id').anyOf([...ids]).toArray();
}

/** Los registros con valores vigentes y sus marcas de corregido y anulado (para los historiales). */
export function leerVigentes<T extends EntidadCorregible>(entidad: T, registros: readonly RegistroLocal<T>[]): Promise<Vigente<RegistroLocal<T>>[]> {
  return correccionesDe(registros.map((r) => r.id)).then((c: Correccion[]) => aplicarATodos(entidad, registros, c));
}

/** Solo los no anulados, con valores vigentes (para los cálculos). */
export function vigentes<T extends EntidadCorregible>(entidad: T, registros: readonly RegistroLocal<T>[]): Promise<RegistroLocal<T>[]> {
  return correccionesDe(registros.map((r) => r.id)).then((c: Correccion[]) => soloVigentes(entidad, registros, c));
}

/** Un animal con sus datos vigentes; undefined si no está en el teléfono. */
export function animalVigente(id: Uuid): Promise<RegistroLocal<'animal'> | undefined> {
  return consulta.animal.get(id).then((animal) => (animal ? vigentes('animal', [animal]).then((r) => r[0]) : undefined));
}

/** Todos los animales con sus datos vigentes (los animales no se anulan). */
export function animalesVigentes(): Promise<RegistroLocal<'animal'>[]> {
  return consulta.animal.toArray().then((animales) => vigentes('animal', animales));
}
