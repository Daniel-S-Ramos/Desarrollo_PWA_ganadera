import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import { aplicarCorrecciones, ordenDeAplicacion, type CorreccionVigente } from '../../dominio/vigente';
import type { DatosNuevos, Sexo } from '../../dominio/tipos';
import { PermisoDenegado } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { consolidarFicha } from '../consulta/ficha';
import { cargarListado } from '../consulta/listado';
import { cargarContextoDestino } from '../destino/destino';
import { promedioDe } from '../leche/ronda';
import { cargarEvolucion } from '../peso/pesajes';
import { cargarControlReproductivo } from '../reproduccion/partos';
import { cargarHistorialSanitario, verificarRepeticion } from '../sanidad/eventos';
import { listarCatalogo } from '../sanidad/catalogo';
import { camposPara, cargarVigente, contextoDeValor, opcionDeCorreccion, registrarCorreccion, validarCorreccion, type FormularioCorreccion } from './correcciones';

/**
 * PU-27 · Corrección, anulación y valor vigente (RF-31, CU-17, HU-17, apartado 3.9.5).
 * Especificación: docs/tecnica/26-correccion-y-anulacion.md, sección 9
 */

const HOY = '2026-10-18';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };
const OTRO: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Pedro Gómez', vence_en: 0 };
const AHORA = new Date();
const OTRO_DIA = new Date(AHORA.getTime() + 2 * 24 * 60 * 60 * 1000);

function datosAnimal(codigo: string, sexo: Sexo = 'hembra', cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo,
    fecha_nacimiento: '2022-03-04',
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

const animal = (codigo: string, sexo: Sexo = 'hembra', cambios: Partial<DatosNuevos<'animal'>> = {}, autor = PROPIETARIO.usuario_id) =>
  crear('animal', datosAnimal(codigo, sexo, cambios), autor);
const medicamento = (nombre = 'Prueba Aftosa', intervalo = 35) => crear('medicamento', { nombre, tipo: 'vacuna', unidad: 'ml', intervalo_advertencia_dias: intervalo }, PROPIETARIO.usuario_id);
const evento = (animalId: string, medicamentoId: string, fecha: string, autor = PROPIETARIO.usuario_id, dosis: number | null = 5) =>
  crear('evento_sanitario', { animal_id: animalId, fecha, tipo: 'vacuna', medicamento_id: medicamentoId, dosis, costo: null, sintomas: null }, autor);
const corregir = (campo: string, valor: string, motivo: FormularioCorreccion['motivo'] = 'error_digitacion', nota = ''): FormularioCorreccion => ({ operacion: 'corregir', campo, valor, motivo, nota });
const anular = (motivo: FormularioCorreccion['motivo'] = 'registro_duplicado', nota = ''): FormularioCorreccion => ({ operacion: 'anular', campo: '', valor: '', motivo, nota });

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: 'Daniel Ramos', perfil: 'trabajador' },
    { id: OTRO.usuario_id, nombre: 'Pedro Gómez', perfil: 'trabajador' },
  ]);
});

describe('PU-27 · 1. Valor vigente (sección 6)', () => {
  const c = (id: string, valor: string, extra: Partial<CorreccionVigente> = {}): CorreccionVigente => ({
    id,
    entidad_afectada: 'pesaje',
    registro_id: 'p1',
    tipo: 'correccion',
    campo: 'peso',
    valor_anterior: null,
    valor_nuevo: valor,
    motivo: 'error_digitacion',
    nota: null,
    autor_id: 'a',
    creado_en: '2026-10-18T10:00:00Z',
    ...extra,
  });
  const pesaje = { id: 'p1', peso: 300, fecha: HOY };

  it('sin correcciones, el original; con varias, la última recibida por el servicio', () => {
    expect(aplicarCorrecciones('pesaje', pesaje, []).registro.peso).toBe(300);
    const recibidas = [c('02', '320', { recibido_en: '2026-10-18T12:00:00Z' }), c('01', '310', { recibido_en: '2026-10-18T11:00:00Z' })];
    expect(aplicarCorrecciones('pesaje', pesaje, recibidas).registro.peso).toBe(320);
  });

  it('las no enviadas van después de las recibidas, por creación', () => {
    const lista = [c('09', '350', { creado_en: '2026-10-18T09:00:00Z' }), c('01', '310', { recibido_en: '2026-10-18T23:00:00Z' }), c('10', '360', { creado_en: '2026-10-18T09:30:00Z' })];
    expect([...lista].sort(ordenDeAplicacion).map((x) => x.id)).toEqual(['01', '09', '10']);
    expect(aplicarCorrecciones('pesaje', pesaje, lista).registro.peso).toBe(360);
  });

  it('la anulación prevalece, cualquiera que sea el orden; el original no cambia', () => {
    const v = aplicarCorrecciones('pesaje', pesaje, [c('01', '310'), c('02', '', { tipo: 'anulacion', campo: null, valor_nuevo: null, creado_en: '2026-10-18T08:00:00Z' })]);
    expect(v.anulacion?.id).toBe('02');
    expect(v.original.peso).toBe(300);
    expect(v.corregidos.get('peso')?.map((x) => x.id)).toEqual(['01']);
  });

  it('las correcciones de otro registro o de un campo desconocido no lo alteran', () => {
    expect(aplicarCorrecciones('pesaje', pesaje, [c('01', '310', { registro_id: 'otro' }), c('02', 'x', { campo: 'inventado' })]).registro).toEqual(pesaje);
  });
});

describe('PU-27 · 2. Campos y validaciones (secciones 2 y 3)', () => {
  it('la dosis, los litros, el peso y la fecha se validan como en su registro; el mismo valor no', async () => {
    const [a, m] = [await animal('Z920'), await medicamento()];
    const e = await evento(a.id, m.id, '2026-10-01');
    const v = (await cargarVigente('evento_sanitario', e.id))!;
    const ctx = await contextoDeValor('evento_sanitario', v.registro, HOY);
    const errores = (f: FormularioCorreccion) => {
      const r = validarCorreccion('evento_sanitario', v, f, 'propietario', ctx);
      return r.ok ? r.correccion : r.errores;
    };
    expect(errores(corregir('dosis', '2,5'))).toMatchObject({ tipo: 'correccion', campo: 'dosis', valor_anterior: '5', valor_nuevo: '2.5' });
    expect(errores(corregir('dosis', '0'))).toEqual({ valor: 'La dosis debe ser mayor que 0 y hasta 9.999' });
    expect(errores(corregir('dosis', '5'))).toEqual({ valor: 'Es el mismo valor' });
    expect(errores(corregir('dosis', ''))).toMatchObject({ valor_nuevo: '' }); // la dosis puede quedar vacía
    expect(errores(corregir('fecha', '2026-10-19'))).toEqual({ valor: 'La fecha no puede ser posterior a hoy' });
    expect(errores(corregir('fecha', '2022-03-01'))).toEqual({ valor: 'El animal nació el 4 de marzo de 2022' });
    expect(errores(corregir('medicamento_id', uuidv7()))).toEqual({ valor: 'Elija un medicamento del catálogo' });
    expect(errores(corregir('tipo', 'purga'))).toMatchObject({ valor_nuevo: 'purga' });
    expect(errores(corregir('inventado', 'x'))).toEqual({ campo: 'Elija el campo que va a corregir' });
  });

  it('el costo solo lo corrige el propietario', () => {
    expect(camposPara('evento_sanitario', 'propietario').map(([n]) => n)).toContain('costo');
    expect(camposPara('evento_sanitario', 'trabajador').map(([n]) => n)).not.toContain('costo');
  });

  it('animal: madre y padre de una sola forma; el nacimiento no después del ingreso; el sexo del progenitor', async () => {
    const toro = await animal('Z931', 'macho');
    const a = await animal('Z920', 'hembra', { madre_externa: 'Vaca del vecino', fecha_ingreso: '2023-01-01' });
    const v = (await cargarVigente('animal', a.id))!;
    const ctx = await contextoDeValor('animal', v.registro, HOY);
    const r = (f: FormularioCorreccion) => {
      const x = validarCorreccion('animal', v, f, 'propietario', ctx);
      return x.ok ? x.correccion : x.errores;
    };
    expect(r(corregir('madre_id', toro.id))).toEqual({ valor: 'La madre debe ser una hembra' });
    const vaca = await animal('Z929');
    const ctx2 = await contextoDeValor('animal', v.registro, HOY);
    expect(validarCorreccion('animal', v, corregir('madre_id', vaca.id), 'propietario', ctx2)).toMatchObject({ ok: false, errores: { valor: expect.stringContaining('externa') } });
    expect(r(corregir('fecha_nacimiento', '2023-02-01'))).toEqual({ valor: 'La fecha de nacimiento no puede ser posterior a la de ingreso' });
    expect(r(corregir('sexo', 'macho'))).toMatchObject({ valor_nuevo: 'macho' });
    expect(r(corregir('codigo_chapeta', 'Z999'))).toEqual({ campo: 'Elija el campo que va a corregir' }); // la chapeta no se corrige
  });

  it('animal y medicamento no se anulan', async () => {
    const a = await animal('Z920');
    const v = (await cargarVigente('animal', a.id))!;
    expect(validarCorreccion('animal', v, anular(), 'propietario', { hoy: HOY })).toMatchObject({ ok: false, errores: { operacion: expect.any(String) } });
  });
});

describe('PU-27 · 3. Motivo y nota (sección 2)', () => {
  it('el motivo es obligatorio; con «otro», la nota también', async () => {
    const a = await animal('Z920');
    const p = await crear('pesaje', { animal_id: a.id, fecha: HOY, peso: 300, metodo: 'cinta' }, PROPIETARIO.usuario_id);
    expect(await registrarCorreccion('pesaje', p.id, anular(null), PROPIETARIO, HOY)).toEqual({ ok: false, errores: { motivo: 'Elija el motivo' } });
    expect(await registrarCorreccion('pesaje', p.id, anular('otro'), PROPIETARIO, HOY)).toEqual({ ok: false, errores: { nota: 'Con el motivo «otro», escriba una nota' } });
    expect(await registrarCorreccion('pesaje', p.id, anular('otro', 'Se pesó otro animal'), PROPIETARIO, HOY)).toMatchObject({ ok: true, correccion: { tipo: 'anulacion', nota: 'Se pesó otro animal' } });
  });
});

describe('PU-27 · 4. Permisos (sección 4, RD-05)', () => {
  it('el propietario corrige cualquiera; el trabajador, los de un trabajador del mismo día', async () => {
    const a = await animal('Z920');
    const delOtro = await crear('pesaje', { animal_id: a.id, fecha: HOY, peso: 300, metodo: 'cinta' }, OTRO.usuario_id);
    const delPropietario = await crear('pesaje', { animal_id: a.id, fecha: HOY, peso: 301, metodo: 'cinta' }, PROPIETARIO.usuario_id);
    expect(opcionDeCorreccion(TRABAJADOR, delOtro, 'trabajador', AHORA)).toBe('mostrar');
    expect(opcionDeCorreccion(TRABAJADOR, delOtro, 'trabajador', OTRO_DIA)).toBe('vencida');
    expect(opcionDeCorreccion(TRABAJADOR, delPropietario, 'propietario', AHORA)).toBe('oculta');
    expect(opcionDeCorreccion(PROPIETARIO, delOtro, 'trabajador', OTRO_DIA)).toBe('mostrar');

    expect((await registrarCorreccion('pesaje', delOtro.id, corregir('peso', '305'), TRABAJADOR, HOY, AHORA)).ok).toBe(true);
    await expect(registrarCorreccion('pesaje', delOtro.id, corregir('peso', '306'), TRABAJADOR, HOY, OTRO_DIA)).rejects.toBeInstanceOf(PermisoDenegado);
    await expect(registrarCorreccion('pesaje', delPropietario.id, corregir('peso', '306'), TRABAJADOR, HOY, AHORA)).rejects.toBeInstanceOf(PermisoDenegado);
    expect((await registrarCorreccion('pesaje', delPropietario.id, corregir('peso', '306'), PROPIETARIO, HOY, OTRO_DIA)).ok).toBe(true);
  });
});

describe('PU-27 · 5. Un registro anulado (CU-17, 1a)', () => {
  it('no admite correcciones ni otra anulación; queda visible y marcado', async () => {
    const [a, m] = [await animal('Z920'), await medicamento()];
    const e = await evento(a.id, m.id, '2026-10-01');
    expect((await registrarCorreccion('evento_sanitario', e.id, anular('animal_equivocado'), PROPIETARIO, HOY)).ok).toBe(true);
    const otra = await registrarCorreccion('evento_sanitario', e.id, corregir('dosis', '3'), PROPIETARIO, HOY);
    expect(otra).toEqual({ ok: false, errores: { registro: 'Este registro está anulado. Si el dato era correcto, regístrelo de nuevo' } });
    const historial = await cargarHistorialSanitario(a.id);
    expect(historial).toHaveLength(1);
    expect(historial[0]?.vigente.anulacion?.motivo).toBe('animal_equivocado');
    expect(await db.correccion.count()).toBe(1);
    expect(await db.cola_operaciones.where('registro_id').equals((await db.correccion.toArray())[0]!.id).count()).toBe(1);
  });
});

describe('PU-27 · 6. Los cálculos usan el valor vigente y descartan lo anulado (sección 6.3)', () => {
  it('promedio de leche', async () => {
    const vaca = await animal('Z920');
    const o1 = await crear('produccion_leche', { animal_id: vaca.id, fecha: '2026-10-16', litros: 10 }, PROPIETARIO.usuario_id);
    const o2 = await crear('produccion_leche', { animal_id: vaca.id, fecha: '2026-10-17', litros: 20 }, PROPIETARIO.usuario_id);
    await registrarCorreccion('produccion_leche', o2.id, anular(), PROPIETARIO, HOY);
    await registrarCorreccion('produccion_leche', o1.id, corregir('litros', '12'), PROPIETARIO, HOY);
    expect((await promedioDe(vaca.id, HOY)).resultado).toEqual({ promedio: 12, registros: 1 });
  });

  it('advertencia por repetición, con el intervalo vigente del medicamento', async () => {
    const [a, m] = [await animal('Z920'), await medicamento('Prueba Aftosa', 35)];
    const e = await evento(a.id, m.id, '2026-10-10');
    expect((await verificarRepeticion(a.id, m.id, HOY))?.repeticion.nivel).toBe('advertencia');
    await registrarCorreccion('medicamento', m.id, corregir('intervalo_advertencia_dias', '5'), PROPIETARIO, HOY);
    expect((await verificarRepeticion(a.id, m.id, HOY))?.repeticion.nivel).toBe('informacion');
    expect((await listarCatalogo())[0]?.intervalo_advertencia_dias).toBe(5);
    await registrarCorreccion('evento_sanitario', e.id, anular(), PROPIETARIO, HOY);
    expect((await verificarRepeticion(a.id, m.id, HOY))?.repeticion.nivel).toBe('ninguno');
  });

  it('evolución del peso: sin el anulado en la serie, listado aparte', async () => {
    const a = await animal('Z920', 'macho', { peso_inicial: 300, fecha_ingreso: '2026-09-01' });
    const malo = await crear('pesaje', { animal_id: a.id, fecha: '2026-10-01', peso: 900, metodo: 'cinta' }, PROPIETARIO.usuario_id);
    await crear('pesaje', { animal_id: a.id, fecha: '2026-10-11', peso: 330, metodo: 'cinta' }, PROPIETARIO.usuario_id);
    await registrarCorreccion('pesaje', malo.id, anular('error_digitacion'), PROPIETARIO, HOY);
    const evolucion = await cargarEvolucion(a.id);
    expect(evolucion?.tramos.map((t) => t.punto.kg)).toEqual([300, 330]);
    expect(evolucion?.anulados.map((x) => x.vigente.registro.peso)).toEqual([900]);
  });

  it('partos y destino', async () => {
    const vaca = await animal('Z920');
    const parto = await crear('parto', { madre_id: vaca.id, fecha: '2026-01-01', resultado: 'aborto', cria_id: null, observacion: null }, PROPIETARIO.usuario_id);
    await registrarCorreccion('parto', parto.id, anular(), PROPIETARIO, HOY);
    const control = await cargarControlReproductivo(vaca.id);
    expect(control.total).toBe(0);
    expect(control.anulados).toHaveLength(1);
    const d = await crear('destino_productivo', { animal_id: vaca.id, destino: 'leche', desde: '2026-02-01' }, PROPIETARIO.usuario_id);
    await registrarCorreccion('destino_productivo', d.id, anular(), PROPIETARIO, HOY);
    expect((await cargarContextoDestino(vaca.id))?.vigente).toBeNull();
  });
});

describe('PU-27 · 7. Ficha y listado (sección 6.3)', () => {
  it('datos vigentes del animal; último peso y última vacuna sin anulados', async () => {
    const [a, m] = [await animal('Z920', 'hembra', { peso_inicial: 30 }), await medicamento()];
    await registrarCorreccion('animal', a.id, corregir('sexo', 'macho'), PROPIETARIO, HOY);
    await registrarCorreccion('animal', a.id, corregir('peso_inicial', '32'), PROPIETARIO, HOY);
    const v1 = await evento(a.id, m.id, '2026-09-01');
    const v2 = await evento(a.id, m.id, '2026-10-01');
    await registrarCorreccion('evento_sanitario', v2.id, anular(), PROPIETARIO, HOY);
    const ficha = await consolidarFicha(a.id);
    expect(ficha).toMatchObject({ sexo: 'macho', vacuna: { fecha: '2026-09-01' }, peso: { kg: 32 } });
    expect(v1.id).toBeTruthy();
    expect((await cargarListado())[0]?.sexo).toBe('macho');
  });
});

describe('PU-27 · 8. Verificación al guardar (sección 4)', () => {
  it('un registro que no está en el teléfono no se corrige', async () => {
    expect(await registrarCorreccion('pesaje', uuidv7(), corregir('peso', '300'), PROPIETARIO, HOY)).toEqual({ ok: false, errores: { registro: 'El registro no está en este teléfono' } });
  });
});
