import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * PU-35 · 8. La sesión de la aplicación no se toca (docs/tecnica/33-recuperar-contrasena.md, sección 4.1).
 * Se simula la librería del servicio para ver con qué opciones se crea el cliente y qué llama.
 */

const auth = {
  resetPasswordForEmail: vi.fn(async () => ({ error: null })),
  verifyOtp: vi.fn(async () => ({ error: { status: 403, code: 'otp_expired' } })),
  updateUser: vi.fn(async () => ({ error: null })),
  signOut: vi.fn(async () => ({ error: null })),
};
const createClient = vi.fn((..._args: unknown[]) => ({ auth }));
vi.mock('@supabase/supabase-js', () => ({ createClient: (...args: unknown[]) => createClient(...args) }));

const { crearServicioRecuperacion } = await import('./recuperacionSupabase');

beforeEach(() => {
  createClient.mockClear();
  for (const f of Object.values(auth)) f.mockClear();
});

describe('PU-35 · 8. El cliente de la recuperación', () => {
  it('no guarda sesión, no la renueva, no la lee de la dirección y usa su propio almacenamiento', () => {
    crearServicioRecuperacion();
    const opciones = createClient.mock.calls[0]![2] as { auth: Record<string, unknown> };
    expect(opciones.auth).toMatchObject({ persistSession: false, autoRefreshToken: false, detectSessionInUrl: false });
    expect(opciones.auth['storageKey']).toBe('ganaderia-jr-recuperacion');
  });

  it('pide el enlace con su destino, verifica el código de un solo uso y cierra solo su sesión', async () => {
    const s = crearServicioRecuperacion();
    await s.pedirEnlace('jose@correo.com', 'https://app/restablecer-contrasena');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('jose@correo.com', { redirectTo: 'https://app/restablecer-contrasena' });
    expect(await s.verificarEnlace('abc')).toEqual({ error: { status: 403, code: 'otp_expired' } });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'recovery' });
    await s.cambiarContrasena('nueva123');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'nueva123' });
    await s.cerrar();
    // «local»: cierra la sesión temporal en memoria sin revocar la que la aplicación tiene en el teléfono.
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
