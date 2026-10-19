/**
 * Valor vigente de un registro: el original con sus correcciones aplicadas en orden; un registro anulado no
 * tiene valor vigente (apartado 3.9.5, Tabla 21).
 * Especificación: docs/tecnica/26-correccion-y-anulacion.md, sección 6
 */
import { CAMPOS_CORREGIBLES, desdeTexto } from './camposCorregibles';
import type { Correccion, EntidadCorregible, Uuid } from './tipos';

export type CorreccionVigente = Pick<
  Correccion,
  'id' | 'entidad_afectada' | 'registro_id' | 'tipo' | 'campo' | 'valor_anterior' | 'valor_nuevo' | 'motivo' | 'nota' | 'autor_id' | 'creado_en'
> & { recibido_en?: string };

/**
 * El orden de aplicación (sección 6.2): primero las recibidas por el servicio, por `recibido_en`; después las
 * que aún no se envían, por `creado_en`; a igual marca, por identificador.
 */
export function ordenDeAplicacion(a: CorreccionVigente, b: CorreccionVigente): number {
  if (a.recibido_en && b.recibido_en && a.recibido_en !== b.recibido_en) return a.recibido_en < b.recibido_en ? -1 : 1;
  if (a.recibido_en && !b.recibido_en) return -1;
  if (!a.recibido_en && b.recibido_en) return 1;
  if (!a.recibido_en && !b.recibido_en && a.creado_en !== b.creado_en) return a.creado_en < b.creado_en ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export interface Vigente<T> {
  /** El registro con los valores vigentes. */
  registro: T;
  original: T;
  /** La anulación, si existe: el registro no cuenta en ningún cálculo (HU-17.4). */
  anulacion: CorreccionVigente | null;
  /** Por campo, sus correcciones en orden de aplicación; la última da el valor vigente. */
  corregidos: ReadonlyMap<string, CorreccionVigente[]>;
}

/** Aplica las correcciones de una tabla a un registro (sección 6.1). */
export function aplicarCorrecciones<T extends { id: Uuid }>(entidad: EntidadCorregible, registro: T, correcciones: readonly CorreccionVigente[]): Vigente<T> {
  const propias = correcciones.filter((c) => c.entidad_afectada === entidad && c.registro_id === registro.id).sort(ordenDeAplicacion);
  const anulacion = propias.find((c) => c.tipo === 'anulacion') ?? null;
  const campos = CAMPOS_CORREGIBLES[entidad];
  const corregidos = new Map<string, CorreccionVigente[]>();
  const vigente: Record<string, unknown> = { ...registro };
  for (const c of propias) {
    if (c.tipo !== 'correccion' || !c.campo) continue;
    const campo = campos[c.campo];
    if (!campo) continue; // un campo que el teléfono no reconoce no altera el registro
    vigente[c.campo] = desdeTexto(campo, c.valor_nuevo);
    corregidos.set(c.campo, [...(corregidos.get(c.campo) ?? []), c]);
  }
  return { registro: vigente as T, original: registro, anulacion, corregidos };
}

/** Los registros con sus valores vigentes. */
export function aplicarATodos<T extends { id: Uuid }>(entidad: EntidadCorregible, registros: readonly T[], correcciones: readonly CorreccionVigente[]): Vigente<T>[] {
  const porRegistro = new Map<Uuid, CorreccionVigente[]>();
  for (const c of correcciones) if (c.entidad_afectada === entidad) porRegistro.set(c.registro_id, [...(porRegistro.get(c.registro_id) ?? []), c]);
  return registros.map((r) => aplicarCorrecciones(entidad, r, porRegistro.get(r.id) ?? []));
}

/** Solo los no anulados, con sus valores vigentes: lo que cuenta en los cálculos (sección 6.3). */
export function soloVigentes<T extends { id: Uuid }>(entidad: EntidadCorregible, registros: readonly T[], correcciones: readonly CorreccionVigente[]): T[] {
  return aplicarATodos(entidad, registros, correcciones)
    .filter((v) => v.anulacion === null)
    .map((v) => v.registro);
}
