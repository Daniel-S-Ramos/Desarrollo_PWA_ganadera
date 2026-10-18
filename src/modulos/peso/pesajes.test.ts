import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import {
  compararConAnterior,
  describirComparacion,
  leerPeso,
  pesoAnterior,
  resumenPeso,
  serieDePeso,
  tramos,
  validarPesaje,
  type ContextoPesaje,
  type FormularioPesaje,
  type PuntoPeso,
} from '../../dominio/peso';
import type { DatosNuevos, MetodoPesaje } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { consolidarFicha } from '../consulta/ficha';
import { cargarEvolucion, cargarParaPesaje, registrarPesaje, SIN_CONFIRMAR } from './pesajes';

/**
 * PU-25 · Pesaje y evolución del peso (RF-13, RF-14, CU-08, CU-09, HU-05).
 * Especificación: docs/tecnica/24-pesaje-y-evolucion.md, sección 10
 */

const HOY = '2026-10-17';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

/** Un animal comprado el 1 de septiembre con 300 kg. */
function datosAnimal(codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'macho',
    fecha_nacimiento: '2025-01-01',
    fecha_nacimiento_exacta: false,
    fecha_ingreso: '2026-09-01',
    procedencia: null,
    peso_inicial: 300,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
    ...cambios,
  };
}

const animal = (codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}) => crear('animal', datosAnimal(codigo, cambios), PROPIETARIO.usuario_id);
const pesar = (animalId: string, fecha: string, peso: number, metodo: MetodoPesaje = 'cinta', autor = PROPIETARIO.usuario_id) =>
  crear('pesaje', { animal_id: animalId, fecha, peso, metodo }, autor);
const formulario = (cambios: Partial<FormularioPesaje> = {}): FormularioPesaje => ({ peso: '320', metodo: 'cinta', fecha: HOY, ...cambios });
const punto = (fecha: string | null, kg: number, metodo: MetodoPesaje | null = 'cinta', id: string | null = 'p'): PuntoPeso => ({
  id,
  fecha,
  kg,
  metodo,
  etiqueta: id === null ? 'Peso de compra' : 'Pesaje',
  autor_id: null,
});

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: 'Daniel Ramos', perfil: 'trabajador' },
  ]);
});

describe('PU-25 · 1. Validaciones (sección 4)', () => {
  const contexto: ContextoPesaje = { llegada: '2026-09-01', retirado: false };
  const errores = (f: FormularioPesaje, ctx = contexto) => {
    const r = validarPesaje(f, ctx, HOY);
    return r.ok ? {} : r.errores;
  };

  it('un pesaje válido', () => {
    expect(validarPesaje(formulario({ peso: '412,5', metodo: 'bascula' }), contexto, HOY)).toEqual({ ok: true, peso: 412.5, metodo: 'bascula', fecha: HOY });
  });

  it.each([
    ['1', 1],
    ['1500', 1500],
    ['412.5', 412.5],
  ])('peso «%s» → %s', (texto, kg) => expect(leerPeso(texto)).toBe(kg));

  it.each(['0', '0,5', '1500,1', '1501', '412,55', 'cuatrocientos', '-5'])('«%s» no es un peso válido', (texto) => expect(leerPeso(texto)).toBeNull());

  it('peso, método y fecha obligatorios; todos los errores juntos', () => {
    expect(errores({ peso: '', metodo: null, fecha: '' })).toEqual({ peso: 'Escriba el peso', metodo: 'Elija cómo se pesó', fecha: 'Escriba una fecha válida' });
    expect(errores(formulario({ peso: '2000' }))).toEqual({ peso: 'El peso debe estar entre 1 y 1.500 kg, con un decimal como máximo' });
  });

  it('la fecha existe, no es futura ni anterior a la llegada; el animal no está retirado', () => {
    expect(errores(formulario({ fecha: '2026-02-30' }))).toEqual({ fecha: 'Escriba una fecha válida' });
    expect(errores(formulario({ fecha: '2026-10-18' }))).toEqual({ fecha: 'La fecha no puede ser posterior a hoy' });
    expect(errores(formulario({ fecha: '2026-08-31' }))).toEqual({ fecha: 'El animal llegó al predio el 1 de septiembre de 2026' });
    expect(errores(formulario({ fecha: '2026-09-01' }))).toEqual({});
    expect(errores(formulario({ fecha: '2020-01-01' }), { llegada: null, retirado: false })).toEqual({});
    expect(errores(formulario(), { ...contexto, retirado: true })).toEqual({ animal: 'Este animal salió del predio' });
  });
});

describe('PU-25 · 2. Peso anterior (sección 6)', () => {
  const animalBase = { peso_inicial: 300, fecha_ingreso: '2026-09-01', fecha_nacimiento: '2025-01-01' };
  const p = (id: string, fecha: string, peso: number) => ({ id, fecha, peso, metodo: 'cinta' as const, autor_id: 'a' });

  it('el pesaje más reciente antes o en la fecha; a igual fecha, el registrado después', () => {
    const pesajes = [p('01', '2026-10-01', 320), p('03', '2026-10-10', 330), p('02', '2026-10-10', 335), p('04', '2026-10-15', 340)];
    expect(pesoAnterior(animalBase, pesajes, '2026-10-12')).toMatchObject({ id: '03', kg: 330 });
    expect(pesoAnterior(animalBase, pesajes, '2026-10-05')).toMatchObject({ id: '01' });
  });

  it('sin pesajes antes de la fecha, el peso de compra o al nacer con su fecha', () => {
    expect(pesoAnterior(animalBase, [], HOY)).toMatchObject({ id: null, kg: 300, fecha: '2026-09-01', etiqueta: 'Peso de compra' });
    expect(pesoAnterior({ peso_inicial: 32, fecha_ingreso: null, fecha_nacimiento: '2026-09-20' }, [], HOY)).toMatchObject({ etiqueta: 'Peso al nacer', fecha: '2026-09-20' });
    expect(pesoAnterior({ ...animalBase, peso_inicial: null }, [], HOY)).toBeNull();
  });

  it('el peso inicial no sirve de anterior para una fecha previa a él (PE-29)', () => {
    expect(pesoAnterior(animalBase, [], '2026-08-31')).toBeNull();
    expect(pesoAnterior(animalBase, [], '2026-09-01')).toMatchObject({ etiqueta: 'Peso de compra' });
    expect(pesoAnterior({ ...animalBase, fecha_ingreso: null, fecha_nacimiento: null }, [], '2020-01-01')).toMatchObject({ kg: 300, fecha: null });
  });
});

describe('PU-25 · 3. Variación atípica (sección 6, umbrales del autor)', () => {
  it.each([
    [320, 10, false], // +2,0 kg/día exacto
    [320.1, 10, true], // apenas más de 2,0
    [280, 10, false], // −2,0 kg/día exacto
    [279.9, 10, true], // apenas menos de −2,0
    [380, 8, true], // +10 kg/día
  ])('de 300 kg a %s kg en %s días → atípico: %s', (peso, dias, atipica) => {
    const fecha = new Date(Date.UTC(2026, 9, 1 + dias)).toISOString().slice(0, 10);
    expect(compararConAnterior(peso, fecha, punto('2026-10-01', 300))?.atipica).toBe(atipica);
  });

  it('el mismo día, más de 10 %; sin fecha anterior, no se compara', () => {
    expect(compararConAnterior(330, '2026-10-01', punto('2026-10-01', 300))).toMatchObject({ atipica: false, gananciaDiaria: null, dias: 0 });
    expect(compararConAnterior(330.5, '2026-10-01', punto('2026-10-01', 300))?.atipica).toBe(true);
    expect(compararConAnterior(320, HOY, punto(null, 300, null, null))).toBeNull();
    expect(compararConAnterior(320, HOY, null)).toBeNull();
  });

  it('el texto de la diferencia', () => {
    const anterior = punto('2026-10-05', 300);
    expect(describirComparacion(compararConAnterior(332, HOY, anterior)!, anterior)).toBe('Frente al pesaje anterior del 5 de octubre de 2026 (300 kg): +32 kg en 12 días, +2,7 kg por día');
    expect(describirComparacion(compararConAnterior(299, '2026-10-06', anterior)!, anterior)).toBe('Frente al pesaje anterior del 5 de octubre de 2026 (300 kg): −1 kg en 1 día, −1 kg por día');
    expect(describirComparacion(compararConAnterior(303, '2026-10-05', anterior)!, anterior)).toBe('Frente al pesaje anterior del 5 de octubre de 2026 (300 kg): +3 kg, el mismo día');
    // Nombra con qué se compara: el peso de compra no es un pesaje (PE-29).
    const compra = punto('2026-10-01', 1000, null, null);
    expect(describirComparacion(compararConAnterior(1010, '2026-10-11', compra)!, compra)).toBe('Frente al peso de compra del 1 de octubre de 2026 (1.000 kg): +10 kg en 10 días, +1 kg por día');
  });
});

describe('PU-25 · 4. Guardar (secciones 2 y 6)', () => {
  it('crea el pesaje con autor, pendiente y en la cola; la ficha muestra el último peso', async () => {
    const a = await animal('Z940');
    const cola = await db.cola_operaciones.count();
    const r = await registrarPesaje(a.id, formulario({ peso: '330,5', metodo: 'bascula', fecha: '2026-10-01' }), TRABAJADOR, SIN_CONFIRMAR, HOY);
    if (!r.ok) throw new Error('debía registrarse');
    expect(r.pesaje).toMatchObject({ animal_id: a.id, peso: 330.5, metodo: 'bascula', fecha: '2026-10-01', autor_id: TRABAJADOR.usuario_id, estado_sync: 'pendiente' });
    expect(await db.cola_operaciones.count()).toBe(cola + 1);
    expect((await consolidarFicha(a.id))?.peso).toEqual({ tipo: 'pesaje', kg: 330.5, fecha: '2026-10-01' });
  });

  it('un atípico sin confirmar no escribe; confirmado, sí', async () => {
    const a = await animal('Z940');
    expect(await registrarPesaje(a.id, formulario({ peso: '600' }), PROPIETARIO, SIN_CONFIRMAR, HOY)).toEqual({ ok: false, requiereConfirmacion: 'variacion' });
    expect(await db.pesaje.count()).toBe(0);
    expect((await registrarPesaje(a.id, formulario({ peso: '600' }), PROPIETARIO, { variacion: true, mismoDia: false }, HOY)).ok).toBe(true);
  });

  it('otro pesaje en la misma fecha exige su propia confirmación (PE-29)', async () => {
    const a = await animal('Z940');
    await pesar(a.id, HOY, 318, 'cinta');
    expect(await registrarPesaje(a.id, formulario({ peso: '320', metodo: 'bascula' }), PROPIETARIO, SIN_CONFIRMAR, HOY)).toEqual({
      ok: false,
      requiereConfirmacion: 'mismo_dia',
    });
    // Confirmar la variación no basta: son confirmaciones distintas.
    expect(await registrarPesaje(a.id, formulario({ peso: '320', metodo: 'bascula' }), PROPIETARIO, { variacion: true, mismoDia: false }, HOY)).toEqual({
      ok: false,
      requiereConfirmacion: 'mismo_dia',
    });
    expect(await db.pesaje.count()).toBe(1);
    expect((await registrarPesaje(a.id, formulario({ peso: '320', metodo: 'bascula' }), PROPIETARIO, { variacion: false, mismoDia: true }, HOY)).ok).toBe(true);
    expect(await db.pesaje.count()).toBe(2);
  });

  it('el mismo día y atípico: hacen falta las dos confirmaciones', async () => {
    const a = await animal('Z940');
    await pesar(a.id, HOY, 300, 'cinta');
    const otro = formulario({ peso: '340', metodo: 'bascula' }); // más de 10 % el mismo día
    expect(await registrarPesaje(a.id, otro, PROPIETARIO, { variacion: false, mismoDia: true }, HOY)).toEqual({ ok: false, requiereConfirmacion: 'variacion' });
    expect((await registrarPesaje(a.id, otro, PROPIETARIO, { variacion: true, mismoDia: true }, HOY)).ok).toBe(true);
  });

  it('un error no escribe nada', async () => {
    const a = await animal('Z940');
    expect(await registrarPesaje(a.id, formulario({ metodo: null }), PROPIETARIO, SIN_CONFIRMAR, HOY)).toEqual({ ok: false, errores: { metodo: 'Elija cómo se pesó' } });
    expect(await db.pesaje.count()).toBe(0);
  });

  it('el formulario informa el peso anterior y otro pesaje en la misma fecha', async () => {
    const a = await animal('Z940');
    await pesar(a.id, HOY, 412, 'cinta');
    const datos = await cargarParaPesaje(a.id, HOY);
    expect(datos?.anterior).toMatchObject({ kg: 412 });
    expect(datos?.mismoDia.map((m) => [m.pesaje.peso, m.autor])).toEqual([[412, 'José Ramos']]);
    expect((await cargarParaPesaje(a.id, '2026-10-10'))?.mismoDia).toEqual([]);
  });
});

describe('PU-25 · 5. Serie y tramos (sección 7)', () => {
  it('el peso inicial primero, luego los pesajes en orden; cambio, días, ganancia y métodos distintos', () => {
    const serie = serieDePeso(
      { peso_inicial: 300, fecha_ingreso: '2026-09-01', fecha_nacimiento: '2025-01-01' },
      [
        { id: '03', fecha: '2026-10-11', peso: 330, metodo: 'bascula', autor_id: 'a' },
        { id: '01', fecha: '2026-10-01', peso: 320, metodo: 'cinta', autor_id: 'a' },
        { id: '02', fecha: '2026-10-01', peso: 322, metodo: 'bascula', autor_id: 'a' },
      ],
    );
    expect(serie.map((p) => [p.etiqueta, p.kg])).toEqual([
      ['Peso de compra', 300],
      ['Pesaje', 320],
      ['Pesaje', 322],
      ['Pesaje', 330],
    ]);
    expect(tramos(serie, null).map((t) => [t.cambio, t.dias, t.gananciaDiaria, t.metodosDistintos])).toEqual([
      [null, null, null, false],
      [20, 30, 0.7, false], // desde la compra: sin nota de métodos
      [2, 0, null, true], // mismo día, cinta y báscula
      [8, 10, 0.8, false],
    ]);
  });

  it('sin peso inicial, la serie empieza en el primer pesaje', () => {
    expect(serieDePeso({ peso_inicial: null, fecha_ingreso: null, fecha_nacimiento: null }, [{ id: '01', fecha: HOY, peso: 50, metodo: 'cinta', autor_id: 'a' }])).toHaveLength(1);
  });
});

describe('PU-25 · 6. Resumen (sección 7)', () => {
  it('ganancia total y diaria promedio desde el primer punto con fecha', () => {
    expect(resumenPeso([punto('2026-09-01', 300, null, null), punto('2026-10-11', 330)])).toEqual({ total: 30, dias: 40, gananciaDiaria: 0.8 });
    expect(resumenPeso([punto(null, 300, null, null), punto('2026-10-01', 320), punto('2026-10-11', 330)])).toEqual({ total: 10, dias: 10, gananciaDiaria: 1 });
  });

  it('con un solo punto, ninguno (CU-09, 2a)', () => {
    expect(resumenPeso([punto(HOY, 300)])).toBeNull();
  });
});

describe('PU-25 · 7. Meta de ganancia diaria (sección 8)', () => {
  it('sin parámetro, ningún tramo bajo la meta; con parámetro, se señalan', async () => {
    const a = await animal('Z940');
    await pesar(a.id, '2026-10-01', 310);
    expect((await cargarEvolucion(a.id))?.tramos.some((t) => t.bajoMeta)).toBe(false);
    expect((await cargarEvolucion(a.id))?.meta).toBeNull();
    await db.parametro.put({ clave: 'ganancia_diaria_esperada', valor: 0.5, unidad: 'kg/día', descripcion: 'Meta' });
    const evolucion = await cargarEvolucion(a.id);
    expect(evolucion?.meta).toBe(0.5);
    // De 300 kg el 1 de septiembre a 310 el 1 de octubre: 0,3 kg por día.
    expect(evolucion?.tramos[1]).toMatchObject({ gananciaDiaria: 0.3, bajoMeta: true });
  });
});

describe('PU-25 · 8. Transacción, autores y permisos', () => {
  it('un animal retirado o que no está no recibe pesajes', async () => {
    const a = await animal('Z940');
    await crear('salida', { animal_id: a.id, fecha: '2026-10-10', motivo: 'venta', peso_venta: 400, valor_venta: 1, comprador: null, causa_muerte: null }, PROPIETARIO.usuario_id);
    expect(await registrarPesaje(a.id, formulario(), PROPIETARIO, SIN_CONFIRMAR, HOY)).toEqual({ ok: false, errores: { animal: 'Este animal salió del predio' } });
    expect(await registrarPesaje(uuidv7(), formulario(), PROPIETARIO, SIN_CONFIRMAR, HOY)).toEqual({ ok: false, errores: { animal: 'El animal no está en este teléfono' } });
  });

  it('un pesaje que llega entre la vista y el guardado cambia la comparación al guardar', async () => {
    const a = await animal('Z940');
    // Con la compra (300 kg el 1 de septiembre), 320 hoy no es atípico...
    expect(compararConAnterior(320, HOY, (await cargarParaPesaje(a.id, HOY))!.anterior)?.atipica).toBe(false);
    // ...pero llega de otro teléfono un pesaje de 250 kg de ayer: +70 kg en un día.
    await pesar(a.id, '2026-10-16', 250, 'cinta', TRABAJADOR.usuario_id);
    expect(await registrarPesaje(a.id, formulario(), PROPIETARIO, SIN_CONFIRMAR, HOY)).toEqual({ ok: false, requiereConfirmacion: 'variacion' });
  });

  it('la evolución nombra a quien registró cada pesaje', async () => {
    const a = await animal('Z940');
    await pesar(a.id, '2026-10-01', 320, 'cinta', TRABAJADOR.usuario_id);
    const evolucion = await cargarEvolucion(a.id);
    expect(evolucion?.tramos.map((t) => t.autor)).toEqual([null, 'Daniel Ramos']);
  });
});
