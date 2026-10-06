/**
 * Cálculo de la relación de contraste entre dos colores según las Pautas de Accesibilidad
 * para el Contenido Web (WCAG) 2.2, criterios 1.4.3 y 1.4.6.
 *
 * Se usa para verificar que el sistema de color de la Tabla 29 cumple los umbrales que
 * afirma el apartado 3.10.4.1 del documento.
 */

/** Umbral del nivel reforzado (AAA) para texto normal. */
export const CONTRASTE_REFORZADO = 7;
/** Umbral del nivel mínimo (AA) para texto normal. */
export const CONTRASTE_MINIMO = 4.5;

/** Convierte un color hexadecimal `#RRGGBB` en sus tres componentes entre 0 y 1. */
function componentes(hex: string): [number, number, number] {
  const limpio = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) {
    throw new Error(`Color no válido: «${hex}». Se espera el formato #RRGGBB`);
  }
  return [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** Luminancia relativa de un color, definida en WCAG 2.2 (sección «relative luminance»). */
export function luminanciaRelativa(hex: string): number {
  const [r, g, b] = componentes(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste entre dos colores, de 1:1 (iguales) a 21:1 (negro sobre blanco). */
export function relacionContraste(colorA: string, colorB: string): number {
  const [clara, oscura] = [luminanciaRelativa(colorA), luminanciaRelativa(colorB)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (clara + 0.05) / (oscura + 0.05);
}
