import { describe, expect, it } from 'vitest';
import { escalar, rutaImagen, vistaPrincipal, VERSIONES } from './fotografias';

/**
 * PU-15 · Fotografías (parte 1: reglas puras). Especificación: docs/tecnica/14-fotografias.md, sección 11
 */

describe('PU-15 · 1. Dimensiones (sección 2)', () => {
  it.each([
    [4000, 3000, 1600, 1600, 1200],
    [3000, 4000, 1600, 1200, 1600],
    [4000, 3000, 480, 480, 360],
    [1000, 750, 1600, 1000, 750],
    [1600, 1200, 1600, 1600, 1200],
    [4032, 1816, 1600, 1600, 721],
  ])('%d×%d con lado mayor %d → %d×%d', (ancho, alto, lado, anchoEsperado, altoEsperado) => {
    expect(escalar(ancho, alto, lado)).toEqual({ ancho: anchoEsperado, alto: altoEsperado });
  });

  it('nunca amplía una foto pequeña', () => {
    expect(escalar(300, 200, VERSIONES.completa.ladoMayor)).toEqual({ ancho: 300, alto: 200 });
  });

  it('las dos versiones de la sección 2', () => {
    expect(VERSIONES).toEqual({ completa: { ladoMayor: 1600, calidad: 0.8 }, reducida: { ladoMayor: 480, calidad: 0.7 } });
  });
});

describe('PU-15 · 2. Vista principal (sección 3)', () => {
  const foto = (id: string, tipo: 'izquierdo' | 'derecho' | 'frontal') => ({ id, tipo });

  it('el costado izquierdo es la principal', () => {
    expect(vistaPrincipal([foto('3', 'frontal'), foto('2', 'derecho'), foto('1', 'izquierdo')])?.tipo).toBe('izquierdo');
  });

  it('sin izquierdo, el derecho; sin ambos, el frente', () => {
    expect(vistaPrincipal([foto('1', 'frontal'), foto('2', 'derecho')])?.tipo).toBe('derecho');
    expect(vistaPrincipal([foto('1', 'frontal')])?.tipo).toBe('frontal');
  });

  it('sin fotografías no hay principal', () => {
    expect(vistaPrincipal([])).toBeUndefined();
  });

  it('entre dos fotos de la misma vista vale la más reciente (mayor UUID v7)', () => {
    const antigua = foto('0190a000-0000-7000-8000-000000000001', 'izquierdo');
    const reciente = foto('0190a000-0000-7000-8000-000000000002', 'izquierdo');
    expect(vistaPrincipal([reciente, antigua])).toBe(reciente);
    expect(vistaPrincipal([antigua, reciente])).toBe(reciente);
  });
});

describe('PU-15 · 2b. Rutas en el servicio de archivos (sección 4.2)', () => {
  it('completa y reducida', () => {
    expect(rutaImagen('a', 'f', 'completa')).toBe('a/f.webp');
    expect(rutaImagen('a', 'f', 'reducida')).toBe('a/f-reducida.webp');
  });
});
