import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear, operacionesPendientes } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import { CAMPOS_CORREGIBLES } from '../../dominio/camposCorregibles';
import { describirSalida, formularioSalidaVacio, leerValor, sinPesajeReciente, validarSalida, type FormularioSalida } from '../../dominio/salida';
import type { DatosNuevos } from '../../dominio/tipos';
import { PermisoDenegado, puedeUsar } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { consolidarFicha } from '../consulta/ficha';
import { cargarListado } from '../consulta/listado';
import { registrarCorreccion } from '../correcciones/correcciones';
import { cargarTernerosSinChapeta } from '../identificacion/chapetaPendiente';
import { cargarRonda } from '../leche/ronda';
import { cargarParaPesaje } from '../peso/pesajes';
import { cargarParaSalida, registrarSalida, salidaDelAnimal } from './salidas';

/**
 * PU-31 · Registro de la salida y venta del animal (RF-15, CU-13, HU-11).
 * Especificación: docs/tecnica/29-salida-y-venta.md, sección 11
 */

const HOY = '2026-10-20';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

function datosAnimal(codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'macho',
    fecha_nacimiento: '2024-01-10',
    fecha_nacimiento_exacta: true,
    fecha_ingreso: null,
    procedencia: null,
    peso_inicial: 30,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
    ...cambios,
  };
}

const animal = (codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}) => crear('animal', datosAnimal(codigo, cambios), PROPIETARIO.usuario_id);
const venta = (cambios: Partial<FormularioSalida> = {}): FormularioSalida => ({ ...formularioSalidaVacio(HOY), motivo: 'venta', peso: '418', valor: '3.200.000', comprador: 'Pedro Gómez', ...cambios });

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: 'Daniel Ramos', perfil: 'trabajador' },
  ]);
});

describe('PU-31 · 1. Validaciones por motivo (sección 3)', () => {
  it('la venta exige peso y valor; el comprador es opcional', () => {
    expect(validarSalida(venta(), HOY, null)).toEqual({
      ok: true,
      datos: { fecha: HOY, motivo: 'venta', peso_venta: 418, valor_venta: 3_200_000, comprador: 'Pedro Gómez', causa_muerte: null, observacion: null },
    });
    expect(validarSalida(venta({ comprador: '  ' }), HOY, null)).toMatchObject({ ok: true, datos: { comprador: null } });
    expect(validarSalida(venta({ peso: '', valor: '' }), HOY, null)).toEqual({ ok: false, errores: { peso: 'Escriba el peso de venta', valor: 'Escriba el valor recibido, en pesos' } });
    expect(validarSalida(venta({ peso: '1600', valor: '12,5' }), HOY, null)).toMatchObject({ ok: false, errores: { peso: expect.stringMatching(/1\.500/), valor: expect.stringMatching(/sin decimales/) } });
    expect(validarSalida(venta({ comprador: 'x'.repeat(101) }), HOY, null)).toMatchObject({ ok: false, errores: { comprador: 'Hasta 100 caracteres' } });
  });

  it('el valor se lee en pesos, con o sin puntos de miles y signo', () => {
    expect(leerValor('3.200.000')).toBe(3_200_000);
    expect(leerValor('$ 950000')).toBe(950_000);
    expect(leerValor('0')).toBeNull();
    expect(leerValor('100000001')).toBeNull();
    expect(leerValor('dos millones')).toBeNull();
  });

  it('la muerte exige la causa; la pérdida o el robo admite una observación opcional (CU-13, 3a y 3b)', () => {
    const base = formularioSalidaVacio(HOY);
    expect(validarSalida({ ...base, motivo: 'muerte' }, HOY, null)).toEqual({ ok: false, errores: { causa: 'Escriba la causa' } });
    expect(validarSalida({ ...base, motivo: 'muerte', causa: 'Timpanismo' }, HOY, null)).toMatchObject({ ok: true, datos: { causa_muerte: 'Timpanismo', peso_venta: null, valor_venta: null } });
    expect(validarSalida({ ...base, motivo: 'perdida_robo' }, HOY, null)).toMatchObject({ ok: true, datos: { observacion: null } });
    expect(validarSalida({ ...base, motivo: 'perdida_robo', observacion: 'Se salió por la cerca' }, HOY, null)).toMatchObject({ ok: true, datos: { observacion: 'Se salió por la cerca' } });
    expect(validarSalida({ ...base, motivo: 'perdida_robo', observacion: 'x'.repeat(301) }, HOY, null)).toMatchObject({ ok: false, errores: { observacion: 'Hasta 300 caracteres' } });
  });

  it('los campos de otro motivo se descartan: una muerte nunca lleva valor de venta', () => {
    const r = validarSalida({ ...venta(), motivo: 'muerte', causa: 'Rayo' }, HOY, null);
    expect(r).toMatchObject({ ok: true, datos: { motivo: 'muerte', peso_venta: null, valor_venta: null, comprador: null, causa_muerte: 'Rayo', observacion: null } });
    const p = validarSalida({ ...venta(), motivo: 'perdida_robo', causa: 'Rayo' }, HOY, null);
    expect(p).toMatchObject({ ok: true, datos: { causa_muerte: null, peso_venta: null } });
  });

  it('el motivo es obligatorio; la fecha, válida, no futura ni anterior a la llegada', () => {
    expect(validarSalida({ ...formularioSalidaVacio(HOY) }, HOY, null)).toEqual({ ok: false, errores: { motivo: 'Elija el motivo' } });
    expect(validarSalida(venta({ fecha: '2026-10-21' }), HOY, null)).toMatchObject({ ok: false, errores: { fecha: 'La fecha no puede ser posterior a hoy' } });
    expect(validarSalida(venta({ fecha: '2026-02-30' }), HOY, null)).toMatchObject({ ok: false, errores: { fecha: 'Escriba una fecha válida' } });
    expect(validarSalida(venta({ fecha: '2024-01-09' }), HOY, '2024-01-10')).toMatchObject({ ok: false, errores: { fecha: 'El animal llegó al predio el 10 de enero de 2024' } });
    expect(validarSalida(venta({ fecha: '2024-01-10' }), HOY, '2024-01-10').ok).toBe(true);
  });
});

describe('PU-31 · 2. Último peso y pesaje reciente (sección 5, CU-13 2a)', () => {
  it('sin pesaje en más de los días del parámetro, o sin ningún pesaje, se advierte', () => {
    expect(sinPesajeReciente('2026-09-20', HOY, 30)).toBe(false);
    expect(sinPesajeReciente('2026-09-19', HOY, 30)).toBe(true);
    expect(sinPesajeReciente(null, HOY, 30)).toBe(true);
  });

  it('el contexto trae el último pesaje vigente, o el peso inicial, y el parámetro', async () => {
    const a = await animal('Z950');
    await db.parametro.put({ clave: 'dias_sin_pesaje', valor: 45, unidad: 'días', descripcion: '' } as never);
    let c = await cargarParaSalida(a.id);
    expect(c).toMatchObject({ ultimoPeso: { tipo: 'peso al nacer', kg: 30 }, ultimoPesaje: null, diasSinPesaje: 45, llegada: '2024-01-10', retirado: false, salidaAnulada: false });
    await crear('pesaje', { animal_id: a.id, fecha: '2026-10-02', peso: 420, metodo: 'cinta' }, PROPIETARIO.usuario_id);
    c = await cargarParaSalida(a.id);
    expect(c).toMatchObject({ ultimoPeso: { tipo: 'pesaje', kg: 420, fecha: '2026-10-02' }, ultimoPesaje: '2026-10-02' });
  });

  it('sin el parámetro en el teléfono se usan 30 días', async () => {
    const a = await animal('Z950');
    expect((await cargarParaSalida(a.id))?.diasSinPesaje).toBe(30);
  });
});

describe('PU-31 · 3. Registro (sección 6)', () => {
  it('se guarda con su operación en la cola', async () => {
    const a = await animal('Z950');
    const r = await registrarSalida(a.id, venta(), PROPIETARIO, HOY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.salida).toMatchObject({ animal_id: a.id, motivo: 'venta', peso_venta: 418, valor_venta: 3_200_000, estado_sync: 'pendiente' });
    expect((await operacionesPendientes()).some((o) => o.registro_id === r.salida.id && o.entidad === 'salida')).toBe(true);
  });

  it('una segunda salida se rechaza dentro de la transacción, aunque la primera esté anulada', async () => {
    const a = await animal('Z950');
    const primera = await registrarSalida(a.id, venta(), PROPIETARIO, HOY);
    expect(await registrarSalida(a.id, venta(), PROPIETARIO, HOY)).toEqual({ ok: false, errores: { registro: 'Este animal ya tiene registrada su salida' } });
    if (!primera.ok) return;
    await registrarCorreccion('salida', primera.salida.id, { operacion: 'anular', campo: '', valor: '', motivo: 'animal_equivocado', nota: '' }, PROPIETARIO, HOY);
    expect(await cargarParaSalida(a.id)).toMatchObject({ retirado: false, salidaAnulada: true });
    expect(await registrarSalida(a.id, venta(), PROPIETARIO, HOY)).toEqual({ ok: false, errores: { registro: 'Este animal ya tiene registrada su salida' } });
  });

  it('con datos inválidos no guarda nada', async () => {
    const a = await animal('Z950');
    expect(await registrarSalida(a.id, venta({ peso: '' }), PROPIETARIO, HOY)).toMatchObject({ ok: false, errores: { peso: 'Escriba el peso de venta' } });
    expect(await db.salida.count()).toBe(0);
  });
});

describe('PU-31 · 4. Retirado: salida vigente (sección 7)', () => {
  it('sale del listado de activos, de la ronda, de la chapeta pendiente y no admite pesajes; anulada, vuelve', async () => {
    const vaca = await animal('Z951', { sexo: 'hembra', chapeta_puesta: false, fecha_nacimiento: '2026-09-20' });
    await crear('destino_productivo', { animal_id: vaca.id, destino: 'leche', desde: '2026-10-01' }, PROPIETARIO.usuario_id);
    const r = await registrarSalida(vaca.id, { ...formularioSalidaVacio(HOY), motivo: 'muerte', causa: 'Timpanismo' }, PROPIETARIO, HOY);
    if (!r.ok) throw new Error('no se registró');

    expect((await cargarListado()).find((a) => a.id === vaca.id)?.retirado).toBe(true);
    expect((await cargarRonda(HOY)).some((v) => v.animal_id === vaca.id)).toBe(false);
    expect((await cargarTernerosSinChapeta(HOY)).some((t) => t.id === vaca.id)).toBe(false);
    expect((await cargarParaPesaje(vaca.id, HOY))?.contexto.retirado).toBe(true);
    expect((await consolidarFicha(vaca.id))?.retirado).toBe(true);

    await registrarCorreccion('salida', r.salida.id, { operacion: 'anular', campo: '', valor: '', motivo: 'animal_equivocado', nota: '' }, PROPIETARIO, HOY);
    expect((await cargarListado()).find((a) => a.id === vaca.id)?.retirado).toBe(false);
    expect((await cargarRonda(HOY)).some((v) => v.animal_id === vaca.id)).toBe(true);
    expect((await cargarTernerosSinChapeta(HOY)).some((t) => t.id === vaca.id)).toBe(true);
    expect((await cargarParaPesaje(vaca.id, HOY))?.contexto.retirado).toBe(false);
    expect((await consolidarFicha(vaca.id))?.retirado).toBe(false);
  });
});

describe('PU-31 · 5. Ficha (sección 7)', () => {
  it('la salida en una línea, según el motivo y el sexo', () => {
    const base = { fecha: '2026-10-20', peso_venta: null, valor_venta: null, comprador: null, causa_muerte: null, observacion: null };
    expect(describirSalida({ ...base, motivo: 'venta', peso_venta: 418, valor_venta: 3_200_000, comprador: 'Pedro Gómez' }, false)).toBe('Vendido el 20 de octubre de 2026 · 418 kg · $3.200.000 · comprador Pedro Gómez');
    expect(describirSalida({ ...base, motivo: 'venta', peso_venta: 418.5, valor_venta: 3_200_000 }, true)).toBe('Vendida el 20 de octubre de 2026 · 418,5 kg · $3.200.000');
    expect(describirSalida({ ...base, motivo: 'muerte', causa_muerte: 'Timpanismo' }, true)).toBe('Murió el 20 de octubre de 2026 · causa: Timpanismo');
    expect(describirSalida({ ...base, motivo: 'perdida_robo', observacion: 'Se salió por la cerca' }, false)).toBe('Perdido o robado el 20 de octubre de 2026 · Se salió por la cerca');
    expect(describirSalida({ ...base, motivo: 'perdida_robo' }, true)).toBe('Perdida o robada el 20 de octubre de 2026');
  });

  it('la salida del animal: la vigente con sus correcciones; anulada, la más reciente con su anulación', async () => {
    const a = await animal('Z950');
    expect(await salidaDelAnimal(a.id)).toBeUndefined();
    const r = await registrarSalida(a.id, venta(), PROPIETARIO, HOY);
    if (!r.ok) throw new Error('no se registró');
    await registrarCorreccion('salida', r.salida.id, { operacion: 'corregir', campo: 'valor_venta', valor: '3300000', motivo: 'error_digitacion', nota: '' }, PROPIETARIO, HOY);
    const corregida = await salidaDelAnimal(a.id);
    expect(corregida?.registro.valor_venta).toBe(3_300_000);
    expect(corregida?.corregidos.size).toBe(1);
    await registrarCorreccion('salida', r.salida.id, { operacion: 'anular', campo: '', valor: '', motivo: 'animal_equivocado', nota: '' }, PROPIETARIO, HOY);
    expect((await salidaDelAnimal(a.id))?.anulacion).not.toBeNull();
    // Si llega otra de otro teléfono, la vigente se muestra antes que la anulada.
    const otra = await crear('salida', { animal_id: a.id, fecha: HOY, motivo: 'muerte', peso_venta: null, valor_venta: null, comprador: null, causa_muerte: 'Rayo', observacion: null }, PROPIETARIO.usuario_id);
    expect((await salidaDelAnimal(a.id))?.registro.id).toBe(otra.id);
  });
});

describe('PU-31 · 6. Corrección (sección 8)', () => {
  it('se corrigen fecha, peso, valor (solo el propietario), comprador, causa y observación; el motivo no', () => {
    expect(Object.keys(CAMPOS_CORREGIBLES.salida).sort()).toEqual(['causa_muerte', 'comprador', 'fecha', 'observacion', 'peso_venta', 'valor_venta']);
    expect(CAMPOS_CORREGIBLES.salida['valor_venta']?.soloPropietario).toBe(true);
  });

  it('el peso de venta corregido se valida como un pesaje; la fecha, desde la llegada', async () => {
    const a = await animal('Z950');
    const r = await registrarSalida(a.id, venta(), PROPIETARIO, HOY);
    if (!r.ok) throw new Error('no se registró');
    const corregir = (campo: string, valor: string) => registrarCorreccion('salida', r.salida.id, { operacion: 'corregir', campo, valor, motivo: 'error_digitacion', nota: '' }, PROPIETARIO, HOY);
    expect(await corregir('peso_venta', '2000')).toMatchObject({ ok: false });
    expect(await corregir('peso_venta', '420,5')).toMatchObject({ ok: true, correccion: { valor_nuevo: '420.5' } });
    expect(await corregir('fecha', '2024-01-09')).toMatchObject({ ok: false, errores: { valor: expect.stringMatching(/llegó al predio/) } });
  });
});

describe('PU-31 · 7. Solo el propietario (Tabla 27, RD-05)', () => {
  it('el trabajador no tiene CU-13 y el teléfono rechaza que registre una salida', async () => {
    expect(puedeUsar('propietario', 'CU-13')).toBe(true);
    expect(puedeUsar('trabajador', 'CU-13')).toBe(false);
    const a = await animal('Z950');
    await expect(registrarSalida(a.id, venta(), TRABAJADOR, HOY)).rejects.toThrow(PermisoDenegado);
    expect(await db.salida.count()).toBe(0);
  });

  it('el trabajador no puede corregir ni anular la salida del propietario', async () => {
    const a = await animal('Z950');
    const r = await registrarSalida(a.id, venta(), PROPIETARIO, HOY);
    if (!r.ok) throw new Error('no se registró');
    await expect(registrarCorreccion('salida', r.salida.id, { operacion: 'anular', campo: '', valor: '', motivo: 'animal_equivocado', nota: '' }, TRABAJADOR, HOY)).rejects.toThrow(PermisoDenegado);
  });
});

