import { describe, expect, it } from 'vitest';
import {
  guardarNuevaContrasena,
  leerCorreo,
  leerEnlace,
  MENSAJES_RECUPERACION,
  pedirEnlace,
  RUTA_NUEVA_CONTRASENA,
  validarNuevaContrasena,
  type ErrorServicio,
  type ServicioRecuperacion,
} from './recuperacion';

/**
 * PU-35 · Recuperación de la contraseña (RF-24, CU-01, HU-06; hallazgo del desarrollo).
 * Especificación: docs/tecnica/33-recuperar-contrasena.md, sección 7
 */

const ORIGEN = 'https://desarrollo-pwa-ganadera.vercel.app';

/** Un servicio simulado que anota las llamadas y responde lo que se le indique. */
function servicio(respuestas: { pedir?: ErrorServicio; verificar?: ErrorServicio; cambiar?: ErrorServicio } = {}) {
  const llamadas: string[] = [];
  const s: ServicioRecuperacion & { llamadas: string[]; pedidos: [string, string][] } = {
    llamadas,
    pedidos: [],
    async pedirEnlace(correo, destino) {
      llamadas.push('pedir');
      s.pedidos.push([correo, destino]);
      return { error: respuestas.pedir ?? null };
    },
    async verificarEnlace(tokenHash) {
      llamadas.push(`verificar:${tokenHash}`);
      return { error: respuestas.verificar ?? null };
    },
    async cambiarContrasena(contrasena) {
      llamadas.push(`cambiar:${contrasena}`);
      return { error: respuestas.cambiar ?? null };
    },
    async cerrar() {
      llamadas.push('cerrar');
    },
  };
  return s;
}

describe('PU-35 · 1. El correo (sección 3)', () => {
  it('vacío o sin forma de correo se rechaza; con espacios alrededor se acepta recortado', () => {
    expect(leerCorreo('')).toBeNull();
    expect(leerCorreo('   ')).toBeNull();
    expect(leerCorreo('jose')).toBeNull();
    expect(leerCorreo('jose@finca')).toBeNull();
    expect(leerCorreo('jose @finca.com')).toBeNull();
    expect(leerCorreo('  jose.ramos@correo.com ')).toBe('jose.ramos@correo.com');
  });
});

describe('PU-35 · 2 y 3. Pedir el enlace (sección 3)', () => {
  it('sin conexión no se llama al servicio', async () => {
    const s = servicio();
    expect(await pedirEnlace('jose@correo.com', false, ORIGEN, s)).toEqual({ ok: false, mensaje: MENSAJES_RECUPERACION.sinConexion });
    expect(s.llamadas).toEqual([]);
  });

  it('un correo inválido no se envía', async () => {
    const s = servicio();
    expect(await pedirEnlace('jose', true, ORIGEN, s)).toEqual({ ok: false, mensaje: MENSAJES_RECUPERACION.correoInvalido });
    expect(s.llamadas).toEqual([]);
  });

  it('se pide con el correo recortado y la dirección de la contraseña nueva; el mensaje no revela si la cuenta existe', async () => {
    const s = servicio();
    expect(await pedirEnlace('  jose@correo.com ', true, ORIGEN, s)).toEqual({ ok: true, mensaje: MENSAJES_RECUPERACION.enviado });
    expect(s.pedidos).toEqual([['jose@correo.com', `${ORIGEN}${RUTA_NUEVA_CONTRASENA}`]]);
    expect(RUTA_NUEVA_CONTRASENA).toBe('/restablecer-contrasena');
    // El servicio responde igual para un correo sin cuenta: el mismo mensaje.
    expect(await pedirEnlace('nadie@correo.com', true, ORIGEN, servicio())).toEqual({ ok: true, mensaje: MENSAJES_RECUPERACION.enviado });
    expect(MENSAJES_RECUPERACION.enviado).toMatch(/correo no deseado/);
    expect(MENSAJES_RECUPERACION.enviado).toMatch(/administrador del sistema/);
  });
});

describe('PU-35 · 4. Límite de envíos y otras fallas (sección 3)', () => {
  it('el límite del servicio (429), la red caída a mitad y cualquier otra falla', async () => {
    expect(await pedirEnlace('jose@correo.com', true, ORIGEN, servicio({ pedir: { status: 429, code: 'over_email_send_rate_limit' } }))).toEqual({
      ok: false,
      mensaje: MENSAJES_RECUPERACION.limite,
    });
    expect(await pedirEnlace('jose@correo.com', true, ORIGEN, servicio({ pedir: { status: 0 } }))).toEqual({ ok: false, mensaje: MENSAJES_RECUPERACION.sinConexion });
    expect(await pedirEnlace('jose@correo.com', true, ORIGEN, servicio({ pedir: {} }))).toEqual({ ok: false, mensaje: MENSAJES_RECUPERACION.sinConexion });
    expect(await pedirEnlace('jose@correo.com', true, ORIGEN, servicio({ pedir: { status: 500 } }))).toEqual({ ok: false, mensaje: MENSAJES_RECUPERACION.errorEnvio });
  });
});

describe('PU-35 · 5. El enlace del correo (sección 4.1)', () => {
  it('token_hash con type=recovery; si falta o es de otro tipo, no hay enlace', () => {
    expect(leerEnlace('?token_hash=abc123&type=recovery')).toBe('abc123');
    expect(leerEnlace('?type=recovery&token_hash=abc123')).toBe('abc123');
    expect(leerEnlace('?token_hash=abc123')).toBeNull();
    expect(leerEnlace('?token_hash=abc123&type=signup')).toBeNull();
    expect(leerEnlace('?type=recovery')).toBeNull();
    expect(leerEnlace('')).toBeNull();
  });
});

describe('PU-35 · 6. La contraseña nueva (sección 4)', () => {
  it('menos de 6 caracteres y no coincidentes se rechazan', () => {
    expect(validarNuevaContrasena('12345', '12345')).toBe(MENSAJES_RECUPERACION.corta);
    expect(validarNuevaContrasena('123456', '123457')).toBe(MENSAJES_RECUPERACION.noCoinciden);
    expect(validarNuevaContrasena('123456', '123456')).toBeNull();
  });

  it('válida: primero se verifica el enlace, después se cambia y al final se cierra la sesión temporal', async () => {
    const s = servicio();
    expect(await guardarNuevaContrasena('abc', 'nueva123', 'nueva123', true, s)).toEqual({ ok: true, mensaje: MENSAJES_RECUPERACION.guardada });
    expect(s.llamadas).toEqual(['verificar:abc', 'cambiar:nueva123', 'cerrar']);
  });

  it('inválida o sin conexión no llama al servicio', async () => {
    const corta = servicio();
    expect(await guardarNuevaContrasena('abc', '123', '123', true, corta)).toEqual({ ok: false, mensaje: MENSAJES_RECUPERACION.corta, vencido: false });
    expect(corta.llamadas).toEqual([]);
    const sinRed = servicio();
    expect(await guardarNuevaContrasena('abc', 'nueva123', 'nueva123', false, sinRed)).toEqual({ ok: false, mensaje: MENSAJES_RECUPERACION.sinConexion, vencido: false });
    expect(sinRed.llamadas).toEqual([]);
  });

  it('la misma contraseña anterior, una débil y otra falla al cambiarla', async () => {
    expect(await guardarNuevaContrasena('abc', 'nueva123', 'nueva123', true, servicio({ cambiar: { status: 422, code: 'same_password' } }))).toMatchObject({ mensaje: MENSAJES_RECUPERACION.igual });
    expect(await guardarNuevaContrasena('abc', 'nueva123', 'nueva123', true, servicio({ cambiar: { status: 422, code: 'weak_password' } }))).toMatchObject({ mensaje: MENSAJES_RECUPERACION.corta });
    const otra = servicio({ cambiar: { status: 500 } });
    expect(await guardarNuevaContrasena('abc', 'nueva123', 'nueva123', true, otra)).toEqual({ ok: false, mensaje: MENSAJES_RECUPERACION.errorGuardar, vencido: false });
    expect(otra.llamadas.at(-1)).toBe('cerrar');
  });
});

describe('PU-35 · 7. Enlace vencido o ya usado (sección 4)', () => {
  it('sin enlace, o con el enlace rechazado, no se cambia la contraseña', async () => {
    const sin = servicio();
    expect(await guardarNuevaContrasena(null, 'nueva123', 'nueva123', true, sin)).toEqual({ ok: false, mensaje: MENSAJES_RECUPERACION.enlaceVencido, vencido: true });
    expect(sin.llamadas).toEqual([]);
    const vencido = servicio({ verificar: { status: 403, code: 'otp_expired' } });
    expect(await guardarNuevaContrasena('abc', 'nueva123', 'nueva123', true, vencido)).toEqual({ ok: false, mensaje: MENSAJES_RECUPERACION.enlaceVencido, vencido: true });
    expect(vencido.llamadas).toEqual(['verificar:abc', 'cerrar']);
  });

  it('si la red se cae al verificar, no se da el enlace por vencido', async () => {
    expect(await guardarNuevaContrasena('abc', 'nueva123', 'nueva123', true, servicio({ verificar: { status: 0 } }))).toEqual({
      ok: false,
      mensaje: MENSAJES_RECUPERACION.sinConexion,
      vencido: false,
    });
  });
});
