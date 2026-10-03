/**
 * Verifica que la aplicación puede comunicarse con el proyecto de Supabase usando los
 * valores de .env.local. No modifica nada: solo consulta la configuración pública del
 * servicio de autenticación.
 *
 * Uso: npm run verificar:supabase
 */

const url = process.env.VITE_SUPABASE_URL;
const clave = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !clave) {
  console.error('✗ Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local');
  process.exit(1);
}

if (clave.startsWith('sb_secret_')) {
  console.error('✗ La clave es SECRETA (sb_secret_). En la aplicación solo va la clave publicable (sb_publishable_).');
  process.exit(1);
}

try {
  const respuesta = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: clave } });
  if (!respuesta.ok) {
    console.error(`✗ Supabase respondió ${respuesta.status} ${respuesta.statusText}. Revise la URL y la clave.`);
    process.exit(1);
  }
  const ajustes = await respuesta.json();
  console.log('✓ Conexión con Supabase correcta');
  console.log(`  Proyecto: ${new URL(url).hostname}`);
  console.log(`  Ingreso con correo habilitado: ${ajustes.external?.email ? 'sí' : 'no'}`);
  console.log(`  Registro abierto de usuarios: ${ajustes.disable_signup ? 'no' : 'sí'}`);
} catch (error) {
  console.error(`✗ No fue posible conectar con ${url}: ${error.message}`);
  process.exit(1);
}
