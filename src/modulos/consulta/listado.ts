/**
 * Listado de animales y búsqueda por chapeta (RF-06, CU-03).
 * Especificación: docs/tecnica/15-listado-de-animales.md, secciones 2 a 4; filtro por destino en
 * docs/tecnica/19-destino-productivo.md, sección 6
 *
 * La búsqueda y el orden son funciones puras sobre los animales ya cargados: con unos cientos de
 * animales, filtrar en memoria mientras se escribe es instantáneo y no exige índices adicionales.
 */
import { consulta, reducidasLocales } from '../../datos/repositorio';
import { animalesVigentes, salidasVigentes, vigentes } from '../../datos/vigentes';
import { destinoVigente } from '../../dominio/destino';
import { vistaPrincipal } from '../../dominio/fotografias';
import type { Destino, EstadoSync, FechaPredio, Sexo, Uuid } from '../../dominio/tipos';
import { idsConChapetaPendiente } from '../identificacion/chapetaPendiente';
import { errorDeChapeta, normalizarChapeta } from '../identificacion/registroAnimal';

/** Lo que muestra una fila del listado (sección 4). */
export interface AnimalListado {
  id: Uuid;
  codigo_chapeta: string;
  sexo: Sexo;
  fecha_nacimiento: FechaPredio | null;
  fecha_nacimiento_exacta: boolean;
  retirado: boolean;
  /** Registrado sin la chapeta física y aún sin colocación (documento técnico 25, sección 7.3). */
  chapetaPendiente: boolean;
  /** Destino vigente, o null si no tiene (documento 19, sección 6). */
  destino: Destino | null;
  estado_sync: EstadoSync;
  detalle_conflicto?: string;
  /** Reducida de la vista principal, o de otra vista si la principal no está en el teléfono. */
  foto: Blob | null;
}

export type FiltroEstado = 'activos' | 'retirados' | 'todos';
/** Las fichas del filtro por destino: todos, uno de los seis o los que no tienen (documento 19, sección 6). */
export type FiltroDestino = 'todos' | Destino | 'sin_destino';

/** Orden numérico de las chapetas: 9 antes que 10, A2 antes que A10, los números antes que las letras. */
export function compararChapetas(a: string, b: string): number {
  return a.localeCompare(b, 'es', { numeric: true });
}

export interface ResultadoBusqueda {
  animales: AnimalListado[];
  /** La chapeta buscada, normalizada, si ningún animal la tiene exactamente y es válida (sección 2.4). */
  ofrecerRegistro: string | null;
  /** Mensaje de formato si lo escrito no puede ser una chapeta. */
  errorFormato: string | null;
}

/**
 * Filtra por estado, por destino y por el inicio de la chapeta; la coincidencia exacta va primero y
 * el resto en orden numérico (sección 2).
 */
export function buscar(
  animales: readonly AnimalListado[],
  texto: string,
  filtro: FiltroEstado,
  filtroDestino: FiltroDestino = 'todos',
): ResultadoBusqueda {
  const buscada = normalizarChapeta(texto);
  const porEstado = animales.filter(
    (a) =>
      (filtro === 'todos' || (filtro === 'retirados') === a.retirado) &&
      (filtroDestino === 'todos' || (filtroDestino === 'sin_destino' ? a.destino === null : a.destino === filtroDestino)),
  );
  // No hace falta una regla aparte para poner la exacta primero: todas empiezan por lo buscado y son
  // más largas que la exacta, así que el orden numérico ya la deja primera (4 antes que 40, A1 antes que A10).
  const coinciden = porEstado
    .filter((a) => a.codigo_chapeta.startsWith(buscada))
    .sort((a, b) => compararChapetas(a.codigo_chapeta, b.codigo_chapeta));

  if (buscada === '') return { animales: coinciden, ofrecerRegistro: null, errorFormato: null };
  const errorFormato = errorDeChapeta(buscada);
  // La exacta se busca entre todos, no solo en el filtro: una chapeta de un animal retirado tampoco puede registrarse.
  const existe = animales.some((a) => a.codigo_chapeta === buscada);
  return { animales: coinciden, ofrecerRegistro: errorFormato || existe ? null : buscada, errorFormato };
}

/** La foto de la fila: la reducida principal si está; si no, otra reducida del animal; si no, ninguna. */
export function elegirFoto(
  fotografias: readonly { id: Uuid; tipo: 'izquierdo' | 'derecho' | 'frontal' }[],
  reducidas: ReadonlyMap<Uuid, Blob>,
): Blob | null {
  const principal = vistaPrincipal(fotografias);
  if (principal && reducidas.has(principal.id)) return reducidas.get(principal.id)!;
  for (const foto of fotografias) {
    const reducida = reducidas.get(foto.id);
    if (reducida) return reducida;
  }
  return null;
}

/** Todos los animales del teléfono con lo que necesita cada fila. */
export async function cargarListado(): Promise<AnimalListado[]> {
  const [animales, salidas, destinos, fotografias, reducidas, colocaciones] = await Promise.all([
    animalesVigentes(),
    salidasVigentes(),
    consulta.destino_productivo.toArray().then((r) => vigentes('destino_productivo', r)),
    consulta.fotografia.toArray(),
    reducidasLocales(),
    consulta.colocacion_chapeta.toArray(),
  ]);
  const retirados = new Set(salidas.map((s) => s.animal_id));
  const pendientes = idsConChapetaPendiente(animales, colocaciones, retirados);
  const fotosPorAnimal = new Map<Uuid, typeof fotografias>();
  const destinosPorAnimal = new Map<Uuid, typeof destinos>();
  for (const d of destinos) destinosPorAnimal.set(d.animal_id, [...(destinosPorAnimal.get(d.animal_id) ?? []), d]);
  for (const foto of fotografias) fotosPorAnimal.set(foto.animal_id, [...(fotosPorAnimal.get(foto.animal_id) ?? []), foto]);

  return animales.map((a) => ({
    id: a.id,
    codigo_chapeta: a.codigo_chapeta,
    sexo: a.sexo,
    fecha_nacimiento: a.fecha_nacimiento,
    fecha_nacimiento_exacta: a.fecha_nacimiento_exacta,
    retirado: retirados.has(a.id),
    chapetaPendiente: pendientes.has(a.id),
    destino: destinoVigente(destinosPorAnimal.get(a.id) ?? [])?.destino ?? null,
    estado_sync: a.estado_sync,
    ...(a.detalle_conflicto ? { detalle_conflicto: a.detalle_conflicto } : {}),
    foto: elegirFoto(fotosPorAnimal.get(a.id) ?? [], reducidas),
  }));
}
