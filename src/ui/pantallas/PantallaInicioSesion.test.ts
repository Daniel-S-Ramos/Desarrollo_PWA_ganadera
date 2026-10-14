import { describe, expect, it } from 'vitest';
import { mensajeDeFalla } from './PantallaInicioSesion';

/**
 * PU-08 (continuación) · El rechazo del reingreso explica el motivo y qué hacer
 * (decisión del 2026-10-07, docs/tecnica/07-codigo-de-desbloqueo.md, sección 6).
 */
describe('PU-08 · 7b. Aviso cuando otro usuario intenta ingresar con pendientes', () => {
  const anterior = { usuario_id: '0192', nombre: 'Daniel Ramos' };
  const falla = (pendientes: number, imagenes = 0) => ({ ok: false as const, motivo: 'otro_usuario_con_pendientes' as const, anterior, pendientes, imagenes });

  it('nombra al usuario anterior, la cantidad de pendientes y la acción a seguir', () => {
    expect(mensajeDeFalla(falla(3))).toBe(
      'Este teléfono tiene 3 registros de Daniel Ramos que aún no se han enviado. Solo Daniel Ramos puede ingresar hasta que se envíen, para que no se pierdan. Pídale que ingrese con su cuenta y sincronice.',
    );
  });

  it('usa el singular con un solo pendiente, también en el verbo', () => {
    expect(mensajeDeFalla(falla(1))).toContain('tiene 1 registro de Daniel Ramos que aún no se ha enviado');
  });

  it('cuenta las fotografías aparte (decisión tras PE-22)', () => {
    expect(mensajeDeFalla(falla(1, 1))).toContain('tiene 1 registro y 1 fotografía de Daniel Ramos que aún no se han enviado');
    expect(mensajeDeFalla(falla(0, 1))).toContain('tiene 1 fotografía de Daniel Ramos que aún no se ha enviado');
  });

  it('los demás motivos conservan su mensaje', () => {
    expect(mensajeDeFalla({ ok: false, motivo: 'credenciales' })).toBe('Correo o contraseña incorrectos.');
  });
});
