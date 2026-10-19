/**
 * Parentesco entre el reproductor y la vaca, según la genealogía registrada (CU-10 8b, HU-12.4).
 * Especificación: docs/tecnica/25-parto-y-control-reproductivo.md, sección 5
 *
 * Solo puede evaluarse sobre la genealogía conocida (apartado 3.8.8): un progenitor desconocido o
 * externo corta la búsqueda.
 */
import { normalizarNombre } from './medicamentos';
import type { Animal, Uuid } from './tipos';

export type AnimalGenealogia = Pick<Animal, 'codigo_chapeta' | 'madre_id' | 'padre_id' | 'padre_externo'> & { id: Uuid };

export type TipoParentesco = 'padre' | 'hijo' | 'hermano' | 'medio_hermano' | 'abuelo' | 'nieto' | 'mismo_padre_externo';

export interface Parentesco {
  tipo: TipoParentesco;
  /** «Z1001 es medio hermano de Z930: los dos son hijos de Z900.» */
  texto: string;
}

export type Reproductor = { id: Uuid } | { externo: string };

/** El parentesco más cercano del reproductor con la vaca, o null si la genealogía registrada no muestra ninguno. */
export function buscarParentesco(animales: ReadonlyMap<Uuid, AnimalGenealogia>, vacaId: Uuid, reproductor: Reproductor): Parentesco | null {
  const vaca = animales.get(vacaId);
  if (!vaca) return null;

  if ('externo' in reproductor) {
    const nombre = normalizarNombre(reproductor.externo);
    if (nombre !== '' && vaca.padre_externo && normalizarNombre(vaca.padre_externo) === nombre) {
      return { tipo: 'mismo_padre_externo', texto: `El reproductor «${reproductor.externo.trim()}» tiene el mismo nombre que el padre de ${vaca.codigo_chapeta}.` };
    }
    return null;
  }

  const toro = animales.get(reproductor.id);
  if (!toro || toro.id === vaca.id) return null;
  const v = vaca.codigo_chapeta;
  const t = toro.codigo_chapeta;
  const chapeta = (id: Uuid | null) => (id ? (animales.get(id)?.codigo_chapeta ?? null) : null);

  // Primer grado: padre e hijo.
  if (vaca.padre_id === toro.id) return { tipo: 'padre', texto: `${t} es el padre de ${v}.` };
  if (toro.madre_id === vaca.id) return { tipo: 'hijo', texto: `${t} es hijo de ${v}.` };

  // Hermanos: comparten madre o padre del predio.
  const mismaMadre = vaca.madre_id !== null && vaca.madre_id === toro.madre_id;
  const mismoPadre = vaca.padre_id !== null && vaca.padre_id === toro.padre_id;
  if (mismaMadre && mismoPadre) {
    return { tipo: 'hermano', texto: `${t} es hermano de ${v}: los dos son hijos de ${chapeta(vaca.madre_id)} y ${chapeta(vaca.padre_id)}.` };
  }
  if (mismaMadre || mismoPadre) {
    const comun = mismaMadre ? vaca.madre_id : vaca.padre_id;
    return { tipo: 'medio_hermano', texto: `${t} es medio hermano de ${v}: los dos son hijos de ${chapeta(comun)}.` };
  }

  // Segundo grado: abuelo y nieto.
  const madreVaca = vaca.madre_id ? animales.get(vaca.madre_id) : undefined;
  const padreVaca = vaca.padre_id ? animales.get(vaca.padre_id) : undefined;
  if (madreVaca?.padre_id === toro.id) return { tipo: 'abuelo', texto: `${t} es abuelo de ${v}: es el padre de su madre ${madreVaca.codigo_chapeta}.` };
  if (padreVaca?.padre_id === toro.id) return { tipo: 'abuelo', texto: `${t} es abuelo de ${v}: es el padre de su padre ${padreVaca.codigo_chapeta}.` };

  const madreToro = toro.madre_id ? animales.get(toro.madre_id) : undefined;
  const padreToro = toro.padre_id ? animales.get(toro.padre_id) : undefined;
  if (madreToro?.madre_id === vaca.id) return { tipo: 'nieto', texto: `${t} es nieto de ${v}: es hijo de su hija ${madreToro.codigo_chapeta}.` };
  if (padreToro?.madre_id === vaca.id) return { tipo: 'nieto', texto: `${t} es nieto de ${v}: es hijo de su hijo ${padreToro.codigo_chapeta}.` };

  return null;
}
