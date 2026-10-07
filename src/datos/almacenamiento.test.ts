import { afterEach, describe, expect, it, vi } from 'vitest';
import { asegurarPersistencia, consultarEspacio, formatearBytes } from './almacenamiento';

/**
 * PU-06 · Almacenamiento persistente (RNF-15, apartado 3.8.7).
 * Especificación: docs/tecnica/04-almacenamiento-persistente.md
 *
 * La interfaz de almacenamiento del navegador no existe en el entorno de pruebas, así que se
 * simula con cada respuesta posible para recorrer todos los caminos del diagrama de la sección 4.1.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Simula navigator.storage con las respuestas indicadas. */
function simularNavegador(storage: Partial<StorageManager> | undefined) {
  vi.stubGlobal('navigator', { storage });
}

describe('PU-06 · Solicitud de almacenamiento persistente', () => {
  it('1. si los datos ya son persistentes, informa «persistente» y no vuelve a solicitar', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    simularNavegador({ persisted: vi.fn().mockResolvedValue(true), persist });

    expect(await asegurarPersistencia()).toBe('persistente');
    expect(persist).not.toHaveBeenCalled();
  });

  it('2. si no son persistentes y el navegador concede, solicita una vez e informa «persistente»', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    simularNavegador({ persisted: vi.fn().mockResolvedValue(false), persist });

    expect(await asegurarPersistencia()).toBe('persistente');
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('3. si el navegador niega la solicitud, informa «negado»', async () => {
    simularNavegador({ persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(false) });

    expect(await asegurarPersistencia()).toBe('negado');
  });

  it('4. si el navegador no ofrece la interfaz, informa «no_disponible» sin errores', async () => {
    simularNavegador(undefined);
    expect(await asegurarPersistencia()).toBe('no_disponible');

    simularNavegador({}); // existe navigator.storage, pero sin los métodos de persistencia
    expect(await asegurarPersistencia()).toBe('no_disponible');
  });

  it('5. si la solicitud falla con un error, informa «negado» sin propagar el error', async () => {
    simularNavegador({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockRejectedValue(new Error('SecurityError')),
    });

    expect(await asegurarPersistencia()).toBe('negado');
  });
});

describe('PU-06 · Espacio ocupado y disponible', () => {
  it('6. devuelve los bytes ocupados y la cuota que estima el navegador', async () => {
    simularNavegador({ estimate: vi.fn().mockResolvedValue({ usage: 4_404_019, quota: 6_549_825_126 }) });

    expect(await consultarEspacio()).toEqual({ usado: 4_404_019, cuota: 6_549_825_126 });
  });

  it('7. si el navegador no informa la estimación, devuelve vacío sin errores', async () => {
    simularNavegador(undefined);
    expect(await consultarEspacio()).toBeNull();

    simularNavegador({ estimate: vi.fn().mockResolvedValue({}) });
    expect(await consultarEspacio()).toBeNull();

    simularNavegador({ estimate: vi.fn().mockRejectedValue(new Error('falla')) });
    expect(await consultarEspacio()).toBeNull();
  });
});

describe('PU-06 · Formato de los bytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1536, '1,5 KB'],
    [4_404_019, '4,2 MB'],
    [6_549_825_126, '6,1 GB'],
  ])('8. %d bytes se muestran como «%s»', (bytes, esperado) => {
    // Intl puede separar número y unidad con un espacio no separable; se normaliza para comparar.
    expect(formatearBytes(bytes).replace(/\s/g, ' ')).toBe(esperado);
  });
});
