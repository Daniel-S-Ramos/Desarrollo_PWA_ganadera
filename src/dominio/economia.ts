/**
 * Reglas de los costos por animal y del consolidado económico (RF-20, RF-21, CU-14, HU-16, apartado 3.8.12).
 * Especificación: docs/tecnica/31-consolidado-economico.md, secciones 3 y 6
 */
import { formatearFecha } from './fechas';
import { leerValor } from './salida';
import type { ConceptoMovimiento, FechaPredio, MovimientoEconomico } from './tipos';

export const NOMBRE_CONCEPTO: Record<ConceptoMovimiento, string> = {
  compra: 'Compra',
  servicio_veterinario: 'Servicio veterinario',
  alimentacion: 'Alimentación',
};

export const LARGO_DESCRIPCION = 300;
/** Si el parámetro precio_litro_leche no está en el teléfono (Tabla 30, valor de ejemplo). */
export const PRECIO_LITRO_POR_DEFECTO = 1950;

export interface FormularioCosto {
  concepto: ConceptoMovimiento | null;
  fecha: string;
  valor: string;
  descripcion: string;
}

export type ErroresCosto = Partial<Record<keyof FormularioCosto, string>>;
export type DatosCosto = Omit<MovimientoEconomico, 'id' | 'autor_id' | 'creado_en' | 'animal_id'>;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const esFechaValida = (t: string) => FECHA.test(t) && new Date(`${t}T00:00:00Z`).toISOString().startsWith(t);

export interface LimitesCosto {
  hoy: FechaPredio;
  /** Llegada al predio (nacimiento o ingreso); null si no se conoce. */
  llegada: FechaPredio | null;
  /** Fecha de la salida vigente; null si el animal sigue en el predio (sección 3, decisión C). */
  salida: FechaPredio | null;
  /** Se ofrece la compra: animal comprado y sin compra vigente (sección 3). */
  admiteCompra: boolean;
}

/** Valida el formulario (sección 3) y devuelve los datos listos para guardar. */
export function validarCosto(f: FormularioCosto, l: LimitesCosto): { ok: true; datos: DatosCosto } | { ok: false; errores: ErroresCosto } {
  const errores: ErroresCosto = {};
  if (!f.concepto) errores.concepto = 'Elija el concepto';
  else if (f.concepto === 'compra' && !l.admiteCompra) errores.concepto = 'Este animal no admite una compra: nació en el predio o ya tiene una registrada';
  if (!esFechaValida(f.fecha)) errores.fecha = 'Escriba una fecha válida';
  else if (f.fecha > l.hoy) errores.fecha = 'La fecha no puede ser posterior a hoy';
  else if (l.llegada && f.fecha < l.llegada) errores.fecha = `El animal llegó al predio el ${formatearFecha(l.llegada)}`;
  else if (l.salida && f.fecha > l.salida) errores.fecha = `El animal salió del predio el ${formatearFecha(l.salida)}`;
  const valor = leerValor(f.valor);
  if (f.valor.trim() === '') errores.valor = 'Escriba el valor, en pesos';
  else if (valor === null) errores.valor = 'Escriba el valor en pesos, sin decimales, hasta 100.000.000';
  if (f.descripcion.trim().length > LARGO_DESCRIPCION) errores.descripcion = `Hasta ${LARGO_DESCRIPCION} caracteres`;
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { concepto: f.concepto!, fecha: f.fecha, valor: valor!, descripcion: f.descripcion.trim() === '' ? null : f.descripcion.trim() } };
}
