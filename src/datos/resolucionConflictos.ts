/**
 * Arreglos en el teléfono de un registro que el servicio rechazó por unicidad (Tabla 21).
 * Especificación: docs/tecnica/26-correccion-y-anulacion.md, sección 10
 *
 * Viven en la capa de datos porque, como la conversión del ordeño duplicado (sincronizacionLocal.ts),
 * reescriben registros que **nunca llegaron al servicio** y tocan la cola. Un registro que el servicio ya
 * aceptó no se toca nunca: si aparece uno, la operación se detiene sin escribir nada.
 */
import type { Table } from 'dexie';
import type { NombreTabla, RegistroLocal, Uuid } from '../dominio/tipos';
import { db, TABLAS_SINCRONIZABLES } from './db';
import { avisarGuardadoLocal } from './eventos';

type Fila = Record<string, unknown> & { id: Uuid; estado_sync: string };

function tablaDe(tabla: NombreTabla): Table<Fila, Uuid> {
  return db[tabla] as unknown as Table<Fila, Uuid>;
}

const TODAS = () => [...TABLAS_SINCRONIZABLES.map((t) => tablaDe(t)), db.cola_operaciones, db.imagen, db.cola_imagenes];

/** Los campos que apuntan a un animal, por tabla (sin la corrección, que se trata aparte). */
export const REFERENCIAS_A_ANIMAL: Partial<Record<NombreTabla, readonly string[]>> = {
  animal: ['madre_id', 'padre_id'],
  colocacion_chapeta: ['animal_id'],
  fotografia: ['animal_id'],
  destino_productivo: ['animal_id'],
  evento_sanitario: ['animal_id'],
  produccion_leche: ['animal_id'],
  pesaje: ['animal_id'],
  parto: ['madre_id', 'cria_id'],
  movimiento_economico: ['animal_id'],
  salida: ['animal_id'],
  recordatorio: ['animal_id'],
};

/** Los campos corregibles cuyo valor es el id de un animal o de un medicamento. */
const CAMPOS_REFERENCIA: Record<'animal' | 'medicamento', readonly string[]> = {
  animal: ['madre_id', 'padre_id'],
  medicamento: ['medicamento_id'],
};

export class ResolucionDetenida extends Error {
  constructor(readonly causa: string) {
    super(causa);
    this.name = 'ResolucionDetenida';
  }
}

/** Un registro que pasa de un id a otro, o que se descarta, para listarlo antes de confirmar. */
export interface Movimiento {
  tabla: NombreTabla;
  id: Uuid;
  /** Qué se hace: pasar al registro correcto, o descartarlo porque solo describía al duplicado. */
  accion: 'pasar' | 'descartar';
  enviado: boolean;
}

/** Lo que hay que mover o descartar para unir el animal duplicado con el correcto (sección 10.1). */
async function planUnionAnimal(duplicadoId: Uuid, correctoId: Uuid): Promise<Movimiento[]> {
  const plan: Movimiento[] = [];
  const colocacionDelCorrecto = (await db.colocacion_chapeta.where('animal_id').equals(correctoId).count()) > 0;
  for (const [tabla, campos] of Object.entries(REFERENCIAS_A_ANIMAL) as [NombreTabla, readonly string[]][]) {
    for (const fila of await tablaDe(tabla).toArray()) {
      if (fila.id === duplicadoId || !campos.some((c) => fila[c] === duplicadoId)) continue;
      // Si el correcto ya tiene su chapeta puesta registrada, la del duplicado sobra (es única por animal).
      const accion = tabla === 'colocacion_chapeta' && colocacionDelCorrecto ? 'descartar' : 'pasar';
      plan.push({ tabla, id: fila.id, accion, enviado: fila.estado_sync === 'sincronizado' });
    }
  }
  plan.push(...(await planCorrecciones('animal', duplicadoId)));
  return plan;
}

/**
 * Correcciones relacionadas con el duplicado: las que lo corrigen a él se descartan (describen un registro
 * que desaparece); las que lo ponen como valor nuevo (madre, padre, medicamento) pasan al correcto.
 */
async function planCorrecciones(entidad: 'animal' | 'medicamento', duplicadoId: Uuid): Promise<Movimiento[]> {
  const plan: Movimiento[] = [];
  for (const c of await db.correccion.toArray()) {
    const enviado = c.estado_sync === 'sincronizado';
    if (c.entidad_afectada === entidad && c.registro_id === duplicadoId) plan.push({ tabla: 'correccion', id: c.id, accion: 'descartar', enviado });
    else if (c.campo && CAMPOS_REFERENCIA[entidad].includes(c.campo) && c.valor_nuevo === duplicadoId) plan.push({ tabla: 'correccion', id: c.id, accion: 'pasar', enviado });
  }
  return plan;
}

async function planUnionMedicamento(duplicadoId: Uuid): Promise<Movimiento[]> {
  const eventos = await db.evento_sanitario.where('medicamento_id').equals(duplicadoId).toArray();
  return [
    ...eventos.map((e): Movimiento => ({ tabla: 'evento_sanitario', id: e.id, accion: 'pasar', enviado: e.estado_sync === 'sincronizado' })),
    ...(await planCorrecciones('medicamento', duplicadoId)),
  ];
}

/** Lo que haría la unión, para mostrarlo antes de confirmar. Sin escribir nada. */
export function previsualizarUnion(entidad: 'animal' | 'medicamento', duplicadoId: Uuid, correctoId: Uuid): Promise<Movimiento[]> {
  return entidad === 'animal' ? planUnionAnimal(duplicadoId, correctoId) : planUnionMedicamento(duplicadoId);
}

/** El registro sigue en conflicto: si otra pantalla ya lo resolvió, no se hace nada. */
async function exigirConflicto(tabla: NombreTabla, id: Uuid): Promise<Fila> {
  const fila = await tablaDe(tabla).get(id);
  if (!fila || fila.estado_sync !== 'conflicto') throw new ResolucionDetenida('Este registro ya no está en conflicto.');
  return fila;
}

/** Deja un registro pendiente de envío: con su operación en la cola, sin duplicarla. */
async function dejarPendiente(tabla: NombreTabla, id: Uuid, cambios: Record<string, unknown>): Promise<void> {
  const fila = await tablaDe(tabla).get(id);
  if (!fila) return;
  await tablaDe(tabla).update(id, { ...cambios, estado_sync: 'pendiente', detalle_conflicto: undefined });
  const enCola = await db.cola_operaciones.where('registro_id').equals(id).count();
  if (enCola === 0) {
    await db.cola_operaciones.add({ entidad: tabla, registro_id: id, tipo: 'insertar', intentos: 0, ultimo_intento: null, creado_en: String(fila['creado_en']) });
  }
}

/** Descarta un registro que nunca llegó al servicio, con su operación. */
async function descartar(tabla: NombreTabla, id: Uuid): Promise<void> {
  await db.cola_operaciones.where('registro_id').equals(id).delete();
  await tablaDe(tabla).delete(id);
}

/** Aplica el plan: reescribe las referencias al duplicado y descarta lo que sobra. Nada enviado se toca. */
async function aplicarPlan(plan: Movimiento[], duplicadoId: Uuid, correctoId: Uuid, entidad: 'animal' | 'medicamento'): Promise<void> {
  const enviado = plan.find((m) => m.enviado);
  if (enviado) throw new ResolucionDetenida(`Un registro del duplicado ya llegó al servicio (${enviado.tabla}): no se puede unir desde el teléfono.`);
  for (const m of plan) {
    if (m.accion === 'descartar') {
      await descartar(m.tabla, m.id);
      continue;
    }
    const fila = (await tablaDe(m.tabla).get(m.id))!;
    const campos = m.tabla === 'correccion' ? ['valor_nuevo'] : entidad === 'medicamento' ? ['medicamento_id'] : REFERENCIAS_A_ANIMAL[m.tabla]!;
    const cambios = Object.fromEntries(campos.filter((c) => fila[c] === duplicadoId).map((c) => [c, correctoId]));
    if (fila.estado_sync === 'conflicto') await dejarPendiente(m.tabla, m.id, cambios);
    else await tablaDe(m.tabla).update(m.id, cambios);
  }
}

/**
 * «Es el mismo animal»: sus registros no enviados pasan al animal correcto, las imágenes también, y el
 * duplicado se retira (sección 10.1). Devuelve lo que se movió.
 *
 * @throws ResolucionDetenida si ya no está en conflicto, si el correcto no está en el teléfono o si algún
 *   registro del duplicado ya llegó al servicio.
 */
export async function unirAnimal(duplicadoId: Uuid, correctoId: Uuid): Promise<Movimiento[]> {
  const plan = await db.transaction('rw', TODAS(), async () => {
    await exigirConflicto('animal', duplicadoId);
    if (!(await db.animal.get(correctoId))) throw new ResolucionDetenida('El animal con ese número no está en este teléfono.');
    const plan = await planUnionAnimal(duplicadoId, correctoId);
    await aplicarPlan(plan, duplicadoId, correctoId, 'animal');
    await db.imagen.where('animal_id').equals(duplicadoId).modify({ animal_id: correctoId });
    await descartar('animal', duplicadoId);
    return plan;
  });
  avisarGuardadoLocal();
  return plan;
}

/** «Usar el que ya existe»: los eventos no enviados pasan al medicamento registrado (sección 10.2). */
export async function unirMedicamento(duplicadoId: Uuid, correctoId: Uuid): Promise<Movimiento[]> {
  const plan = await db.transaction('rw', TODAS(), async () => {
    await exigirConflicto('medicamento', duplicadoId);
    if (!(await db.medicamento.get(correctoId))) throw new ResolucionDetenida('El medicamento registrado no está en este teléfono.');
    const plan = await planUnionMedicamento(duplicadoId);
    await aplicarPlan(plan, duplicadoId, correctoId, 'medicamento');
    await descartar('medicamento', duplicadoId);
    return plan;
  });
  avisarGuardadoLocal();
  return plan;
}

/** «Descartar» la chapeta puesta repetida: el dato ya está registrado por otro teléfono (sección 10.3). */
export async function descartarColocacion(id: Uuid): Promise<void> {
  await db.transaction('rw', TODAS(), async () => {
    await exigirConflicto('colocacion_chapeta', id);
    await descartar('colocacion_chapeta', id);
  });
}

/** Los registros que dependen del animal, también por medio de sus crías y de las correcciones de ellos. */
async function dependientesDe(animalId: Uuid): Promise<Set<Uuid>> {
  const ids = new Set<Uuid>();
  const animales = [animalId];
  while (animales.length > 0) {
    const actual = animales.pop()!;
    for (const [tabla, campos] of Object.entries(REFERENCIAS_A_ANIMAL) as [NombreTabla, readonly string[]][]) {
      for (const fila of await tablaDe(tabla).toArray()) {
        if (ids.has(fila.id) || fila.id === animalId || !campos.some((c) => fila[c] === actual)) continue;
        ids.add(fila.id);
        if (tabla === 'animal') animales.push(fila.id);
      }
    }
  }
  for (const c of await db.correccion.toArray()) if (ids.has(c.registro_id) || c.registro_id === animalId) ids.add(c.id);
  return ids;
}

/**
 * «Son animales distintos»: el animal se vuelve a enviar con otro número (sección 10.1). Las operaciones de
 * sus dependientes pasan detrás de la suya, en el mismo orden, para que salgan con él en la misma subida.
 *
 * @param numero Ya normalizado y validado por quien llama (formato y que no exista).
 */
export async function cambiarNumero(animalId: Uuid, numero: string): Promise<RegistroLocal<'animal'>> {
  const animal = await db.transaction('rw', TODAS(), async () => {
    await exigirConflicto('animal', animalId);
    const otro = await db.animal.where('codigo_chapeta').equals(numero).first();
    if (otro) throw new ResolucionDetenida(`Ya hay un animal con el número ${numero}.`);
    await dejarPendiente('animal', animalId, { codigo_chapeta: numero });

    const dependientes = await dependientesDe(animalId);
    const detras = (await db.cola_operaciones.orderBy('seq').toArray()).filter((o) => dependientes.has(o.registro_id));
    await db.cola_operaciones.bulkDelete(detras.map((o) => o.seq!));
    await db.cola_operaciones.bulkAdd(detras.map(({ seq: _seq, ...o }) => o));
    return (await db.animal.get(animalId))!;
  });
  avisarGuardadoLocal();
  return animal;
}
