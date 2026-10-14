/**
 * PI-05: ejecuta la prueba de las fotografías contra el servicio real y, pase lo que pase, borra
 * después los archivos de prueba del servicio de archivos y los registros de la cuenta de prueba.
 * Termina con el código de la prueba.
 * Uso: npm run prueba:pi-05
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';

const CARPETAS = 'node_modules/.cache/pi-05-carpetas.json';
rmSync(CARPETAS, { force: true });

const prueba = spawnSync('npx', ['vitest', 'run', '--config', 'vitest.pi.config.ts', 'src/sync/fotografias.pi.ts'], {
  stdio: 'inherit',
  shell: true,
});

// Los archivos no se pueden borrar con SQL: se borran con la CLI, por la API del servicio de archivos.
console.log('\nLimpieza de los archivos de prueba en el servicio de archivos…');
const carpetas = existsSync(CARPETAS) ? JSON.parse(readFileSync(CARPETAS, 'utf8')) : [];
for (const carpeta of carpetas) {
  const archivos = spawnSync('npx', ['supabase', 'storage', 'rm', '--linked', '--experimental', '--yes', '-r', `ss:///fotografias/${carpeta}`], {
    stdio: 'inherit',
    shell: true,
  });
  if (archivos.status !== 0) console.error(`✗ No se pudieron borrar los archivos de fotografias/${carpeta}.`);
}

console.log('\nLimpieza de los registros de la cuenta de prueba en el servicio…');
const limpieza = spawnSync('npx', ['supabase', 'db', 'query', '--linked', '-o', 'table', '-f', 'supabase/pruebas/limpiar-usuario-pruebas.sql'], {
  stdio: 'inherit',
  shell: true,
});
if (limpieza.status !== 0) console.error('✗ La limpieza falló: revise los registros de la cuenta de prueba en el servicio.');

process.exit(prueba.status ?? 1);
