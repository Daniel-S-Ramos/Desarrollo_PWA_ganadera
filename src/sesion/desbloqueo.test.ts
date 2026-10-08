import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../datos/db';
import { crear } from '../datos/repositorio';
import { uuidv7 } from '../datos/uuidv7';
import {
  bloquear,
  definirCodigo,
  hayCodigoDefinido,
  INTENTOS_PERMITIDOS,
  ITERACIONES,
  validarCodigo,
  verificarCodigo,
  verificarReingreso,
} from './desbloqueo';
import { leerSesionLocal } from './sesionLocal';

/**
 * PU-08 · Código de desbloqueo (apartado 3.9.1, RD-05, Tabla 31).
 * Especificación: docs/tecnica/07-codigo-de-desbloqueo.md, sección 9
 *
 * Las pruebas usan pocas iteraciones de PBKDF2 para ser rápidas; la cantidad es un parámetro y la
 * aplicación usa 600.000 (verificado en el criterio 8).
 */

const POCAS = 1_000;
const DANIEL = { usuario_id: uuidv7(), nombre: 'Daniel Ramos' };
const JOSE = { usuario_id: uuidv7(), nombre: 'José Ramos' };

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

/** Simula una sesión local abierta (los detalles del token no intervienen en estas pruebas). */
async function sesionDe(usuario: { usuario_id: string; nombre: string }) {
  await db.meta.put({
    clave: 'sesion',
    valor: {
      identidad: { ...usuario, perfil: 'trabajador', vence_en: 0 },
      token: 'token',
      clave_publica: {},
      emisor: 'emisor',
      verificada_en: new Date().toISOString(),
    },
  });
}

async function configuracionGuardada() {
  return (await db.meta.get('desbloqueo'))?.valor as Record<string, unknown> | undefined;
}

describe('PU-08 · 1 y 2. Formato y códigos triviales', () => {
  it.each(['2580', '73915', '486027'])('acepta «%s»', (codigo) => {
    expect(validarCodigo(codigo)).toBe('valido');
  });

  it.each(['258', '2580913', '25a0', '25 80', ''])('rechaza por formato «%s»', (codigo) => {
    expect(validarCodigo(codigo)).toBe('formato');
  });

  it.each(['0000', '11111', '999999', '1234', '23456', '6543', '987654'])('rechaza por trivial «%s»', (codigo) => {
    expect(validarCodigo(codigo)).toBe('trivial');
  });

  it('no se puede definir un código inválido', async () => {
    await expect(definirCodigo('1234', POCAS)).rejects.toThrow();
    expect(await hayCodigoDefinido()).toBe(false);
  });
});

describe('PU-08 · 3. Guardado', () => {
  it('lo guardado no contiene el código', async () => {
    await definirCodigo('2580', POCAS);
    const guardado = JSON.stringify(await configuracionGuardada());
    expect(guardado).not.toContain('2580');
    expect(Object.keys((await configuracionGuardada())!).sort()).toEqual(['derivado', 'intentos_fallidos', 'iteraciones', 'sal']);
  });

  it('dos definiciones del mismo código producen sales y derivados distintos', async () => {
    await definirCodigo('2580', POCAS);
    const primera = await configuracionGuardada();
    await definirCodigo('2580', POCAS);
    const segunda = await configuracionGuardada();
    expect(segunda!['sal']).not.toBe(primera!['sal']);
    expect(segunda!['derivado']).not.toBe(primera!['derivado']);
  });
});

describe('PU-08 · 4 y 5. Verificación', () => {
  it('el código correcto desbloquea', async () => {
    await definirCodigo('2580', POCAS);
    expect(await verificarCodigo('2580')).toEqual({ resultado: 'correcto' });
  });

  it('cada error suma un intento e informa cuántos quedan; el acierto reinicia el contador', async () => {
    await definirCodigo('2580', POCAS);
    expect(await verificarCodigo('0852')).toEqual({ resultado: 'incorrecto', restantes: 4 });
    expect(await verificarCodigo('2581')).toEqual({ resultado: 'incorrecto', restantes: 3 });
    expect(await verificarCodigo('2580')).toEqual({ resultado: 'correcto' });
    expect((await configuracionGuardada())!['intentos_fallidos']).toBe(0);
    expect(await verificarCodigo('9999')).toEqual({ resultado: 'incorrecto', restantes: 4 });
  });

  it('sin código definido lo informa', async () => {
    expect(await verificarCodigo('2580')).toEqual({ resultado: 'sin_codigo' });
  });
});

describe('PU-08 · 6. Bloqueo al quinto error', () => {
  it('se borran el código y la sesión local', async () => {
    await sesionDe(DANIEL);
    await definirCodigo('2580', POCAS);
    for (let i = 1; i < INTENTOS_PERMITIDOS; i++) {
      expect((await verificarCodigo('0000')).resultado).toBe('incorrecto');
    }
    expect(await verificarCodigo('0000')).toEqual({ resultado: 'bloqueado' });

    expect(await hayCodigoDefinido()).toBe(false);
    expect(await leerSesionLocal()).toBeUndefined();
    // El código correcto ya no sirve: hace falta un ingreso completo.
    expect(await verificarCodigo('2580')).toEqual({ resultado: 'sin_codigo' });
  });

  it('con pendientes se conserva quién era el dueño de la sesión; sin pendientes, no', async () => {
    await sesionDe(DANIEL);
    await crear('pesaje', { animal_id: uuidv7(), fecha: '2026-10-07', peso: 300, metodo: 'cinta' }, DANIEL.usuario_id);
    await bloquear();
    expect((await db.meta.get('usuario_anterior'))?.valor).toEqual(DANIEL);

    await db.meta.clear();
    await db.cola_operaciones.clear();
    await sesionDe(JOSE);
    await bloquear();
    expect(await db.meta.get('usuario_anterior')).toBeUndefined();
  });
});

describe('PU-08 · 7. Reingreso tras el bloqueo', () => {
  async function bloqueadaConPendientesDe(usuario: { usuario_id: string; nombre: string }, cantidad: number) {
    await sesionDe(usuario);
    for (let i = 0; i < cantidad; i++) {
      await crear('pesaje', { animal_id: uuidv7(), fecha: '2026-10-07', peso: 300 + i, metodo: 'cinta' }, usuario.usuario_id);
    }
    await bloquear();
  }

  it('con pendientes, otro usuario no puede ingresar y se le informa de quién son y cuántos', async () => {
    await bloqueadaConPendientesDe(DANIEL, 3);
    expect(await verificarReingreso(JOSE.usuario_id)).toEqual({ permitido: false, anterior: DANIEL, pendientes: 3 });
  });

  it('con pendientes, el mismo usuario sí puede ingresar', async () => {
    await bloqueadaConPendientesDe(DANIEL, 3);
    expect(await verificarReingreso(DANIEL.usuario_id)).toEqual({ permitido: true });
  });

  it('sin pendientes, cualquiera puede ingresar y se descarta el usuario anterior', async () => {
    await bloqueadaConPendientesDe(DANIEL, 1);
    await db.cola_operaciones.clear(); // los pendientes se enviaron
    expect(await verificarReingreso(JOSE.usuario_id)).toEqual({ permitido: true });
    expect(await db.meta.get('usuario_anterior')).toBeUndefined();
  });

  it('en un teléfono nuevo, sin usuario anterior, cualquiera puede ingresar', async () => {
    expect(await verificarReingreso(JOSE.usuario_id)).toEqual({ permitido: true });
  });
});

describe('PU-08 · 8. Iteraciones en uso', () => {
  it('la aplicación define el código con 600.000 iteraciones', async () => {
    expect(ITERACIONES).toBe(600_000);
    await definirCodigo('2580');
    expect((await configuracionGuardada())!['iteraciones']).toBe(600_000);
    expect(await verificarCodigo('2580')).toEqual({ resultado: 'correcto' });
  }, 30_000);
});
