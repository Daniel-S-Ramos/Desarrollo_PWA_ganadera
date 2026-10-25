import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import type { DatosNuevos, Uuid } from '../../dominio/tipos';
import { puedeUsar } from '../../sesion/permisos';
import { cargarCorreccionesRecientes, destinoDe, etiquetaDelDia, POR_PAGINA } from './consultaCorrecciones';

/**
 * PU-29 · Consulta de las correcciones y las anulaciones (RF-32, CU-18, HU-17.5).
 * Especificación: docs/tecnica/27-consulta-de-correcciones.md, sección 10
 */

const PROPIETARIO: Uuid = uuidv7();
const TRABAJADOR: Uuid = uuidv7();
const HOY = '2026-10-18';

function datosAnimal(codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: '2022-03-04',
    fecha_nacimiento_exacta: true,
    fecha_ingreso: null,
    procedencia: null,
    peso_inicial: 32,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
    ...cambios,
  };
}

type DatosCorreccion = DatosNuevos<'correccion'>;
const base = { tipo: 'correccion' as const, motivo: 'error_digitacion' as const, nota: null };

/** Una corrección guardada en un instante dado (las del servicio llegan con su hora y sincronizadas). */
async function corregir(datos: Partial<DatosCorreccion> & Pick<DatosCorreccion, 'entidad_afectada' | 'registro_id'>, creado_en: string, autor = PROPIETARIO, estado_sync: 'sincronizado' | 'pendiente' = 'sincronizado') {
  const id = uuidv7();
  await db.correccion.add({ ...base, campo: null, valor_anterior: null, valor_nuevo: null, ...datos, id, autor_id: autor, creado_en, estado_sync } as never);
  return id;
}

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR, nombre: 'Daniel Ramos', perfil: 'trabajador' },
  ]);
});

describe('PU-29 · 1. Contenido de cada entrada (sección 3)', () => {
  it('animal y registro, cambio legible, motivo con nota, autor, fecha y estado', async () => {
    const vaca = await crear('animal', datosAnimal('Z921'), PROPIETARIO);
    const med = await crear('medicamento', { nombre: 'Prueba Aftosa', tipo: 'vacuna', unidad: 'mg', intervalo_advertencia_dias: 35 }, PROPIETARIO);
    const e = await crear('evento_sanitario', { animal_id: vaca.id, fecha: '2026-10-14', tipo: 'vacuna', medicamento_id: med.id, dosis: 1, costo: null, sintomas: null }, PROPIETARIO);
    await corregir({ entidad_afectada: 'evento_sanitario', registro_id: e.id, campo: 'dosis', valor_anterior: '1', valor_nuevo: '2.5', nota: 'Se anotó mal' }, '2026-10-18T14:00:00.000Z', PROPIETARIO, 'pendiente');

    const [entrada] = (await cargarCorreccionesRecientes(null, POR_PAGINA, HOY)).grupos[0]!.entradas;
    expect(entrada).toMatchObject({
      titulo: 'Z921 · Vacuna Prueba Aftosa del 14 de octubre de 2026',
      // La chapeta aparte, para la chapeta amarilla de la pantalla (sesión A, 2026-10-25).
      chapeta: 'Z921',
      nombre: 'Vacuna Prueba Aftosa del 14 de octubre de 2026',
      cambio: 'Dosis: antes 1, ahora 2,5',
      anulacion: false,
      motivo: 'Error de digitación · Se anotó mal',
      autor: 'José Ramos',
      estado_sync: 'pendiente',
      destino: `/animales/${vaca.id}?sanidad=1`,
    });
    // La hora la da el formateador del navegador (formatearInstante); aquí basta el día.
    expect(entrada?.cuando).toMatch(/^18 de octubre de 2026/);
  });

  it('una anulación dice «Anulado»; fechas, opciones, animales y medicamentos se muestran por su nombre', async () => {
    const vaca = await crear('animal', datosAnimal('Z925'), PROPIETARIO);
    const madre = await crear('animal', datosAnimal('Z920'), PROPIETARIO);
    const p = await crear('pesaje', { animal_id: vaca.id, fecha: '2026-10-17', peso: 1016, metodo: 'cinta' }, PROPIETARIO);
    await corregir({ entidad_afectada: 'pesaje', registro_id: p.id, tipo: 'anulacion', motivo: 'registro_duplicado' }, '2026-10-18T10:00:00.000Z');
    await corregir({ entidad_afectada: 'animal', registro_id: vaca.id, campo: 'fecha_nacimiento', valor_anterior: '2022-03-04', valor_nuevo: '2022-03-05' }, '2026-10-18T11:00:00.000Z');
    await corregir({ entidad_afectada: 'animal', registro_id: vaca.id, campo: 'sexo', valor_anterior: 'hembra', valor_nuevo: 'macho' }, '2026-10-18T12:00:00.000Z');
    await corregir({ entidad_afectada: 'animal', registro_id: vaca.id, campo: 'madre_id', valor_anterior: '', valor_nuevo: madre.id }, '2026-10-18T13:00:00.000Z');

    const entradas = (await cargarCorreccionesRecientes(null, POR_PAGINA, HOY)).grupos[0]!.entradas;
    expect(entradas.map((e) => [e.titulo, e.cambio])).toEqual([
      ['Z925 · Datos del animal', 'Madre del predio: antes vacío, ahora Z920'],
      ['Z925 · Datos del animal', 'Sexo: antes Hembra, ahora Macho'],
      ['Z925 · Datos del animal', 'Fecha de nacimiento: antes 4 de marzo de 2022, ahora 5 de marzo de 2022'],
      ['Z925 · Pesaje del 17 de octubre de 2026', 'Anulado'],
    ]);
    expect(entradas[3]).toMatchObject({ anulacion: true, motivo: 'Registro duplicado' });
  });

  it('el registro se nombra con su valor vigente: un evento con el medicamento corregido, con el nuevo', async () => {
    const vaca = await crear('animal', datosAnimal('Z921'), PROPIETARIO);
    const a = await crear('medicamento', { nombre: 'Prueba Aftosa', tipo: 'vacuna', unidad: 'mg', intervalo_advertencia_dias: 35 }, PROPIETARIO);
    const b = await crear('medicamento', { nombre: 'Prueba Ivermectina', tipo: 'purga', unidad: 'ml', intervalo_advertencia_dias: 35 }, PROPIETARIO);
    const e = await crear('evento_sanitario', { animal_id: vaca.id, fecha: '2026-10-14', tipo: 'vacuna', medicamento_id: a.id, dosis: 1, costo: null, sintomas: null }, PROPIETARIO);
    await corregir({ entidad_afectada: 'evento_sanitario', registro_id: e.id, campo: 'medicamento_id', valor_anterior: a.id, valor_nuevo: b.id }, '2026-10-18T10:00:00.000Z');
    const [entrada] = (await cargarCorreccionesRecientes(null, POR_PAGINA, HOY)).grupos[0]!.entradas;
    expect(entrada).toMatchObject({ titulo: 'Z921 · Vacuna Prueba Ivermectina del 14 de octubre de 2026', cambio: 'Medicamento: antes Prueba Aftosa, ahora Prueba Ivermectina' });
  });

  it('un medicamento no pertenece a un animal; un registro ausente se muestra sin enlace', async () => {
    const med = await crear('medicamento', { nombre: 'Prueba Florfenicol LA', tipo: 'otro', unidad: 'cc', intervalo_advertencia_dias: 35 }, PROPIETARIO);
    await corregir({ entidad_afectada: 'medicamento', registro_id: med.id, campo: 'tipo', valor_anterior: 'otro', valor_nuevo: 'antibiotico' }, '2026-10-18T10:00:00.000Z');
    await corregir({ entidad_afectada: 'pesaje', registro_id: uuidv7(), campo: 'peso', valor_anterior: '100', valor_nuevo: '150' }, '2026-10-18T11:00:00.000Z', TRABAJADOR);
    const entradas = (await cargarCorreccionesRecientes(null, POR_PAGINA, HOY)).grupos[0]!.entradas;
    expect(entradas[0]).toMatchObject({ titulo: 'Un registro que no está en este teléfono', destino: null, autor: 'Daniel Ramos', cambio: 'Peso en kg: antes 100, ahora 150' });
    expect(entradas[1]).toMatchObject({ titulo: 'Medicamento Prueba Florfenicol LA', cambio: 'Tipo: antes Otro, ahora Antibiótico', destino: '/medicamentos' });
  });

  it('el autor que ya no está en el predio no muestra su identificador', async () => {
    const vaca = await crear('animal', datosAnimal('Z921'), PROPIETARIO);
    await corregir({ entidad_afectada: 'animal', registro_id: vaca.id, campo: 'peso_inicial', valor_anterior: '32', valor_nuevo: '34' }, '2026-10-18T10:00:00.000Z', uuidv7());
    const [entrada] = (await cargarCorreccionesRecientes(null, POR_PAGINA, HOY)).grupos[0]!.entradas;
    expect(entrada?.autor).toBe('un usuario que ya no está en el predio');
  });
});

describe('PU-29 · 2. Orden y agrupación por día (sección 4)', () => {
  it('de la más reciente a la más antigua, agrupadas por día del predio con «Hoy» y «Ayer»', async () => {
    const vaca = await crear('animal', datosAnimal('Z921'), PROPIETARIO);
    const c = (instante: string) => corregir({ entidad_afectada: 'animal', registro_id: vaca.id, campo: 'peso_inicial', valor_anterior: '32', valor_nuevo: '34' }, instante);
    const antigua = await c('2026-10-14T15:00:00.000Z');
    const ayer = await c('2026-10-17T15:00:00.000Z');
    const hoy1 = await c('2026-10-18T13:00:00.000Z');
    const hoy2 = await c('2026-10-18T16:00:00.000Z');
    // 2 a. m. UTC del 18 es todavía el 17 en Colombia (UTC−5): cuenta como «Ayer».
    const nocheAnterior = await c('2026-10-18T02:00:00.000Z');

    const { grupos } = await cargarCorreccionesRecientes(null, POR_PAGINA, HOY);
    expect(grupos.map((g) => [g.etiqueta, g.entradas.map((e) => e.id)])).toEqual([
      ['Hoy', [hoy2, hoy1]],
      ['Ayer', [nocheAnterior, ayer]],
      ['14 de octubre de 2026', [antigua]],
    ]);
  });

  it('etiqueta del día', () => {
    expect(etiquetaDelDia('2026-10-18', HOY)).toBe('Hoy');
    expect(etiquetaDelDia('2026-10-17', HOY)).toBe('Ayer');
    expect(etiquetaDelDia('2026-10-16', HOY)).toBe('16 de octubre de 2026');
  });
});

describe('PU-29 · 3. De 30 en 30 (sección 4)', () => {
  it('muestra 30, «Ver más» agrega otras 30 y al final ya no se ofrece', async () => {
    const vaca = await crear('animal', datosAnimal('Z921'), PROPIETARIO);
    for (let i = 0; i < 65; i++) {
      await corregir({ entidad_afectada: 'animal', registro_id: vaca.id, campo: 'peso_inicial', valor_anterior: '32', valor_nuevo: String(33 + i) }, new Date(Date.UTC(2026, 9, 1, 12) + i * 3_600_000).toISOString());
    }
    const contar = (r: Awaited<ReturnType<typeof cargarCorreccionesRecientes>>) => r.grupos.reduce((n, g) => n + g.entradas.length, 0);
    const primera = await cargarCorreccionesRecientes(null, POR_PAGINA, HOY);
    expect([contar(primera), primera.hayMas]).toEqual([30, true]);
    const segunda = await cargarCorreccionesRecientes(null, POR_PAGINA * 2, HOY);
    expect([contar(segunda), segunda.hayMas]).toEqual([60, true]);
    const tercera = await cargarCorreccionesRecientes(null, POR_PAGINA * 3, HOY);
    expect([contar(tercera), tercera.hayMas]).toEqual([65, false]);
  });
});

describe('PU-29 · 4. Filtro «Quién» (sección 5)', () => {
  it('filtra por autor; la lista de autores solo tiene a quienes corrigieron, por nombre', async () => {
    const vaca = await crear('animal', datosAnimal('Z921'), PROPIETARIO);
    const sinCorrecciones = uuidv7();
    await db.usuario.put({ id: sinCorrecciones, nombre: 'Pedro Gómez', perfil: 'trabajador' });
    const c = (instante: string, autor: Uuid) => corregir({ entidad_afectada: 'animal', registro_id: vaca.id, campo: 'peso_inicial', valor_anterior: '32', valor_nuevo: '34' }, instante, autor);
    await c('2026-10-18T10:00:00.000Z', PROPIETARIO);
    const delTrabajador = await c('2026-10-18T11:00:00.000Z', TRABAJADOR);

    const todos = await cargarCorreccionesRecientes(null, POR_PAGINA, HOY);
    expect(todos.autores).toEqual([
      { id: TRABAJADOR, nombre: 'Daniel Ramos' },
      { id: PROPIETARIO, nombre: 'José Ramos' },
    ]);
    const filtrado = await cargarCorreccionesRecientes(TRABAJADOR, POR_PAGINA, HOY);
    expect(filtrado.grupos.flatMap((g) => g.entradas.map((e) => e.id))).toEqual([delTrabajador]);
    expect(filtrado.totalDelPredio).toBe(2);
  });
});

describe('PU-29 · 5. Adónde lleva cada entrada (sección 6)', () => {
  it('la sección del registro en la ficha, la producción de la vaca o el catálogo', () => {
    expect(destinoDe('evento_sanitario', { animal_id: 'a' })).toBe('/animales/a?sanidad=1');
    expect(destinoDe('pesaje', { animal_id: 'a' })).toBe('/animales/a?peso=1');
    expect(destinoDe('parto', { madre_id: 'v' })).toBe('/animales/v?reproduccion=1');
    expect(destinoDe('destino_productivo', { animal_id: 'a' })).toBe('/animales/a?destino=1');
    expect(destinoDe('produccion_leche', { animal_id: 'v' })).toBe('/produccion?vaca=v');
    expect(destinoDe('animal', { id: 'a' })).toBe('/animales/a');
    expect(destinoDe('medicamento', { id: 'm' })).toBe('/medicamentos');
  });
});

describe('PU-29 · 6. Solo el propietario (Tabla 27)', () => {
  it('el trabajador no tiene la consulta', () => {
    expect(puedeUsar('propietario', 'CU-18')).toBe(true);
    expect(puedeUsar('trabajador', 'CU-18')).toBe(false);
  });
});

describe('PU-29 · 7. Sin correcciones (CU-18, 2a)', () => {
  it('sin correcciones en el predio, y con un filtro sin resultados', async () => {
    const vacia = await cargarCorreccionesRecientes(null, POR_PAGINA, HOY);
    expect(vacia).toEqual({ grupos: [], hayMas: false, autores: [], totalDelPredio: 0 });
    const vaca = await crear('animal', datosAnimal('Z921'), PROPIETARIO);
    await corregir({ entidad_afectada: 'animal', registro_id: vaca.id, campo: 'peso_inicial', valor_anterior: '32', valor_nuevo: '34' }, '2026-10-18T10:00:00.000Z');
    const filtrada = await cargarCorreccionesRecientes(TRABAJADOR, POR_PAGINA, HOY);
    expect([filtrada.grupos, filtrada.totalDelPredio]).toEqual([[], 1]);
  });
});
