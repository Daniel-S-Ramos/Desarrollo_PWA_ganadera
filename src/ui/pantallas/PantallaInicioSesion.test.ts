import { describe, expect, it } from 'vitest';
import { mensajeDeFalla } from './PantallaInicioSesion';

/**
 * PU-08 (continuación) · El rechazo del reingreso explica el motivo y qué hacer
 * (decisión del 2026-10-07, docs/tecnica/07-codigo-de-desbloqueo.md, sección 6).
 */
describe('PU-08 · 7b. Aviso cuando otro usuario intenta ingresar con pendientes', () => {
  const anterior = { usuario_id: '0192', nombre: 'Daniel Ramos' };

  it('nombra al usuario anterior, la cantidad de pendientes y la acción a seguir', () => {
    const texto = mensajeDeFalla({ ok: false, motivo: 'otro_usuario_con_pendientes', anterior, pendientes: 3 });
    expect(texto).toBe(
      'Este teléfono tiene 3 registros de Daniel Ramos que aún no se han enviado. Solo Daniel Ramos puede ingresar hasta que se envíen, para que no se pierdan. Pídale que ingrese con su cuenta y sincronice.',
    );
  });

  it('usa el singular con un solo pendiente', () => {
    const texto = mensajeDeFalla({ ok: false, motivo: 'otro_usuario_con_pendientes', anterior, pendientes: 1 });
    expect(texto).toContain('tiene 1 registro de Daniel Ramos');
  });

  it('los demás motivos conservan su mensaje', () => {
    expect(mensajeDeFalla({ ok: false, motivo: 'credenciales' })).toBe('Correo o contraseña incorrectos.');
  });
});
