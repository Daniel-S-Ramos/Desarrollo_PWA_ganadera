/**
 * Reglas de la salida del animal del predio: venta, muerte o pérdida o robo (RF-15, CU-13, HU-11).
 * Especificación: docs/tecnica/29-salida-y-venta.md, secciones 3, 5 y 7
 */
import { formatearFecha } from './fechas';
import { leerPeso } from './peso';
import type { FechaPredio, MotivoSalida, Salida } from './tipos';

export const NOMBRE_MOTIVO_SALIDA: Record<MotivoSalida, string> = {
  venta: 'Venta',
  muerte: 'Muerte',
  perdida_robo: 'Pérdida o robo',
};

export const VALOR_MAXIMO = 100_000_000;
export const LARGO_COMPRADOR = 100;
export const LARGO_TEXTO = 300;

export interface FormularioSalida {
  fecha: string;
  motivo: MotivoSalida | null;
  peso: string;
  valor: string;
  comprador: string;
  causa: string;
  observacion: string;
}

export const formularioSalidaVacio = (hoy: FechaPredio): FormularioSalida => ({ fecha: hoy, motivo: null, peso: '', valor: '', comprador: '', causa: '', observacion: '' });

export type ErroresSalida = Partial<Record<keyof FormularioSalida, string>>;

export type DatosSalida = Omit<Salida, 'id' | 'autor_id' | 'creado_en' | 'animal_id'>;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(texto: string): boolean {
  if (!FECHA.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(texto);
}

/** «3.200.000» o «3200000» → 3200000; null si no es un entero en pesos. */
export function leerValor(texto: string): number | null {
  const limpio = texto.trim().replace(/[$\s.]/g, '');
  if (!/^\d+$/.test(limpio)) return null;
  const valor = Number(limpio);
  return valor > 0 && valor <= VALOR_MAXIMO ? valor : null;
}

/**
 * Valida el formulario (sección 3) y devuelve los datos listos para guardar. Los campos de un motivo distinto
 * al elegido se descartan: una muerte nunca lleva valor de venta (Tabla 24).
 *
 * @param llegada Fecha en que el animal llegó al predio (nacimiento o ingreso); null si no se conoce.
 */
export function validarSalida(f: FormularioSalida, hoy: FechaPredio, llegada: FechaPredio | null): { ok: true; datos: DatosSalida } | { ok: false; errores: ErroresSalida } {
  const errores: ErroresSalida = {};
  if (!esFechaValida(f.fecha)) errores.fecha = 'Escriba una fecha válida';
  else if (f.fecha > hoy) errores.fecha = 'La fecha no puede ser posterior a hoy';
  else if (llegada && f.fecha < llegada) errores.fecha = `El animal llegó al predio el ${formatearFecha(llegada)}`;
  if (!f.motivo) errores.motivo = 'Elija el motivo';

  let peso: number | null = null;
  let valor: number | null = null;
  if (f.motivo === 'venta') {
    if (f.peso.trim() === '') errores.peso = 'Escriba el peso de venta';
    else if ((peso = leerPeso(f.peso.trim())) === null) errores.peso = 'Escriba el peso en kilogramos, de 1 a 1.500, con un decimal como máximo';
    if (f.valor.trim() === '') errores.valor = 'Escriba el valor recibido, en pesos';
    else if ((valor = leerValor(f.valor)) === null) errores.valor = 'Escriba el valor en pesos, sin decimales, hasta 100.000.000';
    if (f.comprador.trim().length > LARGO_COMPRADOR) errores.comprador = `Hasta ${LARGO_COMPRADOR} caracteres`;
  }
  if (f.motivo === 'muerte') {
    if (f.causa.trim() === '') errores.causa = 'Escriba la causa';
    else if (f.causa.trim().length > LARGO_TEXTO) errores.causa = `Hasta ${LARGO_TEXTO} caracteres`;
  }
  if (f.motivo === 'perdida_robo' && f.observacion.trim().length > LARGO_TEXTO) errores.observacion = `Hasta ${LARGO_TEXTO} caracteres`;

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  const texto = (t: string) => (t.trim() === '' ? null : t.trim());
  return {
    ok: true,
    datos: {
      fecha: f.fecha,
      motivo: f.motivo!,
      // El peso y el valor solo se leen en la venta: en otro motivo quedan en null.
      peso_venta: peso,
      valor_venta: valor,
      comprador: f.motivo === 'venta' ? texto(f.comprador) : null,
      causa_muerte: f.motivo === 'muerte' ? texto(f.causa) : null,
      observacion: f.motivo === 'perdida_robo' ? texto(f.observacion) : null,
    },
  };
}

/** «$3.200.000». */
export function formatearPesos(valor: number): string {
  return `$${valor.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

/** «418 kg». */
const kg = (peso: number) => `${peso.toLocaleString('es-CO', { maximumFractionDigits: 1 })} kg`;

/**
 * La salida en una línea (sección 7): «Vendido el 20 de octubre de 2026 · 418 kg · $3.200.000 · comprador
 * Pedro Gómez», «Murió el … · causa: …», «Perdido o robado el … · …». El género sigue al sexo del animal.
 */
export function describirSalida(s: Pick<Salida, 'fecha' | 'motivo' | 'peso_venta' | 'valor_venta' | 'comprador' | 'causa_muerte' | 'observacion'>, hembra: boolean): string {
  const fecha = formatearFecha(s.fecha);
  if (s.motivo === 'venta') {
    const partes = [`${hembra ? 'Vendida' : 'Vendido'} el ${fecha}`];
    if (s.peso_venta !== null) partes.push(kg(s.peso_venta));
    if (s.valor_venta !== null) partes.push(formatearPesos(s.valor_venta));
    if (s.comprador) partes.push(`comprador ${s.comprador}`);
    return partes.join(' · ');
  }
  if (s.motivo === 'muerte') return `Murió el ${fecha}${s.causa_muerte ? ` · causa: ${s.causa_muerte}` : ''}`;
  return `${hembra ? 'Perdida o robada' : 'Perdido o robado'} el ${fecha}${s.observacion ? ` · ${s.observacion}` : ''}`;
}

/**
 * ¿Le falta un pesaje reciente para vender? (sección 5, CU-13 2a). Solo cuenta un pesaje, no el peso de compra
 * o al nacer: este último no dice cuánto pesa hoy.
 *
 * @param ultimoPesaje Fecha del último pesaje vigente; null si nunca se ha pesado.
 */
export function sinPesajeReciente(ultimoPesaje: FechaPredio | null, fecha: FechaPredio, dias: number): boolean {
  if (!ultimoPesaje) return true;
  const transcurridos = Math.round((Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${ultimoPesaje}T00:00:00Z`)) / 86_400_000);
  return transcurridos > dias;
}
