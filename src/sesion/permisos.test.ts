import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../datos/db';
import { contarPendientes } from '../datos/repositorio';
import { uuidv7 } from '../datos/uuidv7';
import { fechaDelPredio } from '../dominio/fechas';
import type { NombreTabla } from '../dominio/tipos';
import { crearAutorizado, PermisoDenegado, puedeCorregir, puedeCrear, puedeUsar, type CasoDeUso } from './permisos';
import type { Identidad } from './token';

/**
 * PU-09 · Gestor de permisos del teléfono (Tabla 27, apartados 3.9.2, 3.9.3 y 3.9.5).
 * Especificación: docs/tecnica/08-permisos.md, sección 10
 */

const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

describe('PU-09 · 1. Funciones según la Tabla 27', () => {
  // Columna «Trabajador» de la Tabla 27, transcrita caso por caso.
  const TABLA_27: [CasoDeUso, string, boolean][] = [
    ['CU-01', 'Iniciar sesión', true],
    ['CU-02', 'Registrar un animal', true],
    ['CU-03', 'Consultar la ficha de un animal', true],
    ['CU-04', 'Registrar un evento sanitario', true],
    ['CU-05', 'Consultar el historial sanitario', true],
    ['CU-06', 'Registrar la producción de leche', true],
    ['CU-07', 'Consultar y comparar la producción', false],
    ['CU-08', 'Registrar el pesaje de un animal', true],
    ['CU-09', 'Consultar la evolución del peso', true],
    ['CU-10', 'Registrar un parto y la genealogía', true],
    ['CU-11', 'Consultar el control reproductivo', false],
    ['CU-12', 'Asignar o modificar el destino productivo', false],
    ['CU-13', 'Registrar la salida y venta de un animal', false],
    ['CU-14', 'Consultar el consolidado económico', false],
    ['CU-15', 'Atender los recordatorios pendientes', true],
    ['CU-16', 'Sincronizar la información', true],
    ['CU-17', 'Corregir o anular un registro', true],
    ['CU-18', 'Consultar las correcciones y las anulaciones', false],
  ];

  it.each(TABLA_27)('%s %s · propietario: sí · trabajador: %s', (caso, _nombre, trabajador) => {
    expect(puedeUsar('propietario', caso)).toBe(true);
    expect(puedeUsar('trabajador', caso)).toBe(trabajador);
  });
});

describe('PU-09 · 2. Escritura según la sección 3', () => {
  const ESCRITURA: [NombreTabla, boolean][] = [
    ['animal', true],
    ['fotografia', true],
    ['evento_sanitario', true],
    ['medicamento', true],
    ['produccion_leche', true],
    ['pesaje', true],
    ['parto', true],
    ['correccion', true],
    ['destino_productivo', false],
    ['salida', false],
    ['movimiento_economico', false],
    ['recordatorio', false],
  ];

  it.each(ESCRITURA)('%s · propietario: sí · trabajador: %s', (tabla, trabajador) => {
    expect(puedeCrear('propietario', tabla)).toBe(true);
    expect(puedeCrear('trabajador', tabla)).toBe(trabajador);
  });
});

describe('PU-09 · 3 y 4. Corrección (3.9.5)', () => {
  const ahora = new Date('2026-10-07T15:00:00-05:00');
  const hoy = { creado_en: '2026-10-07T06:30:00-05:00' };
  const ayer = { creado_en: '2026-10-06T18:00:00-05:00' };
  const haceMeses = { creado_en: '2026-06-01T08:00:00-05:00' };

  it('el propietario corrige cualquier registro, de cualquier autor y fecha', () => {
    for (const registro of [hoy, ayer, haceMeses]) {
      expect(puedeCorregir(PROPIETARIO, registro, 'propietario', ahora)).toBe(true);
      expect(puedeCorregir(PROPIETARIO, registro, 'trabajador', ahora)).toBe(true);
    }
  });

  it('el trabajador corrige un registro de un trabajador del mismo día', () => {
    expect(puedeCorregir(TRABAJADOR, hoy, 'trabajador', ahora)).toBe(true);
  });

  it('el trabajador no corrige un registro del propietario, ni siquiera del mismo día', () => {
    expect(puedeCorregir(TRABAJADOR, hoy, 'propietario', ahora)).toBe(false);
  });

  it('el trabajador no corrige un registro de otro día', () => {
    expect(puedeCorregir(TRABAJADOR, ayer, 'trabajador', ahora)).toBe(false);
    expect(puedeCorregir(TRABAJADOR, haceMeses, 'trabajador', ahora)).toBe(false);
  });

  it('sin el perfil del autor (usuario desconocido), el trabajador no corrige', () => {
    expect(puedeCorregir(TRABAJADOR, hoy, undefined, ahora)).toBe(false);
  });

  it('el mismo día se calcula en la fecha del predio: un registro de las 11 p. m. y una corrección de la 1 a. m. son días distintos', () => {
    const once = { creado_en: '2026-10-06T23:00:00-05:00' };
    expect(puedeCorregir(TRABAJADOR, once, 'trabajador', new Date('2026-10-07T01:00:00-05:00'))).toBe(false);
    // En tiempo universal ambos instantes caen el 7 de octubre; en el predio, no.
    expect(fechaDelPredio(once.creado_en)).toBe('2026-10-06');
  });
});

describe('PU-09 · 5. Escritura autorizada', () => {
  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });

  it('el trabajador no puede registrar una salida: se rechaza sin escribir nada', async () => {
    await expect(
      crearAutorizado(TRABAJADOR, 'salida', {
        animal_id: uuidv7(),
        fecha: '2026-10-07',
        motivo: 'venta',
        peso_venta: 410,
        valor_venta: 3_200_000,
        comprador: null,
        causa_muerte: null,
      }),
    ).rejects.toBeInstanceOf(PermisoDenegado);
    expect(await db.salida.count()).toBe(0);
    expect(await contarPendientes()).toBe(0);
  });

  it('el trabajador sí puede registrar un pesaje, con su propia autoría', async () => {
    const pesaje = await crearAutorizado(TRABAJADOR, 'pesaje', { animal_id: uuidv7(), fecha: '2026-10-07', peso: 312, metodo: 'cinta' });
    expect(pesaje.autor_id).toBe(TRABAJADOR.usuario_id);
    expect(await contarPendientes()).toBe(1);
  });

  it('el propietario puede registrar una salida', async () => {
    const salida = await crearAutorizado(PROPIETARIO, 'salida', {
      animal_id: uuidv7(),
      fecha: '2026-10-07',
      motivo: 'muerte',
      peso_venta: null,
      valor_venta: null,
      comprador: null,
      causa_muerte: 'Timpanismo',
    });
    expect(salida.autor_id).toBe(PROPIETARIO.usuario_id);
  });
});
