import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../datos/db';
import { ServicioSimulado } from '../test/servicioSimulado';
import { iniciarSincronizacionAutomatica, VIGILANCIA_RED_MS } from './motor';

/**
 * PU-10 · 9. Momentos de la sincronización (docs/tecnica/09-sincronizacion-subida.md, sección 2).
 * El entorno de las pruebas no tiene navegador: la red, la ventana y el documento se simulan.
 */

const red = { onLine: false };
let ventana: EventTarget;
let documento: EventTarget & { visibilityState: string };
let servicio: ServicioSimulado;
let consultas: ReturnType<typeof vi.spyOn>;
let terminadas = 0;
const alTerminar = () => {
  terminadas++;
};

/** Espera a que terminen n sincronizaciones (el candado omite una que empieza mientras otra sigue). */
async function esperarTerminadas(n: number) {
  for (let i = 0; i < 500 && terminadas < n; i++) await new Promise((r) => setImmediate(r));
  expect(terminadas).toBe(n);
}

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  // setImmediate queda real: lo usa la base de datos simulada para terminar cada sincronización.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  terminadas = 0;
  red.onLine = false;
  ventana = new EventTarget();
  documento = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('navigator', red);
  vi.stubGlobal('window', ventana);
  vi.stubGlobal('document', documento);
  servicio = new ServicioSimulado();
  consultas = vi.spyOn(servicio, 'sesionVigente');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PU-10 · 9. Momentos de la sincronización', () => {
  it('si la señal vuelve sin el aviso del navegador, sincroniza en la siguiente revisión (PE-32)', async () => {
    const detener = iniciarSincronizacionAutomatica(servicio, alTerminar);
    expect(consultas).not.toHaveBeenCalled(); // sin señal al abrir
    red.onLine = true; // salió del modo avión, sin evento «online»
    await vi.advanceTimersByTimeAsync(VIGILANCIA_RED_MS);
    await esperarTerminadas(1);
    expect(consultas).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(VIGILANCIA_RED_MS * 3); // con señal estable no repite
    expect(consultas).toHaveBeenCalledTimes(1);
    detener();
  });

  it('al volver a la aplicación sincroniza; oculta, no', async () => {
    red.onLine = true;
    const detener = iniciarSincronizacionAutomatica(servicio, alTerminar);
    await esperarTerminadas(1);
    expect(consultas).toHaveBeenCalledTimes(1); // al abrir
    documento.visibilityState = 'hidden';
    documento.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(consultas).toHaveBeenCalledTimes(1);
    documento.visibilityState = 'visible';
    documento.dispatchEvent(new Event('visibilitychange'));
    await esperarTerminadas(2);
    expect(consultas).toHaveBeenCalledTimes(2);
    detener();
  });

  it('al detenerse deja de vigilar la red y de escuchar los eventos', async () => {
    const detener = iniciarSincronizacionAutomatica(servicio, alTerminar);
    detener();
    red.onLine = true;
    await vi.advanceTimersByTimeAsync(VIGILANCIA_RED_MS);
    ventana.dispatchEvent(new Event('online'));
    documento.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(consultas).not.toHaveBeenCalled();
  });
});
