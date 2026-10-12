import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * PU-03 · Identificador UUID versión 7 (apartado 3.7.1, RD-02, RFC 9562).
 * Especificación: docs/tecnica/01-identificador-uuidv7.md
 *
 * El generador conserva estado (la última marca temporal y el contador), así que cada prueba
 * carga una instancia nueva del módulo. Esa misma técnica permite simular dos teléfonos
 * independientes en la prueba de dos dispositivos.
 */

type Modulo = typeof import('./uuidv7');

async function nuevoGenerador(): Promise<Modulo> {
  vi.resetModules();
  return import('./uuidv7');
}

/** 6 de octubre de 2026, 2:15:00 a. m. en Colombia: el ejemplo resuelto del documento técnico. */
const ORDENO_2_15_AM = Date.UTC(2026, 9, 6, 7, 15, 0, 0);

const FORMATO_UUIDV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let g: Modulo;
beforeEach(async () => {
  g = await nuevoGenerador();
});

describe('PU-03 · 1. Formato', () => {
  it('cumple el patrón 8-4-4-4-12 hexadecimal, con versión 7 y variante RFC', () => {
    for (let i = 0; i < 1000; i++) {
      expect(g.uuidv7()).toMatch(FORMATO_UUIDV7);
    }
  });

  it('reproduce el ejemplo resuelto del documento técnico: el ordeño de las 2:15 a. m. empieza por 01a11010-d120-7000', () => {
    expect(g.uuidv7(ORDENO_2_15_AM).startsWith('01a11010-d120-7000-')).toBe(true);
  });
});

describe('PU-03 · 2. Marca temporal', () => {
  it('la marca codificada es la hora de creación y se recupera con marcaTemporalDeUuidv7', () => {
    const id = g.uuidv7(ORDENO_2_15_AM);
    expect(g.marcaTemporalDeUuidv7(id)).toBe(ORDENO_2_15_AM);
    expect(new Date(g.marcaTemporalDeUuidv7(id)).toISOString()).toBe('2026-10-06T07:15:00.000Z');
  });

  it('sin argumento usa la hora actual del dispositivo', () => {
    const antes = Date.now();
    const id = g.uuidv7();
    const despues = Date.now();
    const marca = g.marcaTemporalDeUuidv7(id);
    expect(marca).toBeGreaterThanOrEqual(antes);
    expect(marca).toBeLessThanOrEqual(despues);
  });
});

describe('PU-03 · 3. Unicidad', () => {
  it('100.000 identificadores generados sin ninguna repetición', () => {
    const generados = new Set<string>();
    for (let i = 0; i < 100_000; i++) generados.add(g.uuidv7());
    expect(generados.size).toBe(100_000);
  });
});

describe('PU-03 · 4. Orden', () => {
  it('generados uno tras otro, su orden alfabético coincide con el de creación', () => {
    const enOrdenDeCreacion = Array.from({ length: 10_000 }, () => g.uuidv7());
    expect([...enOrdenDeCreacion].sort()).toEqual(enOrdenDeCreacion);
  });

  it('dentro del mismo milisegundo el contador ordena: …-7000-, …-7001-, …-7002-', () => {
    const ids = [g.uuidv7(ORDENO_2_15_AM), g.uuidv7(ORDENO_2_15_AM), g.uuidv7(ORDENO_2_15_AM)];
    expect(ids.map((id) => id.slice(14, 18))).toEqual(['7000', '7001', '7002']);
    expect([...ids].sort()).toEqual(ids);
  });

  it('al pasar a un milisegundo nuevo el contador vuelve a cero', () => {
    g.uuidv7(ORDENO_2_15_AM);
    g.uuidv7(ORDENO_2_15_AM);
    expect(g.uuidv7(ORDENO_2_15_AM + 1).slice(14, 18)).toBe('7000');
  });
});

describe('PU-03 · 5. Reloj que retrocede', () => {
  it('si la hora retrocede, el identificador siguiente sigue quedando después del anterior', () => {
    const antes = g.uuidv7(ORDENO_2_15_AM);
    const conRelojAtrasado = g.uuidv7(ORDENO_2_15_AM - 60_000); // el reloj retrocede un minuto
    expect(conRelojAtrasado > antes).toBe(true);
    expect(g.marcaTemporalDeUuidv7(conRelojAtrasado)).toBe(ORDENO_2_15_AM);
  });
});

describe('PU-03 · 6. Contador lleno', () => {
  it('con más de 4.096 identificadores en el mismo milisegundo, el orden se conserva y la marca avanza 1 ms', () => {
    const ids = Array.from({ length: 5_000 }, () => g.uuidv7(ORDENO_2_15_AM));
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(5_000);
    expect(g.marcaTemporalDeUuidv7(ids[4095]!)).toBe(ORDENO_2_15_AM);
    expect(g.marcaTemporalDeUuidv7(ids[4096]!)).toBe(ORDENO_2_15_AM + 1);
  });
});

describe('PU-03 · 7. Dos dispositivos (RD-02)', () => {
  it('dos teléfonos independientes, en el mismo milisegundo exacto, no producen ningún identificador en común', async () => {
    const telefonoPropietario = await nuevoGenerador();
    const telefonoTrabajador = await nuevoGenerador();

    // Escenario de la Tabla 34: ambos registran a la misma hora, sin señal, sin comunicación entre sí.
    // Cada uno genera 1.000 identificadores con la misma marca temporal y los mismos valores de contador.
    const delPropietario = Array.from({ length: 1_000 }, () => telefonoPropietario.uuidv7(ORDENO_2_15_AM));
    const delTrabajador = Array.from({ length: 1_000 }, () => telefonoTrabajador.uuidv7(ORDENO_2_15_AM));

    // Comparten marca temporal y contador: solo los 62 bits aleatorios los distinguen.
    expect(delPropietario[0]!.slice(0, 18)).toBe(delTrabajador[0]!.slice(0, 18));

    const comunes = delPropietario.filter((id) => new Set(delTrabajador).has(id));
    expect(comunes).toEqual([]);
  });
});
