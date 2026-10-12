import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../datos/db';
import { contarPendientes, crear, operacionesPendientes } from '../datos/repositorio';
import { crearServicioRemoto } from '../servicios/servicioRemotoSupabase';
import type { ServicioRemoto } from './servicioRemoto';
import { bajar } from './bajada';
import { subir } from './subida';

/**
 * PI-04 · Sincronización de extremo a extremo contra el servicio real.
 * Especificación: docs/tecnica/10-sincronizacion-bajada.md, sección 8
 *
 * Usa los mismos módulos de la aplicación (repositorio, subida, bajada y el servicio remoto sobre
 * Supabase) con la cuenta de prueba de perfil trabajador. Los registros que crea se borran al
 * terminar con supabase/pruebas/limpiar-usuario-pruebas.sql (npm run prueba:pi-04).
 */

const url = process.env['VITE_SUPABASE_URL']!;
const clave = process.env['VITE_SUPABASE_PUBLISHABLE_KEY']!;
const correo = process.env['PRUEBAS_CORREO'];
const contrasena = process.env['PRUEBAS_CONTRASENA'];

const cliente = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
let servicio: ServicioRemoto;
let usuarioId: string;
// Serie Z900 a Z999, reservada para pruebas (docs/tecnica/13-registro-de-animal.md, sección 2.4). La limpieza la borra al terminar.
const chapeta = `Z${950 + Math.floor(Math.random() * 50)}`;
let animalId: string;
let pesajeId: string;

beforeAll(async () => {
  if (!correo || !contrasena) throw new Error('Configure PRUEBAS_CORREO y PRUEBAS_CONTRASENA en .env.local');
  const { data, error } = await cliente.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error || !data.user) throw new Error(`No fue posible ingresar con la cuenta de prueba: ${error?.message}`);
  usuarioId = data.user.id;
  servicio = crearServicioRemoto(cliente);

  db.close();
  await db.delete();
  await db.open();
});

describe('PI-04 · Sincronización de extremo a extremo', () => {
  it('1. un animal y un pesaje creados en el teléfono llegan al servicio con su autor', async () => {
    const animal = await crear(
      'animal',
      {
        codigo_chapeta: chapeta,
        sexo: 'hembra',
        fecha_nacimiento: '2024-02-10',
        fecha_nacimiento_exacta: false,
        fecha_ingreso: null,
        procedencia: 'Prueba PI-04',
        peso_inicial: null,
        madre_id: null,
        madre_externa: null,
        padre_id: null,
        padre_externo: null,
      },
      usuarioId,
    );
    const pesaje = await crear('pesaje', { animal_id: animal.id, fecha: '2026-10-08', peso: 287.5, metodo: 'cinta' }, usuarioId);
    animalId = animal.id;
    pesajeId = pesaje.id;

    const resumen = await subir(servicio);
    expect(resumen).toMatchObject({ estado: 'completa', enviadas: 2, conflictos: 0 });
    expect(await contarPendientes()).toBe(0);

    const { data } = await cliente.from('pesaje').select('id, autor_id, peso, creado_en, recibido_en').eq('id', pesaje.id).single();
    expect(data).toMatchObject({ id: pesaje.id, autor_id: usuarioId, peso: 287.5 });
    expect(Date.parse(data!.creado_en)).toBe(Date.parse(pesaje.creado_en)); // la fecha de creación no se recalcula (RD-04)
    expect(data!.recibido_en).toBeTruthy();
    expect((await db.pesaje.get(pesaje.id))?.estado_sync).toBe('sincronizado');
  });

  it('2. reenviar los mismos registros no los duplica (3.7.8)', async () => {
    // Simula una confirmación perdida: las operaciones vuelven a la cola.
    for (const [entidad, id] of [['animal', animalId], ['pesaje', pesajeId]] as const) {
      await db.cola_operaciones.add({ entidad, registro_id: id, tipo: 'insertar', intentos: 0, ultimo_intento: null, creado_en: new Date().toISOString() });
    }
    const resumen = await subir(servicio);
    expect(resumen).toMatchObject({ estado: 'completa', enviadas: 2, conflictos: 0 });
    expect(await operacionesPendientes()).toEqual([]);

    const { count } = await cliente.from('animal').select('id', { count: 'exact', head: true }).eq('codigo_chapeta', chapeta);
    expect(count).toBe(1);
  });

  it('3. un teléfono vacío recupera el animal y el pesaje con la carga inicial', async () => {
    db.close();
    await db.delete();
    await db.open();

    const { filas } = await bajar(servicio);

    expect(filas).toBeGreaterThanOrEqual(2);
    expect(await db.animal.get(animalId)).toMatchObject({ codigo_chapeta: chapeta, estado_sync: 'sincronizado' });
    expect(await db.pesaje.get(pesajeId)).toMatchObject({ peso: 287.5, autor_id: usuarioId, estado_sync: 'sincronizado' });
    expect(await db.usuario.count()).toBeGreaterThanOrEqual(4); // los tres usuarios del predio y el de pruebas
    expect(await db.parametro.count()).toBeGreaterThanOrEqual(7);
  });

  it('4. el trabajador de prueba no recibe información económica', async () => {
    expect(await db.movimiento_economico.count()).toBe(0);
  });
});
