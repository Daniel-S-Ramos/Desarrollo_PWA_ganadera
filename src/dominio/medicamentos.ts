/**
 * Reglas del catálogo de medicamentos (apartado 3.8.9, RF-09).
 * Especificación: docs/tecnica/18-catalogo-de-medicamentos.md, secciones 3 a 5
 */
import { TIPOS_MEDICAMENTO, UNIDADES_DOSIS, type Medicamento, type TipoMedicamento, type UnidadDosis } from './tipos';

/** Vocales con tilde, diéresis o acentos grave y circunflejo, y su vocal simple. La ñ no está: se conserva. */
const CON_TILDE = 'áéíóúàèìòùäëïöüâêîôû';
const SIN_TILDE = 'aeiouaeiouaeiouaeiou';

/**
 * Forma de comparación de un nombre: sin espacios en los extremos ni repetidos, en minúsculas y con las
 * vocales sin tilde (sección 3). Es la misma regla de la función normalizar_nombre del servicio.
 */
export function normalizarNombre(nombre: string): string {
  const minusculas = nombre.trim().replace(/\s+/g, ' ').toLowerCase();
  let resultado = '';
  for (const letra of minusculas) {
    const i = CON_TILDE.indexOf(letra);
    resultado += i >= 0 ? SIN_TILDE[i] : letra;
  }
  return resultado;
}

/**
 * ¿Son parecidos? Uno contiene al otro, o comparten la primera palabra de al menos tres letras
 * (sección 4). Es una ayuda para quien registra, no una regla: dos nombres parecidos pueden ser
 * productos distintos.
 */
export function sonParecidos(a: string, b: string): boolean {
  const x = normalizarNombre(a);
  const y = normalizarNombre(b);
  if (x === y) return false; // eso es una coincidencia, no un parecido
  if (x.includes(y) || y.includes(x)) return true;
  const [primeraX] = x.split(' ');
  const [primeraY] = y.split(' ');
  return !!primeraX && primeraX.length >= 3 && primeraX === primeraY;
}

/** Nombre visible de cada tipo de medicamento. */
export const NOMBRE_TIPO: Record<TipoMedicamento, string> = {
  vacuna: 'Vacuna',
  purga: 'Purga',
  vitamina: 'Vitamina',
  antibiotico: 'Antibiótico',
  otro: 'Otro',
};

export const LARGO_NOMBRE = { minimo: 2, maximo: 60 } as const;
export const INTERVALO = { minimo: 1, maximo: 730 } as const;

/** Lo que se escribe en el formulario: el intervalo llega como texto. */
export interface FormularioMedicamento {
  nombre: string;
  tipo: TipoMedicamento | null;
  unidad: UnidadDosis | null;
  intervalo: string;
}

export type CampoMedicamento = keyof FormularioMedicamento;
export type ErroresMedicamento = Partial<Record<CampoMedicamento, string>>;

export const formularioMedicamentoVacio = (): FormularioMedicamento => ({ nombre: '', tipo: null, unidad: null, intervalo: '' });

export type DatosMedicamento = Omit<Medicamento, 'id' | 'autor_id' | 'creado_en'>;

/** Valida el formulario y lo convierte en los datos de la Tabla 24; todos los errores juntos (sección 5). */
export function validarMedicamento(f: FormularioMedicamento): { ok: true; datos: DatosMedicamento } | { ok: false; errores: ErroresMedicamento } {
  const errores: ErroresMedicamento = {};
  // Se guarda como se escribió, sin espacios sobrantes; la forma normalizada solo sirve para comparar.
  const nombre = f.nombre.trim().replace(/\s+/g, ' ');
  if (nombre.length < LARGO_NOMBRE.minimo || nombre.length > LARGO_NOMBRE.maximo) {
    errores.nombre = `Escriba el nombre del medicamento (de ${LARGO_NOMBRE.minimo} a ${LARGO_NOMBRE.maximo} caracteres)`;
  }
  if (!f.tipo || !TIPOS_MEDICAMENTO.includes(f.tipo)) errores.tipo = 'Elija el tipo';
  if (!f.unidad || !UNIDADES_DOSIS.includes(f.unidad)) errores.unidad = 'Elija la unidad de dosis';
  const intervalo = Number(f.intervalo.trim());
  if (f.intervalo.trim() === '' || !Number.isInteger(intervalo) || intervalo < INTERVALO.minimo || intervalo > INTERVALO.maximo) {
    errores.intervalo = `Escriba un número entero de días, de ${INTERVALO.minimo} a ${INTERVALO.maximo}`;
  }
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { nombre, tipo: f.tipo!, unidad: f.unidad!, intervalo_advertencia_dias: intervalo } };
}

/** Orden del catálogo: por tipo (en el orden de la Tabla 24) y, dentro de cada tipo, por nombre. */
export function compararMedicamentos(a: Pick<Medicamento, 'tipo' | 'nombre'>, b: Pick<Medicamento, 'tipo' | 'nombre'>): number {
  const porTipo = TIPOS_MEDICAMENTO.indexOf(a.tipo) - TIPOS_MEDICAMENTO.indexOf(b.tipo);
  return porTipo !== 0 ? porTipo : normalizarNombre(a.nombre).localeCompare(normalizarNombre(b.nombre), 'es', { numeric: true });
}
