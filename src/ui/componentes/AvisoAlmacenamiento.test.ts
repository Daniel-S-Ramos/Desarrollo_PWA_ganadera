import { afterEach, describe, expect, it, vi } from 'vitest';
import { estaInstalada, mensajeAvisoAlmacenamiento } from './AvisoAlmacenamiento';

/**
 * PU-06 (continuación) · Texto del aviso de almacenamiento según el modo de la aplicación.
 * Ajuste derivado de PE-12: con la aplicación instalada en Chrome para Windows el navegador siguió
 * negando la persistencia, así que el aviso no puede pedir instalarla.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PU-06 · 9. Texto del aviso', () => {
  it('no hay aviso mientras se consulta ni cuando los datos son persistentes', () => {
    expect(mensajeAvisoAlmacenamiento(null, false)).toBeNull();
    expect(mensajeAvisoAlmacenamiento('persistente', false)).toBeNull();
    expect(mensajeAvisoAlmacenamiento('persistente', true)).toBeNull();
  });

  it('sin instalar, recomienda instalar la aplicación', () => {
    for (const estado of ['negado', 'no_disponible'] as const) {
      const mensaje = mensajeAvisoAlmacenamiento(estado, false);
      expect(mensaje?.detalle).toContain('instale la aplicación');
    }
  });

  it('ya instalada, no pide instalarla: recomienda espacio libre y sincronizar con frecuencia', () => {
    for (const estado of ['negado', 'no_disponible'] as const) {
      const mensaje = mensajeAvisoAlmacenamiento(estado, true);
      expect(mensaje?.detalle).not.toContain('instale');
      expect(mensaje?.detalle).toContain('Mantenga espacio libre');
    }
  });

  it('el título y la descripción del riesgo son los mismos en ambos casos', () => {
    const sinInstalar = mensajeAvisoAlmacenamiento('negado', false)!;
    const instalada = mensajeAvisoAlmacenamiento('negado', true)!;
    expect(instalada.titulo).toBe(sinInstalar.titulo);
    expect(instalada.detalle.startsWith('Si el teléfono se queda sin espacio')).toBe(true);
    expect(sinInstalar.detalle.startsWith('Si el teléfono se queda sin espacio')).toBe(true);
  });
});

describe('PU-06 · 10. Detección de la aplicación instalada', () => {
  function simularVentana(standaloneCss: boolean, standaloneIos?: boolean) {
    vi.stubGlobal('window', {
      navigator: { standalone: standaloneIos },
      matchMedia: (consulta: string) => ({ matches: consulta === '(display-mode: standalone)' && standaloneCss }),
    });
  }

  it('abierta en una pestaña del navegador: no instalada', () => {
    simularVentana(false);
    expect(estaInstalada()).toBe(false);
  });

  it('abierta como aplicación instalada (display-mode standalone): instalada', () => {
    simularVentana(true);
    expect(estaInstalada()).toBe(true);
  });

  it('agregada a la pantalla de inicio en iOS (navigator.standalone): instalada', () => {
    simularVentana(false, true);
    expect(estaInstalada()).toBe(true);
  });
});
