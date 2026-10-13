import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../datos/db';
import { crear } from '../datos/repositorio';
import { uuidv7 } from '../datos/uuidv7';
import { rutaImagen } from '../dominio/fotografias';
import { formularioVacio, registrarAnimal } from '../modulos/identificacion/registroAnimal';
import { BUCKET_FOTOGRAFIAS, crearServicioRemoto } from '../servicios/servicioRemotoSupabase';
import type { Identidad } from '../sesion/token';
import { sincronizar } from './motor';
import type { ServicioRemoto } from './servicioRemoto';
import { subir } from './subida';
import { clasificarImagen } from './subidaImagenes';

/**
 * PI-05 · Fotografías contra el servicio de archivos real.
 * Especificación: docs/tecnica/14-fotografias.md, secciones 7 y 11
 *
 * Con la cuenta de prueba (perfil trabajador): registra un animal con su fotografía, la sincroniza con
 * el motor de la aplicación y comprueba las políticas del bucket. npm run prueba:pi-05 borra después
 * los archivos (CLI de Supabase) y los registros (limpiar-usuario-pruebas.sql).
 */

const url = process.env['VITE_SUPABASE_URL']!;
const clave = process.env['VITE_SUPABASE_PUBLISHABLE_KEY']!;
const correo = process.env['PRUEBAS_CORREO'];
const contrasena = process.env['PRUEBAS_CONTRASENA'];

const cliente = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
const almacen = cliente.storage.from(BUCKET_FOTOGRAFIAS);
let servicio: ServicioRemoto;
let identidad: Identidad;
// Serie de pruebas Z950–Z999 (docs/tecnica/13-registro-de-animal.md, sección 2.4).
const chapeta = `Z${950 + Math.floor(Math.random() * 50)}`;
let animalId: string;
let izquierdoId: string;
let derechoId: string;

const webp = (bytes: number) => new Blob([new Uint8Array(bytes).fill(7)], { type: 'image/webp' });

beforeAll(async () => {
  if (!correo || !contrasena) throw new Error('Configure PRUEBAS_CORREO y PRUEBAS_CONTRASENA en .env.local');
  const { data, error } = await cliente.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error || !data.user) throw new Error(`No fue posible ingresar con la cuenta de prueba: ${error?.message}`);
  identidad = { usuario_id: data.user.id, perfil: 'trabajador', nombre: 'Usuario de pruebas', vence_en: 0 };
  servicio = crearServicioRemoto(cliente);

  db.close();
  await db.delete();
  await db.open();
});

describe('PI-05 · Fotografías en el servicio de archivos', () => {
  it('1. el animal y su fotografía suben con el motor: primero los datos y después la completa y la reducida', async () => {
    const r = await registrarAnimal(
      { ...formularioVacio('2026-10-12'), chapeta, sexo: 'hembra', origen: 'nacido', fecha_nacimiento: '2026-01-15' },
      identidad,
      '2026-10-12',
      { izquierdo: { completa: webp(250_000), reducida: webp(40_000) } },
    );
    if (!r.ok) throw new Error('El animal debía registrarse');
    animalId = r.animal.id;
    // La carpeta del animal queda anotada para que la limpieza borre sus archivos.
    mkdirSync('node_modules/.cache', { recursive: true });
    writeFileSync('node_modules/.cache/pi-05-carpetas.json', JSON.stringify([animalId]));
    izquierdoId = (await db.fotografia.where('animal_id').equals(animalId).first())!.id;

    const resultado = await sincronizar(servicio);
    expect(resultado).toMatchObject({ estado: 'completa', imagenes: { subidas: 1, rechazadas: 0 } });
    expect(await db.cola_imagenes.count()).toBe(0);

    const completa = await almacen.download(rutaImagen(animalId, izquierdoId, 'completa'));
    const reducida = await almacen.download(rutaImagen(animalId, izquierdoId, 'reducida'));
    expect(completa.data?.size).toBe(250_000);
    expect(reducida.data?.size).toBe(40_000);
  });

  it('2. subir otra vez el mismo archivo responde «ya existe», que la aplicación trata como éxito', async () => {
    const respuesta = await servicio.subirImagen(rutaImagen(animalId, izquierdoId, 'completa'), webp(10));
    expect(respuesta).toMatchObject({ ok: false, codigo: '409' });
    expect(clasificarImagen(respuesta)).toBe('aceptada');
  });

  it('3. nadie reemplaza ni borra una imagen', async () => {
    const ruta = rutaImagen(animalId, izquierdoId, 'completa');
    const reemplazo = await almacen.upload(ruta, webp(10), { contentType: 'image/webp', upsert: true });
    expect(reemplazo.error).not.toBeNull();

    await almacen.remove([ruta]);
    const despues = await almacen.download(ruta);
    expect(despues.data?.size).toBe(250_000);
  });

  it('4. no se sube una imagen sin su fotografía', async () => {
    const respuesta = await servicio.subirImagen(rutaImagen(animalId, uuidv7(), 'completa'), webp(10));
    expect(respuesta.ok).toBe(false);
    expect(clasificarImagen(respuesta)).toBe('definitiva');
  });

  it('5. el servicio rechaza otro formato y más de 1 MB', async () => {
    // Una fotografía real, sincronizada, sin imagen todavía: la ruta es válida y solo falla lo que se prueba.
    derechoId = (await crear('fotografia', { animal_id: animalId, tipo: 'derecho' }, identidad.usuario_id)).id;
    await subir(servicio);

    const png = await almacen.upload(rutaImagen(animalId, derechoId, 'completa'), new Blob([new Uint8Array(10)], { type: 'image/png' }), {
      contentType: 'image/png',
      upsert: false,
    });
    expect(png.error).not.toBeNull();

    const pesada = await servicio.subirImagen(rutaImagen(animalId, derechoId, 'completa'), webp(1_100_000));
    expect(pesada.ok).toBe(false);
    expect(clasificarImagen(pesada)).toBe('definitiva');
  });
});
