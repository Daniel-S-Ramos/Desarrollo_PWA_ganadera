/// <reference types="vite/client" />

/** Variables de entorno que la aplicación espera encontrar en .env.local. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Administrador del sistema, para la ayuda de «¿Olvidó su contraseña?» (documento técnico 33). Opcionales. */
  readonly VITE_ADMIN_NOMBRE?: string;
  readonly VITE_ADMIN_TELEFONO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
