import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import { compararConPromedio, leerLitros, promedioReciente, restarDias, validarOrdeno } from '../../dominio/leche';
import { soloVigentes, type CorreccionVigente } from '../../dominio/vigente';
import type { DatosNuevos, Sexo } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { consolidarFicha } from '../consulta/ficha';
import { cargarRonda, promedioDe, puedeReemplazar, registrarOrdeno, siguienteVaca } from './ronda';

/**
 * PU-23 · Ronda de ordeño (RF-10, CU-06, HU-04, apartado 3.8.6).
 * Especificación: docs/tecnica/22-ronda-de-ordeno.md, sección 10
 */

const HOY = '2026-10-14';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };
const OTRO_TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Pedro Gómez', vence_en: 0 };
/**
 * El instante de la prueba. Los registros se crean con la hora real, y la regla de 3.9.5 compara su día
 * con este: por eso es la hora real, no una fija (una fija dejó de coincidir al cambiar el día, 2026-10-15).
 */
const AHORA = new Date();
/** Dos días después: otro día del predio. */
const OTRO_DIA = new Date(AHORA.getTime() + 2 * 24 * 60 * 60 * 1000);

function datosAnimal(codigo: string, sexo: Sexo): DatosNuevos<'animal'> {
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
  };
}

/** Un animal con un destino. */
async function animal(codigo: string, destino: 'leche' | 'ceba' | null = 'leche', sexo: Sexo = 'hembra') {
  const a = await crear('animal', datosAnimal(codigo, sexo), PROPIETARIO.usuario_id);
  if (destino) await crear('destino_productivo', { animal_id: a.id, destino, desde: '2026-01-01' }, PROPIETARIO.usuario_id);
  return a;
}

/** Un ordeño guardado directamente, como si hubiera llegado de otro teléfono. */
const ordeno = (animalId: string, fecha: string, litros: number, autor = PROPIETARIO.usuario_id) => crear('produccion_leche', { animal_id: animalId, fecha, litros }, autor);

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: 'Daniel Ramos', perfil: 'trabajador' },
    { id: OTRO_TRABAJADOR.usuario_id, nombre: 'Pedro Gómez', perfil: 'trabajador' },
  ]);
});

describe('PU-23 · 1. Vacas de la ronda (sección 4)', () => {
  it('hembras con destino vigente leche, no retiradas, en orden de chapeta', async () => {
    await animal('Z932');
    await animal('Z930');
    await animal('Z931', 'ceba');
    await animal('Z933', null);
    await animal('Z934', 'leche', 'macho');
    const vendida = await animal('Z935');
    await crear('salida', { animal_id: vendida.id, fecha: '2026-10-01', motivo: 'venta', peso_venta: 400, valor_venta: 1, comprador: null, causa_muerte: null }, PROPIETARIO.usuario_id);
    expect((await cargarRonda(HOY)).map((v) => v.codigo_chapeta)).toEqual(['Z930', 'Z932']);
  });

  it('un cambio de destino la saca de la ronda', async () => {
    const a = await animal('Z930');
    await crear('destino_productivo', { animal_id: a.id, destino: 'venta', desde: '2026-10-01' }, PROPIETARIO.usuario_id);
    expect(await cargarRonda(HOY)).toEqual([]);
    expect(await registrarOrdeno(a.id, HOY, '10', PROPIETARIO, false, HOY)).toEqual({ ok: false, errores: { animal: 'Esta vaca ya no está en producción' } });
  });
});

describe('PU-23 · 2. Siguiente vaca (sección 5)', () => {
  it('la primera sin registro en la fecha; ronda completa cuando no queda ninguna', async () => {
    const [a, b] = [await animal('Z930'), await animal('Z931')];
    expect(siguienteVaca(await cargarRonda(HOY))?.codigo_chapeta).toBe('Z930');
    await registrarOrdeno(a.id, HOY, '12', PROPIETARIO, false, HOY);
    expect(siguienteVaca(await cargarRonda(HOY))?.codigo_chapeta).toBe('Z931');
    await registrarOrdeno(b.id, HOY, '9,5', PROPIETARIO, false, HOY);
    expect(siguienteVaca(await cargarRonda(HOY))).toBeNull();
    // Otra fecha empieza de nuevo.
    expect(siguienteVaca(await cargarRonda('2026-10-13'))?.codigo_chapeta).toBe('Z930');
  });

  it('cada vaca muestra sus litros y su autor en la fecha', async () => {
    const a = await animal('Z930');
    await ordeno(a.id, HOY, 12.5, TRABAJADOR.usuario_id);
    expect((await cargarRonda(HOY))[0]?.existente).toMatchObject({ litros: 12.5, autor: 'Daniel Ramos', perfilAutor: 'trabajador' });
  });
});

describe('PU-23 · 3. Litros (sección 6.1)', () => {
  it.each([
    ['0', 0],
    ['12', 12],
    ['12,5', 12.5],
    ['12.5', 12.5],
    [' 60 ', 60],
  ])('«%s» → %s', (texto, litros) => {
    expect(leerLitros(texto)).toBe(litros);
  });

  it.each(['', '-1', '60,1', '61', '12,55', 'doce', '1e1'])('«%s» no es un valor válido', (texto) => {
    expect(leerLitros(texto)).toBeNull();
  });

  it('mensajes; la fecha existe y no es futura', () => {
    expect(validarOrdeno('', HOY, HOY)).toEqual({ ok: false, errores: { litros: 'Escriba los litros' } });
    expect(validarOrdeno('70', '2026-10-15', HOY)).toEqual({
      ok: false,
      errores: { litros: 'Escriba los litros, de 0 a 60, con un decimal como máximo', fecha: 'La fecha no puede ser posterior a hoy' },
    });
    expect(validarOrdeno('5', '2026-02-30', HOY)).toEqual({ ok: false, errores: { fecha: 'Escriba una fecha válida' } });
  });

  it('el cero se registra: la vaca se ordeñó y no produjo', async () => {
    const a = await animal('Z930');
    expect(await registrarOrdeno(a.id, HOY, '0', PROPIETARIO, false, HOY)).toEqual({ ok: true, resultado: 'registrado' });
    expect((await db.produccion_leche.toArray())[0]).toMatchObject({ litros: 0, fecha: HOY, autor_id: PROPIETARIO.usuario_id, estado_sync: 'pendiente' });
  });
});

describe('PU-23 · 4. Promedio (sección 6.2)', () => {
  it('solo los días con registro dentro de los anteriores, sin la fecha', () => {
    const r = [
      { fecha: '2026-10-14', litros: 99 }, // la fecha misma: no cuenta
      { fecha: '2026-10-13', litros: 12 },
      { fecha: '2026-10-10', litros: 0 }, // el cero sí cuenta
      { fecha: '2026-10-07', litros: 9 }, // el límite: 7 días antes
      { fecha: '2026-10-06', litros: 50 }, // fuera de la ventana
    ];
    expect(promedioReciente(r, HOY, 7)).toEqual({ promedio: 7, registros: 3 });
    expect(promedioReciente([{ fecha: '2026-10-01', litros: 10 }], HOY, 7)).toBeNull();
    expect(restarDias('2026-03-01', 1)).toBe('2026-02-28');
  });

  it('con los valores vigentes y el parámetro del teléfono; sin él, 7 días', async () => {
    const a = await animal('Z930');
    const r = await ordeno(a.id, '2026-10-12', 10);
    await ordeno(a.id, '2026-10-04', 30);
    await crear('correccion', { entidad_afectada: 'produccion_leche', registro_id: r.id, tipo: 'correccion', campo: 'litros', valor_anterior: '10', valor_nuevo: '14', motivo: 'registro_duplicado', nota: null }, PROPIETARIO.usuario_id);
    expect(await promedioDe(a.id, HOY)).toEqual({ dias: 7, resultado: { promedio: 14, registros: 1 } });
    await db.parametro.put({ clave: 'dias_promedio_produccion', valor: 10, unidad: 'días', descripcion: 'Periodo' });
    expect(await promedioDe(a.id, HOY)).toEqual({ dias: 10, resultado: { promedio: 22, registros: 2 } });
  });
});

describe('PU-23 · 5. Diferencia en palabras (sección 6.3)', () => {
  it.each([
    [10.9, 10, 'Similar a su promedio', false],
    [11, 10, 'Similar a su promedio', false], // 10 % exacto
    [11.1, 10, 'Por encima de su promedio', false],
    [8.9, 10, 'Por debajo de su promedio', false],
    [7.5, 10, 'Por debajo de su promedio', false], // 25 % exacto
    [7.4, 10, 'Muy por debajo de su promedio', true],
    [0, 0, 'Similar a su promedio', false],
    [3, 0, 'Por encima de su promedio', false],
  ])('%s litros con promedio %s → %s', (litros, promedio, palabras, atencion) => {
    expect(compararConPromedio(litros, promedio)).toMatchObject({ palabras, atencion });
  });

  it('la diferencia en litros', () => {
    expect(compararConPromedio(9.5, 12).diferencia).toBe('2,5 litros menos que su promedio');
    expect(compararConPromedio(13, 12).diferencia).toBe('1 litro más que su promedio');
    expect(compararConPromedio(12, 12).diferencia).toBe('Igual a su promedio');
  });
});

describe('PU-23 · 6. Reemplazo como corrección (sección 7)', () => {
  it('confirmado: crea la corrección de litros con los dos valores y el motivo; no un segundo registro', async () => {
    const a = await animal('Z930');
    const r = await ordeno(a.id, HOY, 12.5, TRABAJADOR.usuario_id);
    expect(await registrarOrdeno(a.id, HOY, '13', PROPIETARIO, true, HOY, AHORA)).toEqual({ ok: true, resultado: 'reemplazado' });
    expect(await db.produccion_leche.count()).toBe(1);
    expect(await db.correccion.toArray()).toMatchObject([
      { entidad_afectada: 'produccion_leche', registro_id: r.id, tipo: 'correccion', campo: 'litros', valor_anterior: '12.5', valor_nuevo: '13', motivo: 'registro_duplicado', nota: null, autor_id: PROPIETARIO.usuario_id },
    ]);
    expect(await db.cola_operaciones.where('registro_id').equals((await db.correccion.toArray())[0]!.id).count()).toBe(1);
  });

  it('sin confirmar no escribe nada', async () => {
    const a = await animal('Z930');
    await ordeno(a.id, HOY, 12.5);
    expect(await registrarOrdeno(a.id, HOY, '13', PROPIETARIO, false, HOY, AHORA)).toEqual({ ok: false, requiereConfirmacion: true });
    expect(await db.correccion.count()).toBe(0);
  });

  it('el mismo valor vigente no escribe nada', async () => {
    const a = await animal('Z930');
    await ordeno(a.id, HOY, 12.5);
    expect(await registrarOrdeno(a.id, HOY, '12,5', PROPIETARIO, true, HOY, AHORA)).toEqual({ ok: true, resultado: 'sin_cambios' });
    expect(await db.correccion.count()).toBe(0);
  });

  it('el segundo reemplazo parte del valor vigente', async () => {
    const a = await animal('Z930');
    await ordeno(a.id, HOY, 10);
    await registrarOrdeno(a.id, HOY, '11', PROPIETARIO, true, HOY, AHORA);
    await registrarOrdeno(a.id, HOY, '12', PROPIETARIO, true, HOY, AHORA);
    expect((await db.correccion.toArray()).map((c) => [c.valor_anterior, c.valor_nuevo])).toEqual([
      ['10', '11'],
      ['11', '12'],
    ]);
  });
});

describe('PU-23 · 7. Quién puede reemplazar (sección 7, apartado 3.9.5)', () => {
  it('el trabajador no reemplaza un registro del propietario (CU-06, 3b)', async () => {
    const a = await animal('Z930');
    await ordeno(a.id, HOY, 12.5, PROPIETARIO.usuario_id);
    expect(await registrarOrdeno(a.id, HOY, '13', TRABAJADOR, true, HOY, AHORA)).toEqual({ ok: false, sinPermiso: true });
    expect(await db.correccion.count()).toBe(0);
  });

  it('el trabajador reemplaza el de otro trabajador del mismo día, no el de otro día', async () => {
    const a = await animal('Z930');
    const r = await ordeno(a.id, HOY, 12.5, OTRO_TRABAJADOR.usuario_id);
    expect(puedeReemplazar(TRABAJADOR, { registro: r, perfilAutor: 'trabajador' }, AHORA)).toBe(true);
    expect(puedeReemplazar(TRABAJADOR, { registro: r, perfilAutor: 'trabajador' }, OTRO_DIA)).toBe(false);
    expect(await registrarOrdeno(a.id, HOY, '13', TRABAJADOR, true, HOY, OTRO_DIA)).toEqual({ ok: false, sinPermiso: true });
    expect(await registrarOrdeno(a.id, HOY, '13', TRABAJADOR, true, HOY, AHORA)).toMatchObject({ ok: true });
  });

  it('el propietario reemplaza a cualquiera; sin autor en el teléfono, el trabajador no', async () => {
    const a = await animal('Z930');
    const r = await ordeno(a.id, HOY, 12.5, uuidv7());
    expect(puedeReemplazar(TRABAJADOR, { registro: r, perfilAutor: undefined }, AHORA)).toBe(false);
    expect(puedeReemplazar(PROPIETARIO, { registro: r, perfilAutor: undefined }, AHORA)).toBe(true);
  });

  it('el trabajador registra ordeños nuevos (Tabla 27: CU-06 con permisos de creación)', async () => {
    const a = await animal('Z930');
    expect(await registrarOrdeno(a.id, HOY, '10', TRABAJADOR, false, HOY, AHORA)).toEqual({ ok: true, resultado: 'registrado' });
  });
});

describe('PU-23 · 8. Valor vigente (sección 8)', () => {
  // Desde el paso 4.3a, la regla general del valor vigente (documento técnico 26, sección 6) sustituye a la de los litros.
  it('prevalece la corrección más reciente; a igual instante, la de mayor UUID', () => {
    const base = { entidad_afectada: 'produccion_leche' as const, registro_id: 'r1', tipo: 'correccion' as const, campo: 'litros', valor_anterior: null, motivo: 'registro_duplicado' as const, nota: null, autor_id: 'a' };
    const correcciones = [
      { ...base, id: '01', valor_nuevo: '11', creado_en: '2026-10-14T10:00:00Z' },
      { ...base, id: '03', valor_nuevo: '13', creado_en: '2026-10-14T09:00:00Z' },
      { ...base, id: '02', valor_nuevo: '12', creado_en: '2026-10-14T10:00:00Z' },
      { ...base, id: '04', valor_nuevo: '99', campo: 'fecha', creado_en: '2026-10-14T11:00:00Z' },
      { ...base, id: '05', valor_nuevo: '98', registro_id: 'r2', creado_en: '2026-10-14T11:00:00Z' },
    ] satisfies CorreccionVigente[];
    expect(soloVigentes('produccion_leche', [{ id: 'r1', litros: 10 }], correcciones)[0]?.litros).toBe(12);
    expect(soloVigentes('produccion_leche', [{ id: 'r1', litros: 10 }], [])[0]?.litros).toBe(10);
  });

  it('la ficha y la ronda muestran el valor vigente', async () => {
    const a = await animal('Z930');
    await ordeno(a.id, HOY, 10);
    await registrarOrdeno(a.id, HOY, '14,5', PROPIETARIO, true, HOY, AHORA);
    expect((await consolidarFicha(a.id))?.leche).toEqual({ litros: 14.5, fecha: HOY });
    expect((await cargarRonda(HOY))[0]?.existente?.litros).toBe(14.5);
  });
});

describe('PU-23 · 9. Un registro que llega entre la vista y el guardado (sección 7.1)', () => {
  it('la ronda no lo mostraba; al guardar sin confirmar se detecta y no se escribe', async () => {
    const a = await animal('Z930');
    expect((await cargarRonda(HOY))[0]?.existente).toBeNull();
    await ordeno(a.id, HOY, 11, TRABAJADOR.usuario_id);
    expect(await registrarOrdeno(a.id, HOY, '12', PROPIETARIO, false, HOY, AHORA)).toEqual({ ok: false, requiereConfirmacion: true });
    expect(await db.produccion_leche.count()).toBe(1);
    expect(await db.correccion.count()).toBe(0);
  });
});

/** Anula un ordeño, como desde Corregir o anular. */
const anularOrdeno = (id: string) =>
  crear('correccion', { entidad_afectada: 'produccion_leche', registro_id: id, tipo: 'anulacion', campo: null, valor_anterior: null, valor_nuevo: null, motivo: 'animal_equivocado', nota: null }, PROPIETARIO.usuario_id);

describe('PU-23 · 10. Un solo ordeño vigente por vaca y día (documento técnico 32)', () => {
  it('con el ordeño del día anulado, la vaca queda sin registro y es la siguiente pendiente', async () => {
    const a = await animal('Z1');
    const b = await animal('Z2');
    await ordeno(b.id, HOY, 9);
    await anularOrdeno((await ordeno(a.id, HOY, 10)).id);
    const vacas = await cargarRonda(HOY);
    expect(vacas.find((v) => v.animal_id === a.id)?.existente).toBeNull();
    expect(siguienteVaca(vacas)?.animal_id).toBe(a.id);
  });

  it('con el anterior anulado se registra un ordeño nuevo, que la ronda muestra', async () => {
    const a = await animal('Z1');
    await anularOrdeno((await ordeno(a.id, HOY, 10)).id);
    expect(await registrarOrdeno(a.id, HOY, '12', TRABAJADOR, false, HOY, AHORA)).toEqual({ ok: true, resultado: 'registrado' });
    expect(await db.produccion_leche.count()).toBe(2);
    const [vaca] = await cargarRonda(HOY);
    expect(vaca?.existente).toMatchObject({ litros: 12, autor: 'Daniel Ramos' });
  });

  it('con un anulado y uno vigente, la ronda muestra el vigente y el reemplazo se hace sobre él', async () => {
    const a = await animal('Z1');
    const viejo = await ordeno(a.id, HOY, 10);
    await anularOrdeno(viejo.id);
    const nuevo = await ordeno(a.id, HOY, 12);
    expect((await cargarRonda(HOY))[0]?.existente).toMatchObject({ litros: 12, registro: { id: nuevo.id } });
    expect(await registrarOrdeno(a.id, HOY, '13', PROPIETARIO, false, HOY, AHORA)).toEqual({ ok: false, requiereConfirmacion: true });
    expect(await registrarOrdeno(a.id, HOY, '13', PROPIETARIO, true, HOY, AHORA)).toEqual({ ok: true, resultado: 'reemplazado' });
    expect((await db.correccion.toArray()).filter((c) => c.tipo === 'correccion')).toEqual([expect.objectContaining({ registro_id: nuevo.id, valor_anterior: '12', valor_nuevo: '13' })]);
    expect(await db.produccion_leche.count()).toBe(2);
  });
});
