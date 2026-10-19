import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../datos/db';
import { crear } from '../datos/repositorio';
import { uuidv7 } from '../datos/uuidv7';
import { sincronizar, suscribirseAlMotor, type EstadoMotor } from '../sync/motor';
import { ServicioSimulado } from '../test/servicioSimulado';
import { describirBarra, describirDistintivo, haceCuanto, type SituacionSincronizacion } from './estadoSincronizacion';

/**
 * PU-12 · Indicador de sincronización (apartados 3.7.4 y 3.10.4.5, Tablas 22 y 31, RF-30).
 * Especificación: docs/tecnica/11-indicador-de-sincronizacion.md, sección 7
 */

const AHORA = new Date('2026-10-12T15:00:00-05:00');
const base: SituacionSincronizacion = {
  pendientes: 0,
  imagenes: 0,
  conflictos: 0,
  enLinea: true,
  sincronizando: false,
  ultima: null,
  ultimaEn: null,
  ahora: AHORA,
};
const subidaVacia = { estado: 'completa' as const, enviadas: 0, pendientes_por_dependencia: 0, conflictos: 0 };
const imagenesVacia = { estado: 'completa' as const, subidas: 0, esperando_fotografia: 0, rechazadas: 0 };
const principal = (s: Partial<SituacionSincronizacion>) => describirBarra({ ...base, ...s })[0]!;

describe('PU-12 · 1. Textos de la barra (sección 3)', () => {
  it('nada pendiente y la última sincronización terminó bien: «Todo enviado · Última sincronización: hace 5 min»', () => {
    expect(
      principal({ ultima: { estado: 'completa', subida: subidaVacia, bajada: { filas: 0 }, imagenes: imagenesVacia }, ultimaEn: new Date(AHORA.getTime() - 5 * 60_000) }),
    ).toEqual({ icono: '✓', texto: 'Todo enviado', detalle: 'Última sincronización: hace 5 min', tono: 'correcto' });
  });

  it('sincronizando en este momento: «Enviando…»', () => {
    expect(principal({ sincronizando: true, pendientes: 3 })).toEqual({ icono: '↻', texto: 'Enviando…', detalle: null, tono: 'informacion' });
  });

  it('pendientes con señal: «Se enviarán en unos segundos»', () => {
    expect(principal({ pendientes: 3 })).toEqual({
      icono: '⏳',
      texto: '3 registros pendientes de enviar',
      detalle: 'Se enviarán en unos segundos',
      tono: 'informacion',
    });
  });

  it('pendientes sin señal: «Sin conexión: se enviarán cuando vuelva la señal»', () => {
    expect(principal({ pendientes: 3, enLinea: false }).detalle).toBe('Sin conexión: se enviarán cuando vuelva la señal');
  });

  it('nada pendiente y sin señal: «Todo enviado · Sin conexión»', () => {
    expect(principal({ enLinea: false })).toMatchObject({ texto: 'Todo enviado', detalle: 'Sin conexión', tono: 'correcto' });
  });

  it('sesión vencida con pendientes: advertencia «Ingrese de nuevo con conexión para enviarlos»', () => {
    expect(principal({ pendientes: 3, ultima: { estado: 'sesion_vencida', subida: { ...subidaVacia, estado: 'sesion_vencida' } } })).toEqual({
      icono: '⚠',
      texto: '3 registros pendientes de enviar',
      detalle: 'Ingrese de nuevo con conexión para enviarlos',
      tono: 'advertencia',
    });
  });

  it('la descarga falló: «No se pudo descargar lo nuevo; se reintentará»', () => {
    expect(principal({ ultima: { estado: 'error_bajada', subida: subidaVacia, mensaje: 'timeout', imagenes: imagenesVacia } }).detalle).toBe(
      'No se pudo descargar lo nuevo; se reintentará',
    );
  });

  it('con conflictos se agrega una segunda línea de advertencia', () => {
    const lineas = describirBarra({ ...base, conflictos: 2 });
    expect(lineas).toHaveLength(2);
    expect(lineas[1]).toEqual({
      icono: '⚠',
      texto: '2 registros en conflicto',
      detalle: 'Los resuelve quien los registró o el propietario',
      tono: 'advertencia',
    });
  });
});

describe('PU-12 · 1b. Fotografías pendientes (documento 14, sección 8.2)', () => {
  it('se cuentan en una línea propia, después de la de los registros', () => {
    expect(describirBarra({ ...base, pendientes: 1, imagenes: 3 }).map((l) => [l.icono, l.texto, l.detalle])).toEqual([
      ['⏳', '1 registro pendiente de enviar', 'Se enviarán en unos segundos'],
      ['📷', '3 fotografías pendientes de enviar', 'Se enviarán después de los registros'],
    ]);
  });

  it('con solo fotografías pendientes no dice «Todo enviado»', () => {
    const lineas = describirBarra({ ...base, imagenes: 1 });
    expect(lineas.map((l) => l.texto)).toEqual(['1 fotografía pendiente de enviar']);
  });

  it('sin señal lo dice, con tono de información', () => {
    expect(principal({ imagenes: 2, enLinea: false })).toMatchObject({ detalle: 'Sin conexión: se enviarán cuando vuelva la señal', tono: 'informacion' });
  });

  it('si la subida de imágenes encontró la sesión vencida, advierte', () => {
    const ultima = { estado: 'completa' as const, subida: subidaVacia, bajada: { filas: 0 }, imagenes: { ...imagenesVacia, estado: 'sesion_vencida' as const } };
    expect(principal({ imagenes: 2, ultima })).toMatchObject({ icono: '⚠', detalle: 'Ingrese de nuevo con conexión para enviarlas', tono: 'advertencia' });
  });

  it('mientras sincroniza solo se muestra «Enviando…»', () => {
    expect(describirBarra({ ...base, sincronizando: true, imagenes: 2 }).map((l) => l.texto)).toEqual(['Enviando…']);
  });
});

describe('PU-12 · 2. Singular y plural', () => {
  it('1 registro pendiente de enviar · 1 registro en conflicto', () => {
    const lineas = describirBarra({ ...base, pendientes: 1, conflictos: 1 });
    expect(lineas.map((l) => l.texto)).toEqual(['1 registro pendiente de enviar', '1 registro en conflicto']);
  });
});

describe('PU-12 · 3. Registrar sin conexión no es un error (Tabla 31)', () => {
  it('con pendientes y sin red, el tono es de información y no de advertencia', () => {
    expect(principal({ pendientes: 5, enLinea: false }).tono).toBe('informacion');
  });
});

describe('PU-12 · 4. Distintivo por registro (Tabla 22)', () => {
  it.each([
    ['pendiente', { icono: '⏳', texto: 'Pendiente', tono: 'atencion', detalle: null }],
    ['en_transmision', { icono: '↻', texto: 'Enviando', tono: 'atencion', detalle: null }],
  ] as const)('%s', (estado, esperado) => {
    expect(describirDistintivo(estado)).toEqual(esperado);
  });

  it('conflicto: en rojo y con la causa que dejó el motor', () => {
    expect(describirDistintivo('conflicto', 'El código de chapeta ya está asignado a otro animal.')).toEqual({
      icono: '⚠',
      texto: 'En conflicto',
      tono: 'riesgo',
      detalle: 'El código de chapeta ya está asignado a otro animal.',
    });
  });

  it('sincronizado: el distintivo desaparece', () => {
    expect(describirDistintivo('sincronizado')).toBeNull();
  });
});

describe('PU-12 · 5. Tiempo transcurrido', () => {
  it.each([
    [20_000, 'hace unos segundos'],
    [5 * 60_000, 'hace 5 min'],
    [2 * 3_600_000, 'hace 2 h'],
    [26 * 3_600_000, 'hace 1 día'],
    [3 * 86_400_000, 'hace 3 días'],
  ])('%d ms → «%s»', (ms, esperado) => {
    expect(haceCuanto(new Date(AHORA.getTime() - ms), AHORA)).toBe(esperado);
  });
});

describe('PU-12 · 6. Avisos del motor', () => {
  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });

  it('el motor avisa al empezar y al terminar cada sincronización, con el resultado y la hora', async () => {
    const avisos: EstadoMotor[] = [];
    const dejar = suscribirseAlMotor((estado) => avisos.push(estado));
    await crear('pesaje', { animal_id: uuidv7(), fecha: '2026-10-12', peso: 300, metodo: 'cinta' }, uuidv7());

    await sincronizar(new ServicioSimulado());
    dejar();

    // Entre el primero y el último puede haber avisos de avance (documento 17, sección 4).
    const ultimo = avisos[avisos.length - 1]!;
    expect(avisos[0]!.sincronizando).toBe(true);
    expect(avisos.slice(0, -1).every((a) => a.sincronizando)).toBe(true);
    expect(ultimo).toMatchObject({ sincronizando: false, avance: null });
    expect(ultimo.ultima?.estado).toBe('completa');
    expect(ultimo.ultimaEn).toBeInstanceOf(Date);
  });
});
