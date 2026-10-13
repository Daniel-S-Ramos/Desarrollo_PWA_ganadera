/**
 * Origen de un animal y nombre de su peso inicial.
 * Especificación: docs/tecnica/13-registro-de-animal.md, sección 3.1, y 16-ficha-del-animal.md, sección 3.1
 */
import type { Animal } from './tipos';

export type Origen = 'nacido' | 'comprado';

/** El origen no se almacena: un animal sin fecha de ingreso nació en el predio. */
export function origenDe(animal: Pick<Animal, 'fecha_ingreso'>): Origen {
  return animal.fecha_ingreso === null ? 'nacido' : 'comprado';
}

/**
 * El peso inicial se nombra según el origen, en el formulario y en la ficha (decisión del 2026-10-13):
 * en un animal comprado es el peso con el que llegó; en uno nacido en el predio, el peso al nacer.
 */
export function nombrePesoInicial(origen: Origen | null): 'peso de compra' | 'peso al nacer' | 'peso inicial' {
  if (origen === 'comprado') return 'peso de compra';
  if (origen === 'nacido') return 'peso al nacer';
  return 'peso inicial';
}

/** «Peso de compra en kg» o «Peso al nacer en kg», según el origen elegido (documento técnico 16, sección 3.1). */
export function etiquetaPeso(origen: Origen | null): string {
  const nombre = nombrePesoInicial(origen);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} en kg`;
}
