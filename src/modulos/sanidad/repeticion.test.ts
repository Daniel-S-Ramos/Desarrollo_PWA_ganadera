import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import { describirHace, diasEntre, evaluarRepeticion } from '../../dominio/repeticion';
import { formularioEventoVacio, type FormularioEvento } from '../../dominio/sanidad';
import type { DatosNuevos } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { registrarEvento, verificarRepeticion } from './eventos';

/**
 * PU-22 · Advertencia por repetición de un medicamento (RF-09, HU-09, CU-04 5a).
 * Especificación: docs/tecnica/21-advertencia-por-repeticion.md, sección 9
 */

const HOY = '2026-10-14';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

const app = (id: string, fecha: string) => ({ id, fecha });

function datosAnimal(codigo: string): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: '2024-03-04',
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

const animal = (codigo: string) => crear('animal', datosAnimal(codigo), PROPIETARIO.usuario_id);
const medicamento = (nombre: string, intervalo = 35) =>
  crear('medicamento', { nombre, tipo: 'vacuna', unidad: 'ml', intervalo_advertencia_dias: intervalo }, PROPIETARIO.usuario_id);
const formulario = (medicamentoId: string, fecha = HOY): FormularioEvento => ({ ...formularioEventoVacio(HOY), tipo: 'vacuna', medicamento_id: medicamentoId, fecha });

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: 'Daniel Ramos', perfil: 'trabajador' },
  ]);
});

describe('PU-22 · 1. Niveles (sección 2)', () => {
  it('sin aplicaciones, ninguno; dentro del intervalo, advertencia; fuera, información', () => {
    expect(evaluarRepeticion([], HOY, 35)).toEqual({ nivel: 'ninguno' });
    expect(evaluarRepeticion([app('01', '2026-10-01')], HOY, 35)).toMatchObject({ nivel: 'advertencia', posterior: false });
    expect(evaluarRepeticion([app('01', '2026-08-01')], HOY, 35)).toMatchObject({ nivel: 'informacion' });
  });
});

describe('PU-22 · 2. Límites del intervalo (sección 2)', () => {
  it.each([
    [35, '2026-10-14', 'advertencia'],
    [35, '2026-09-10', 'advertencia'], // 34 días
    [35, '2026-09-09', 'informacion'], // 35 días
    [2, '2026-10-14', 'advertencia'],
    [2, '2026-10-13', 'advertencia'], // el día anterior
    [2, '2026-10-12', 'informacion'], // dos días antes
  ])('intervalo %i, aplicación anterior el %s → %s', (intervalo, fecha, nivel) => {
    expect(evaluarRepeticion([app('01', fecha)], HOY, intervalo).nivel).toBe(nivel);
  });

  it('los días son de calendario, también al cruzar meses y años', () => {
    expect(diasEntre('2026-02-28', '2026-03-01')).toBe(1);
    expect(diasEntre('2025-12-31', '2026-01-01')).toBe(1);
    expect(diasEntre('2026-03-01', '2026-02-28')).toBe(1);
  });
});

describe('PU-22 · 3. Una aplicación posterior a la fecha que se registra (sección 2)', () => {
  it('advierte si está dentro del intervalo y lo señala como posterior', () => {
    expect(evaluarRepeticion([app('01', '2026-10-10')], '2026-09-20', 35)).toEqual({ nivel: 'advertencia', aplicacion: app('01', '2026-10-10'), posterior: true });
  });

  it('fuera del intervalo, solo informa', () => {
    expect(evaluarRepeticion([app('01', '2026-10-10')], '2026-05-01', 35).nivel).toBe('informacion');
  });
});

describe('PU-22 · 4. Cuál aplicación se muestra (sección 2)', () => {
  it('advertencia: la más cercana a la fecha elegida, aunque haya otra más reciente', () => {
    const r = evaluarRepeticion([app('01', '2026-09-10'), app('02', '2026-10-12')], '2026-09-12', 35);
    expect(r).toMatchObject({ nivel: 'advertencia', aplicacion: { id: '01' } });
  });

  it('a igual distancia, la más reciente; a igual fecha, la registrada después', () => {
    expect(evaluarRepeticion([app('01', '2026-10-04'), app('02', '2026-10-24')], '2026-10-14', 35)).toMatchObject({ aplicacion: { id: '02' } });
    expect(evaluarRepeticion([app('02', '2026-10-10'), app('01', '2026-10-10')], HOY, 35)).toMatchObject({ aplicacion: { id: '02' } });
    expect(evaluarRepeticion([app('01', '2026-10-10'), app('02', '2026-10-10')], HOY, 35)).toMatchObject({ aplicacion: { id: '02' } });
  });

  it('información: la más reciente', () => {
    expect(evaluarRepeticion([app('01', '2026-01-01'), app('03', '2026-06-01'), app('02', '2026-03-01')], HOY, 35)).toMatchObject({
      nivel: 'informacion',
      aplicacion: { id: '03' },
    });
  });
});

describe('PU-22 · 5. Solo el mismo medicamento al mismo animal (sección 2)', () => {
  it('otros animales y otros medicamentos no cuentan', async () => {
    const [a, b, aftosa, ivermectina] = await Promise.all([animal('Z920'), animal('Z921'), medicamento('Prueba Aftosa'), medicamento('Prueba Ivermectina')]);
    await registrarEvento(b.id, formulario(aftosa.id), PROPIETARIO, HOY);
    await registrarEvento(a.id, formulario(ivermectina.id), PROPIETARIO, HOY);
    expect((await verificarRepeticion(a.id, aftosa.id, HOY))?.repeticion).toEqual({ nivel: 'ninguno' });
  });

  it('sin medicamento elegido o con una fecha incompleta, no hay verificación', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    expect(await verificarRepeticion(a.id, null, HOY)).toBeNull();
    expect(await verificarRepeticion(a.id, aftosa.id, '2026-10')).toBeNull();
  });
});

describe('PU-22 · 6. Guardar con advertencia (secciones 4 y 5)', () => {
  it('sin confirmar no se guarda nada; confirmado, sí', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    expect((await registrarEvento(a.id, formulario(aftosa.id, '2026-10-01'), PROPIETARIO, HOY)).ok).toBe(true);
    const cola = await db.cola_operaciones.count();

    expect(await registrarEvento(a.id, formulario(aftosa.id), PROPIETARIO, HOY)).toEqual({ ok: false, requiereConfirmacion: true });
    expect(await db.evento_sanitario.count()).toBe(1);
    expect(await db.cola_operaciones.count()).toBe(cola);

    expect((await registrarEvento(a.id, formulario(aftosa.id), PROPIETARIO, HOY, true)).ok).toBe(true);
    expect(await db.evento_sanitario.count()).toBe(2);
  });

  it('fuera del intervalo se guarda sin confirmar', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    await registrarEvento(a.id, formulario(aftosa.id, '2026-08-01'), PROPIETARIO, HOY);
    expect((await registrarEvento(a.id, formulario(aftosa.id), PROPIETARIO, HOY)).ok).toBe(true);
  });

  it('los errores del formulario se informan antes que la repetición', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    await registrarEvento(a.id, formulario(aftosa.id), PROPIETARIO, HOY);
    expect(await registrarEvento(a.id, { ...formulario(aftosa.id), dosis: '0' }, PROPIETARIO, HOY)).toEqual({
      ok: false,
      errores: { dosis: 'La dosis debe ser mayor que 0 y hasta 9.999' },
    });
  });
});

describe('PU-22 · 7. Una aplicación que llega entre la vista y el guardado (sección 5)', () => {
  it('la vista no advertía, pero al guardar se detecta la que llegó de otro teléfono', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    expect((await verificarRepeticion(a.id, aftosa.id, HOY))?.repeticion.nivel).toBe('ninguno');
    // Llega por sincronización, registrada por el trabajador en su teléfono.
    await crear('evento_sanitario', { animal_id: a.id, fecha: HOY, tipo: 'vacuna', medicamento_id: aftosa.id, dosis: null, costo: null, sintomas: null }, TRABAJADOR.usuario_id);
    expect(await registrarEvento(a.id, formulario(aftosa.id), PROPIETARIO, HOY)).toEqual({ ok: false, requiereConfirmacion: true });
    expect((await verificarRepeticion(a.id, aftosa.id, HOY))?.repeticion.nivel).toBe('advertencia');
  });
});

describe('PU-22 · 8. Lo que muestra el aviso (sección 3)', () => {
  it('«hoy», «ayer», «hace N días»', () => {
    expect(describirHace(HOY, HOY)).toBe('hoy');
    expect(describirHace('2026-10-13', HOY)).toBe('ayer');
    expect(describirHace('2026-10-11', HOY)).toBe('hace 3 días');
  });

  it('el medicamento, el intervalo y quien registró la aplicación', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa', 2)]);
    await registrarEvento(a.id, formulario(aftosa.id, '2026-10-13'), TRABAJADOR, HOY);
    const v = await verificarRepeticion(a.id, aftosa.id, HOY);
    expect(v).toMatchObject({ medicamento: 'Prueba Aftosa', intervalo: 2, autor: 'Daniel Ramos', repeticion: { nivel: 'advertencia', aplicacion: { fecha: '2026-10-13', estado_sync: 'pendiente' } } });
  });

  it('la dosis vigente de la aplicación anterior y la unidad del medicamento (pedido del autor, 2026-10-25)', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa', 2)]);
    const e = await crear('evento_sanitario', { animal_id: a.id, fecha: '2026-10-13', tipo: 'vacuna', medicamento_id: aftosa.id, dosis: 1.5, costo: null, sintomas: null }, TRABAJADOR.usuario_id);
    expect(await verificarRepeticion(a.id, aftosa.id, HOY)).toMatchObject({ unidad: 'ml', repeticion: { aplicacion: { dosis: 1.5 } } });
    // Con la dosis corregida, la vigente.
    await crear('correccion', { entidad_afectada: 'evento_sanitario', registro_id: e.id, tipo: 'correccion', campo: 'dosis', valor_anterior: '1.5', valor_nuevo: '2', motivo: 'error_digitacion', nota: null }, PROPIETARIO.usuario_id);
    expect(await verificarRepeticion(a.id, aftosa.id, HOY)).toMatchObject({ repeticion: { aplicacion: { dosis: 2 } } });
  });

  it('sin aplicaciones no hay autor; si el autor ya no está, se dice', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    expect((await verificarRepeticion(a.id, aftosa.id, HOY))?.autor).toBeNull();
    await crear('evento_sanitario', { animal_id: a.id, fecha: '2026-01-01', tipo: 'vacuna', medicamento_id: aftosa.id, dosis: null, costo: null, sintomas: null }, uuidv7());
    expect((await verificarRepeticion(a.id, aftosa.id, HOY))?.autor).toBe('un usuario que ya no está en el predio');
  });
});
