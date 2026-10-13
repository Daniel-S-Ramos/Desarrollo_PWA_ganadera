/**
 * Compresión de las fotografías en el teléfono (RNF-12).
 * Especificación: docs/tecnica/14-fotografias.md, sección 2
 *
 * Usa las capacidades del navegador (createImageBitmap y canvas), así que no se ejecuta en las
 * pruebas automáticas: se verifica en PE-18 midiendo los tamaños obtenidos. Las reglas que sí se
 * prueban (dimensiones y vista principal) están en src/dominio/fotografias.ts.
 */
import { escalar, VERSIONES } from '../../dominio/fotografias';

/** Las dos versiones de una foto, ya comprimidas. */
export interface FotoComprimida {
  completa: Blob;
  reducida: Blob;
}

/** El navegador no pudo leer la imagen (por ejemplo, un formato que no decodifica). */
export class ImagenIlegible extends Error {
  constructor() {
    super('No se pudo leer la imagen. Tómela de nuevo con la cámara.');
    this.name = 'ImagenIlegible';
  }
}

/** El navegador no genera WebP: se rechaza en lugar de guardar otro formato. */
export class FormatoNoSoportado extends Error {
  constructor() {
    super('Este navegador no puede comprimir la fotografía. Use Chrome en el teléfono.');
    this.name = 'FormatoNoSoportado';
  }
}

/** Ni con la calidad mínima la imagen cabe en el límite del servicio de archivos. */
export class ImagenDemasiadoPesada extends Error {
  constructor() {
    super('La fotografía es demasiado pesada aun comprimida. Tómela de nuevo.');
    this.name = 'ImagenDemasiadoPesada';
  }
}

/** Límite del servicio de archivos (sección 7). Si una versión lo supera, se recodifica con menos calidad. */
const PESO_MAXIMO = 1024 * 1024;
const CALIDAD_MINIMA = 0.5;

/**
 * Convierte la foto original en sus dos versiones WebP. Aplica la orientación guardada por la
 * cámara y descarta los metadatos (incluida la ubicación GPS) al recodificar.
 */
export async function comprimirFoto(original: Blob): Promise<FotoComprimida> {
  let mapa: ImageBitmap;
  try {
    mapa = await createImageBitmap(original, { imageOrientation: 'from-image' });
  } catch {
    throw new ImagenIlegible();
  }
  try {
    const completa = dibujar(mapa, mapa.width, mapa.height, VERSIONES.completa.ladoMayor);
    // La reducida se obtiene de la completa y no del original: reducir en dos pasos da bordes más limpios.
    const reducida = dibujar(completa, completa.width, completa.height, VERSIONES.reducida.ladoMayor);
    return {
      completa: await codificar(completa, VERSIONES.completa.calidad),
      reducida: await codificar(reducida, VERSIONES.reducida.calidad),
    };
  } finally {
    mapa.close();
  }
}

function dibujar(origen: CanvasImageSource, ancho: number, alto: number, ladoMayor: number): HTMLCanvasElement {
  const medidas = escalar(ancho, alto, ladoMayor);
  const lienzo = document.createElement('canvas');
  lienzo.width = medidas.ancho;
  lienzo.height = medidas.alto;
  const contexto = lienzo.getContext('2d');
  if (!contexto) throw new FormatoNoSoportado();
  contexto.imageSmoothingQuality = 'high';
  contexto.drawImage(origen, 0, 0, medidas.ancho, medidas.alto);
  return lienzo;
}

async function codificar(lienzo: HTMLCanvasElement, calidadInicial: number): Promise<Blob> {
  for (let calidad = calidadInicial; calidad >= CALIDAD_MINIMA - 1e-9; calidad -= 0.1) {
    const imagen = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, 'image/webp', calidad));
    // Si el navegador no sabe generar WebP, toBlob devuelve PNG: se rechaza.
    if (!imagen || imagen.type !== 'image/webp') throw new FormatoNoSoportado();
    if (imagen.size <= PESO_MAXIMO) return imagen;
  }
  throw new ImagenDemasiadoPesada();
}
