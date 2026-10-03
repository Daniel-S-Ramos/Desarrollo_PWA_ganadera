import { createClient } from '@supabase/supabase-js';

/**
 * Cliente del servicio remoto (Tabla 20). Es la única puerta de salida hacia Supabase:
 * autenticación, transmisión de los datos y envío de las fotografías pasan por aquí.
 *
 * La clave publicable viaja en el navegador por diseño. La seguridad no depende de que sea
 * secreta sino de las reglas a nivel de fila del servidor (apartado 3.9.3).
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const clavePublicable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !clavePublicable) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Copie .env.example como .env.local y complete los valores.',
  );
}

export const supabase = createClient(url, clavePublicable, {
  auth: {
    // La sesión se conserva en el dispositivo para que el perfil pueda leerse sin red (apartado 3.9.1).
    persistSession: true,
    autoRefreshToken: true,
    // La aplicación no recibe sesiones por enlace (no hay inicio de sesión por correo mágico ni OAuth).
    detectSessionInUrl: false,
  },
});
