import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../datos/db';
import { uuidv7 } from '../datos/uuidv7';
import { rutaImagen } from '../dominio/fotografias';
import { descartarYCerrar } from '../sesion/cierre';
import { ServicioSimulado } from '../test/servicioSimulado';
import { describirBarra, pasosDeCarga } from '../ui/estadoSincronizacion';
import { leerCargaInicialCompleta } from '../datos/sincronizacionLocal';
import { cargaInicialCompleta, contarLoDescargado, marcarCargaInicialCompleta } from './cargaInicial';
import { sincronizar, suscribirseAlMotor, type EstadoMotor } from './motor';

/**
 * PU-18 · Carga inicial de un teléfono nuevo (apartado 3.7.6).
 * Especificación: docs/tecnica/17-carga-inicial.md, sección 7
 */

const OTRO = uuidv7();
let servicio: ServicioSimulado;

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  servicio = new ServicioSimulado();
  servicio.usuariosRemotos = [{ id: OTRO, nombre: 'José Ramos', perfil: 'propietario' }];
});

/** El predio en el servicio: animales registrados en otro teléfono, con su foto. */
function predioEnElServicio(cantidad: number, { conFotos = true } = {}) {
  for (let i = 1; i <= cantidad; i++) {
    const animal = servicio.sembrar('animal', {
      id: uuidv7(), autor_id: OTRO, creado_en: new Date().toISOString(), codigo_chapeta: String(i), sexo: 'hembra',
      fecha_nacimiento: null, fecha_nacimiento_exacta: false, fecha_ingreso: null, procedencia: null, peso_inicial: null,
      madre_id: null, madre_externa: null, padre_id: null, padre_externo: null,
    });
    const foto = servicio.sembrar('fotografia', { id: uuidv7(), autor_id: OTRO, creado_en: new Date().toISOString(), animal_id: animal.id, tipo: 'izquierdo' });
    if (conFotos) servicio.archivos.set(rutaImagen(animal.id, foto.id, 'reducida'), new Blob([new Uint8Array(30)]));
  }
}

describe('PU-18 · 1. Marca de carga completa (sección 3)', () => {
  it('un teléfono nuevo está en carga inicial; al completarse la bajada de datos, ya no', async () => {
    predioEnElServicio(3);
    expect(await cargaInicialCompleta()).toBe(false);
    await sincronizar(servicio);
    expect(await cargaInicialCompleta()).toBe(true);
    expect(await db.animal.count()).toBe(3);
  });

  it('si la bajada se interrumpe, sigue en carga inicial', async () => {
    predioEnElServicio(3);
    servicio.fallarConsultaEnLlamada = 3; // falla a mitad de las tablas
    const resultado = await sincronizar(servicio);
    expect(resultado.estado).toBe('error_bajada');
    expect(await cargaInicialCompleta()).toBe(false);
  });

  it('se guarda una sola vez: conserva la fecha en que terminó la primera carga', async () => {
    await marcarCargaInicialCompleta(new Date('2026-10-13T08:00:00Z'));
    await marcarCargaInicialCompleta(new Date('2026-10-14T08:00:00Z'));
    expect(await leerCargaInicialCompleta()).toBe('2026-10-13T08:00:00.000Z');
  });

  it('la marca se conserva al cerrar sesión, como la información del predio', async () => {
    predioEnElServicio(1);
    await sincronizar(servicio);
    await descartarYCerrar({ servicio, cerrarServicio: async () => {} });
    expect(await cargaInicialCompleta()).toBe(true);
  });
});

describe('PU-18 · 2. Las fotos no bloquean (sección 3)', () => {
  it('con los datos completos y las fotos todavía sin llegar, la carga se da por terminada', async () => {
    predioEnElServicio(2, { conFotos: false });
    await sincronizar(servicio);
    expect(await cargaInicialCompleta()).toBe(true);
    expect(await db.imagen.count()).toBe(0);
  });
});

describe('PU-18 · 3. Avance (sección 4)', () => {
  it('el motor publica la referencia, los animales, los registros y las fotos con su total, en ese orden', async () => {
    predioEnElServicio(3);
    const avances: NonNullable<EstadoMotor['avance']>[] = [];
    const dejar = suscribirseAlMotor((e) => e.avance && avances.push(e.avance));
    await sincronizar(servicio);
    dejar();

    const conReferencia = avances.findIndex((a) => a.datos?.referencia);
    const conAnimales = avances.findIndex((a) => (a.datos?.animales ?? 0) === 3);
    const conRegistros = avances.findIndex((a) => (a.datos?.registros ?? 0) === 3);
    const fotos = avances.filter((a) => a.fotos).map((a) => a.fotos);
    expect(conReferencia).toBeGreaterThanOrEqual(0);
    expect(conAnimales).toBeGreaterThan(conReferencia);
    expect(conRegistros).toBeGreaterThan(conAnimales);
    expect(fotos[0]).toEqual({ bajadas: 0, total: 3 });
    expect(fotos[fotos.length - 1]).toEqual({ bajadas: 3, total: 3 });
  });

  it('la barra inferior muestra las fotos que se están bajando', () => {
    const [linea] = describirBarra({
      pendientes: 0, imagenes: 0, conflictos: 0, enLinea: true, sincronizando: true, ultima: null, ultimaEn: null,
      ahora: new Date(), fotosBajando: { bajadas: 34, total: 55 },
    });
    expect(linea).toEqual({ icono: '↻', texto: 'Bajando fotos de los animales', detalle: '34 de 55', tono: 'informacion' });
  });
});

describe('PU-18 · 4. Orden de referencia (sección 4, 3.7.6)', () => {
  it('los usuarios y los parámetros se piden antes que las tablas del predio', async () => {
    predioEnElServicio(1);
    const orden: string[] = [];
    const usuarios = servicio.usuarios.bind(servicio);
    const parametros = servicio.parametros.bind(servicio);
    const consultar = servicio.consultar.bind(servicio);
    vi.spyOn(servicio, 'usuarios').mockImplementation(async () => (orden.push('usuarios'), usuarios()));
    vi.spyOn(servicio, 'parametros').mockImplementation(async () => (orden.push('parametros'), parametros()));
    vi.spyOn(servicio, 'consultar').mockImplementation(async (tabla, desde, limite) => (orden.push(tabla), consultar(tabla, desde, limite)));

    await sincronizar(servicio);
    expect(orden.slice(0, 4)).toEqual(['usuarios', 'parametros', 'medicamento', 'animal']);
  });
});

describe('PU-18 · 5. Reanudación (3.7.7)', () => {
  it('una carga interrumpida no vuelve a pedir desde el principio lo que ya aplicó', async () => {
    predioEnElServicio(3);
    servicio.fallarConsultaEnLlamada = 3; // medicamento y animal se aplican; la tercera consulta falla
    await sincronizar(servicio);
    expect(await db.animal.count()).toBe(3);

    servicio.fallarConsultaEnLlamada = undefined;
    servicio.consultas = [];
    await sincronizar(servicio);
    const deAnimal = servicio.consultas.filter((c) => c.tabla === 'animal');
    expect(deAnimal[0]?.desde.tipo).toBe('despues_de');
    expect(await cargaInicialCompleta()).toBe(true);
  });
});

describe('PU-18 · 6. Pasos de la pantalla (corrección tras PE-21)', () => {
  it('al empezar: la referencia en curso, lo demás pendiente', () => {
    expect(pasosDeCarga({ sincronizando: true, tabla: null, usuarios: 0, animales: 0 })).toEqual({
      referencia: 'en_curso', animales: 'pendiente', registros: 'pendiente',
    });
  });

  it('descargando animales y después registros', () => {
    expect(pasosDeCarga({ sincronizando: true, tabla: 'animal', usuarios: 4, animales: 0 })).toMatchObject({ referencia: 'hecho', animales: 'en_curso' });
    expect(pasosDeCarga({ sincronizando: true, tabla: 'pesaje', usuarios: 4, animales: 8 })).toEqual({
      referencia: 'hecho', animales: 'hecho', registros: 'en_curso',
    });
  });

  it('tras una interrupción, lo que ya está en el teléfono sigue hecho; los registros siguen pendientes', () => {
    expect(pasosDeCarga({ sincronizando: false, tabla: null, usuarios: 4, animales: 8 })).toEqual({
      referencia: 'hecho', animales: 'hecho', registros: 'pendiente',
    });
  });

  it('al reanudar, mientras vuelve a pedir la referencia, los animales que ya llegaron no vuelven a «pendiente»', () => {
    expect(pasosDeCarga({ sincronizando: true, tabla: 'medicamento', usuarios: 4, animales: 8 })).toMatchObject({ animales: 'hecho' });
  });

  it('lo descargado se cuenta desde el teléfono, no desde la sincronización en curso', async () => {
    predioEnElServicio(3);
    await sincronizar(servicio);
    expect(await contarLoDescargado()).toEqual({ usuarios: 1, animales: 3, registros: 3 });
  });
});
