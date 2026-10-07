import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { DatosNuevos, Uuid } from '../dominio/tipos';
import { BaseLocal, db } from './db';
import { consulta, contarPendientes, crear, operacionesPendientes, unidadDeTrabajo } from './repositorio';
import { marcaTemporalDeUuidv7, uuidv7 } from './uuidv7';

/**
 * PU-05 · Repositorio local y cola de operaciones (apartado 3.7.2, RNF-04, RD-04).
 * Especificación: docs/tecnica/03-repositorio-y-cola.md
 *
 * Prueba de integración contra IndexedDB simulada en memoria. Cada prueba parte de la base de
 * datos de la aplicación vacía.
 */

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Datos de apoyo
// ---------------------------------------------------------------------------

const PROPIETARIO: Uuid = uuidv7();

function pesaje(peso = 312.5): DatosNuevos<'pesaje'> {
  return { animal_id: uuidv7(), fecha: '2026-10-07', peso, metodo: 'cinta' };
}

function cria(codigo: string): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: '2026-10-07',
    fecha_nacimiento_exacta: true,
    fecha_ingreso: null,
    procedencia: 'Nacida en el predio',
    peso_inicial: 32,
    madre_id: uuidv7(),
    padre_id: null,
    padre_externo: null,
    estado: 'activo',
  };
}

function parto(madreId: Uuid, criaId: Uuid | null): DatosNuevos<'parto'> {
  return { madre_id: madreId, fecha: '2026-10-07', resultado: 'cria_viva', cria_id: criaId, observacion: null };
}

// ---------------------------------------------------------------------------
// Pruebas
// ---------------------------------------------------------------------------

describe('PU-05 · 1. Campos que fija el repositorio', () => {
  it('el registro creado tiene id UUID v7, el autor recibido, la hora de creación y estado pendiente', async () => {
    const antes = Date.now();
    const registro = await crear('pesaje', pesaje(), PROPIETARIO);
    const despues = Date.now();

    expect(registro.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(registro.autor_id).toBe(PROPIETARIO);
    expect(registro.estado_sync).toBe('pendiente');
    const creado = Date.parse(registro.creado_en);
    expect(creado).toBeGreaterThanOrEqual(antes);
    expect(creado).toBeLessThanOrEqual(despues);
    expect(marcaTemporalDeUuidv7(registro.id)).toBeGreaterThanOrEqual(antes);
  });

  it('conserva los datos aportados por quien registra', async () => {
    const datos = pesaje(287);
    const registro = await crear('pesaje', datos, PROPIETARIO);
    expect(registro).toMatchObject(datos);
    expect(await db.pesaje.get(registro.id)).toEqual(registro);
  });

  it('los campos de auditoría prevalecen aunque lleguen valores mezclados en los datos (RD-04)', async () => {
    const intentoDeFalsear = { ...pesaje(), id: 'falso', autor_id: 'otro-usuario', creado_en: '2020-01-01T00:00:00Z' };
    const registro = await crear('pesaje', intentoDeFalsear as DatosNuevos<'pesaje'>, PROPIETARIO);
    expect(registro.id).not.toBe('falso');
    expect(registro.autor_id).toBe(PROPIETARIO);
    expect(registro.creado_en).not.toBe('2020-01-01T00:00:00Z');
  });
});

describe('PU-05 · 2. Registro y cola juntos', () => {
  it('tras crear existen el registro y exactamente una entrada en la cola que apunta a él', async () => {
    const registro = await crear('pesaje', pesaje(), PROPIETARIO);
    const cola = await operacionesPendientes();

    expect(cola).toHaveLength(1);
    expect(cola[0]).toMatchObject({
      entidad: 'pesaje',
      registro_id: registro.id,
      tipo: 'insertar',
      intentos: 0,
      ultimo_intento: null,
    });
  });
});

describe('PU-05 · 3. Atomicidad ante una falla', () => {
  it('si la escritura en la cola falla, el registro tampoco queda (simulación de apagado entre las dos escrituras)', async () => {
    vi.spyOn(db.cola_operaciones, 'add').mockRejectedValueOnce(new Error('Apagado simulado del dispositivo'));

    await expect(crear('pesaje', pesaje(), PROPIETARIO)).rejects.toThrow('Apagado simulado');

    expect(await db.pesaje.count()).toBe(0);
    expect(await contarPendientes()).toBe(0);
  });

  it('si el trabajo falla después de crear el registro, la transacción se descarta completa', async () => {
    await expect(
      unidadDeTrabajo(PROPIETARIO, async (tx) => {
        await tx.crear('pesaje', pesaje());
        throw new Error('Falla posterior a la escritura');
      }),
    ).rejects.toThrow('Falla posterior');

    expect(await db.pesaje.count()).toBe(0);
    expect(await contarPendientes()).toBe(0);
  });
});

describe('PU-05 · 4. Unidad de trabajo', () => {
  it('una cría y su parto creados juntos generan dos registros y dos entradas en la cola, en ese orden (CU-10)', async () => {
    const madre = uuidv7();
    const { criaCreada, partoCreado } = await unidadDeTrabajo(PROPIETARIO, async (tx) => {
      const criaCreada = await tx.crear('animal', cria('058'));
      const partoCreado = await tx.crear('parto', parto(madre, criaCreada.id));
      return { criaCreada, partoCreado };
    });

    expect(partoCreado.cria_id).toBe(criaCreada.id);
    expect((await operacionesPendientes()).map((o) => [o.entidad, o.registro_id])).toEqual([
      ['animal', criaCreada.id],
      ['parto', partoCreado.id],
    ]);
  });

  it('si el parto falla, no queda la cría: el control reproductivo no pierde un parto (3.8.8)', async () => {
    vi.spyOn(db.parto, 'add').mockRejectedValueOnce(new Error('Falla al guardar el parto'));

    await expect(
      unidadDeTrabajo(PROPIETARIO, async (tx) => {
        const criaCreada = await tx.crear('animal', cria('058'));
        await tx.crear('parto', parto(uuidv7(), criaCreada.id));
      }),
    ).rejects.toThrow('Falla al guardar el parto');

    expect(await db.animal.count()).toBe(0);
    expect(await db.parto.count()).toBe(0);
    expect(await contarPendientes()).toBe(0);
  });
});

describe('PU-05 · 5. Confirmación después de la escritura', () => {
  it('cuando crear termina, el registro ya es legible desde una conexión nueva a la base de datos', async () => {
    const registro = await crear('pesaje', pesaje(), PROPIETARIO);

    const otraConexion = new BaseLocal(db.name);
    await otraConexion.open();
    try {
      expect(await otraConexion.pesaje.get(registro.id)).toEqual(registro);
      expect(await otraConexion.cola_operaciones.count()).toBe(1);
    } finally {
      otraConexion.close();
    }
  });
});

describe('PU-05 · 6. Persistencia ante el cierre', () => {
  it('tras cerrar y reabrir la base de datos, el registro y su entrada en la cola siguen ahí', async () => {
    const registro = await crear('pesaje', pesaje(), PROPIETARIO);

    db.close();
    await db.open();

    expect(await db.pesaje.get(registro.id)).toEqual(registro);
    expect((await operacionesPendientes())[0]?.registro_id).toBe(registro.id);
  });
});

describe('PU-05 · 7. Orden de la cola', () => {
  it('varias operaciones se leen en el orden en que se crearon y contarPendientes las cuenta', async () => {
    const creados = [];
    for (const peso of [300, 305, 310, 315, 320]) {
      creados.push(await crear('pesaje', pesaje(peso), PROPIETARIO));
    }
    expect((await operacionesPendientes()).map((o) => o.registro_id)).toEqual(creados.map((r) => r.id));
    expect(await contarPendientes()).toBe(5);
  });
});

describe('PU-05 · 8. Solo lectura', () => {
  it('las tablas de consulta permiten consultar por índice', async () => {
    const registro = await crear('pesaje', pesaje(), PROPIETARIO);
    const delAnimal = await consulta.pesaje.where('animal_id').equals(registro.animal_id).toArray();
    expect(delAnimal).toEqual([registro]);
  });

  it('las tablas de consulta no tienen métodos de escritura (verificado por el compilador)', () => {
    expectTypeOf(consulta.pesaje).not.toHaveProperty('add');
    expectTypeOf(consulta.pesaje).not.toHaveProperty('put');
    expectTypeOf(consulta.pesaje).not.toHaveProperty('update');
    expectTypeOf(consulta.pesaje).not.toHaveProperty('delete');
    expectTypeOf(consulta.pesaje).not.toHaveProperty('bulkAdd');
    expectTypeOf(consulta.pesaje).not.toHaveProperty('clear');
    expectTypeOf(consulta.pesaje).toHaveProperty('where');
  });
});

describe('PU-05 · 9. Arquitectura', () => {
  it('ningún archivo fuera de src/datos/ importa directamente la base de datos (db.ts)', () => {
    const raiz = join(import.meta.dirname, '..');
    const archivos = readdirSync(raiz, { recursive: true, encoding: 'utf8' })
      .filter((ruta) => /\.(ts|tsx)$/.test(ruta))
      .map((ruta) => ruta.replaceAll('\\', '/'))
      .filter((ruta) => !ruta.startsWith('datos/'));

    const infractores = archivos.filter((ruta) => {
      const codigo = readFileSync(join(raiz, ruta), 'utf8');
      return /from\s+['"][^'"]*datos\/db['"]/.test(codigo);
    });

    expect(archivos.length).toBeGreaterThan(0);
    expect(infractores.map((ruta) => relative('.', ruta))).toEqual([]);
  });
});
