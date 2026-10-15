/**
 * Evento sanitario: tipos, filtro del catálogo, dosis precargada, validación e historial (RF-07, RF-08).
 * Especificación: docs/tecnica/20-registro-sanitario.md, secciones 2 a 8
 */
import { formatearFecha } from './fechas';
import { TIPOS_EVENTO_SANITARIO, type DatosNuevos, type EventoSanitario, type FechaPredio, type Medicamento, type TipoEventoSanitario, type TipoMedicamento, type Uuid } from './tipos';

export const NOMBRE_TIPO_EVENTO: Record<TipoEventoSanitario, string> = {
  vacuna: 'Vacuna',
  purga: 'Purga',
  vitamina: 'Vitamina',
  tratamiento: 'Tratamiento',
  otro: 'Otro',
};

/** Los tipos de medicamento que lista cada tipo de evento; null es todo el catálogo (sección 4). */
const MEDICAMENTOS_DEL_EVENTO: Record<TipoEventoSanitario, readonly TipoMedicamento[] | null> = {
  vacuna: ['vacuna'],
  purga: ['purga'],
  vitamina: ['vitamina'],
  tratamiento: ['antibiotico', 'otro'],
  otro: null,
};

/** Los medicamentos del catálogo que corresponden al tipo de evento, en el orden recibido. */
export function medicamentosDelTipo<T extends Pick<Medicamento, 'tipo'>>(catalogo: readonly T[], tipo: TipoEventoSanitario): T[] {
  const tipos = MEDICAMENTOS_DEL_EVENTO[tipo];
  return tipos === null ? [...catalogo] : catalogo.filter((m) => tipos.includes(m.tipo));
}

/** El tipo que se propone al agregar un medicamento desde el registro (sección 4). */
export function tipoMedicamentoPropuesto(tipo: TipoEventoSanitario): TipoMedicamento {
  return tipo === 'tratamiento' ? 'antibiotico' : tipo;
}

type ConFecha = Pick<EventoSanitario, 'id' | 'fecha'>;

/** Del más reciente al más antiguo; a igual fecha, el registrado después (documento 01). */
function delMasReciente(a: ConFecha, b: ConFecha): number {
  return a.fecha !== b.fecha ? (a.fecha < b.fecha ? 1 : -1) : a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/** El historial sanitario en su orden (sección 8). */
export function ordenarHistorial<T extends ConFecha>(eventos: readonly T[]): T[] {
  return [...eventos].sort(delMasReciente);
}

/**
 * La última dosis registrada de un medicamento en el predio, en cualquier animal (sección 5.1). Se
 * propone para revisar, no se recomienda (Tabla 30).
 */
export function ultimaDosis(eventos: readonly Pick<EventoSanitario, 'id' | 'fecha' | 'medicamento_id' | 'dosis'>[], medicamentoId: Uuid): number | null {
  const conDosis = eventos.filter((e) => e.medicamento_id === medicamentoId && e.dosis !== null);
  return ordenarHistorial(conDosis)[0]?.dosis ?? null;
}

// ---------------------------------------------------------------------------
// Formulario y validación: secciones 5 y 6
// ---------------------------------------------------------------------------

export interface FormularioEvento {
  tipo: TipoEventoSanitario | null;
  medicamento_id: Uuid | null;
  fecha: string;
  dosis: string;
  costo: string;
  sintomas: string;
}

export function formularioEventoVacio(hoy: FechaPredio): FormularioEvento {
  return { tipo: null, medicamento_id: null, fecha: hoy, dosis: '', costo: '', sintomas: '' };
}

/** Lo que se copia al aplicar lo mismo a otro animal: todo menos los síntomas, y el costo si se ve (sección 7). */
export function copiarEvento(evento: Pick<EventoSanitario, 'tipo' | 'medicamento_id' | 'fecha' | 'dosis' | 'costo'>, conCosto: boolean): FormularioEvento {
  return {
    tipo: evento.tipo,
    medicamento_id: evento.medicamento_id,
    fecha: evento.fecha,
    dosis: evento.dosis === null ? '' : String(evento.dosis).replace('.', ','),
    costo: conCosto && evento.costo !== null ? String(evento.costo) : '',
    sintomas: '',
  };
}

export interface ContextoEvento {
  /** Fecha de nacimiento, exacta o aproximada; null si no se conoce. */
  nacimiento: FechaPredio | null;
  retirado: boolean;
  /** El medicamento elegido está en el catálogo del teléfono. */
  medicamentoExiste: boolean;
}

export type CampoEvento = 'tipo' | 'medicamento_id' | 'fecha' | 'dosis' | 'costo' | 'sintomas' | 'animal';
export type ErroresEvento = Partial<Record<CampoEvento, string>>;

export const DOSIS_MAXIMA = 9999;
export const COSTO_MAXIMO = 10_000_000;
export const LARGO_SINTOMAS = 300;

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaValida(texto: string): boolean {
  if (!FORMATO_FECHA.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto);
}

/** El costo en pesos enteros: admite los puntos o espacios de miles («25.000»), no decimales. */
export function leerCosto(texto: string): number | null {
  const limpio = texto.replace(/[.\s]/g, '');
  return /^\d+$/.test(limpio) ? Number(limpio) : null;
}

/** Las reglas de la sección 6; devuelve todos los errores juntos. */
export function validarEvento(
  f: FormularioEvento,
  contexto: ContextoEvento,
  hoy: FechaPredio,
): { ok: true; datos: Omit<DatosNuevos<'evento_sanitario'>, 'animal_id'> } | { ok: false; errores: ErroresEvento } {
  const errores: ErroresEvento = {};
  if (contexto.retirado) errores.animal = 'Este animal salió del predio';
  if (!f.tipo || !TIPOS_EVENTO_SANITARIO.includes(f.tipo)) errores.tipo = 'Elija el tipo de evento';
  if (!f.medicamento_id || !contexto.medicamentoExiste) errores.medicamento_id = 'Elija el medicamento';

  if (!esFechaValida(f.fecha)) errores.fecha = 'Escriba una fecha válida';
  else if (f.fecha > hoy) errores.fecha = 'La fecha no puede ser posterior a hoy';
  else if (contexto.nacimiento && f.fecha < contexto.nacimiento) errores.fecha = `El animal nació el ${formatearFecha(contexto.nacimiento)}`;

  let dosis: number | null = null;
  if (f.dosis.trim() !== '') {
    dosis = Number(f.dosis.trim().replace(',', '.'));
    if (!(dosis > 0 && dosis <= DOSIS_MAXIMA)) errores.dosis = 'La dosis debe ser mayor que 0 y hasta 9.999';
  }

  let costo: number | null = null;
  if (f.costo.trim() !== '') {
    costo = leerCosto(f.costo);
    if (costo === null || costo > COSTO_MAXIMO) errores.costo = 'Escriba el costo en pesos, sin decimales, hasta 10.000.000';
  }

  const sintomas = f.sintomas.trim();
  if (sintomas.length > LARGO_SINTOMAS) errores.sintomas = `Hasta ${LARGO_SINTOMAS} caracteres`;

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    datos: { fecha: f.fecha, tipo: f.tipo!, medicamento_id: f.medicamento_id!, dosis, costo, sintomas: sintomas === '' ? null : sintomas },
  };
}

/** «$ 25.000»: pesos con separador de miles (sección 5.2). */
export function formatearPesos(valor: number): string {
  return `$ ${valor.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

/** «5 ml», «2,5 cc»: la dosis con su unidad (sección 8). */
export function describirDosis(dosis: number | null, unidad: string | undefined): string {
  if (dosis === null) return 'Sin dosis';
  const numero = dosis.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  return unidad ? `${numero} ${unidad}` : numero;
}
