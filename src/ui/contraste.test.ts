import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTRASTE_REFORZADO, luminanciaRelativa, relacionContraste } from './contraste';

/**
 * PU-01 · Contraste del sistema de color (apartado 3.10.4.1, Tabla 29, WCAG 2.2).
 *
 * Los colores se leen directamente de estilos.css, de modo que la prueba verifica la hoja de
 * estilos que usa la aplicación y no una copia que podría desincronizarse.
 */

function leerVariablesDeColor(): Record<string, string> {
  const css = readFileSync(new URL('./estilos.css', import.meta.url), 'utf8');
  const variables: Record<string, string> = {};
  for (const [, nombre, valor] of css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    variables[nombre!] = valor!;
  }
  return variables;
}

const color = leerVariablesDeColor();

describe('PU-01 · Cálculo de contraste según WCAG 2.2', () => {
  it('negro sobre blanco tiene el contraste máximo, 21:1', () => {
    expect(relacionContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('un color sobre sí mismo tiene el contraste mínimo, 1:1', () => {
    expect(relacionContraste('#165232', '#165232')).toBeCloseTo(1, 5);
  });

  it('el orden de los colores no altera el resultado', () => {
    expect(relacionContraste('#FFFFFF', '#165232')).toBe(relacionContraste('#165232', '#FFFFFF'));
  });

  it('la luminancia del blanco es 1 y la del negro es 0', () => {
    expect(luminanciaRelativa('#FFFFFF')).toBeCloseTo(1, 5);
    expect(luminanciaRelativa('#000000')).toBeCloseTo(0, 5);
  });

  it('rechaza un color con formato no válido', () => {
    expect(() => relacionContraste('verde', '#FFFFFF')).toThrow(/Color no válido/);
  });
});

describe('PU-01 · Cifras declaradas en el apartado 3.10.4.1', () => {
  it('texto blanco sobre verde oscuro alcanza 9,18:1', () => {
    expect(relacionContraste(color['blanco']!, color['verde-oscuro']!)).toBeCloseTo(9.18, 2);
  });

  it('texto principal sobre fondo claro alcanza 14,92:1', () => {
    expect(relacionContraste(color['texto']!, color['fondo']!)).toBeCloseTo(14.92, 2);
  });
});

describe('PU-01 · Todas las combinaciones de texto del sistema alcanzan el nivel reforzado (7:1)', () => {
  // [texto, fondo, dónde se usa]
  const combinaciones: [string, string, string][] = [
    ['blanco', 'verde-oscuro', 'botones principales y encabezado'],
    ['texto', 'fondo', 'texto principal'],
    ['texto', 'blanco', 'tarjetas y barra inferior'],
    ['texto', 'amarillo', 'código de la chapeta'],
    ['texto', 'verde-claro', 'confirmaciones'],
    ['texto', 'amarillo-claro', 'avisos que requieren revisión'],
    ['rojo-oscuro', 'rojo-fondo', 'advertencias con consecuencia sanitaria'],
    ['texto-secundario', 'fondo', 'textos secundarios'],
    ['verde-oscuro', 'blanco', 'botones secundarios'],
    ['rojo-oscuro', 'blanco', 'advertencias de la barra de estado'],
  ];

  it.each(combinaciones)('%s sobre %s (%s)', (texto, fondo) => {
    expect(color[texto], `falta la variable --${texto} en estilos.css`).toBeDefined();
    expect(color[fondo], `falta la variable --${fondo} en estilos.css`).toBeDefined();
    expect(relacionContraste(color[texto]!, color[fondo]!)).toBeGreaterThanOrEqual(CONTRASTE_REFORZADO);
  });
});
