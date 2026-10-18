import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import { buscarParentesco, type AnimalGenealogia } from '../../dominio/parentesco';
import { controlReproductivo, partoCercano, validarParto, type ContextoParto, type FormularioParto } from '../../dominio/reproduccion';
import type { DatosNuevos, Sexo } from '../../dominio/tipos';
import { puedeUsar } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { cargarListado } from '../consulta/listado';
import {
  cargarTernerosSinChapeta,
  confirmarChapetaPuesta,
  errorDeFechaColocacion,
  estadoDeChapeta,
  idsConChapetaPendiente,
  ternerosSinChapeta,
} from '../identificacion/chapetaPendiente';
import { formularioVacio, registrarAnimal, siguienteNumeroLibre } from '../identificacion/registroAnimal';
import { cargarControlReproductivo, cargarParaParto, criaVacia, registrarParto, type FormularioCria } from './partos';

/**
 * PU-26 · Parto, control reproductivo y chapeta pendiente (RF-16, RF-17, CU-10, CU-11, HU-12).
 * Especificación: docs/tecnica/25-parto-y-control-reproductivo.md, sección 10
 */

const HOY = '2026-10-18';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

function datosAnimal(codigo: string, sexo: Sexo, cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
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

const animal = (codigo: string, sexo: Sexo = 'hembra', cambios: Partial<DatosNuevos<'animal'>> = {}) =>
  crear('animal', datosAnimal(codigo, sexo, cambios), PROPIETARIO.usuario_id);
const parto = (cambios: Partial<FormularioParto> = {}): FormularioParto => ({ resultado: 'cria_viva', fecha: HOY, observacion: '', ...cambios });
const cria = (cambios: Partial<FormularioCria> = {}): FormularioCria => ({ ...criaVacia('1046'), sexo: 'macho', ...cambios });

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: 'Daniel Ramos', perfil: 'trabajador' },
  ]);
});

describe('PU-26 · 1. Validaciones del parto (sección 4.1)', () => {
  const contexto: ContextoParto = { esHembra: true, retirada: false, nacimientoVaca: '2022-03-04' };
  const errores = (f: FormularioParto, ctx = contexto) => {
    const r = validarParto(f, ctx, HOY);
    return r.ok ? {} : r.errores;
  };

  it('un parto válido; la observación se recorta', () => {
    expect(validarParto(parto({ observacion: '  Parto difícil  ' }), contexto, HOY)).toEqual({ ok: true, resultado: 'cria_viva', fecha: HOY, observacion: 'Parto difícil' });
  });

  it('resultado y fecha obligatorios; la fecha no es futura ni anterior al nacimiento de la vaca', () => {
    expect(errores(parto({ resultado: null, fecha: '' }))).toEqual({ resultado: 'Elija el resultado del parto', fecha: 'Escriba una fecha válida' });
    expect(errores(parto({ fecha: '2026-10-19' }))).toEqual({ fecha: 'La fecha no puede ser posterior a hoy' });
    expect(errores(parto({ fecha: '2022-03-03' }))).toEqual({ fecha: 'La vaca nació el 4 de marzo de 2022' });
  });

  it('solo una hembra que no salió del predio; observación hasta 300', () => {
    expect(errores(parto(), { ...contexto, esHembra: false })).toEqual({ vaca: 'Solo se registran partos de una hembra' });
    expect(errores(parto(), { ...contexto, retirada: true })).toEqual({ vaca: 'Esta vaca salió del predio' });
    expect(errores(parto({ observacion: 'a'.repeat(301) }))).toEqual({ observacion: 'Hasta 300 caracteres' });
  });
});

describe('PU-26 · 2. Parto y cría en una transacción (sección 4)', () => {
  it('con cría viva crea la cría y el parto juntos, en la cola', async () => {
    const vaca = await animal('Z930');
    const r = await registrarParto(vaca.id, parto({ observacion: 'Sin novedad' }), cria(), TRABAJADOR, undefined, HOY);
    if (!r.ok) throw new Error(`debía registrarse: ${JSON.stringify(r)}`);
    expect(r.parto).toMatchObject({ madre_id: vaca.id, fecha: HOY, resultado: 'cria_viva', cria_id: r.cria!.id, observacion: 'Sin novedad', autor_id: TRABAJADOR.usuario_id });
    // La vaca entró antes; el parto agrega la cría y el parto, en ese orden.
    expect((await db.cola_operaciones.toArray()).slice(1).map((o) => [o.entidad, o.registro_id])).toEqual([
      ['animal', r.cria!.id],
      ['parto', r.parto.id],
    ]);
  });

  it('con un número ya asignado no se guarda nada', async () => {
    const vaca = await animal('Z930');
    await animal('1046', 'macho');
    const r = await registrarParto(vaca.id, parto(), cria(), PROPIETARIO, undefined, HOY);
    expect(r).toMatchObject({ ok: false, chapetaAsignada: { animal: { codigo_chapeta: '1046' } } });
    expect(await db.parto.count()).toBe(0);
    expect(await db.animal.count()).toBe(2);
  });

  it('cría nacida muerta y aborto: sin cría, con observación', async () => {
    const vaca = await animal('Z930');
    const r = await registrarParto(vaca.id, parto({ resultado: 'aborto', observacion: 'A los cinco meses' }), cria(), PROPIETARIO, undefined, HOY);
    expect(r).toMatchObject({ ok: true, cria: null, parto: { resultado: 'aborto', cria_id: null, observacion: 'A los cinco meses' } });
    expect(await db.animal.count()).toBe(1);
  });

  it('los errores de la cría se devuelven sin escribir', async () => {
    const vaca = await animal('Z930');
    const r = await registrarParto(vaca.id, parto(), cria({ sexo: null, chapeta: 'O12' }), PROPIETARIO, undefined, HOY);
    expect(r).toMatchObject({ ok: false, erroresCria: { sexo: 'Indique si es macho o hembra' } });
    expect(await db.parto.count()).toBe(0);
  });
});

describe('PU-26 · 3. La cría (secciones 4 y 7)', () => {
  it('hija de la vaca, nacida el día del parto, exacta, con el reproductor y la chapeta pendiente', async () => {
    const vaca = await animal('Z930');
    const toro = await animal('Z931', 'macho');
    const r = await registrarParto(vaca.id, parto({ fecha: '2026-10-10' }), cria({ forma_padre: 'predio', padre_id: toro.id, peso_inicial: '32' }), PROPIETARIO, undefined, HOY);
    if (!r.ok) throw new Error('debía registrarse');
    expect(r.cria).toMatchObject({
      codigo_chapeta: '1046',
      madre_id: vaca.id,
      padre_id: toro.id,
      padre_externo: null,
      fecha_nacimiento: '2026-10-10',
      fecha_nacimiento_exacta: true,
      fecha_ingreso: null,
      peso_inicial: 32,
      chapeta_puesta: false,
    });
  });

  it('con reproductor externo, el padre queda como texto', async () => {
    const vaca = await animal('Z930');
    const r = await registrarParto(vaca.id, parto(), cria({ forma_padre: 'externo', padre_externo: 'Toro de don Pedro' }), PROPIETARIO, undefined, HOY);
    expect(r).toMatchObject({ ok: true, cria: { padre_id: null, padre_externo: 'Toro de don Pedro' } });
  });
});

describe('PU-26 · 4. Otro parto cercano (sección 4.2)', () => {
  it('a menos de 240 días pide confirmación, antes o después; a 240, no', () => {
    const partos = [{ id: '01', fecha: '2026-03-01' }];
    expect(partoCercano(partos, '2026-10-26')).toMatchObject({ id: '01', dias: 239 });
    expect(partoCercano(partos, '2026-10-27')).toBeNull(); // 240 días
    expect(partoCercano(partos, '2025-12-01')).toMatchObject({ dias: 90 });
  });

  it('al guardar sin confirmar no escribe; confirmado, sí', async () => {
    const vaca = await animal('Z930');
    await crear('parto', { madre_id: vaca.id, fecha: '2026-06-01', resultado: 'aborto', cria_id: null, observacion: null }, PROPIETARIO.usuario_id);
    expect(await registrarParto(vaca.id, parto({ resultado: 'aborto' }), null, PROPIETARIO, undefined, HOY)).toEqual({ ok: false, requiereConfirmacion: 'cercano' });
    expect(await db.parto.count()).toBe(1);
    expect((await registrarParto(vaca.id, parto({ resultado: 'aborto' }), null, PROPIETARIO, { cercano: true, parentesco: false }, HOY)).ok).toBe(true);
  });
});

describe('PU-26 · 5. Parentesco (sección 5)', () => {
  // Genealogía: abuelo A0 (macho) → madre M (hembra, hija de A0) → vaca V (hija de M y del toro P).
  const a = (id: string, madre: string | null = null, padre: string | null = null, externo: string | null = null): AnimalGenealogia => ({
    id,
    codigo_chapeta: id,
    madre_id: madre,
    padre_id: padre,
    padre_externo: externo,
  });
  const mapa = (...animales: AnimalGenealogia[]) => new Map(animales.map((x) => [x.id, x]));
  const base = [a('A0'), a('M', null, 'A0'), a('P'), a('V', 'M', 'P'), a('Q')];

  it.each([
    ['padre', [a('V', 'M', 'P')], 'P', 'P es el padre de V.'],
    ['hijo', [a('H', 'V', 'P')], 'H', 'H es hijo de V.'],
    ['hermano', [a('S', 'M', 'P')], 'S', 'S es hermano de V: los dos son hijos de M y P.'],
    ['medio_hermano', [a('S', 'M', 'Q')], 'S', 'S es medio hermano de V: los dos son hijos de M.'],
    ['abuelo', [], 'A0', 'A0 es abuelo de V: es el padre de su madre M.'],
    ['nieto', [a('H', 'V', 'Q'), a('N', 'H', 'Q')], 'N', 'N es nieto de V: es hijo de su hija H.'],
  ])('%s', (tipo, extra, toro, texto) => {
    expect(buscarParentesco(mapa(...base, ...extra), 'V', { id: toro })).toEqual({ tipo, texto });
  });

  it('el más cercano primero; sin parentesco, ninguno', () => {
    // P es padre de V y también padre de su hermano: se nombra «padre».
    expect(buscarParentesco(mapa(...base), 'V', { id: 'P' })?.tipo).toBe('padre');
    expect(buscarParentesco(mapa(...base), 'V', { id: 'Q' })).toBeNull();
  });

  it('externo con el mismo nombre que el padre externo de la vaca, sin tildes ni mayúsculas', () => {
    const vaca = a('V', null, null, 'Toro de don Pedro');
    expect(buscarParentesco(mapa(vaca), 'V', { externo: '  toro de DON pédro ' })?.tipo).toBe('mismo_padre_externo');
    expect(buscarParentesco(mapa(vaca), 'V', { externo: 'Otro toro' })).toBeNull();
  });

  it('al guardar, el parentesco pide confirmación', async () => {
    const madre = await animal('Z929');
    const toro = await animal('Z931', 'macho', { madre_id: madre.id });
    const vaca = await animal('Z930', 'hembra', { madre_id: madre.id });
    const datos = await cargarParaParto(vaca.id, HOY, { id: toro.id });
    expect(datos?.parentesco?.tipo).toBe('medio_hermano');
    const conToro = cria({ forma_padre: 'predio', padre_id: toro.id });
    expect(await registrarParto(vaca.id, parto(), conToro, PROPIETARIO, undefined, HOY)).toMatchObject({ ok: false, requiereConfirmacion: 'parentesco' });
    expect(await db.parto.count()).toBe(0);
    expect((await registrarParto(vaca.id, parto(), conToro, PROPIETARIO, { cercano: false, parentesco: true }, HOY)).ok).toBe(true);
  });
});

describe('PU-26 · 6. Siguiente número libre (sección 6)', () => {
  it.each([
    [[], '1'],
    [['1045', '12', 'Z930'], 'Z931'],
    [['1045', '12'], '1046'],
    [['1045', '1046', '1047'], '1048'],
    [['9999'], 'A1'],
    [['A999'], 'B1'],
    [['N999'], 'P1'], // sin la O
    [['Z999'], ''], // la secuencia se agotó: se escribe a mano
  ])('%j → %s', (chapetas, siguiente) => {
    expect(siguienteNumeroLibre(chapetas)).toBe(siguiente);
  });

  it('el formulario lo sugiere', async () => {
    const vaca = await animal('1045');
    expect((await cargarParaParto(vaca.id, HOY, null))?.numeroSugerido).toBe('1046');
  });
});

describe('PU-26 · 7. Chapeta pendiente de poner (sección 7)', () => {
  it('pendiente hasta confirmarla; la confirmación es única y con fecha válida', async () => {
    const ternero = await animal('1046', 'macho', { fecha_nacimiento: '2026-10-01', chapeta_puesta: false });
    expect(await estadoDeChapeta(ternero.id, HOY)).toMatchObject({ estado: 'pendiente', dias: 17, quedan: 73, vencido: false });
    expect(await confirmarChapetaPuesta(ternero.id, '2026-09-30', TRABAJADOR, HOY)).toEqual({ ok: false, error: 'El animal nació el 1 de octubre de 2026' });
    expect(await confirmarChapetaPuesta(ternero.id, HOY, TRABAJADOR, HOY)).toEqual({ ok: true });
    expect(await estadoDeChapeta(ternero.id, HOY)).toMatchObject({ estado: 'puesta', autor: 'Daniel Ramos', colocacion: { fecha: HOY } });
    expect(await confirmarChapetaPuesta(ternero.id, HOY, PROPIETARIO, HOY)).toEqual({ ok: false, error: 'Ya se registró que tiene la chapeta puesta' });
    expect(await db.colocacion_chapeta.count()).toBe(1);
  });

  it('un animal registrado con chapeta no aplica; tampoco uno anterior a este campo', async () => {
    const adulta = await animal('Z930');
    expect(await estadoDeChapeta(adulta.id, HOY)).toEqual({ estado: 'no_aplica' });
    expect(await confirmarChapetaPuesta(adulta.id, HOY, PROPIETARIO, HOY)).toEqual({ ok: false, error: 'Este animal se registró con la chapeta puesta' });
    expect(idsConChapetaPendiente([{ id: 'x' }], [])).toEqual(new Set());
  });

  it('la fecha de colocación: válida, no futura, no anterior al nacimiento', () => {
    expect(errorDeFechaColocacion('2026-02-30', null, HOY)).toBe('Escriba una fecha válida');
    expect(errorDeFechaColocacion('2026-10-19', null, HOY)).toBe('La fecha no puede ser posterior a hoy');
    expect(errorDeFechaColocacion(HOY, '2026-10-01', HOY)).toBeNull();
  });

  it('el plazo vence después del día 90: a los 90 días aún no, al 91 sí', () => {
    const t = (nacimiento: string) => ({ id: nacimiento, codigo_chapeta: '1', fecha_nacimiento: nacimiento, chapeta_puesta: false });
    expect(ternerosSinChapeta([t('2026-07-20')], [], new Set(), HOY, 90)[0]).toMatchObject({ dias: 90, quedan: 0, vencido: false });
    expect(ternerosSinChapeta([t('2026-07-19')], [], new Set(), HOY, 90)[0]).toMatchObject({ dias: 91, quedan: -1, vencido: true });
  });

  it('Inicio: los vencidos primero, luego por días de nacido; los retirados no aparecen', () => {
    const t = (id: string, nacimiento: string) => ({ id, codigo_chapeta: id, fecha_nacimiento: nacimiento, chapeta_puesta: false });
    const lista = ternerosSinChapeta([t('1047', '2026-10-10'), t('1046', '2026-07-01'), t('1048', '2026-09-01'), t('1049', '2026-01-01')], [], new Set(['1049']), HOY, 90);
    expect(lista.map((x) => [x.codigo_chapeta, x.vencido, x.quedan])).toEqual([
      ['1046', true, -19],
      ['1048', false, 43],
      ['1047', false, 82],
    ]);
  });

  it('la cría de un parto aparece en Inicio y en el listado; con la colocación, deja de aparecer', async () => {
    const vaca = await animal('Z930');
    const r = await registrarParto(vaca.id, parto(), cria(), PROPIETARIO, undefined, HOY);
    if (!r.ok) throw new Error('debía registrarse');
    expect((await cargarTernerosSinChapeta(HOY)).map((x) => x.codigo_chapeta)).toEqual(['1046']);
    expect((await cargarListado()).find((x) => x.codigo_chapeta === '1046')?.chapetaPendiente).toBe(true);
    await confirmarChapetaPuesta(r.cria!.id, HOY, PROPIETARIO, HOY);
    expect(await cargarTernerosSinChapeta(HOY)).toEqual([]);
  });

  it('el registro normal de un nacido en el predio admite «aún no tiene la chapeta puesta»; uno comprado, no', async () => {
    const base = { ...formularioVacio(HOY), sexo: 'hembra' as const, fecha_nacimiento: '2026-10-01' };
    const nacido = await registrarAnimal({ ...base, chapeta: '2001', origen: 'nacido', sin_chapeta_puesta: true }, PROPIETARIO, HOY);
    const comprado = await registrarAnimal({ ...base, chapeta: '2002', origen: 'comprado', fecha_ingreso: '2026-10-05', nacimiento_comprado: 'desconocido', sin_chapeta_puesta: true }, PROPIETARIO, HOY);
    expect(nacido).toMatchObject({ ok: true, animal: { chapeta_puesta: false } });
    expect(comprado).toMatchObject({ ok: true, animal: { chapeta_puesta: true } });
  });
});

describe('PU-26 · 8. Control reproductivo (sección 8)', () => {
  const p = (id: string, fecha: string, resultado: 'cria_viva' | 'aborto' | 'cria_nacida_muerta' = 'cria_viva') => ({ id, fecha, resultado, cria_id: resultado === 'cria_viva' ? `c${id}` : null });

  it('intervalos con todos los resultados, promedio y descendencia solo con las vivas', () => {
    const c = controlReproductivo([p('03', '2026-04-15'), p('01', '2024-03-01'), p('02', '2025-03-20', 'aborto')]);
    expect(c.total).toBe(3);
    expect(c.tramos.map((t) => [t.parto.id, t.intervaloDias, t.intervaloMeses])).toEqual([
      ['01', null, null],
      ['02', 384, 12.6],
      ['03', 391, 12.8],
    ]);
    expect(c.promedioMeses).toBe(12.7);
    expect(c.descendencia).toEqual(['c01', 'c03']);
  });

  it('sin partos y con uno solo, sin intervalos (2a y 4a)', () => {
    expect(controlReproductivo([])).toMatchObject({ total: 0, promedioMeses: null });
    expect(controlReproductivo([p('01', '2026-01-01')])).toMatchObject({ total: 1, promedioMeses: null });
  });

  it('con las crías del teléfono', async () => {
    const vaca = await animal('Z930');
    await registrarParto(vaca.id, parto({ fecha: '2025-01-10' }), cria(), PROPIETARIO, undefined, HOY);
    await registrarParto(vaca.id, parto({ fecha: '2026-01-10', resultado: 'cria_nacida_muerta' }), null, PROPIETARIO, undefined, HOY);
    const control = await cargarControlReproductivo(vaca.id);
    expect(control.total).toBe(2);
    expect(control.crias.map((x) => x.codigo_chapeta)).toEqual(['1046']);
  });
});

describe('PU-26 · 9. Permisos (sección 3, Tabla 27)', () => {
  it('el trabajador registra partos y confirma chapetas, pero no consulta el control reproductivo', () => {
    expect(puedeUsar('trabajador', 'CU-10')).toBe(true);
    expect(puedeUsar('trabajador', 'CU-11')).toBe(false);
    expect(puedeUsar('propietario', 'CU-11')).toBe(true);
  });
});
