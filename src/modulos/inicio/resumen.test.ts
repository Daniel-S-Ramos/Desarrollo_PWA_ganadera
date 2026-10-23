import { describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import { avanceDeRonda, calcularResumenProduccion, cargarResumenProduccion, primerNombre, saludo } from './resumen';

/**
 * PU-34 · Resumen de la pantalla de inicio: saludo, producción y avance de la ronda.
 * Rediseño del inicio aprobado por el autor el 2026-10-22.
 */

const HOY = '2026-10-22';
const o = (animal_id: string, fecha: string, litros: number) => ({ animal_id, fecha, litros });

describe('PU-34 · 1. Saludo', () => {
  it('días hasta el mediodía, tardes hasta las 7 de la noche, noches después', () => {
    expect([0, 11, 12, 18, 19, 23].map(saludo)).toEqual(['Buenos días', 'Buenos días', 'Buenas tardes', 'Buenas tardes', 'Buenas noches', 'Buenas noches']);
  });

  it('el primer nombre', () => {
    expect(primerNombre('José Ramos')).toBe('José');
    expect(primerNombre('  Daniel  Santiago Ramos ')).toBe('Daniel');
    expect(primerNombre('Pedro')).toBe('Pedro');
  });
});

describe('PU-34 · 2. Producción del inicio', () => {
  it('los litros de hoy', () => {
    expect(calcularResumenProduccion([o('a', HOY, 10), o('b', HOY, 12.35), o('a', '2026-10-21', 99)], HOY)).toEqual({ fecha: HOY, esHoy: true, litros: 22.4 });
  });

  it('sin ordeños hoy, el último día que los tuvo; los de días futuros no cuentan', () => {
    expect(calcularResumenProduccion([o('a', '2026-10-19', 5), o('a', '2026-10-20', 7), o('b', '2026-10-20', 3), o('a', '2026-10-25', 50)], HOY)).toEqual({
      fecha: '2026-10-20',
      esHoy: false,
      litros: 10,
    });
    expect(calcularResumenProduccion([o('a', '2026-10-25', 50)], HOY)).toBeNull();
    expect(calcularResumenProduccion([], HOY)).toBeNull();
  });

  it('desde el teléfono: sin anulados y con los litros corregidos', async () => {
    db.close();
    await db.delete();
    await db.open();
    const autor = uuidv7();
    const vaca = uuidv7();
    const a = await crear('produccion_leche', { animal_id: vaca, fecha: HOY, litros: 10 }, autor);
    const b = await crear('produccion_leche', { animal_id: uuidv7(), fecha: HOY, litros: 8 }, autor);
    const base = { motivo: 'error_digitacion' as const, nota: null };
    await crear('correccion', { ...base, entidad_afectada: 'produccion_leche', registro_id: a.id, tipo: 'correccion', campo: 'litros', valor_anterior: '10', valor_nuevo: '12' }, autor);
    await crear('correccion', { ...base, entidad_afectada: 'produccion_leche', registro_id: b.id, tipo: 'anulacion', campo: null, valor_anterior: null, valor_nuevo: null }, autor);
    expect(await cargarResumenProduccion(HOY)).toEqual({ fecha: HOY, esHoy: true, litros: 12 });
  });
});

describe('PU-34 · 3. Avance de la ronda (trabajador)', () => {
  it('cuántas vacas tienen ordeño y cuántas hay', () => {
    expect(avanceDeRonda([{ existente: {} }, { existente: null }, { existente: {} }])).toEqual({ registradas: 2, total: 3 });
    expect(avanceDeRonda([])).toEqual({ registradas: 0, total: 0 });
  });
});

