import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import type { DatosNuevos, Destino, Uuid } from '../../dominio/tipos';
import { puedeUsar } from '../../sesion/permisos';
import { cargarComparacion, estuvoEnLeche, periodoComparado } from './comparacion';

/**
 * PU-30 · Comparación de la producción de leche entre vacas (RF-12, CU-07 pasos 5 y 6, HU-10).
 * Especificación: docs/tecnica/28-comparacion-entre-vacas.md, sección 11
 */

const YO: Uuid = uuidv7();
// Domingo 18 de octubre de 2026: la semana en curso va del 12 al 18; el mes, del 1 al 31 (18 días hasta hoy).
const HOY = '2026-10-18';

function datosVaca(codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: '2020-01-01',
    fecha_nacimiento_exacta: true,
    fecha_ingreso: null,
    procedencia: null,
    peso_inicial: null,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
    ...cambios,
  };
}

const vaca = (codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}) => crear('animal', datosVaca(codigo, cambios), YO);
const destino = (animalId: Uuid, d: Destino, desde: string) => crear('destino_productivo', { animal_id: animalId, destino: d, desde }, YO);
const ordeno = (animalId: Uuid, fecha: string, litros: number) => crear('produccion_leche', { animal_id: animalId, fecha, litros }, YO);
/** Ordeños de varios días seguidos, con los mismos litros. */
async function ordenos(animalId: Uuid, desde: string, dias: number, litros: number) {
  for (let i = 0; i < dias; i++) {
    const d = new Date(`${desde}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    await ordeno(animalId, d.toISOString().slice(0, 10), litros);
  }
}

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

describe('PU-30 · 1. El periodo (sección 3)', () => {
  it('la semana va de lunes a domingo y el mes es calendario; 0 es el que contiene hoy', () => {
    expect(periodoComparado('semanal', HOY, 0)).toMatchObject({ inicio: '2026-10-12', fin: '2026-10-18', enCurso: true });
    expect(periodoComparado('semanal', HOY, -1)).toMatchObject({ inicio: '2026-10-05', fin: '2026-10-11', enCurso: false });
    expect(periodoComparado('mensual', HOY, 0)).toMatchObject({ inicio: '2026-10-01', fin: '2026-10-31', etiqueta: 'octubre de 2026', enCurso: true });
    expect(periodoComparado('mensual', HOY, -2)).toMatchObject({ inicio: '2026-08-01', fin: '2026-08-31' });
  });

  it('se mueve más allá de una ventana del documento 23 (12 semanas, 12 meses)', () => {
    expect(periodoComparado('semanal', HOY, -12)).toMatchObject({ inicio: '2026-07-20', fin: '2026-07-26' });
    expect(periodoComparado('mensual', HOY, -13)).toMatchObject({ inicio: '2025-09-01', fin: '2025-09-30' });
  });

  it('en curso, los días del periodo cuentan solo hasta hoy', async () => {
    const a = await vaca('Z1');
    await ordenos(a.id, '2026-10-12', 7, 10);
    const semana = await cargarComparacion('semanal', 0, '2026-10-14');
    expect(semana.sinRegistros.concat(semana.conRegistros)[0]).toMatchObject({ diasRegistrados: 3, diasDelPeriodo: 3 });
  });
});

describe('PU-30 · 2. Qué vacas entran (sección 4)', () => {
  const OCTUBRE = { inicio: '2026-10-01', fin: '2026-10-31', etiqueta: 'octubre', enCurso: true };
  const d = (destinoDe: Destino, desde: string) => ({ id: uuidv7(), animal_id: 'a', destino: destinoDe, desde, creado_en: `${desde}T12:00:00.000Z` });

  it('en leche al empezar, pasada a leche dentro del periodo o sacada de leche dentro de él; no si nunca estuvo', () => {
    expect(estuvoEnLeche([d('leche', '2026-09-01')], OCTUBRE)).toBe(true);
    expect(estuvoEnLeche([d('ceba', '2026-09-01'), d('leche', '2026-10-20')], OCTUBRE)).toBe(true);
    expect(estuvoEnLeche([d('leche', '2026-09-01'), d('reproductora', '2026-10-10')], OCTUBRE)).toBe(true);
    expect(estuvoEnLeche([d('ceba', '2026-09-01')], OCTUBRE)).toBe(false);
    expect(estuvoEnLeche([d('leche', '2026-11-02')], OCTUBRE)).toBe(false);
    expect(estuvoEnLeche([], OCTUBRE)).toBe(false);
    // El primer día del periodo: el destino de ese día es el que vale al empezar.
    expect(estuvoEnLeche([d('ceba', '2026-09-01'), d('leche', '2026-10-01')], OCTUBRE)).toBe(true);
    expect(estuvoEnLeche([d('leche', '2026-09-01'), d('ceba', '2026-10-01')], OCTUBRE)).toBe(false);
  });

  it('entran las que estuvieron en leche y las que tienen ordeños; no los machos ni las que nunca estuvieron; las retiradas, marcadas', async () => {
    const enLeche = await vaca('Z1');
    await destino(enLeche.id, 'leche', '2026-09-01');
    await ordenos(enLeche.id, '2026-10-01', 10, 12);
    const secada = await vaca('Z2');
    await destino(secada.id, 'leche', '2026-09-01');
    await destino(secada.id, 'reproductora', '2026-10-05');
    await ordenos(secada.id, '2026-10-01', 4, 8);
    const sinDestino = await vaca('Z3');
    await ordenos(sinDestino.id, '2026-10-01', 10, 9);
    const nunca = await vaca('Z4');
    await destino(nunca.id, 'ceba', '2026-09-01');
    const macho = await vaca('Z5', { sexo: 'macho' });
    await destino(macho.id, 'leche', '2026-09-01');
    const vendida = await vaca('Z6');
    await destino(vendida.id, 'leche', '2026-09-01');
    await ordenos(vendida.id, '2026-10-01', 9, 7);
    await crear('salida', { animal_id: vendida.id, fecha: '2026-10-10', motivo: 'venta', peso_venta: 400, valor_venta: 1, comprador: null, causa_muerte: null }, YO);

    const c = await cargarComparacion('mensual', 0, HOY);
    expect(c.conRegistros.map((v) => v.codigo_chapeta).sort()).toEqual(['Z1', 'Z2', 'Z3', 'Z6']);
    expect(c.conRegistros.find((v) => v.codigo_chapeta === 'Z6')?.retirada).toBe(true);
    expect(c.sinRegistros).toEqual([]);
  });
});

describe('PU-30 · 3. Promedio por día registrado y orden (sección 5)', () => {
  it('ordena por promedio, no por total: el día sin anotar no cuenta y el cero sí', async () => {
    const constante = await vaca('Z1'); // 7 días a 10: total 70, promedio 10
    await ordenos(constante.id, '2026-10-12', 7, 10);
    const olvidadiza = await vaca('Z2'); // 3 días a 12: total 36, promedio 12
    await ordenos(olvidadiza.id, '2026-10-12', 3, 12);
    const conCero = await vaca('Z3'); // 12, 0, 12, 12: promedio 9
    await ordeno(conCero.id, '2026-10-12', 12);
    await ordeno(conCero.id, '2026-10-13', 0);
    await ordeno(conCero.id, '2026-10-14', 12);
    await ordeno(conCero.id, '2026-10-15', 12);

    const c = await cargarComparacion('semanal', 0, HOY);
    expect(c.conRegistros.map((v) => [v.codigo_chapeta, v.promedio, v.total, v.diasRegistrados])).toEqual([
      ['Z2', 12, 36, 3],
      ['Z1', 10, 70, 7],
      ['Z3', 9, 36, 4],
    ]);
    // Promedio de los promedios (12 + 10 + 9) / 3, no total entre días (142 / 14).
    expect(c.promedioDelHato).toBe(10.3);
    expect(c.posible).toBe(true);
  });

  it('a igual promedio, primero la de más días registrados; después, por chapeta', async () => {
    const pocos = await vaca('Z1');
    await ordenos(pocos.id, '2026-10-12', 4, 10);
    const muchos = await vaca('Z9');
    await ordenos(muchos.id, '2026-10-12', 6, 10);
    const otra = await vaca('Z2');
    await ordenos(otra.id, '2026-10-12', 4, 10);
    const c = await cargarComparacion('semanal', 0, HOY);
    expect(c.conRegistros.map((v) => v.codigo_chapeta)).toEqual(['Z9', 'Z1', 'Z2']);
  });
});

describe('PU-30 · 4. De menor a mayor (sección 6)', () => {
  it('invierte las vacas con registros; las sin registros siguen al final', async () => {
    const a = await vaca('Z1');
    await ordenos(a.id, '2026-10-12', 7, 10);
    const b = await vaca('Z2');
    await ordenos(b.id, '2026-10-12', 7, 14);
    const sin = await vaca('Z3');
    await destino(sin.id, 'leche', '2026-09-01');
    const mayor = await cargarComparacion('semanal', 0, HOY, 'mayor');
    const menor = await cargarComparacion('semanal', 0, HOY, 'menor');
    expect(mayor.conRegistros.map((v) => v.codigo_chapeta)).toEqual(['Z2', 'Z1']);
    expect(menor.conRegistros.map((v) => v.codigo_chapeta)).toEqual(['Z1', 'Z2']);
    expect(menor.sinRegistros.map((v) => v.codigo_chapeta)).toEqual(['Z3']);
  });
});

describe('PU-30 · 5. Registros insuficientes (sección 7, CU-07 5a)', () => {
  it('menos de la mitad de los días queda marcada; la mitad exacta no', async () => {
    const tres = await vaca('Z1'); // 3 de 7
    await ordenos(tres.id, '2026-10-12', 3, 10);
    const cuatro = await vaca('Z2'); // 4 de 7
    await ordenos(cuatro.id, '2026-10-12', 4, 10);
    const c = await cargarComparacion('semanal', 0, HOY);
    expect(c.conRegistros.find((v) => v.codigo_chapeta === 'Z1')?.pocosRegistros).toBe(true);
    expect(c.conRegistros.find((v) => v.codigo_chapeta === 'Z2')?.pocosRegistros).toBe(false);
    // La mitad exacta no es «pocos»: el martes, 1 de 2 días.
    const martes = await cargarComparacion('semanal', 0, '2026-10-13');
    expect(martes.conRegistros.find((v) => v.codigo_chapeta === 'Z1')).toMatchObject({ diasRegistrados: 2, diasDelPeriodo: 2, pocosRegistros: false });
    const mitad = await vaca('Z3');
    await ordeno(mitad.id, '2026-10-12', 10);
    const martes2 = await cargarComparacion('semanal', 0, '2026-10-13');
    expect(martes2.conRegistros.find((v) => v.codigo_chapeta === 'Z3')).toMatchObject({ diasRegistrados: 1, diasDelPeriodo: 2, pocosRegistros: false });
    // En curso, la mitad se mide con los días hasta hoy: el miércoles, 2 de 3 días no son pocos.
    const miercoles = await cargarComparacion('semanal', 0, '2026-10-14');
    expect(miercoles.conRegistros.find((v) => v.codigo_chapeta === 'Z1')).toMatchObject({ diasRegistrados: 3, diasDelPeriodo: 3, pocosRegistros: false });
  });

  it('con una sola vaca con registros la comparación no es posible; sin vacas, tampoco', async () => {
    expect(await cargarComparacion('semanal', 0, HOY)).toMatchObject({ conRegistros: [], sinRegistros: [], posible: false, promedioDelHato: null });
    const a = await vaca('Z1');
    await ordenos(a.id, '2026-10-12', 7, 10);
    const sin = await vaca('Z2');
    await destino(sin.id, 'leche', '2026-09-01');
    const una = await cargarComparacion('semanal', 0, HOY);
    expect(una.posible).toBe(false);
    expect(una.conRegistros.map((v) => v.codigo_chapeta)).toEqual(['Z1']);
    expect(una.sinRegistros.map((v) => v.codigo_chapeta)).toEqual(['Z2']);
  });

  it('los registros de otro periodo no cuentan', async () => {
    const a = await vaca('Z1');
    await ordenos(a.id, '2026-10-05', 7, 10);
    const b = await vaca('Z2');
    await ordenos(b.id, '2026-10-05', 7, 12);
    expect((await cargarComparacion('semanal', 0, HOY)).conRegistros).toEqual([]);
    expect((await cargarComparacion('semanal', -1, HOY)).conRegistros).toHaveLength(2);
  });
});

describe('PU-30 · 6. Valor vigente (sección 9)', () => {
  it('usa los litros corregidos y descarta los ordeños anulados', async () => {
    const a = await vaca('Z1');
    const corregido = await ordeno(a.id, '2026-10-12', 10);
    const anulado = await ordeno(a.id, '2026-10-13', 30);
    const b = await vaca('Z2');
    await ordeno(b.id, '2026-10-12', 15);
    const base = { entidad_afectada: 'produccion_leche' as const, motivo: 'error_digitacion' as const, nota: null };
    await crear('correccion', { ...base, registro_id: corregido.id, tipo: 'correccion', campo: 'litros', valor_anterior: '10', valor_nuevo: '20' }, YO);
    await crear('correccion', { ...base, registro_id: anulado.id, tipo: 'anulacion', campo: null, valor_anterior: null, valor_nuevo: null }, YO);
    const c = await cargarComparacion('semanal', 0, HOY);
    expect(c.conRegistros.map((v) => [v.codigo_chapeta, v.promedio, v.diasRegistrados])).toEqual([
      ['Z1', 20, 1],
      ['Z2', 15, 1],
    ]);
  });
});

describe('PU-30 · 7. Solo el propietario (Tabla 27)', () => {
  it('el trabajador no tiene CU-07', () => {
    expect(puedeUsar('propietario', 'CU-07')).toBe(true);
    expect(puedeUsar('trabajador', 'CU-07')).toBe(false);
  });
});
