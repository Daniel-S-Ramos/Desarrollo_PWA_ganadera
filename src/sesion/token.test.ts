import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../datos/db';
import { uuidv7 } from '../datos/uuidv7';
import { borrarSesionLocal, guardarSesionLocal, leerSesionLocal, restaurarSesionLocal } from './sesionLocal';
import { verificarToken } from './token';

/**
 * PU-07 · Verificación del token sin conexión y sesión local (apartado 3.9.1, RD-03).
 * Especificación: docs/tecnica/06-autenticacion.md, sección 11
 *
 * La prueba genera su propio par de claves ES256: la privada hace el papel del servicio de
 * autenticación, que firma, y la pública el de la clave que el teléfono guarda en el primer ingreso.
 */

const EMISOR = 'https://proyecto-de-prueba.supabase.co/auth/v1';
const USUARIO = uuidv7();

let privadaServicio: CryptoKey;
let publicaServicio: JWK;
let privadaAtacante: CryptoKey;

beforeAll(async () => {
  const servicio = await generateKeyPair('ES256', { extractable: true });
  privadaServicio = servicio.privateKey;
  publicaServicio = { ...(await exportJWK(servicio.publicKey)), kid: 'clave-del-servicio', alg: 'ES256' };
  privadaAtacante = (await generateKeyPair('ES256')).privateKey;
});

/** Emite un token como lo haría el servicio, con el contenido indicado. */
function emitir(contenido: Record<string, unknown>, opciones: { clave?: CryptoKey; kid?: string; vence?: string | number } = {}) {
  return new SignJWT({ perfil: 'trabajador', nombre: 'Trabajador de prueba', ...contenido })
    .setProtectedHeader({ alg: 'ES256', kid: opciones.kid ?? 'clave-del-servicio' })
    .setSubject(USUARIO)
    .setIssuer(EMISOR)
    .setIssuedAt()
    .setExpirationTime(opciones.vence ?? '1h')
    .sign(opciones.clave ?? privadaServicio);
}

/** Cambia el contenido de un token sin volver a firmarlo, como haría quien manipula el teléfono. */
function alterarContenido(token: string, cambios: Record<string, unknown>): string {
  const [encabezado, contenido, firma] = token.split('.') as [string, string, string];
  const original = JSON.parse(Buffer.from(contenido, 'base64url').toString('utf8')) as Record<string, unknown>;
  const alterado = Buffer.from(JSON.stringify({ ...original, ...cambios })).toString('base64url');
  return `${encabezado}.${alterado}.${firma}`;
}

describe('PU-07 · Verificación del token', () => {
  it('1. un token válido entrega el usuario, el perfil y el nombre', async () => {
    const resultado = await verificarToken(await emitir({}), publicaServicio, EMISOR);
    expect(resultado).toMatchObject({
      valido: true,
      identidad: { usuario_id: USUARIO, perfil: 'trabajador', nombre: 'Trabajador de prueba' },
    });
  });

  it('2. un token vencido se acepta: sin red el perfil sigue siendo válido (3.9.1)', async () => {
    const haceUnDia = Math.floor(Date.now() / 1000) - 86_400;
    const resultado = await verificarToken(await emitir({}, { vence: haceUnDia }), publicaServicio, EMISOR);
    expect(resultado.valido).toBe(true);
    if (resultado.valido) expect(resultado.identidad.vence_en).toBeLessThan(Date.now());
  });

  it('3. un token al que se le cambió el perfil de trabajador a propietario se rechaza', async () => {
    const alterado = alterarContenido(await emitir({}), { perfil: 'propietario' });
    expect(await verificarToken(alterado, publicaServicio, EMISOR)).toEqual({ valido: false, motivo: 'firma_invalida' });
  });

  it('4. un token firmado con otra clave se rechaza', async () => {
    const falso = await emitir({ perfil: 'propietario' }, { clave: privadaAtacante });
    expect(await verificarToken(falso, publicaServicio, EMISOR)).toEqual({ valido: false, motivo: 'firma_invalida' });
  });

  it('4b. un token con un identificador de clave distinto se rechaza antes de verificar', async () => {
    const otraClave = await emitir({}, { kid: 'clave-rotada' });
    expect(await verificarToken(otraClave, publicaServicio, EMISOR)).toEqual({ valido: false, motivo: 'clave_distinta' });
  });

  it('5. un token sin perfil se rechaza (cuenta sin fila en usuario)', async () => {
    expect(await verificarToken(await emitir({ perfil: undefined }), publicaServicio, EMISOR)).toEqual({
      valido: false,
      motivo: 'sin_perfil',
    });
  });

  it('6. un perfil distinto de propietario o trabajador se rechaza', async () => {
    expect(await verificarToken(await emitir({ perfil: 'administrador' }), publicaServicio, EMISOR)).toEqual({
      valido: false,
      motivo: 'perfil_invalido',
    });
  });

  it('7. un token con otro algoritmo se rechaza, incluido «alg: none»', async () => {
    const sinFirma = `${Buffer.from(JSON.stringify({ alg: 'none', kid: 'clave-del-servicio' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: USUARIO, perfil: 'propietario' })).toString('base64url')}.`;
    expect(await verificarToken(sinFirma, publicaServicio, EMISOR)).toEqual({ valido: false, motivo: 'algoritmo_no_admitido' });

    const conHS256 = await new SignJWT({ perfil: 'propietario' })
      .setProtectedHeader({ alg: 'HS256', kid: 'clave-del-servicio' })
      .setSubject(USUARIO)
      .sign(new TextEncoder().encode('secreto-cualquiera-de-al-menos-32-bytes!!'));
    expect(await verificarToken(conHS256, publicaServicio, EMISOR)).toEqual({ valido: false, motivo: 'algoritmo_no_admitido' });
  });

  it('7b. un token de otro emisor se rechaza', async () => {
    expect(await verificarToken(await emitir({}), publicaServicio, 'https://otro-proyecto.supabase.co/auth/v1')).toEqual({
      valido: false,
      motivo: 'emisor_distinto',
    });
  });

  it('7c. un texto que no es un token se rechaza sin errores', async () => {
    expect(await verificarToken('esto-no-es-un-token', publicaServicio)).toEqual({ valido: false, motivo: 'formato_invalido' });
  });
});

describe('PU-07 · 8. Sesión local', () => {
  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });

  it('se guarda un token válido y se recupera sin red con la clave guardada', async () => {
    const token = await emitir({ perfil: 'propietario', nombre: 'Propietario de prueba' });
    expect((await guardarSesionLocal(token, publicaServicio, EMISOR)).valido).toBe(true);

    expect(await restaurarSesionLocal()).toMatchObject({ usuario_id: USUARIO, perfil: 'propietario', nombre: 'Propietario de prueba' });
  });

  it('un token inválido no se guarda', async () => {
    const falso = await emitir({}, { clave: privadaAtacante });
    expect((await guardarSesionLocal(falso, publicaServicio, EMISOR)).valido).toBe(false);
    expect(await leerSesionLocal()).toBeUndefined();
  });

  it('la sesión guardada no incluye la contraseña ni ningún dato derivado de ella (3.9.1)', async () => {
    await guardarSesionLocal(await emitir({}), publicaServicio, EMISOR);
    const guardada = JSON.stringify(await leerSesionLocal());
    expect(Object.keys((await leerSesionLocal())!).sort()).toEqual(['clave_publica', 'emisor', 'identidad', 'token', 'verificada_en']);
    expect(guardada).not.toMatch(/contrase|password|clave_derivada/i);
  });

  it('si alguien altera el token guardado para cambiarse el perfil, la sesión se descarta al abrir', async () => {
    await guardarSesionLocal(await emitir({ perfil: 'trabajador' }), publicaServicio, EMISOR);

    // Manipulación directa de la base de datos del teléfono.
    const sesion = (await leerSesionLocal())!;
    await db.meta.put({ clave: 'sesion', valor: { ...sesion, token: alterarContenido(sesion.token, { perfil: 'propietario' }) } });

    expect(await restaurarSesionLocal()).toBeNull();
    expect(await leerSesionLocal()).toBeUndefined();
  });

  it('sin sesión guardada, restaurar devuelve vacío; borrar la elimina', async () => {
    expect(await restaurarSesionLocal()).toBeNull();
    await guardarSesionLocal(await emitir({}), publicaServicio, EMISOR);
    await borrarSesionLocal();
    expect(await restaurarSesionLocal()).toBeNull();
  });
});
