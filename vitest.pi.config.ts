/**
 * Configuración de las pruebas de integración de extremo a extremo contra el servicio real (PI-04, PI-05).
 * Se ejecutan aparte de las automáticas (npm run prueba:pi-04 y prueba:pi-05) porque necesitan conexión y la cuenta
 * de prueba configurada en .env.local (PRUEBAS_CORREO y PRUEBAS_CONTRASENA).
 */
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.pi.ts'],
    testTimeout: 60_000,
    // Todas las variables de .env.local, no solo las VITE_: la contraseña de la cuenta de prueba
    // nunca llega al código de la aplicación.
    env: loadEnv(mode, process.cwd(), ''),
  },
}));
