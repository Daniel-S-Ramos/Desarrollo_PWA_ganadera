import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import type { DatosNuevos, Sexo } from '../../dominio/tipos';
import { puedeUsar } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import {
  buscarPorChapeta,
  describirAnimalConChapeta,
  errorDeChapeta,
  fechaPorEdad,
  formularioModificado,
  formularioVacio,
  listarProgenitores,
  normalizarChapeta,
  registrarAnimal,
  validarFormulario,
  type FormularioAnimal,
} from './registroAnimal';

/**
 * PU-14 · Registro de un animal (CU-02, HU-01, RF-01, RF-03, RF-04, Tabla 31).
 * Especificación: docs/tecnica/13-registro-de-animal.md, sección 10
 */

const HOY = '2026-10-12';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

/** Un formulario válido de un animal nacido en el predio, con los cambios indicados. */
function formulario(cambios: Partial<FormularioAnimal> = {}): FormularioAnimal {
  return { ...formularioVacio(HOY), chapeta: '45', sexo: 'hembra', origen: 'nacido', fecha_nacimiento: '2026-01-15', ...cambios };
}

function comprado(cambios: Partial<FormularioAnimal> = {}): FormularioAnimal {
  return formulario({ origen: 'comprado', fecha_ingreso: '2026-09-01', nacimiento_comprado: 'edad', edad: '18', ...cambios });
}

function errores(f: FormularioAnimal) {
  const r = validarFormulario(f, HOY);
  return r.ok ? {} : r.errores;
}

function datos(f: FormularioAnimal) {
  const r = validarFormulario(f, HOY);
  if (!r.ok) throw new Error(`Formulario inválido: ${JSON.stringify(r.errores)}`);
  return r.datos;
}

/** Guarda un animal directamente, como lo haría la sincronización o un registro anterior. */
function animalExistente(codigo: string, sexo: Sexo = 'hembra', cambios: Partial<DatosNuevos<'animal'>> = {}) {
  return crear(
    'animal',
    {
      codigo_chapeta: codigo,
      sexo,
      fecha_nacimiento: '2021-03-04',
      fecha_nacimiento_exacta: true,
      fecha_ingreso: null,
      procedencia: null,
      peso_inicial: null,
      madre_id: null,
      madre_externa: null,
      padre_id: null,
      padre_externo: null,
      ...cambios,
    },
    PROPIETARIO.usuario_id,
  );
}

async function reiniciarBase() {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: PROPIETARIO.nombre, perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: TRABAJADOR.nombre, perfil: 'trabajador' },
  ]);
}

describe('PU-14 · 1. Chapeta: normalización y numeración del predio (sección 2.1)', () => {
  it.each([
    ['01', '1'],
    [' 0 45 ', '45'],
    ['0001', '1'],
    ['\t7\n', '7'],
    ['a01', 'A1'],
    ['A-1', 'A1'],
    ['b 015', 'B15'],
    ['10', '10'],
    ['A10', 'A10'],
    ['0', '0'],
  ])('«%s» → «%s»: sin espacios ni guiones, en mayúsculas, sin ceros a la izquierda', (escrito, esperado) => {
    expect(normalizarChapeta(escrito)).toBe(esperado);
  });

  it('01 y 1 son la misma chapeta; A01 y A1 también', () => {
    expect(normalizarChapeta('01')).toBe(normalizarChapeta('1'));
    expect(normalizarChapeta('A01')).toBe(normalizarChapeta('a1'));
  });

  it.each(['1', '9999', 'A1', 'A999', 'I5', 'N12', 'P1', 'Z999'])('admite «%s»', (chapeta) => {
    expect(errorDeChapeta(chapeta)).toBeNull();
  });

  const FORMATO = 'Use un número del 1 al 9999, o una letra seguida de un número del 1 al 999 (por ejemplo, A15)';
  it.each([
    ['', 'Escriba el número de la chapeta'],
    ['0', FORMATO],
    ['10000', FORMATO],
    ['A0', FORMATO],
    ['A1000', FORMATO],
    ['AB1', FORMATO],
    ['A', FORMATO],
    ['1A', FORMATO],
    ['Ñ1', FORMATO],
    ['É1', FORMATO],
    ['12/3', FORMATO],
    ['O1', 'La letra O no se usa en las chapetas del predio. ¿Quiso escribir un cero?'],
  ])('rechaza «%s»', (chapeta, mensaje) => {
    expect(errorDeChapeta(chapeta)).toBe(mensaje);
  });

  it('el formulario guarda la chapeta normalizada', () => {
    expect(datos(formulario({ chapeta: ' a-015 ' })).codigo_chapeta).toBe('A15');
  });
});

describe('PU-14 · 2. Origen (sección 3)', () => {
  it('nacido en el predio: fecha de nacimiento exacta, sin fecha de ingreso ni procedencia', () => {
    expect(datos(formulario({ fecha_ingreso: '2026-02-01', procedencia: 'Finca vecina' }))).toMatchObject({
      fecha_nacimiento: '2026-01-15',
      fecha_nacimiento_exacta: true,
      fecha_ingreso: null,
      procedencia: null,
    });
  });

  it('nacido en el predio con la fecha marcada como aproximada', () => {
    expect(datos(formulario({ fecha_nacimiento_exacta: false })).fecha_nacimiento_exacta).toBe(false);
  });

  it('nacido en el predio exige la fecha de nacimiento', () => {
    expect(errores(formulario({ fecha_nacimiento: '' })).fecha_nacimiento).toBe('Escriba una fecha válida');
  });

  it('comprado: exige la fecha de ingreso y guarda la procedencia sin espacios sobrantes', () => {
    expect(errores(comprado({ fecha_ingreso: '' })).fecha_ingreso).toBe('Escriba una fecha válida');
    expect(datos(comprado({ procedencia: '  Finca La Esperanza, Une ' }))).toMatchObject({
      fecha_ingreso: '2026-09-01',
      procedencia: 'Finca La Esperanza, Une',
    });
  });

  it('comprado con procedencia vacía: queda sin procedencia', () => {
    expect(datos(comprado({ procedencia: '   ' })).procedencia).toBeNull();
  });

  it('comprado con nacimiento desconocido: sin fecha de nacimiento y no exacta', () => {
    expect(datos(comprado({ nacimiento_comprado: 'desconocido' }))).toMatchObject({
      fecha_nacimiento: null,
      fecha_nacimiento_exacta: false,
    });
  });

  it('comprado con fecha de nacimiento: respeta si se marcó exacta o estimada', () => {
    const f = comprado({ nacimiento_comprado: 'fecha', fecha_nacimiento: '2025-04-01' });
    expect(datos({ ...f, fecha_nacimiento_exacta: false })).toMatchObject({ fecha_nacimiento: '2025-04-01', fecha_nacimiento_exacta: false });
    expect(datos({ ...f, fecha_nacimiento_exacta: true }).fecha_nacimiento_exacta).toBe(true);
  });

  it('sin origen elegido se pide elegirlo', () => {
    expect(errores(formulario({ origen: null })).origen).toBe('Indique si nació en el predio o fue comprado');
  });
});

describe('PU-14 · 3. Edad aproximada (sección 3.2)', () => {
  it.each([
    ['2026-10-12', 18, 'meses', '2025-04-12'],
    ['2026-10-12', 3, 'anios', '2023-10-12'],
    ['2026-10-12', 0, 'meses', '2026-10-12'],
    ['2026-03-31', 1, 'meses', '2026-02-28'],
    ['2024-03-31', 1, 'meses', '2024-02-29'],
    ['2026-01-15', 1, 'meses', '2025-12-15'],
    ['2026-10-12', 300, 'meses', '2001-10-12'],
  ] as const)('%s − %d %s = %s', (hoy, cantidad, unidad, esperado) => {
    expect(fechaPorEdad(hoy, cantidad, unidad)).toBe(esperado);
  });

  it('la edad se convierte en fecha estimada (exacta = false)', () => {
    expect(datos(comprado({ edad: '18', unidad_edad: 'meses' }))).toMatchObject({
      fecha_nacimiento: '2025-04-12',
      fecha_nacimiento_exacta: false,
    });
  });

  it.each(['', 'x', '-1', '1.5', '301'])('en meses rechaza «%s»', (edad) => {
    expect(errores(comprado({ edad })).edad).toBe('Escriba la edad en números enteros, hasta 300 meses o 25 años');
  });

  it('en años admite 25 y rechaza 26', () => {
    expect(errores(comprado({ edad: '25', unidad_edad: 'anios', fecha_ingreso: HOY })).edad).toBeUndefined();
    expect(errores(comprado({ edad: '26', unidad_edad: 'anios' })).edad).toBeDefined();
  });
});

describe('PU-14 · 4. Validaciones (sección 3.3)', () => {
  it('ninguna fecha puede ser posterior a hoy', () => {
    expect(errores(formulario({ fecha_nacimiento: '2026-10-13' })).fecha_nacimiento).toBe('La fecha no puede ser posterior a hoy');
    expect(errores(comprado({ fecha_ingreso: '2026-10-13' })).fecha_ingreso).toBe('La fecha no puede ser posterior a hoy');
    expect(errores(formulario({ fecha_nacimiento: HOY })).fecha_nacimiento).toBeUndefined();
  });

  it('una fecha inexistente se rechaza', () => {
    expect(errores(formulario({ fecha_nacimiento: '2026-02-30' })).fecha_nacimiento).toBe('Escriba una fecha válida');
  });

  it('el nacimiento no puede ser posterior al ingreso, con fecha o con edad', () => {
    const mensaje = 'La fecha de nacimiento no puede ser posterior a la de ingreso';
    expect(errores(comprado({ nacimiento_comprado: 'fecha', fecha_nacimiento: '2026-09-02' })).fecha_nacimiento).toBe(mensaje);
    // 2 meses de edad hoy: nació el 2026-08-12, antes del ingreso. 1 mes: 2026-09-12, después.
    expect(errores(comprado({ edad: '2' })).edad).toBeUndefined();
    expect(errores(comprado({ edad: '1' })).edad).toBe(mensaje);
    expect(errores(comprado({ nacimiento_comprado: 'fecha', fecha_nacimiento: '2026-09-01' })).fecha_nacimiento).toBeUndefined();
  });

  it('el sexo es obligatorio', () => {
    expect(errores(formulario({ sexo: null })).sexo).toBe('Indique si es macho o hembra');
  });

  it.each(['0', '0.5', '1500.1', 'abc', '-3'])('peso inicial «%s» fuera de rango', (peso) => {
    expect(errores(formulario({ peso_inicial: peso })).peso_inicial).toBe('El peso debe estar entre 1 y 1.500 kg');
  });

  it.each([
    ['1', 1],
    ['1500', 1500],
    ['32,5', 32.5],
    ['', null],
  ])('peso inicial «%s» → %s', (peso, esperado) => {
    expect(datos(formulario({ peso_inicial: peso })).peso_inicial).toBe(esperado);
  });

  it('devuelve todos los errores juntos', () => {
    expect(Object.keys(errores(formulario({ chapeta: '', sexo: null, fecha_nacimiento: '', peso_inicial: '0' }))).sort()).toEqual([
      'chapeta',
      'fecha_nacimiento',
      'peso_inicial',
      'sexo',
    ]);
  });

  it('textos de más de 100 caracteres se rechazan', () => {
    expect(errores(comprado({ procedencia: 'x'.repeat(101) })).procedencia).toBe('Hasta 100 caracteres');
    expect(errores(formulario({ forma_padre: 'externo', padre_externo: 'x'.repeat(101) })).padre_externo).toBe('Hasta 100 caracteres');
  });
});

describe('PU-14 · 5. Genealogía (sección 4)', () => {
  beforeEach(reiniciarBase);

  it('padre del predio o externo, nunca las dos cosas', () => {
    const delPredio = datos(formulario({ forma_padre: 'predio', padre_id: 'id-toro', padre_externo: 'Toro del vecino' }));
    expect(delPredio).toMatchObject({ padre_id: 'id-toro', padre_externo: null });
    const externo = datos(formulario({ forma_padre: 'externo', padre_id: 'id-toro', padre_externo: '  Toro del vecino ' }));
    expect(externo).toMatchObject({ padre_id: null, padre_externo: 'Toro del vecino' });
    const desconocido = datos(formulario({ forma_padre: 'desconocido', padre_id: 'id-toro', padre_externo: 'Toro' }));
    expect(desconocido).toMatchObject({ padre_id: null, padre_externo: null });
  });

  it('madre del predio o externa, nunca las dos cosas', () => {
    const delPredio = datos(formulario({ forma_madre: 'predio', madre_id: 'id-vaca', madre_externa: 'Vaca del vecino' }));
    expect(delPredio).toMatchObject({ madre_id: 'id-vaca', madre_externa: null });
    const externa = datos(formulario({ forma_madre: 'externo', madre_id: 'id-vaca', madre_externa: '  Vaca del vecino ' }));
    expect(externa).toMatchObject({ madre_id: null, madre_externa: 'Vaca del vecino' });
    const desconocida = datos(formulario({ forma_madre: 'desconocido', madre_id: 'id-vaca', madre_externa: 'Vaca' }));
    expect(desconocida).toMatchObject({ madre_id: null, madre_externa: null });
  });

  it('elegir «del predio» o «externo» exige el dato', () => {
    expect(errores(formulario({ forma_padre: 'predio' })).padre_id).toBe('Elija el padre');
    expect(errores(formulario({ forma_padre: 'externo', padre_externo: '  ' })).padre_externo).toBe(
      'Escriba el nombre o la referencia del reproductor',
    );
    expect(errores(formulario({ forma_madre: 'predio' })).madre_id).toBe('Elija la madre');
    expect(errores(formulario({ forma_madre: 'externo', madre_externa: '' })).madre_externa).toBe(
      'Escriba el nombre o la referencia de la madre',
    );
  });

  it('registra la madre hembra y el padre macho del predio', async () => {
    const madre = await animalExistente('100', 'hembra');
    const padre = await animalExistente('200', 'macho');
    const r = await registrarAnimal(
      formulario({ forma_madre: 'predio', madre_id: madre.id, forma_padre: 'predio', padre_id: padre.id }),
      PROPIETARIO,
      HOY,
    );
    expect(r.ok && r.animal).toMatchObject({ madre_id: madre.id, madre_externa: null, padre_id: padre.id, padre_externo: null });
  });

  it('registra madre y padre externos', async () => {
    const r = await registrarAnimal(
      formulario({ forma_madre: 'externo', madre_externa: 'Vaca de don Pedro', forma_padre: 'externo', padre_externo: 'Toro Brahman' }),
      PROPIETARIO,
      HOY,
    );
    expect(r.ok && r.animal).toMatchObject({ madre_id: null, madre_externa: 'Vaca de don Pedro', padre_id: null, padre_externo: 'Toro Brahman' });
  });

  it('rechaza una madre macho o un padre hembra, sin escribir nada', async () => {
    const macho = await animalExistente('200', 'macho');
    const hembra = await animalExistente('100', 'hembra');
    expect(await registrarAnimal(formulario({ forma_madre: 'predio', madre_id: macho.id }), PROPIETARIO, HOY)).toEqual({
      ok: false,
      errores: { madre_id: 'La madre debe ser una hembra' },
    });
    expect(await registrarAnimal(formulario({ forma_padre: 'predio', padre_id: hembra.id }), PROPIETARIO, HOY)).toEqual({
      ok: false,
      errores: { padre_id: 'El padre debe ser un macho' },
    });
    expect(await db.animal.count()).toBe(2);
    expect(await db.cola_operaciones.count()).toBe(2);
  });

  it('rechaza una madre o un padre que no existen en el teléfono', async () => {
    expect(await registrarAnimal(formulario({ forma_madre: 'predio', madre_id: uuidv7() }), PROPIETARIO, HOY)).toEqual({
      ok: false,
      errores: { madre_id: 'La madre elegida no está registrada en este teléfono' },
    });
    expect(await registrarAnimal(formulario({ forma_padre: 'predio', padre_id: uuidv7() }), PROPIETARIO, HOY)).toEqual({
      ok: false,
      errores: { padre_id: 'El padre elegido no está registrado en este teléfono' },
    });
    expect(await db.animal.count()).toBe(0);
  });

  it('la lista separa hembras y machos, ordena como números (9 antes que 10, letras al final) e incluye retirados', async () => {
    const vendida = await animalExistente('10', 'hembra');
    await animalExistente('A2', 'hembra');
    await animalExistente('9', 'hembra');
    await animalExistente('A10', 'hembra');
    await animalExistente('200', 'macho');
    await crear('salida', { animal_id: vendida.id, fecha: '2026-05-01', motivo: 'venta', peso_venta: 400, valor_venta: null, comprador: null, causa_muerte: null }, PROPIETARIO.usuario_id);

    const { hembras, machos } = await listarProgenitores();
    expect(hembras.map((h) => [h.codigo_chapeta, h.retirado])).toEqual([
      ['9', false],
      ['10', true],
      ['A2', false],
      ['A10', false],
    ]);
    expect(machos.map((m) => m.codigo_chapeta)).toEqual(['200']);
  });
});

describe('PU-14 · 6. Chapeta repetida (sección 2.3, Tabla 31)', () => {
  beforeEach(reiniciarBase);

  it('detecta la chapeta escrita con espacios o en minúsculas y devuelve el animal que la tiene', async () => {
    const existente = await animalExistente('A45');
    const encontrado = await buscarPorChapeta(' a 045');
    expect(encontrado).toEqual({ animal: existente, autor: 'José Ramos', retirado: false });
    expect(describirAnimalConChapeta(encontrado!)).toBe('Hembra · nacida el 4 de marzo de 2021 · registrada por José Ramos');
  });

  it('también la de un animal retirado', async () => {
    const vendido = await animalExistente('45', 'macho', { fecha_nacimiento: null, fecha_ingreso: '2025-06-10' });
    await crear('salida', { animal_id: vendido.id, fecha: '2026-05-01', motivo: 'venta', peso_venta: 400, valor_venta: null, comprador: null, causa_muerte: null }, PROPIETARIO.usuario_id);
    const encontrado = await buscarPorChapeta('45');
    expect(encontrado?.retirado).toBe(true);
    expect(describirAnimalConChapeta(encontrado!)).toBe('Macho · ingresó el 10 de junio de 2025 · registrado por José Ramos');
  });

  it('señala la fecha aproximada', async () => {
    await animalExistente('45', 'hembra', { fecha_nacimiento_exacta: false });
    expect(describirAnimalConChapeta((await buscarPorChapeta('45'))!)).toContain('nacida el 4 de marzo de 2021 (aproximada)');
  });

  it('una chapeta libre no encuentra nada', async () => {
    await animalExistente('45');
    expect(await buscarPorChapeta('450')).toBeNull();
    expect(await buscarPorChapeta('A45')).toBeNull();
  });

  it('registrar con una chapeta asignada no escribe nada y devuelve el animal existente', async () => {
    const existente = await animalExistente('45');
    const r = await registrarAnimal(formulario({ chapeta: ' 045 ' }), TRABAJADOR, HOY);
    expect(r).toEqual({ ok: false, chapetaAsignada: { animal: existente, autor: 'José Ramos', retirado: false } });
    expect(await db.animal.count()).toBe(1);
    expect(await db.cola_operaciones.count()).toBe(1);
  });
});

describe('PU-14 · 7. Verificación dentro de la transacción (sección 2.2)', () => {
  beforeEach(reiniciarBase);

  it('dos registros simultáneos con la misma chapeta: queda un animal y una entrada en la cola', async () => {
    const resultados = await Promise.all([
      registrarAnimal(formulario({ chapeta: '45' }), PROPIETARIO, HOY),
      registrarAnimal(formulario({ chapeta: '045 ' }), PROPIETARIO, HOY),
    ]);
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(resultados.filter((r) => !r.ok && 'chapetaAsignada' in r)).toHaveLength(1);
    expect(await db.animal.count()).toBe(1);
    expect(await db.cola_operaciones.count()).toBe(1);
  });
});

describe('PU-14 · 8. Registro correcto (CU-02 paso 8, RF-27)', () => {
  beforeEach(reiniciarBase);

  it('guarda el animal normalizado, pendiente, con autor, y su entrada en la cola', async () => {
    const r = await registrarAnimal(comprado({ chapeta: 'b-07', sexo: 'macho', peso_inicial: '180', procedencia: 'Une' }), TRABAJADOR, HOY);
    if (!r.ok) throw new Error('debía registrarse');
    expect(r.animal).toMatchObject({
      codigo_chapeta: 'B7',
      sexo: 'macho',
      fecha_nacimiento: '2025-04-12',
      fecha_nacimiento_exacta: false,
      fecha_ingreso: '2026-09-01',
      procedencia: 'Une',
      peso_inicial: 180,
      autor_id: TRABAJADOR.usuario_id,
      estado_sync: 'pendiente',
    });
    expect(await db.animal.get(r.animal.id)).toEqual(r.animal);
    expect(await db.cola_operaciones.toArray()).toMatchObject([{ entidad: 'animal', registro_id: r.animal.id, tipo: 'insertar' }]);
  });

  it('un formulario inválido no escribe nada', async () => {
    const r = await registrarAnimal(formulario({ sexo: null }), PROPIETARIO, HOY);
    expect(r).toEqual({ ok: false, errores: { sexo: 'Indique si es macho o hembra' } });
    expect(await db.animal.count()).toBe(0);
  });

  it('el formulario vacío no cuenta como modificado; escribir algo sí (CU-02, 7a)', () => {
    expect(formularioModificado(formularioVacio(HOY), HOY)).toBe(false);
    expect(formularioModificado({ ...formularioVacio(HOY), chapeta: '4' }, HOY)).toBe(true);
    expect(formularioModificado({ ...formularioVacio(HOY), sexo: 'macho' }, HOY)).toBe(true);
  });
});

describe('PU-14 · 9. Permisos (Tabla 27)', () => {
  beforeEach(reiniciarBase);

  it('ambos perfiles ven la opción y pueden registrar', async () => {
    expect(puedeUsar('propietario', 'CU-02')).toBe(true);
    expect(puedeUsar('trabajador', 'CU-02')).toBe(true);
    expect((await registrarAnimal(formulario({ chapeta: '1' }), PROPIETARIO, HOY)).ok).toBe(true);
    expect((await registrarAnimal(formulario({ chapeta: '2' }), TRABAJADOR, HOY)).ok).toBe(true);
  });
});
