/**
 * Reglas de las fotografías que no dependen del navegador ni del almacenamiento.
 * Especificación: docs/tecnica/14-fotografias.md, secciones 2 y 3
 */
import type { TipoFotografia, Uuid } from './tipos';

/** Las dos versiones de cada foto (sección 2). */
export const VERSIONES = {
  completa: { ladoMayor: 1600, calidad: 0.8 },
  reducida: { ladoMayor: 480, calidad: 0.7 },
} as const;

/** Dimensiones que mantienen la proporción con el lado mayor indicado. Nunca amplía. */
export function escalar(ancho: number, alto: number, ladoMayor: number): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto);
  if (mayor <= ladoMayor) return { ancho, alto };
  const factor = ladoMayor / mayor;
  return { ancho: Math.max(1, Math.round(ancho * factor)), alto: Math.max(1, Math.round(alto * factor)) };
}

/**
 * Orden de preferencia de la vista principal, la única cuya imagen reducida se conserva en el
 * teléfono (Tabla 25). Lo indicó el propietario el 2026-10-12.
 */
export const ORDEN_VISTA_PRINCIPAL: readonly TipoFotografia[] = ['izquierdo', 'derecho', 'frontal'];

export interface DatosFotografia {
  id: Uuid;
  tipo: TipoFotografia;
}

/**
 * La fotografía vigente de cada vista es la más reciente (documento 05, sección 5.2). Los
 * identificadores UUID v7 se ordenan por fecha de creación, así que la más reciente es la de mayor id.
 */
export function fotografiasVigentes<T extends DatosFotografia>(fotografias: readonly T[]): Map<TipoFotografia, T> {
  const vigentes = new Map<TipoFotografia, T>();
  for (const foto of fotografias) {
    const actual = vigentes.get(foto.tipo);
    if (!actual || foto.id > actual.id) vigentes.set(foto.tipo, foto);
  }
  return vigentes;
}

/** La fotografía principal de un animal: izquierdo, luego derecho, luego frente, entre las vigentes. */
export function vistaPrincipal<T extends DatosFotografia>(fotografias: readonly T[]): T | undefined {
  const vigentes = fotografiasVigentes(fotografias);
  for (const tipo of ORDEN_VISTA_PRINCIPAL) {
    const foto = vigentes.get(tipo);
    if (foto) return foto;
  }
  return undefined;
}

/** Ruta de cada versión en el servicio de archivos (sección 4.2). No se almacena: se deduce. */
export function rutaImagen(animalId: Uuid, fotografiaId: Uuid, version: 'completa' | 'reducida'): string {
  return version === 'completa' ? `${animalId}/${fotografiaId}.webp` : `${animalId}/${fotografiaId}-reducida.webp`;
}
