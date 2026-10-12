import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../datos/db';
import { contarPendientes, crear, operacionesPendientes } from '../datos/repositorio';
import { uuidv7 } from '../datos/uuidv7';
import type { DatosNuevos, Uuid } from '../dominio/tipos';
import { ServicioSimulado } from '../test/servicioSimulado';
import { sincronizar } from './motor';
import { clasificar, subir } from './subida';

/**
 * PU-10 · Sincronización, subida y conflictos (apartados 3.7.2 a 3.7.8 y 3.8.6, Tablas 21 y 22).
 * Especificación: docs/tecnica/09-sincronizacion-subida.md, sección 9
 */

const TRABAJADOR: Uuid = uuidv7();
let servicio: ServicioSimulado;

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  servicio = new ServicioSimulado();
});

function animal(codigo: string): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: '2022-03-15',
    fecha_nacimiento_exacta: true,
    fecha_ingreso: null,
    procedencia: null,
    peso_inicial: null,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
  };
}

const pesaje = (animalId: Uuid, peso: number): DatosNuevos<'pesaje'> => ({ animal_id: animalId, fecha: '2026-10-08', peso, metodo: 'cinta' });

describe('PU-10 · 1. Envío en orden', () => {
  it('las operaciones se envían en el orden de la cola, salen de ella y los registros quedan sincronizados', async () => {
    const vaca = await crear('animal', animal('012'), TRABAJADOR);
    const p1 = await crear('pesaje', pesaje(vaca.id, 300), TRABAJADOR);
    const p2 = await crear('pesaje', pesaje(vaca.id, 305), TRABAJADOR);

    const resumen = await subir(servicio);

    expect(resumen).toMatchObject({ estado: 'completa', enviadas: 3 });
    expect(servicio.insertados.map((i) => i.fila['id'])).toEqual([vaca.id, p1.id, p2.id]);
    expect(await contarPendientes()).toBe(0);
    const guardado = await db.pesaje.get(p2.id);
    expect(guardado?.estado_sync).toBe('sincronizado');
    expect(guardado?.recibido_en).toMatch(/\+00:00$/);
  });
});

describe('PU-10 · 2. Atributos locales', () => {
  it('lo que viaja no incluye estado_sync, recibido_en ni detalle_conflicto, y conserva autor y fecha de creación', async () => {
    const vaca = await crear('animal', animal('012'), TRABAJADOR);
    await subir(servicio);
    const enviado = servicio.insertados[0]!.fila;
    expect(enviado).not.toHaveProperty('estado_sync');
    expect(enviado).not.toHaveProperty('recibido_en');
    expect(enviado).not.toHaveProperty('detalle_conflicto');
    expect(enviado).toMatchObject({ id: vaca.id, autor_id: TRABAJADOR, creado_en: vaca.creado_en });
  });
});

describe('PU-10 · 3. Idempotencia (3.7.8)', () => {
  it('un identificador que el servicio ya tenía se trata como aceptado', async () => {
    const vaca = await crear('animal', animal('012'), TRABAJADOR);
    // El envío anterior llegó, pero la confirmación se perdió con la señal.
    servicio.sembrar('animal', { ...vaca });

    expect(await subir(servicio)).toMatchObject({ estado: 'completa', enviadas: 1, conflictos: 0 });
    expect(await contarPendientes()).toBe(0);
    expect(servicio.filas('animal')).toHaveLength(1);
    expect((await db.animal.get(vaca.id))?.estado_sync).toBe('sincronizado');
  });
});

describe('PU-10 · 4. Falla de red', () => {
  it('la subida se detiene, la operación se queda con un intento más y el registro vuelve a pendiente', async () => {
    const vaca = await crear('animal', animal('012'), TRABAJADOR);
    await crear('pesaje', pesaje(vaca.id, 300), TRABAJADOR);
    servicio.forzar = () => ({ ok: false, mensaje: 'TypeError: Failed to fetch' });

    expect(await subir(servicio)).toMatchObject({ estado: 'detenida_sin_red', enviadas: 0 });
    expect(servicio.insertados).toHaveLength(1); // no siguió con el pesaje
    const [primera, segunda] = await operacionesPendientes();
    expect(primera).toMatchObject({ registro_id: vaca.id, intentos: 1 });
    expect(primera?.ultimo_intento).not.toBeNull();
    expect(segunda?.intentos).toBe(0);
    expect((await db.animal.get(vaca.id))?.estado_sync).toBe('pendiente');
  });

  it('un error 5xx del servicio también es transitorio', () => {
    expect(clasificar({ ok: false, estado: 503, mensaje: 'Service Unavailable' })).toBe('transitoria');
  });
});

describe('PU-10 · 5. Dependencia', () => {
  it('una clave foránea inexistente deja la operación en la cola y la subida continúa con la siguiente', async () => {
    const pesajeHuerfano = await crear('pesaje', pesaje(uuidv7(), 300), TRABAJADOR); // su animal no está en el servicio
    const otraVaca = await crear('animal', animal('031'), TRABAJADOR);

    const resumen = await subir(servicio);

    expect(resumen).toMatchObject({ estado: 'completa', enviadas: 1, pendientes_por_dependencia: 1 });
    expect((await operacionesPendientes()).map((o) => o.registro_id)).toEqual([pesajeHuerfano.id]);
    expect((await db.animal.get(otraVaca.id))?.estado_sync).toBe('sincronizado');
    expect((await db.pesaje.get(pesajeHuerfano.id))?.estado_sync).toBe('pendiente');
  });
});

describe('PU-10 · 6. Rechazo definitivo', () => {
  it('un rechazo de política retira la operación y deja el registro en conflicto con la causa', async () => {
    const vaca = await crear('animal', animal('012'), TRABAJADOR);
    servicio.forzar = () => ({ ok: false, codigo: '42501', estado: 403, mensaje: 'new row violates row-level security policy' });

    expect(await subir(servicio)).toMatchObject({ conflictos: 1 });
    expect(await contarPendientes()).toBe(0);
    const guardado = await db.animal.get(vaca.id);
    expect(guardado?.estado_sync).toBe('conflicto');
    expect(guardado?.detalle_conflicto).toBe('El servicio rechazó el registro por los permisos del perfil.');
  });
});

describe('PU-10 · 7. Chapeta repetida (3.7.3, tercera regla)', () => {
  it('el animal queda en conflicto con la causa, no se descarta, y la operación sale de la cola', async () => {
    servicio.sembrar('animal', { id: uuidv7(), codigo_chapeta: '045', autor_id: uuidv7() });
    const delTrabajador = await crear('animal', animal('045'), TRABAJADOR);

    expect(await subir(servicio)).toMatchObject({ conflictos: 1 });
    const guardado = await db.animal.get(delTrabajador.id);
    expect(guardado?.estado_sync).toBe('conflicto');
    expect(guardado?.detalle_conflicto).toBe('El código de chapeta ya está asignado a otro animal.');
    expect(await contarPendientes()).toBe(0);
  });
});

describe('PU-10 · 8. Ordeño duplicado (3.8.6)', () => {
  it('se convierte en una corrección del campo litros sobre el ordeño aceptado y el ordeño local se retira', async () => {
    const vaca = servicio.sembrar('animal', { id: uuidv7(), codigo_chapeta: '012' });
    const aceptado = servicio.sembrar('produccion_leche', { id: uuidv7(), animal_id: vaca.id, fecha: '2026-10-08', litros: 6.5 });
    const local = await crear('produccion_leche', { animal_id: vaca.id, fecha: '2026-10-08', litros: 7 }, TRABAJADOR);

    await subir(servicio);

    expect(await db.produccion_leche.get(local.id)).toBeUndefined();
    const enviada = servicio.filas('correccion')[0];
    expect(enviada).toMatchObject({
      entidad_afectada: 'produccion_leche',
      registro_id: aceptado.id,
      tipo: 'correccion',
      campo: 'litros',
      valor_anterior: '6.5',
      valor_nuevo: '7',
      motivo: 'registro_duplicado',
      autor_id: TRABAJADOR,
    });
    expect(await contarPendientes()).toBe(0); // la corrección se envió en la misma subida
  });

  it('si el servicio rechaza la corrección por permisos (ordeño del propietario), queda en conflicto conservando el valor', async () => {
    const vaca = servicio.sembrar('animal', { id: uuidv7(), codigo_chapeta: '012' });
    servicio.sembrar('produccion_leche', { id: uuidv7(), animal_id: vaca.id, fecha: '2026-10-08', litros: 6.5 });
    await crear('produccion_leche', { animal_id: vaca.id, fecha: '2026-10-08', litros: 7 }, TRABAJADOR);
    servicio.forzar = (tabla) =>
      tabla === 'correccion' ? { ok: false, codigo: '42501', estado: 403, mensaje: 'new row violates row-level security policy' } : undefined;

    await subir(servicio);

    const [correccion] = await db.correccion.toArray();
    expect(correccion).toMatchObject({ valor_nuevo: '7', estado_sync: 'conflicto' });
    expect(correccion?.detalle_conflicto).toContain('Solo el propietario puede reemplazar este ordeño');
  });
});

describe('PU-10 · 9. Registros en transmisión', () => {
  it('al empezar, los registros que quedaron en transmisión vuelven a pendiente y se reenvían', async () => {
    const vaca = await crear('animal', animal('012'), TRABAJADOR);
    await db.animal.update(vaca.id, { estado_sync: 'en_transmision' }); // la aplicación se cerró a mitad de un envío
    servicio.forzar = () => ({ ok: false, mensaje: 'sin red' });

    await subir(servicio);
    expect((await db.animal.get(vaca.id))?.estado_sync).toBe('pendiente');
  });
});

describe('PU-10 · 10. Una a la vez', () => {
  it('una segunda sincronización simultánea se omite', async () => {
    await crear('animal', animal('012'), TRABAJADOR);
    const [primera, segunda] = await Promise.all([sincronizar(servicio), sincronizar(servicio)]);
    expect([primera.estado, segunda.estado].sort()).toEqual(['completa', 'omitida']);
    expect(servicio.insertados).toHaveLength(1);
  });
});

describe('PU-10 · 11. Sesión vencida', () => {
  it('si no hay sesión vigente, la subida se suspende sin tocar la cola', async () => {
    await crear('animal', animal('012'), TRABAJADOR);
    servicio.sesion = false;
    expect(await subir(servicio)).toMatchObject({ estado: 'sesion_vencida', enviadas: 0 });
    expect(servicio.insertados).toHaveLength(0);
    expect((await operacionesPendientes())[0]?.intentos).toBe(0);
  });
});
