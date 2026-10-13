/**
 * Edad de un animal (RF-05, apartado 3.8.10).
 * Especificación: docs/tecnica/15-listado-de-animales.md, sección 5
 */
import type { FechaPredio } from './tipos';

/** Años, meses y días calendario completos entre dos fechas del predio (AAAA-MM-DD). */
export function diferenciaCalendario(desde: FechaPredio, hasta: FechaPredio): { anios: number; meses: number; dias: number } {
  const [a1, m1, d1] = desde.split('-').map(Number) as [number, number, number];
  const [a2, m2, d2] = hasta.split('-').map(Number) as [number, number, number];
  // Meses completos: el mes se cumple al llegar al mismo día del mes.
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d2 < d1) meses -= 1;
  if (meses < 0) return { anios: 0, meses: 0, dias: 0 };

  // Los días se cuentan desde el último mes cumplido. Si ese día no existe en el mes (31 de enero
  // más un mes), se toma el último día del mes, como en la edad aproximada (documento 13, sección 3.2).
  const mesAniversario = m1 - 1 + meses;
  const anioAniversario = a1 + Math.floor(mesAniversario / 12);
  const indiceMes = mesAniversario % 12;
  const ultimoDia = new Date(Date.UTC(anioAniversario, indiceMes + 1, 0)).getUTCDate();
  const aniversario = Date.UTC(anioAniversario, indiceMes, Math.min(d1, ultimoDia));
  const dias = Math.round((Date.UTC(a2, m2 - 1, d2) - aniversario) / 86_400_000);

  return { anios: Math.floor(meses / 12), meses: meses % 12, dias };
}

const plural = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

/**
 * «12 días», «8 meses», «2 años y 5 meses»; si la fecha es aproximada, redondeada a la unidad mayor
 * y señalada: «Unos 8 meses», «Unos 3 años». Hasta los 23 meses la edad se da en meses.
 */
export function describirEdad(nacimiento: FechaPredio | null, exacta: boolean, hoy: FechaPredio): string {
  if (!nacimiento) return 'Edad desconocida';
  const { anios, meses, dias } = diferenciaCalendario(nacimiento, hoy);
  const totalMeses = anios * 12 + meses;

  if (totalMeses === 0) {
    if (!exacta) return 'Menos de 1 mes';
    return dias === 0 ? 'Nació hoy' : plural(dias, 'día', 'días');
  }

  if (totalMeses < 24) {
    if (exacta) return plural(totalMeses, 'mes', 'meses');
    return totalMeses === 1 ? 'Cerca de 1 mes' : `Unos ${totalMeses} meses`;
  }

  if (!exacta) return `Unos ${anios} años`;
  return meses === 0 ? plural(anios, 'año', 'años') : `${plural(anios, 'año', 'años')} y ${plural(meses, 'mes', 'meses')}`;
}
