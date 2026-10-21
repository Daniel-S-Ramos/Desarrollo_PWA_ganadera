import { liveQuery } from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import { CAMPOS_CORREGIBLES } from '../../dominio/camposCorregibles';
import { validarCosto, type FormularioCosto, type LimitesCosto } from '../../dominio/economia';
import type { DatosNuevos, RegistroLocal } from '../../dominio/tipos';
import type { Vigente } from '../../dominio/vigente';
import { PermisoDenegado, puedeUsar } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { registrarCorreccion } from '../correcciones/correcciones';
import { calcularConsolidado, cargarConsolidado, type Consolidado, type DatosConsolidado } from './consolidado';
import { cargarParaCosto, registrarCosto } from './costos';

/**
 * PU-33 · Costos por animal y consolidado económico (RF-20, RF-21, CU-14, HU-16, 3.8.12).
 * Especificación: docs/tecnica/31-consolidado-economico.md, sección 9
 */

const HOY = '2026-10-21';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

const costo = (cambios: Partial<FormularioCosto> = {}): FormularioCosto => ({ concepto: 'servicio_veterinario', fecha: '2026-10-10', valor: '80.000', descripcion: '', ...cambios });
const limites = (cambios: Partial<LimitesCosto> = {}): LimitesCosto => ({ hoy: HOY, llegada: '2026-01-15', salida: null, admiteCompra: true, ...cambios });

function datosAnimal(codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return { codigo_chapeta: codigo, sexo: 'hembra', fecha_nacimiento: '2024-01-10', fecha_nacimiento_exacta: false, fecha_ingreso: '2026-01-15', procedencia: null, peso_inicial: 300, madre_id: null, madre_externa: null, padre_id: null, padre_externo: null, ...cambios };
}
const comprado = (codigo = 'Z950') => crear('animal', datosAnimal(codigo), PROPIETARIO.usuario_id);
const nacido = (codigo = 'Z951') => crear('animal', datosAnimal(codigo, { fecha_ingreso: null, fecha_nacimiento: '2026-01-15', fecha_nacimiento_exacta: true }), PROPIETARIO.usuario_id);

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: 'Daniel Ramos', perfil: 'trabajador' },
  ]);
});

describe('PU-33 · 1. Validaciones del costo (sección 3)', () => {
  it('concepto, valor en pesos con puntos de miles y descripción opcional', () => {
    expect(validarCosto(costo({ descripcion: '  Revisión de cojera ' }), limites())).toEqual({ ok: true, datos: { concepto: 'servicio_veterinario', fecha: '2026-10-10', valor: 80_000, descripcion: 'Revisión de cojera' } });
    expect(validarCosto(costo({ concepto: null, valor: '' }), limites())).toEqual({ ok: false, errores: { concepto: 'Elija el concepto', valor: 'Escriba el valor, en pesos' } });
    expect(validarCosto(costo({ valor: '80000,5' }), limites())).toMatchObject({ ok: false, errores: { valor: expect.stringMatching(/sin decimales/) } });
    expect(validarCosto(costo({ descripcion: 'x'.repeat(301) }), limites())).toMatchObject({ ok: false, errores: { descripcion: 'Hasta 300 caracteres' } });
  });

  it('la fecha: no posterior a hoy, no anterior a la llegada, no posterior a la salida', () => {
    expect(validarCosto(costo({ fecha: '2026-10-22' }), limites())).toMatchObject({ ok: false, errores: { fecha: 'La fecha no puede ser posterior a hoy' } });
    expect(validarCosto(costo({ fecha: HOY }), limites()).ok).toBe(true);
    expect(validarCosto(costo({ fecha: '2026-01-14' }), limites())).toMatchObject({ ok: false, errores: { fecha: 'El animal llegó al predio el 15 de enero de 2026' } });
    expect(validarCosto(costo({ fecha: '2026-10-16' }), limites({ salida: '2026-10-15' }))).toMatchObject({ ok: false, errores: { fecha: 'El animal salió del predio el 15 de octubre de 2026' } });
    expect(validarCosto(costo({ fecha: '2026-10-15' }), limites({ salida: '2026-10-15' })).ok).toBe(true);
  });

  it('la compra solo si el animal la admite', () => {
    expect(validarCosto(costo({ concepto: 'compra' }), limites({ admiteCompra: false }))).toMatchObject({ ok: false, errores: { concepto: expect.stringMatching(/no admite una compra/) } });
  });
});

describe('PU-33 · 2. La compra (secciones 3 y 4)', () => {
  it('solo un comprado sin compra vigente la admite; anulada, se admite otra', async () => {
    const a = await comprado();
    const b = await nacido();
    expect((await cargarParaCosto(b.id))?.admiteCompra).toBe(false);
    expect((await cargarParaCosto(a.id))?.admiteCompra).toBe(true);
    const r = await registrarCosto(a.id, costo({ concepto: 'compra', fecha: '2026-01-15', valor: '2.800.000' }), PROPIETARIO, HOY);
    expect(r).toMatchObject({ ok: true, costo: { concepto: 'compra', valor: 2_800_000, estado_sync: 'pendiente' } });
    expect((await cargarParaCosto(a.id))?.admiteCompra).toBe(false);
    if (!r.ok) return;
    await registrarCorreccion('movimiento_economico', r.costo.id, { operacion: 'anular', campo: '', valor: '', motivo: 'error_digitacion', nota: '' }, PROPIETARIO, HOY);
    expect((await cargarParaCosto(a.id))?.admiteCompra).toBe(true);
  });

  it('dentro de la transacción, de dos compras a la vez solo queda una', async () => {
    const a = await comprado();
    const compra = costo({ concepto: 'compra', fecha: '2026-01-15' });
    const r = await Promise.all([registrarCosto(a.id, compra, PROPIETARIO, HOY), registrarCosto(a.id, compra, PROPIETARIO, HOY)]);
    expect(r.filter((x) => x.ok)).toHaveLength(1);
    expect(r.find((x) => !x.ok)).toMatchObject({ errores: { registro: 'Este animal ya tiene registrada su compra' } });
    expect(await db.movimiento_economico.count()).toBe(1);
  });

  it('un retirado admite costos con fecha hasta su salida', async () => {
    const a = await comprado();
    await crear('salida', { animal_id: a.id, fecha: '2026-10-15', motivo: 'venta', peso_venta: 400, valor_venta: 3_000_000, comprador: null, causa_muerte: null, observacion: null }, PROPIETARIO.usuario_id);
    expect((await cargarParaCosto(a.id))?.salida).toBe('2026-10-15');
    expect(await registrarCosto(a.id, costo({ fecha: '2026-10-16' }), PROPIETARIO, HOY)).toMatchObject({ ok: false, errores: { fecha: expect.stringMatching(/salió/) } });
    expect(await registrarCosto(a.id, costo({ fecha: '2026-10-14' }), PROPIETARIO, HOY)).toMatchObject({ ok: true });
  });
});

/** Un costo como lo entrega `aplicarATodos`, para la función pura. */
const mov = (concepto: RegistroLocal<'movimiento_economico'>['concepto'], valor: number, fecha = '2026-05-01', anulado = false): Vigente<RegistroLocal<'movimiento_economico'>> => {
  const registro = { id: uuidv7(), autor_id: 'p', creado_en: `${fecha}T12:00:00.000Z`, estado_sync: 'sincronizado' as const, animal_id: 'a', concepto, fecha, valor, descripcion: null };
  return { registro, original: registro, anulacion: anulado ? ({} as never) : null, corregidos: new Map() };
};
const base = (cambios: Partial<DatosConsolidado> = {}): DatosConsolidado => ({
  animal: { fecha_ingreso: '2026-01-15' },
  movimientos: [],
  eventos: [],
  ordenos: [],
  salida: null,
  precio: 1950,
  nombreMedicamento: () => 'Prueba Aftosa',
  ...cambios,
});

describe('PU-33 · 3. Invertido (sección 6)', () => {
  it('cada concepto con su total y su número; medicamentos desde los eventos con costo; anulados fuera', () => {
    const c = calcularConsolidado(
      base({
        movimientos: [mov('compra', 2_800_000), mov('servicio_veterinario', 80_000), mov('servicio_veterinario', 50_000), mov('alimentacion', 200_000), mov('alimentacion', 999, '2026-05-02', true)],
        eventos: [{ fecha: '2026-03-01', costo: 35_000, medicamento_id: 'm' }, { fecha: '2026-04-01', costo: null, medicamento_id: 'm' }, { fecha: '2026-04-02', costo: 0, medicamento_id: 'm' }],
      }),
    );
    expect(c.invertido).toEqual([
      { concepto: 'compra', total: 2_800_000, registros: 1 },
      { concepto: 'servicio_veterinario', total: 130_000, registros: 2 },
      { concepto: 'alimentacion', total: 200_000, registros: 1 },
      { concepto: 'medicamentos', total: 35_000, registros: 1 },
    ]);
    expect(c.totalInvertido).toBe(3_165_000);
    expect(c.avisos).toContain('2 eventos sanitarios no tienen costo registrado y no se incluyen.');
  });
});

describe('PU-33 · 4. Generado (sección 6)', () => {
  it('la leche al precio del parámetro; sin parámetro, el de ejemplo', () => {
    const ordenos = [{ litros: 10 }, { litros: 12.5 }, { litros: 0 }];
    expect(calcularConsolidado(base({ ordenos, precio: 2000 })).leche).toEqual({ litros: 22.5, ordenos: 3, precio: 2000, total: 45_000 });
    const sinPrecio = calcularConsolidado(base({ ordenos }));
    expect(sinPrecio.leche?.total).toBe(Math.round(22.5 * 1950));
    expect(calcularConsolidado(base({ ordenos: [{ litros: 1.5 }], precio: 1955 })).leche?.total).toBe(2933);
    const ejemplo = calcularConsolidado(base({ ordenos, precio: null }));
    expect(ejemplo).toMatchObject({ precioDeEjemplo: true, leche: { precio: 1950 } });
    expect(ejemplo.avisos).toContain('La leche se valora al precio de ejemplo: es el valor de la producción, no el dinero recibido.');
  });

  it('la venta solo si salió por venta', () => {
    expect(calcularConsolidado(base({ salida: { fecha: '2026-10-15', motivo: 'venta', valor_venta: 3_000_000 } })).venta).toBe(3_000_000);
    expect(calcularConsolidado(base({ salida: { fecha: '2026-10-15', motivo: 'muerte', valor_venta: 500_000 } })).venta).toBeNull();
  });
});

const avisos = (c: Consolidado) => c.avisos;

describe('PU-33 · 5. Resultado y avisos (sección 6, CU-14 2a, 3a, 4a, 4b, HU-16.4)', () => {
  it('ganancia o pérdida: generado menos invertido', () => {
    const venta = calcularConsolidado(base({ movimientos: [mov('compra', 2_800_000)], salida: { fecha: '2026-10-15', motivo: 'venta', valor_venta: 3_500_000 } }));
    expect(venta).toMatchObject({ totalGenerado: 3_500_000, resultado: 700_000, salida: 'venta' });
    expect(avisos(venta)).not.toContain('Resultado parcial: el animal sigue en el predio.');
    expect(calcularConsolidado(base({ movimientos: [mov('compra', 2_800_000)] })).resultado).toBe(-2_800_000);
  });

  it('sin costos, nacido, activo, eventos sin costo y lo que queda fuera', () => {
    const c = calcularConsolidado(base({ animal: { fecha_ingreso: null }, eventos: [{ fecha: '2026-03-01', costo: null, medicamento_id: 'm' }, { fecha: '2026-03-02', costo: null, medicamento_id: 'm' }] }));
    expect(avisos(c)).toEqual([
      'No tiene costos registrados: el resultado no es representativo.',
      'Nació en el predio: no tiene costo de compra, y su resultado no es comparable con el de un animal comprado.',
      'Resultado parcial: el animal sigue en el predio.',
      '2 eventos sanitarios no tienen costo registrado y no se incluyen.',
      'No incluye costos por lote ni otros gastos que no se registraron para este animal.',
    ]);
    expect(avisos(calcularConsolidado(base({ eventos: [{ fecha: '2026-03-01', costo: null, medicamento_id: 'm' }] })))).toContain('1 evento sanitario no tiene costo registrado y no se incluye.');
  });

  it('muerte o pérdida: lo invertido como pérdida, sin venta de valor cero', () => {
    const muerte = calcularConsolidado(base({ movimientos: [mov('compra', 2_000_000)], salida: { fecha: '2026-10-15', motivo: 'muerte', valor_venta: null } }));
    expect(muerte).toMatchObject({ resultado: -2_000_000, venta: null, salida: 'muerte', totalGenerado: 0 });
    expect(avisos(muerte)).toContain('Salió por muerte: no hubo venta, y lo invertido se presenta como pérdida.');
    expect(avisos(calcularConsolidado(base({ salida: { fecha: '2026-10-15', motivo: 'perdida_robo', valor_venta: null } })))).toContain('Salió por pérdida o robo: no hubo venta, y lo invertido se presenta como pérdida.');
  });

  it('el detalle: costos, medicamentos y venta, del más reciente al más antiguo', () => {
    const c = calcularConsolidado(
      base({
        movimientos: [mov('compra', 2_800_000, '2026-01-15')],
        eventos: [{ fecha: '2026-03-01', costo: 35_000, medicamento_id: 'm' }],
        salida: { fecha: '2026-10-15', motivo: 'venta', valor_venta: 3_000_000 },
      }),
    );
    expect(c.detalle.map((e) => [e.fecha, e.concepto, e.valor, e.clase])).toEqual([
      ['2026-10-15', 'Venta', 3_000_000, 'ingreso'],
      ['2026-03-01', 'Medicamento: Prueba Aftosa', 35_000, 'costo'],
      ['2026-01-15', 'Compra', 2_800_000, 'costo'],
    ]);
  });
});

describe('PU-33 · 6. Valor vigente, desde el teléfono (sección 7)', () => {
  it('costos, costos de eventos y litros corregidos; anulados fuera; salida vigente', async () => {
    const a = await comprado();
    const med = await crear('medicamento', { nombre: 'Prueba Aftosa', tipo: 'vacuna', unidad: 'ml', intervalo_advertencia_dias: 30 }, PROPIETARIO.usuario_id);
    const c1 = await crear('movimiento_economico', { animal_id: a.id, concepto: 'alimentacion', fecha: '2026-05-01', valor: 100_000, descripcion: null }, PROPIETARIO.usuario_id);
    const c2 = await crear('movimiento_economico', { animal_id: a.id, concepto: 'alimentacion', fecha: '2026-06-01', valor: 50_000, descripcion: null }, PROPIETARIO.usuario_id);
    const e = await crear('evento_sanitario', { animal_id: a.id, fecha: '2026-03-01', tipo: 'vacuna', medicamento_id: med.id, dosis: 2, costo: 10_000, sintomas: null }, PROPIETARIO.usuario_id);
    const o = await crear('produccion_leche', { animal_id: a.id, fecha: '2026-10-10', litros: 10 }, PROPIETARIO.usuario_id);
    await db.parametro.put({ clave: 'precio_litro_leche', valor: 2000, unidad: 'pesos', descripcion: '' } as never);
    const base = { motivo: 'error_digitacion' as const, nota: null };
    await crear('correccion', { ...base, entidad_afectada: 'movimiento_economico', registro_id: c1.id, tipo: 'correccion', campo: 'valor', valor_anterior: '100000', valor_nuevo: '120000' }, PROPIETARIO.usuario_id);
    await crear('correccion', { ...base, entidad_afectada: 'movimiento_economico', registro_id: c2.id, tipo: 'anulacion', campo: null, valor_anterior: null, valor_nuevo: null }, PROPIETARIO.usuario_id);
    await crear('correccion', { ...base, entidad_afectada: 'evento_sanitario', registro_id: e.id, tipo: 'correccion', campo: 'costo', valor_anterior: '10000', valor_nuevo: '15000' }, PROPIETARIO.usuario_id);
    await crear('correccion', { ...base, entidad_afectada: 'produccion_leche', registro_id: o.id, tipo: 'correccion', campo: 'litros', valor_anterior: '10', valor_nuevo: '12' }, PROPIETARIO.usuario_id);
    const salida = await crear('salida', { animal_id: a.id, fecha: '2026-10-15', motivo: 'venta', peso_venta: 400, valor_venta: 3_000_000, comprador: null, causa_muerte: null, observacion: null }, PROPIETARIO.usuario_id);
    await crear('correccion', { ...base, entidad_afectada: 'salida', registro_id: salida.id, tipo: 'anulacion', campo: null, valor_anterior: null, valor_nuevo: null }, PROPIETARIO.usuario_id);

    const c = await cargarConsolidado(a.id);
    expect(c?.invertido).toEqual([
      { concepto: 'alimentacion', total: 120_000, registros: 1 },
      { concepto: 'medicamentos', total: 15_000, registros: 1 },
    ]);
    expect(c?.leche).toMatchObject({ litros: 12, precio: 2000, total: 24_000 });
    expect(c?.venta).toBeNull();
    expect(c?.salida).toBeNull();
    expect(c?.detalle.find((d) => d.concepto === 'Alimentación')?.movimiento?.corregidos.size).toBe(1);
  });

  it('se entera al registrar un costo (consulta en vivo)', async () => {
    const a = await comprado();
    const vistos: (Consolidado | null)[] = [];
    const sub = liveQuery(() => cargarConsolidado(a.id)).subscribe((v) => vistos.push(v));
    for (let i = 0; i < 200 && vistos.length < 1; i++) await new Promise((r) => setTimeout(r, 5));
    await registrarCosto(a.id, costo(), PROPIETARIO, HOY);
    for (let i = 0; i < 200 && vistos.length < 2; i++) await new Promise((r) => setTimeout(r, 5));
    sub.unsubscribe();
    expect(vistos[vistos.length - 1]?.totalInvertido).toBe(80_000);
  });
});

describe('PU-33 · 7. Corrección (sección 5)', () => {
  it('se corrigen fecha, valor (solo el propietario) y descripción; el concepto no', async () => {
    expect(Object.keys(CAMPOS_CORREGIBLES.movimiento_economico).sort()).toEqual(['descripcion', 'fecha', 'valor']);
    expect(CAMPOS_CORREGIBLES.movimiento_economico['valor']?.soloPropietario).toBe(true);
    const a = await comprado();
    const r = await registrarCosto(a.id, costo(), PROPIETARIO, HOY);
    if (!r.ok) throw new Error('no se registró');
    const corregir = (campo: string, valor: string) => registrarCorreccion('movimiento_economico', r.costo.id, { operacion: 'corregir', campo, valor, motivo: 'error_digitacion', nota: '' }, PROPIETARIO, HOY);
    expect(await corregir('valor', '90000')).toMatchObject({ ok: true });
    expect(await corregir('fecha', '2026-01-14')).toMatchObject({ ok: false, errores: { valor: expect.stringMatching(/llegó al predio/) } });
  });
});

describe('PU-33 · 8. Solo el propietario (Tabla 27)', () => {
  it('el trabajador no tiene CU-14 ni registra costos', async () => {
    expect(puedeUsar('propietario', 'CU-14')).toBe(true);
    expect(puedeUsar('trabajador', 'CU-14')).toBe(false);
    const a = await comprado();
    await expect(registrarCosto(a.id, costo(), TRABAJADOR, HOY)).rejects.toThrow(PermisoDenegado);
    expect(await db.movimiento_economico.count()).toBe(0);
  });
});
