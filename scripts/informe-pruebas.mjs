/**
 * Ejecuta las pruebas automáticas y genera un informe de resultados en Markdown dentro de
 * docs/pruebas/resultados/, como evidencia versionada de cada ejecución (apartado 1.6.3.11).
 *
 * Uso: npm run test:informe
 *
 * El informe registra la fecha, el commit evaluado, el resumen y el resultado de cada prueba.
 * El proceso termina con el mismo código que Vitest, de modo que una falla sigue siendo una falla.
 */

import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

const RAIZ = process.cwd();
const JSON_TEMPORAL = 'node_modules/.cache/vitest-resultados.json';
const CARPETA_INFORMES = 'docs/pruebas/resultados';

mkdirSync('node_modules/.cache', { recursive: true });
rmSync(JSON_TEMPORAL, { force: true });

// 1. Ejecutar Vitest con dos salidas: la normal en la terminal y una en JSON para el informe.
const ejecucion = spawnSync(
  'npx',
  ['vitest', 'run', '--reporter=default', '--reporter=json', `--outputFile.json=${JSON_TEMPORAL}`],
  { stdio: 'inherit', shell: true },
);

let resultados;
try {
  resultados = JSON.parse(readFileSync(JSON_TEMPORAL, 'utf8'));
} catch {
  console.error('\n✗ Vitest no produjo resultados; no se generó el informe.');
  process.exit(ejecucion.status ?? 1);
}

// 2. Datos de contexto: fecha local del predio, commit y versiones.
const ahora = new Date(resultados.startTime);
const partes = Object.fromEntries(
  new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(ahora)
    .map((p) => [p.type, p.value]),
);
const fecha = `${partes.year}-${partes.month}-${partes.day}`;
const hora = `${partes.hour}:${partes.minute}:${partes.second}`;

const git = (comando) => {
  try {
    return execSync(`git ${comando}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const commit = git('rev-parse --short HEAD') || 'sin commit';
const hayCambiosSinCommit = git('status --porcelain') !== '';
const versionVitest = JSON.parse(readFileSync('node_modules/vitest/package.json', 'utf8')).version;

// 3. Construcción del informe.
const ICONO = { passed: '✅', failed: '❌', skipped: '⏭️', pending: '⏭️', todo: '📝' };
const TEXTO = { passed: 'Aprobada', failed: 'Fallida', skipped: 'Omitida', pending: 'Omitida', todo: 'Pendiente' };

const lineas = [];
lineas.push(`# Informe de pruebas automáticas · ${fecha} ${hora}`);
lineas.push('');
lineas.push('Generado automáticamente por `npm run test:informe`. No editar a mano.');
lineas.push('');
lineas.push('| Campo | Valor |');
lineas.push('|---|---|');
lineas.push(`| Fecha y hora | ${fecha} ${hora} (hora de Colombia) |`);
lineas.push(`| Commit evaluado | \`${commit}\`${hayCambiosSinCommit ? ' con cambios aún sin commit' : ''} |`);
lineas.push(`| Herramienta | Vitest ${versionVitest} · Node.js ${process.versions.node} |`);
lineas.push(`| Resultado global | ${resultados.success ? '✅ Todas las pruebas aprobadas' : '❌ Hay pruebas fallidas'} |`);
lineas.push('');
lineas.push('## Resumen');
lineas.push('');
lineas.push('| Total | Aprobadas | Fallidas | Omitidas |');
lineas.push('|---|---|---|---|');
lineas.push(
  `| ${resultados.numTotalTests} | ${resultados.numPassedTests} | ${resultados.numFailedTests} | ${resultados.numPendingTests + resultados.numTodoTests} |`,
);

for (const archivo of resultados.testResults) {
  const ruta = relative(RAIZ, archivo.name).replaceAll('\\', '/');
  lineas.push('');
  lineas.push(`## \`${ruta}\``);
  lineas.push('');
  lineas.push('| Estado | Grupo | Prueba | Duración |');
  lineas.push('|---|---|---|---|');
  for (const prueba of archivo.assertionResults) {
    const grupo = prueba.ancestorTitles.join(' › ').replaceAll('|', '\\|');
    const titulo = prueba.title.replaceAll('|', '\\|');
    const duracion = prueba.duration != null ? `${prueba.duration.toFixed(1)} ms` : '—';
    lineas.push(`| ${ICONO[prueba.status] ?? prueba.status} ${TEXTO[prueba.status] ?? ''} | ${grupo} | ${titulo} | ${duracion} |`);
  }

  const fallidas = archivo.assertionResults.filter((p) => p.status === 'failed');
  if (fallidas.length > 0) {
    lineas.push('');
    lineas.push('### Detalle de las fallas');
    for (const prueba of fallidas) {
      const mensaje = (prueba.failureMessages[0] ?? '').split('\n')[0];
      lineas.push('');
      lineas.push(`- **${prueba.title}**`);
      lineas.push(`  \`${mensaje}\``);
    }
  }
}
lineas.push('');

// 4. Escritura del informe. El nombre ordena los informes cronológicamente.
mkdirSync(CARPETA_INFORMES, { recursive: true });
const nombre = `${fecha}_${hora.replaceAll(':', '')}_${commit}.md`;
writeFileSync(`${CARPETA_INFORMES}/${nombre}`, lineas.join('\n'), 'utf8');
console.log(`\n📄 Informe guardado en ${CARPETA_INFORMES}/${nombre}`);

process.exit(ejecucion.status ?? 1);
