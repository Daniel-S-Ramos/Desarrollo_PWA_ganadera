import { createClient } from '@supabase/supabase-js';
import type { ServicioRecuperacion } from '../sesion/recuperacion';

/**
 * El servicio de la recuperación de la contraseña (docs/tecnica/33-recuperar-contrasena.md, sección 4.1).
 *
 * Usa un cliente aparte que **no guarda sesión**: verificar el enlace crea una sesión temporal solo en memoria,
 * para cambiar la contraseña, y así no se reemplaza la sesión que la aplicación conserva en el teléfono (que puede
 * ser de otro usuario o tener registros pendientes). El cliente principal (servicios/supabase.ts) no cambia.
 */
export function crearServicioRecuperacion(): ServicioRecuperacion {
  const cliente = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'ganaderia-jr-recuperacion' },
  });
  return {
    async pedirEnlace(correo, destino) {
      const { error } = await cliente.auth.resetPasswordForEmail(correo, { redirectTo: destino });
      return { error: error ? { status: error.status, code: error.code } : null };
    },
    async verificarEnlace(tokenHash) {
      const { error } = await cliente.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
      return { error: error ? { status: error.status, code: error.code } : null };
    },
    async cambiarContrasena(contrasena) {
      const { error } = await cliente.auth.updateUser({ password: contrasena });
      return { error: error ? { status: error.status, code: error.code } : null };
    },
    async cerrar() {
      await cliente.auth.signOut({ scope: 'local' });
    },
  };
}
