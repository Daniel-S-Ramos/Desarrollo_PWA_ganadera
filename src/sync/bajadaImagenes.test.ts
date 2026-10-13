import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../datos/db';
import { uuidv7 } from '../datos/uuidv7';
import { rutaImagen } from '../dominio/fotografias';
import type { TipoFotografia, Uuid } from '../dominio/tipos';
import { ServicioSimulado } from '../test/servicioSimulado';
import { bajarImagenes, clasificarDescarga } from './bajadaImagenes';
import { sincronizar } from './motor';

/**
 * PU-16 · Listado (parte 3: bajada de las imágenes de otros teléfonos).
 * Especificación: docs/tecnica/15-listado-de-animales.md, sección 6
 */

const AHORA = new Date('2026-10-13T10:00:00-05:00');
const OTRO_TELEFONO = uuidv7();
let servicio: ServicioSimulado;

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  servicio = new ServicioSimulado();
});

const reducida = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'image/webp' });

/** Un animal con sus fotos, registrado en otro teléfono y ya llegado a este: datos sincronizados, sin imágenes. */
async function animalDeOtroTelefono(tipos: TipoFotografia[], { conImagenes = true, retirado = false } = {}) {
  const animalId = uuidv7();
  await db.animal.add({
    id: animalId, autor_id: OTRO_TELEFONO, creado_en: AHORA.toISOString(), estado_sync: 'sincronizado',
    codigo_chapeta: String(Math.floor(Math.random() * 9000) + 1), sexo: 'hembra', fecha_nacimiento: null, fecha_nacimiento_exacta: false,
    fecha_ingreso: null, procedencia: null, peso_inicial: null, madre_id: null, madre_externa: null, padre_id: null, padre_externo: null,
  });
  const fotos: Record<string, Uuid> = {};
  for (const tipo of tipos) {
    const id = uuidv7();
    fotos[tipo] = id;
    await db.fotografia.add({ id, animal_id: animalId, tipo, autor_id: OTRO_TELEFONO, creado_en: AHORA.toISOString(), estado_sync: 'sincronizado' });
    if (conImagenes) servicio.archivos.set(rutaImagen(animalId, id, 'reducida'), reducida(30_000));
  }
  if (retirado) {
    await db.salida.add({
      id: uuidv7(), animal_id: animalId, fecha: '2026-10-01', motivo: 'venta', peso_venta: 300, valor_venta: 1, comprador: null,
      causa_muerte: null, autor_id: OTRO_TELEFONO, creado_en: AHORA.toISOString(), estado_sync: 'sincronizado',
    });
  }
  return { animalId, fotos };
}

describe('PU-16 · 6. Bajada de imágenes (sección 6.2)', () => {
  it('baja solo la reducida de la vista principal y la guarda sin completa', async () => {
    const { animalId, fotos } = await animalDeOtroTelefono(['izquierdo', 'derecho', 'frontal']);
    expect(await bajarImagenes(servicio, AHORA)).toEqual({ estado: 'completa', bajadas: 1, no_disponibles: 0 });
    expect(servicio.descargas).toEqual([rutaImagen(animalId, fotos['izquierdo']!, 'reducida')]);
    const guardada = await db.imagen.get(fotos['izquierdo']!);
    expect(guardada).toMatchObject({ animal_id: animalId, completa: null });
    expect(guardada?.reducida?.size).toBe(30_000);
  });

  it('lo que ya está en el teléfono no se vuelve a bajar', async () => {
    await animalDeOtroTelefono(['frontal']);
    await bajarImagenes(servicio, AHORA);
    servicio.descargas = [];
    expect(await bajarImagenes(servicio, AHORA)).toMatchObject({ bajadas: 0 });
    expect(servicio.descargas).toEqual([]);
  });

  it('no baja la de un animal retirado (Tabla 25)', async () => {
    await animalDeOtroTelefono(['izquierdo'], { retirado: true });
    expect(await bajarImagenes(servicio, AHORA)).toMatchObject({ bajadas: 0 });
    expect(servicio.descargas).toEqual([]);
  });

  it('no baja la de una foto de este teléfono que aún no se ha subido', async () => {
    const { fotos } = await animalDeOtroTelefono(['izquierdo']);
    await db.fotografia.update(fotos['izquierdo']!, { estado_sync: 'pendiente' });
    expect(await bajarImagenes(servicio, AHORA)).toMatchObject({ bajadas: 0 });
  });

  it('si llega una principal nueva (el izquierdo de un animal que solo tenía el frente), se baja y la anterior se borra', async () => {
    const { animalId, fotos } = await animalDeOtroTelefono(['frontal']);
    await bajarImagenes(servicio, AHORA);
    const izquierdo = uuidv7();
    await db.fotografia.add({ id: izquierdo, animal_id: animalId, tipo: 'izquierdo', autor_id: OTRO_TELEFONO, creado_en: AHORA.toISOString(), estado_sync: 'sincronizado' });
    servicio.archivos.set(rutaImagen(animalId, izquierdo, 'reducida'), reducida(31_000));

    expect(await bajarImagenes(servicio, AHORA)).toMatchObject({ bajadas: 1 });
    expect((await db.imagen.toArray()).map((i) => i.fotografia_id)).toEqual([izquierdo]);
    expect(await db.imagen.get(fotos['frontal']!)).toBeUndefined();
  });

  it('el motor la ejecuta como cuarta etapa', async () => {
    await animalDeOtroTelefono(['derecho']);
    expect(await sincronizar(servicio)).toMatchObject({ estado: 'completa', imagenesBajadas: { bajadas: 1 } });
  });
});

describe('PU-16 · 7. Imagen que aún no está en el servicio (sección 6.3)', () => {
  it('se anota y no se pide de nuevo antes de 1 hora; pasada la hora, sí', async () => {
    const { animalId, fotos } = await animalDeOtroTelefono(['izquierdo'], { conImagenes: false });
    expect(await bajarImagenes(servicio, AHORA)).toEqual({ estado: 'completa', bajadas: 0, no_disponibles: 1 });

    servicio.descargas = [];
    await bajarImagenes(servicio, new Date(AHORA.getTime() + 59 * 60_000));
    expect(servicio.descargas).toEqual([]);

    // El otro teléfono ya subió la imagen.
    servicio.archivos.set(rutaImagen(animalId, fotos['izquierdo']!, 'reducida'), reducida(30_000));
    expect(await bajarImagenes(servicio, new Date(AHORA.getTime() + 61 * 60_000))).toMatchObject({ bajadas: 1 });
  });
});

describe('PU-16 · 8. Respuestas (sección 6.4)', () => {
  it.each([
    [{ ok: true, imagen: new Blob() } as const, 'recibida'],
    [{ ok: false, codigo: '404', estado: 400, mensaje: 'Object not found' } as const, 'no_existe'],
    [{ ok: false, codigo: '403', estado: 400, mensaje: 'new row violates row-level security policy' } as const, 'no_existe'],
    [{ ok: false, estado: 0, mensaje: 'Failed to fetch' } as const, 'transitoria'],
    [{ ok: false, codigo: '502', estado: 502, mensaje: 'Bad Gateway' } as const, 'transitoria'],
    [{ ok: false, codigo: '403', estado: 400, mensaje: 'jwt expired' } as const, 'sesion'],
  ])('%j → %s', (resultado, clase) => {
    expect(clasificarDescarga(resultado)).toBe(clase);
  });

  it('una falla transitoria detiene la bajada; una sesión vencida también', async () => {
    await animalDeOtroTelefono(['izquierdo']);
    await animalDeOtroTelefono(['izquierdo']);
    servicio.forzarDescarga = () => ({ ok: false, estado: 0, mensaje: 'Failed to fetch' });
    expect(await bajarImagenes(servicio, AHORA)).toMatchObject({ estado: 'detenida', bajadas: 0 });
    expect(servicio.descargas).toHaveLength(1);

    servicio.forzarDescarga = () => ({ ok: false, codigo: '403', estado: 400, mensaje: 'jwt expired' });
    expect(await bajarImagenes(servicio, AHORA)).toMatchObject({ estado: 'sesion_vencida' });
  });
});
