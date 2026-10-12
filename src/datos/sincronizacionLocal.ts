/**
 * Operaciones sobre el almacenamiento del dispositivo que necesita el motor de sincronización.
 * Especificación: docs/tecnica/09-sincronizacion-subida.md y 10-sincronizacion-bajada.md
 *
 * Viven en la capa de datos porque son las únicas que, además de crear, tocan los atributos locales
 * de sincronización (estado, recibido_en, detalle del conflicto), retiran operaciones de la cola o
 * aplican lo que llega del servicio. Ninguna modifica los datos de un registro.
 */
import type { Table } from 'dexie';
import type { EstadoSync, NombreTabla, Parametro, RegistroLocal, Usuario, Uuid } from '../dominio/tipos';
import { db, TABLAS_SINCRONIZABLES, type OperacionPendiente } from './db';
import { unidadDeTrabajo } from './repositorio';

/** Una fila tal como la entrega el servicio: la entidad más su recibido_en. */
export type FilaRemota = Record<string, unknown> & { id: Uuid; recibido_en: string };

const ATRIBUTOS_LOCALES = ['estado_sync', 'recibido_en', 'detalle_conflicto'] as const;

function tablaDe(tabla: NombreTabla): Table<Record<string, unknown>, Uuid> {
  return db[tabla] as unknown as Table<Record<string, unknown>, Uuid>;
}

// ---------------------------------------------------------------------------
// Subida
// ---------------------------------------------------------------------------

/** Devuelve a «pendiente» los registros que quedaron «en transmisión» por un cierre inesperado. */
export async function reiniciarEnTransmision(): Promise<void> {
  for (const tabla of TABLAS_SINCRONIZABLES) {
    await tablaDe(tabla).where('estado_sync').equals('en_transmision').modify({ estado_sync: 'pendiente' });
  }
}

export function leerRegistro<T extends NombreTabla>(tabla: T, id: Uuid): Promise<RegistroLocal<T> | undefined> {
  return tablaDe(tabla).get(id) as Promise<RegistroLocal<T> | undefined>;
}

/** Lo que viaja al servicio: el registro sin los atributos que solo describen su sincronización. */
export function sinAtributosLocales(registro: Record<string, unknown>): Record<string, unknown> {
  const copia = { ...registro };
  for (const atributo of ATRIBUTOS_LOCALES) delete copia[atributo];
  return copia;
}

export async function marcarEstado(
  tabla: NombreTabla,
  id: Uuid,
  estado: EstadoSync,
  extra: { recibido_en?: string; detalle_conflicto?: string } = {},
): Promise<void> {
  await tablaDe(tabla).update(id, { estado_sync: estado, ...extra });
}

/** El servicio confirmó que tiene el dato: sale de la cola y queda sincronizado, en una transacción. */
export async function confirmarEnvio(operacion: OperacionPendiente, recibidoEn?: string): Promise<void> {
  await db.transaction('rw', [tablaDe(operacion.entidad), db.cola_operaciones], async () => {
    await db.cola_operaciones.delete(operacion.seq!);
    await tablaDe(operacion.entidad).update(operacion.registro_id, {
      estado_sync: 'sincronizado',
      ...(recibidoEn ? { recibido_en: recibidoEn } : {}),
    });
  });
}

/** Rechazo que no cambiará al reintentar: sale de la cola y queda en conflicto con la causa. */
export async function marcarConflicto(operacion: OperacionPendiente, detalle: string): Promise<void> {
  await db.transaction('rw', [tablaDe(operacion.entidad), db.cola_operaciones], async () => {
    await db.cola_operaciones.delete(operacion.seq!);
    await tablaDe(operacion.entidad).update(operacion.registro_id, { estado_sync: 'conflicto', detalle_conflicto: detalle });
  });
}

/** Falla transitoria o de dependencia: la operación se queda y suma un intento. */
export async function registrarIntento(operacion: OperacionPendiente): Promise<void> {
  await db.transaction('rw', [tablaDe(operacion.entidad), db.cola_operaciones], async () => {
    await db.cola_operaciones.update(operacion.seq!, {
      intentos: operacion.intentos + 1,
      ultimo_intento: new Date().toISOString(),
    });
    await tablaDe(operacion.entidad).update(operacion.registro_id, { estado_sync: 'pendiente' });
  });
}

/** Retira una operación cuyo registro ya no existe en el teléfono. */
export async function retirarOperacion(operacion: OperacionPendiente): Promise<void> {
  await db.cola_operaciones.delete(operacion.seq!);
}

/**
 * Ordeño duplicado (3.8.6, documento 09 sección 5.2): el ordeño local, que nunca llegó al servicio,
 * se convierte en una corrección del campo litros sobre el ordeño que el servicio aceptó. Todo en
 * una transacción: si algo falla, el ordeño local sigue en la cola como estaba.
 */
export async function convertirOrdenoEnCorreccion(
  operacion: OperacionPendiente,
  ordenoLocal: RegistroLocal<'produccion_leche'>,
  aceptado: { id: Uuid; litros: number },
): Promise<RegistroLocal<'correccion'>> {
  const tablas = [...TABLAS_SINCRONIZABLES.map((t) => tablaDe(t)), db.cola_operaciones];
  return db.transaction('rw', tablas, async () => {
    await db.cola_operaciones.delete(operacion.seq!);
    await db.produccion_leche.delete(ordenoLocal.id);
    return unidadDeTrabajo(ordenoLocal.autor_id, (tx) =>
      tx.crear('correccion', {
        entidad_afectada: 'produccion_leche',
        registro_id: aceptado.id,
        tipo: 'correccion',
        campo: 'litros',
        valor_anterior: String(aceptado.litros),
        valor_nuevo: String(ordenoLocal.litros),
        motivo: 'registro_duplicado',
        nota: null,
      }),
    );
  });
}

/** Registros en conflicto en todas las tablas: requieren la revisión del propietario (documento 11). */
export async function contarConflictos(): Promise<number> {
  let total = 0;
  for (const tabla of TABLAS_SINCRONIZABLES) {
    total += await tablaDe(tabla).where('estado_sync').equals('conflicto').count();
  }
  return total;
}

// ---------------------------------------------------------------------------
// Bajada
// ---------------------------------------------------------------------------

const claveMarca = (tabla: NombreTabla) => `marca:${tabla}`;

/** Marca de avance de la tabla: el recibido_en más reciente incorporado, con la precisión del servicio. */
export async function leerMarca(tabla: NombreTabla): Promise<string | undefined> {
  return (await db.meta.get(claveMarca(tabla)))?.valor as string | undefined;
}

/**
 * Aplica una página de filas recibidas y avanza la marca, en una sola transacción
 * (documento 10, secciones 2.1 y 4). Una fila que ya existe no cambia sus datos: solo queda
 * sincronizada, y si tenía una operación pendiente (el envío llegó pero se perdió la confirmación),
 * esa operación sale de la cola.
 */
export async function aplicarPagina(tabla: NombreTabla, filas: FilaRemota[]): Promise<void> {
  if (filas.length === 0) return;
  const almacen = tablaDe(tabla);

  await db.transaction('rw', [almacen, db.cola_operaciones, db.meta], async () => {
    for (const fila of filas) {
      const existente = await almacen.get(fila.id);
      if (existente) {
        await almacen.update(fila.id, { estado_sync: 'sincronizado', recibido_en: fila.recibido_en });
        await db.cola_operaciones.where('registro_id').equals(fila.id).delete();
      } else {
        await almacen.add({ ...fila, estado_sync: 'sincronizado' });
      }
    }

    // La marca nunca retrocede: con el margen de solapamiento llegan filas anteriores a ella.
    const ultima = filas[filas.length - 1]!.recibido_en;
    const actual = (await db.meta.get(claveMarca(tabla)))?.valor as string | undefined;
    if (!actual || Date.parse(ultima) >= Date.parse(actual)) {
      await db.meta.put({ clave: claveMarca(tabla), valor: ultima });
    }
  });
}

/** Reemplaza la copia local de los datos de referencia (documento 10, sección 4.1). */
export async function reemplazarUsuarios(usuarios: Usuario[]): Promise<void> {
  await db.transaction('rw', db.usuario, async () => {
    await db.usuario.clear();
    await db.usuario.bulkPut(usuarios);
  });
}

export async function reemplazarParametros(parametros: Parametro[]): Promise<void> {
  await db.transaction('rw', db.parametro, async () => {
    await db.parametro.clear();
    await db.parametro.bulkPut(parametros);
  });
}
