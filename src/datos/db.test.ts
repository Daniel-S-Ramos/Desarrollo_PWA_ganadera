import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RegistroLocal, Uuid } from '../dominio/tipos';
import { BaseLocal, TABLAS_SINCRONIZABLES } from './db';
import { uuidv7 } from './uuidv7';

/**
 * PU-04 · Esquema local (RD-01, apartado 3.8.4, Tabla 25).
 * Especificación: docs/tecnica/02-esquema-local.md
 *
 * Prueba de integración entre el esquema y una base IndexedDB real, simulada en memoria por
 * fake-indexeddb (cargado en src/test/setup.ts). Cada prueba abre una base de datos propia,
 * vacía, y la elimina al terminar.
 */

let db: BaseLocal;

beforeEach(async () => {
  db = new BaseLocal(`prueba-${uuidv7()}`);
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

// ---------------------------------------------------------------------------
// Datos de apoyo
// ---------------------------------------------------------------------------

const AUTOR: Uuid = uuidv7();

function auditable() {
  return { id: uuidv7(), autor_id: AUTOR, creado_en: new Date().toISOString(), estado_sync: 'pendiente' as const };
}

function animal(codigo: string): RegistroLocal<'animal'> {
  return {
    ...auditable(),
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: '2022-03-15',
    fecha_nacimiento_exacta: true,
    fecha_ingreso: null,
    procedencia: null,
    peso_inicial: null,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
  };
}

function eventoSanitario(animalId: Uuid, medicamentoId: Uuid, fecha: string): RegistroLocal<'evento_sanitario'> {
  return { ...auditable(), animal_id: animalId, fecha, tipo: 'purga', medicamento_id: medicamentoId, dosis: 5, costo: null, sintomas: null };
}

function ordeno(animalId: Uuid, fecha: string, litros: number): RegistroLocal<'produccion_leche'> {
  return { ...auditable(), animal_id: animalId, fecha, litros };
}

// ---------------------------------------------------------------------------
// 1 y 2. Estructura e índices
// ---------------------------------------------------------------------------

/** Índices de cada tabla según la sección 5 del documento técnico (sin contar la clave primaria). */
const INDICES_ESPERADOS: Record<string, string[]> = {
  animal: ['codigo_chapeta', 'madre_id', 'padre_id', 'estado_sync'],
  fotografia: ['animal_id', '[animal_id+tipo]', 'estado_sync'],
  evento_sanitario: ['animal_id', 'medicamento_id', '[animal_id+medicamento_id]', 'fecha', 'estado_sync'],
  produccion_leche: ['animal_id', 'fecha', '[animal_id+fecha]', 'estado_sync'],
  pesaje: ['animal_id', 'fecha', 'estado_sync'],
  parto: ['madre_id', 'cria_id', 'fecha', 'estado_sync'],
  destino_productivo: ['animal_id', 'desde', 'estado_sync'],
  movimiento_economico: ['animal_id', 'concepto', 'estado_sync'],
  salida: ['animal_id', 'estado_sync'],
  recordatorio: ['tipo', 'animal_id', 'estado_sync'],
  correccion: ['[entidad_afectada+registro_id]', 'registro_id', 'autor_id', 'creado_en', 'estado_sync'],
  medicamento: ['nombre', 'estado_sync'],
  usuario: [],
  parametro: [],
  cola_operaciones: ['registro_id'],
  cola_imagenes: ['fotografia_id'],
  imagen: ['animal_id'],
  meta: [],
};

const CLAVES_PRIMARIAS: Record<string, string> = {
  parametro: 'clave',
  cola_operaciones: 'seq',
  cola_imagenes: 'seq',
  imagen: 'fotografia_id',
  meta: 'clave',
};

describe('PU-04 · 1. Estructura', () => {
  it('la base de datos abre con las 18 tablas del documento técnico', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(Object.keys(INDICES_ESPERADOS).sort());
  });

  it.each(Object.keys(INDICES_ESPERADOS))('%s tiene la clave primaria declarada', (tabla) => {
    expect(db.table(tabla).schema.primKey.name).toBe(CLAVES_PRIMARIAS[tabla] ?? 'id');
  });

  it('las colas usan clave autoincremental para conservar el orden', () => {
    expect(db.cola_operaciones.schema.primKey.auto).toBe(true);
    expect(db.cola_imagenes.schema.primKey.auto).toBe(true);
  });

  it('las doce tablas sincronizables son las entidades que crea el dispositivo', () => {
    expect([...TABLAS_SINCRONIZABLES].sort()).toEqual(
      Object.keys(INDICES_ESPERADOS)
        .filter((t) => !['usuario', 'parametro', 'cola_operaciones', 'cola_imagenes', 'imagen', 'meta'].includes(t))
        .sort(),
    );
  });
});

describe('PU-04 · 2. Índices', () => {
  it.each(Object.entries(INDICES_ESPERADOS))('%s tiene exactamente los índices justificados', (tabla, esperados) => {
    const declarados = db.table(tabla).schema.indexes.map((i) => i.name);
    expect(declarados.sort()).toEqual([...esperados].sort());
  });

  it('ningún índice es único: la unicidad la garantiza el servicio remoto (sección 6)', () => {
    const unicos = db.tables.flatMap((t) => t.schema.indexes.filter((i) => i.unique).map((i) => `${t.name}.${i.name}`));
    expect(unicos).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3 a 9. Comportamiento
// ---------------------------------------------------------------------------

describe('PU-04 · 3. Consulta por índice simple', () => {
  it('el historial sanitario de un animal no trae los eventos de otros animales', async () => {
    const a027 = animal('027');
    const a031 = animal('031');
    const ivermectina = uuidv7();
    await db.animal.bulkAdd([a027, a031]);
    await db.evento_sanitario.bulkAdd([
      eventoSanitario(a027.id, ivermectina, '2026-09-01'),
      eventoSanitario(a031.id, ivermectina, '2026-09-02'),
      eventoSanitario(a027.id, ivermectina, '2026-10-01'),
    ]);

    const historial027 = await db.evento_sanitario.where('animal_id').equals(a027.id).toArray();
    expect(historial027).toHaveLength(2);
    expect(historial027.every((e) => e.animal_id === a027.id)).toBe(true);
  });
});

describe('PU-04 · 4. Consulta por índice compuesto', () => {
  it('[animal_id+fecha] responde «¿esta vaca ya tiene ordeño hoy?» (HU-04)', async () => {
    const vaca = animal('012');
    await db.produccion_leche.bulkAdd([ordeno(vaca.id, '2026-10-05', 6.5), ordeno(vaca.id, '2026-10-06', 7)]);

    const hoy = await db.produccion_leche.where('[animal_id+fecha]').equals([vaca.id, '2026-10-06']).toArray();
    const manana = await db.produccion_leche.where('[animal_id+fecha]').equals([vaca.id, '2026-10-07']).toArray();
    expect(hoy.map((o) => o.litros)).toEqual([7]);
    expect(manana).toEqual([]);
  });

  it('[animal_id+medicamento_id] encuentra las aplicaciones previas de un medicamento a un animal (RF-09)', async () => {
    const animal027 = animal('027');
    const ivermectina = uuidv7();
    const vitamina = uuidv7();
    await db.evento_sanitario.bulkAdd([
      eventoSanitario(animal027.id, ivermectina, '2026-09-20'),
      eventoSanitario(animal027.id, vitamina, '2026-09-25'),
    ]);

    const previas = await db.evento_sanitario
      .where('[animal_id+medicamento_id]')
      .equals([animal027.id, ivermectina])
      .toArray();
    expect(previas.map((e) => e.fecha)).toEqual(['2026-09-20']);
  });
});

describe('PU-04 · 5. Orden de las fechas', () => {
  it('las fechas AAAA-MM-DD recuperadas por índice salen en orden cronológico', async () => {
    const vaca = animal('012');
    // Se insertan desordenadas, cruzando cambio de mes y de año.
    for (const fecha of ['2026-10-02', '2025-12-31', '2026-01-15', '2026-09-30', '2026-10-01']) {
      await db.produccion_leche.add(ordeno(vaca.id, fecha, 6));
    }
    const fechas = (await db.produccion_leche.orderBy('fecha').toArray()).map((o) => o.fecha);
    expect(fechas).toEqual(['2025-12-31', '2026-01-15', '2026-09-30', '2026-10-01', '2026-10-02']);
  });

  it('un periodo se consulta con un rango sobre el índice (consulta semanal, RF-11)', async () => {
    const vaca = animal('012');
    for (const fecha of ['2026-09-28', '2026-09-30', '2026-10-03', '2026-10-05']) {
      await db.produccion_leche.add(ordeno(vaca.id, fecha, 6));
    }
    const semana = await db.produccion_leche.where('fecha').between('2026-09-29', '2026-10-05', true, true).toArray();
    expect(semana.map((o) => o.fecha).sort()).toEqual(['2026-09-30', '2026-10-03', '2026-10-05']);
  });
});

describe('PU-04 · 6. La unicidad no se impone en el teléfono (sección 6)', () => {
  it('dos animales con el mismo código de chapeta pueden coexistir mientras se resuelve el conflicto', async () => {
    const delTrabajador = animal('045');
    const delPropietario = { ...animal('045'), estado_sync: 'conflicto' as const, detalle_conflicto: 'Código de chapeta ya asignado' };
    await db.animal.bulkAdd([delTrabajador, delPropietario]);

    const con045 = await db.animal.where('codigo_chapeta').equals('045').toArray();
    expect(con045).toHaveLength(2);
  });

  it('la consulta por código permite advertir la coincidencia antes de guardar (Tabla 31)', async () => {
    await db.animal.add(animal('045'));
    const yaAsignado = (await db.animal.where('codigo_chapeta').equals('045').count()) > 0;
    const libre = (await db.animal.where('codigo_chapeta').equals('046').count()) > 0;
    expect(yaAsignado).toBe(true);
    expect(libre).toBe(false);
  });

  it('los registros en conflicto se localizan por su estado (Tabla 22)', async () => {
    await db.animal.bulkAdd([animal('045'), { ...animal('045'), estado_sync: 'conflicto' }]);
    expect(await db.animal.where('estado_sync').equals('conflicto').count()).toBe(1);
  });
});

describe('PU-04 · 7. Orden de la cola', () => {
  it('las entradas reciben un seq creciente y se recorren en el orden en que se agregaron', async () => {
    const registros = [uuidv7(), uuidv7(), uuidv7(), uuidv7()];
    for (const registro_id of registros) {
      await db.cola_operaciones.add({
        entidad: 'pesaje',
        registro_id,
        tipo: 'insertar',
        intentos: 0,
        ultimo_intento: null,
        creado_en: new Date().toISOString(),
      });
    }
    const cola = await db.cola_operaciones.orderBy('seq').toArray();
    expect(cola.map((o) => o.registro_id)).toEqual(registros);
    const seqs = cola.map((o) => o.seq!);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
  });
});

describe('PU-04 · 8. Campos no indexados', () => {
  it('un registro conserva todos sus campos aunque no estén declarados en el esquema', async () => {
    const pesaje: RegistroLocal<'pesaje'> = {
      ...auditable(),
      animal_id: uuidv7(),
      fecha: '2026-10-06',
      peso: 312.5,
      metodo: 'cinta',
    };
    await db.pesaje.add(pesaje);
    expect(await db.pesaje.get(pesaje.id)).toEqual(pesaje);
  });
});

describe('PU-04 · 9. Contenido binario', () => {
  it('una imagen guardada como Blob se recupera con el mismo tamaño y tipo', async () => {
    const contenido = new Uint8Array(100 * 1024).map((_, i) => i % 256); // 100 KB, tamaño de la imagen reducida (3.8.7)
    const reducida = new Blob([contenido], { type: 'image/webp' });
    const fotografia_id = uuidv7();

    await db.imagen.add({ fotografia_id, animal_id: uuidv7(), reducida, completa: null });
    const recuperada = await db.imagen.get(fotografia_id);

    expect(recuperada?.reducida?.size).toBe(100 * 1024);
    expect(recuperada?.reducida?.type).toBe('image/webp');
    expect(new Uint8Array(await recuperada!.reducida!.arrayBuffer())).toEqual(contenido);
  });
});
