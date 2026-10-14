import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../datos/db';
import { unidadDeTrabajo } from '../datos/repositorio';
import { uuidv7 } from '../datos/uuidv7';
import type { TipoFotografia, Uuid } from '../dominio/tipos';
import { formularioVacio, registrarAnimal, type FormularioAnimal, type FotosCapturadas } from '../modulos/identificacion/registroAnimal';
import type { Identidad } from '../sesion/token';
import { ServicioSimulado } from '../test/servicioSimulado';
import { sincronizar } from './motor';
import { subir } from './subida';
import { clasificarImagen, subirImagenes } from './subidaImagenes';

/**
 * PU-15 · Fotografías (parte 2: guardado, cola y subida). Especificación: docs/tecnica/14-fotografias.md, sección 11
 */

const HOY = '2026-10-12';
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };
let servicio: ServicioSimulado;

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  servicio = new ServicioSimulado();
});

const imagen = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'image/webp' });
const foto = () => ({ completa: imagen(250_000), reducida: imagen(40_000) });

function formulario(chapeta: string): FormularioAnimal {
  return { ...formularioVacio(HOY), chapeta, sexo: 'hembra', origen: 'nacido', fecha_nacimiento: '2026-01-15' };
}

function fotos(...tipos: TipoFotografia[]): FotosCapturadas {
  return Object.fromEntries(tipos.map((t) => [t, foto()]));
}

async function registrar(chapeta: string, ...tipos: TipoFotografia[]) {
  const r = await registrarAnimal(formulario(chapeta), TRABAJADOR, HOY, fotos(...tipos));
  if (!r.ok) throw new Error('debía registrarse');
  return r;
}

const fotografiaDe = async (animalId: Uuid, tipo: TipoFotografia) =>
  (await db.fotografia.where('animal_id').equals(animalId).toArray()).find((f) => f.tipo === tipo)!;

describe('PU-15 · 3. Guardar con fotografías (sección 5)', () => {
  it('en una transacción: animal, tres fotografías, sus imágenes y la cola de imágenes', async () => {
    const r = await registrar('45', 'izquierdo', 'derecho', 'frontal');
    expect(r.fotografias).toBe(3);
    const fotografias = await db.fotografia.where('animal_id').equals(r.animal.id).toArray();
    expect(fotografias.map((f) => f.tipo).sort()).toEqual(['derecho', 'frontal', 'izquierdo']);
    expect(fotografias.every((f) => f.estado_sync === 'pendiente' && f.autor_id === TRABAJADOR.usuario_id)).toBe(true);
    expect(await db.imagen.count()).toBe(3);
    expect(await db.cola_imagenes.count()).toBe(3);
    // Animal y fotografías también viajan por la cola de datos.
    expect((await db.cola_operaciones.toArray()).map((o) => o.entidad)).toEqual(['animal', 'fotografia', 'fotografia', 'fotografia']);
  });

  it('si el animal se rechaza por la chapeta, no queda ninguna fotografía ni imagen', async () => {
    await registrar('45');
    const r = await registrarAnimal(formulario('045'), TRABAJADOR, HOY, fotos('izquierdo'));
    expect(r.ok).toBe(false);
    expect(await db.fotografia.count()).toBe(0);
    expect(await db.imagen.count()).toBe(0);
    expect(await db.cola_imagenes.count()).toBe(0);
  });
});

describe('PU-15 · 4. Registro fotográfico incompleto (CU-02, 6a)', () => {
  it.each([[[] as TipoFotografia[]], [['frontal'] as TipoFotografia[]], [['izquierdo', 'derecho'] as TipoFotografia[]]])(
    'con %j el animal se guarda e informa cuántas tiene',
    async (tipos) => {
      const r = await registrar('7', ...tipos);
      expect(r.fotografias).toBe(tipos.length);
      expect(await db.animal.get(r.animal.id)).toBeDefined();
      expect(await db.fotografia.count()).toBe(tipos.length);
    },
  );
});

describe('PU-15 · 5. Una imagen solo sube si su fotografía ya llegó (sección 6.2)', () => {
  it('con la fotografía pendiente no se sube nada', async () => {
    await registrar('45', 'izquierdo');
    const resumen = await subirImagenes(servicio);
    expect(resumen).toMatchObject({ estado: 'completa', subidas: 0, esperando_fotografia: 1 });
    expect(servicio.subidas).toEqual([]);
    expect(await db.cola_imagenes.count()).toBe(1);
  });

  it('el motor sube primero los datos y al final las imágenes, completa y reducida', async () => {
    const r = await registrar('45', 'izquierdo');
    const izquierdo = await fotografiaDe(r.animal.id, 'izquierdo');
    const resultado = await sincronizar(servicio);
    expect(resultado).toMatchObject({ estado: 'completa', imagenes: { subidas: 1 } });
    expect(servicio.subidas).toEqual([`${r.animal.id}/${izquierdo.id}.webp`, `${r.animal.id}/${izquierdo.id}-reducida.webp`]);
    expect(servicio.archivos.get(`${r.animal.id}/${izquierdo.id}.webp`)?.size).toBe(250_000);
    expect(await db.cola_imagenes.count()).toBe(0);
  });

  it('una fotografía en conflicto deja su imagen en la cola', async () => {
    const r = await registrar('45', 'izquierdo');
    await subir(servicio);
    await db.fotografia.update((await fotografiaDe(r.animal.id, 'izquierdo')).id, { estado_sync: 'conflicto' });
    expect(await subirImagenes(servicio)).toMatchObject({ subidas: 0, esperando_fotografia: 1 });
    expect(await db.cola_imagenes.count()).toBe(1);
  });
});

describe('PU-15 · 6. Respuestas del servicio de archivos (sección 6.3)', () => {
  it.each([
    [{ ok: true } as const, 'aceptada'],
    [{ ok: false, codigo: '409', estado: 400, mensaje: 'The resource already exists' } as const, 'aceptada'],
    [{ ok: false, estado: 0, mensaje: 'Failed to fetch' } as const, 'transitoria'],
    [{ ok: false, codigo: '503', estado: 503, mensaje: 'Service Unavailable' } as const, 'transitoria'],
    [{ ok: false, codigo: '403', estado: 400, mensaje: 'jwt expired' } as const, 'sesion'],
    [{ ok: false, codigo: '401', estado: 401, mensaje: 'Unauthorized' } as const, 'sesion'],
    [{ ok: false, codigo: '403', estado: 400, mensaje: 'new row violates row-level security policy' } as const, 'definitiva'],
    [{ ok: false, codigo: '415', estado: 400, mensaje: 'invalid_mime_type' } as const, 'definitiva'],
    [{ ok: false, codigo: '413', estado: 413, mensaje: 'Payload too large' } as const, 'definitiva'],
  ])('%j → %s', (resultado, clase) => {
    expect(clasificarImagen(resultado)).toBe(clase);
  });

  it('«ya existe» confirma la imagen (la confirmación anterior se perdió)', async () => {
    const r = await registrar('45', 'izquierdo');
    await subir(servicio);
    const izquierdo = await fotografiaDe(r.animal.id, 'izquierdo');
    servicio.archivos.set(`${r.animal.id}/${izquierdo.id}.webp`, imagen(1));
    expect(await subirImagenes(servicio)).toMatchObject({ subidas: 1 });
    expect(await db.cola_imagenes.count()).toBe(0);
  });

  it('una falla transitoria detiene la subida y suma un intento', async () => {
    await registrar('45', 'izquierdo');
    await registrar('46', 'izquierdo');
    await subir(servicio);
    servicio.forzarImagen = () => ({ ok: false, estado: 0, mensaje: 'Failed to fetch' });
    expect(await subirImagenes(servicio)).toMatchObject({ estado: 'detenida', subidas: 0 });
    expect(servicio.subidas).toHaveLength(1);
    expect((await db.cola_imagenes.toArray()).map((e) => e.intentos)).toEqual([1, 0]);
  });

  it('una sesión vencida detiene la subida', async () => {
    await registrar('45', 'izquierdo');
    await subir(servicio);
    servicio.forzarImagen = () => ({ ok: false, codigo: '403', estado: 400, mensaje: 'jwt expired' });
    expect(await subirImagenes(servicio)).toMatchObject({ estado: 'sesion_vencida' });
    expect(await db.cola_imagenes.count()).toBe(1);
  });

  it('un rechazo definitivo registra el intento y sigue con la siguiente', async () => {
    const primero = await registrar('45', 'izquierdo');
    await registrar('46', 'izquierdo');
    await subir(servicio);
    servicio.forzarImagen = (ruta) =>
      ruta.startsWith(primero.animal.id) ? { ok: false, codigo: '403', estado: 400, mensaje: 'new row violates row-level security policy' } : undefined;
    expect(await subirImagenes(servicio)).toMatchObject({ estado: 'completa', subidas: 1, rechazadas: 1 });
    expect((await db.cola_imagenes.toArray()).map((e) => e.intentos)).toEqual([1]);
  });
});

describe('PU-15 · 7. Limpieza tras subir (sección 6.3, Tabla 25)', () => {
  it('se borra la completa de todas; solo la vista principal conserva su reducida', async () => {
    const r = await registrar('45', 'izquierdo', 'derecho', 'frontal');
    await sincronizar(servicio);
    const imagenes = await db.imagen.toArray();
    expect(imagenes).toHaveLength(1);
    expect(imagenes[0]).toMatchObject({ fotografia_id: (await fotografiaDe(r.animal.id, 'izquierdo')).id, completa: null });
    expect(imagenes[0]!.reducida?.size).toBe(40_000);
  });

  it('sin izquierdo, la principal es el derecho', async () => {
    const r = await registrar('45', 'derecho', 'frontal');
    await sincronizar(servicio);
    expect((await db.imagen.toArray()).map((i) => i.fotografia_id)).toEqual([(await fotografiaDe(r.animal.id, 'derecho')).id]);
  });

  it('una imagen que aún espera en la cola no se toca', async () => {
    const r = await registrar('45', 'izquierdo', 'frontal');
    await subir(servicio);
    const frontal = await fotografiaDe(r.animal.id, 'frontal');
    servicio.forzarImagen = (ruta) => (ruta.includes(frontal.id) ? { ok: false, codigo: '403', estado: 400, mensaje: 'rechazada' } : undefined);
    await subirImagenes(servicio);
    const deFrente = await db.imagen.get(frontal.id);
    expect(deFrente?.completa?.size).toBe(250_000);
    expect(deFrente?.reducida?.size).toBe(40_000);
  });

  it('si luego llega el izquierdo, la reducida del frente se borra y queda la del izquierdo', async () => {
    const r = await registrar('45', 'frontal');
    await sincronizar(servicio);
    expect(await db.imagen.count()).toBe(1);

    await unidadDeTrabajo(TRABAJADOR.usuario_id, async (tx) => {
      const izquierdo = await tx.crear('fotografia', { animal_id: r.animal.id, tipo: 'izquierdo' });
      await tx.guardarImagen(izquierdo, foto());
    });
    await sincronizar(servicio);
    expect((await db.imagen.toArray()).map((i) => i.fotografia_id)).toEqual([(await fotografiaDe(r.animal.id, 'izquierdo')).id]);
  });
});
