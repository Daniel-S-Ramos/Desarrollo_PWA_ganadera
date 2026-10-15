/**
 * Periodos de consulta de la producción: ventanas diaria, semanal y mensual y sus agregados (RF-11).
 * Especificación: docs/tecnica/23-consulta-de-produccion.md, secciones 4 y 5
 *
 * Todo se calcula con fechas del calendario del predio (AAAA-MM-DD), sin horas.
 */
import type { FechaPredio } from './tipos';

export type Agregacion = 'diaria' | 'semanal' | 'mensual';

/** Cuántas unidades tiene cada ventana (sección 4). */
export const TAMANO_VENTANA: Record<Agregacion, number> = { diaria: 30, semanal: 12, mensual: 12 };

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function aFecha(texto: FechaPredio): Date {
  return new Date(`${texto}T00:00:00Z`);
}

function aTexto(fecha: Date): FechaPredio {
  return fecha.toISOString().slice(0, 10);
}

export function sumarDias(fecha: FechaPredio, dias: number): FechaPredio {
  const d = aFecha(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return aTexto(d);
}

/** El lunes de la semana de la fecha (sección 4: la semana empieza el lunes). */
export function inicioDeSemana(fecha: FechaPredio): FechaPredio {
  const diaSemana = (aFecha(fecha).getUTCDay() + 6) % 7; // lunes = 0
  return sumarDias(fecha, -diaSemana);
}

/** El primer día del mes de la fecha, desplazado `meses` meses. */
function inicioDeMes(fecha: FechaPredio, meses = 0): FechaPredio {
  const d = aFecha(fecha);
  return aTexto(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1)));
}

export function diasEntreInclusive(inicio: FechaPredio, fin: FechaPredio): number {
  return Math.round((aFecha(fin).getTime() - aFecha(inicio).getTime()) / 86_400_000) + 1;
}

function etiquetaDia(fecha: FechaPredio): string {
  const d = aFecha(fecha);
  return `${d.getUTCDate()} ${MESES_CORTOS[d.getUTCMonth()]}`;
}

export interface Periodo {
  inicio: FechaPredio;
  fin: FechaPredio;
  etiqueta: string;
  /** Contiene el día de hoy. */
  enCurso: boolean;
}

function periodo(inicio: FechaPredio, fin: FechaPredio, etiqueta: string, hoy: FechaPredio): Periodo {
  return { inicio, fin, etiqueta, enCurso: inicio <= hoy && hoy <= fin };
}

/**
 * Los periodos de una ventana, del más reciente al más antiguo (sección 4). `desplazamiento` 0 es la
 * ventana que termina hoy; −1, la anterior; y así.
 */
export function periodosDeVentana(agregacion: Agregacion, hoy: FechaPredio, desplazamiento = 0): Periodo[] {
  const n = TAMANO_VENTANA[agregacion];
  const resultado: Periodo[] = [];
  for (let i = 0; i < n; i++) {
    const paso = -desplazamiento * n + i; // unidades hacia atrás desde la actual
    if (agregacion === 'diaria') {
      const dia = sumarDias(hoy, -paso);
      resultado.push(periodo(dia, dia, etiquetaDia(dia), hoy));
    } else if (agregacion === 'semanal') {
      const inicio = sumarDias(inicioDeSemana(hoy), -7 * paso);
      const fin = sumarDias(inicio, 6);
      const mismoMes = inicio.slice(5, 7) === fin.slice(5, 7);
      const etiqueta = mismoMes
        ? `${Number(inicio.slice(8))} – ${etiquetaDia(fin)}`
        : `${etiquetaDia(inicio)} – ${etiquetaDia(fin)}`;
      resultado.push(periodo(inicio, fin, etiqueta, hoy));
    } else {
      const inicio = inicioDeMes(hoy, -paso);
      const fin = sumarDias(inicioDeMes(inicio, 1), -1);
      resultado.push(periodo(inicio, fin, `${MESES[Number(inicio.slice(5, 7)) - 1]} de ${inicio.slice(0, 4)}`, hoy));
    }
  }
  return resultado;
}

export interface FilaPeriodo {
  periodo: Periodo;
  /** Litros de los días registrados; null si ningún día tiene registro. */
  total: number | null;
  diasRegistrados: number;
  /** Días del periodo; el periodo en curso cuenta solo hasta hoy (sección 5). */
  diasDelPeriodo: number;
  /** Promedio por día registrado; null sin registros. */
  promedio: number | null;
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/** Agrega los registros en cada periodo: un día sin registro no cuenta, un cero sí (apartado 3.8.6). */
export function agregar(periodos: readonly Periodo[], registros: readonly { fecha: FechaPredio; litros: number }[], hoy: FechaPredio): FilaPeriodo[] {
  return periodos.map((p) => {
    const dentro = registros.filter((r) => r.fecha >= p.inicio && r.fecha <= p.fin && r.fecha <= hoy);
    const total = dentro.reduce((suma, r) => suma + r.litros, 0);
    const fin = p.fin < hoy ? p.fin : hoy;
    return {
      periodo: p,
      total: dentro.length === 0 ? null : redondear(total),
      diasRegistrados: dentro.length,
      diasDelPeriodo: p.inicio > hoy ? 0 : diasEntreInclusive(p.inicio, fin),
      promedio: dentro.length === 0 ? null : redondear(total / dentro.length),
    };
  });
}

/** El resumen de toda la ventana (sección 5). */
export function resumir(filas: readonly FilaPeriodo[]): { total: number | null; diasRegistrados: number; diasDelPeriodo: number; promedio: number | null } {
  const diasRegistrados = filas.reduce((s, f) => s + f.diasRegistrados, 0);
  const total = filas.reduce((s, f) => s + (f.total ?? 0), 0);
  return {
    total: diasRegistrados === 0 ? null : redondear(total),
    diasRegistrados,
    diasDelPeriodo: filas.reduce((s, f) => s + f.diasDelPeriodo, 0),
    promedio: diasRegistrados === 0 ? null : redondear(total / diasRegistrados),
  };
}
