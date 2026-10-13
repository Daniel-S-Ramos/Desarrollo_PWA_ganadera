/**
 * PI-04: ejecuta la prueba de extremo a extremo contra el servicio real y, pase lo que pase,
 * limpia después los registros de la cuenta de prueba. Termina con el código de la prueba.
 * Uso: npm run prueba:pi-04
 */
import { spawnSync } from 'node:child_process';

const prueba = spawnSync('npx', ['vitest', 'run', '--config', 'vitest.pi.config.ts', 'src/sync/sincronizacion.pi.ts'], {
  stdio: 'inherit',
  shell: true,
});

console.log('\nLimpieza de los registros de la cuenta de prueba en el servicio…');
const limpieza = spawnSync('npx', ['supabase', 'db', 'query', '--linked', '-o', 'table', '-f', 'supabase/pruebas/limpiar-usuario-pruebas.sql'], {
  stdio: 'inherit',
  shell: true,
});
if (limpieza.status !== 0) console.error('✗ La limpieza falló: revise los registros de la cuenta de prueba en el servicio.');

process.exit(prueba.status ?? 1);
