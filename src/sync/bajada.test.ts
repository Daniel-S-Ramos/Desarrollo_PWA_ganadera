import { beforeEach, describe, expect, it } from 'vitest';
import { db, TABLAS_SINCRONIZABLES } from '../datos/db';
import { contarPendientes, crear } from '../datos/repositorio';
import { leerMarca } from '../datos/sincronizacionLocal';
import { uuidv7 } from '../datos/uuidv7';
import type { Uuid } from '../dominio/tipos';
import { ServicioSimulado } from '../test/servicioSimulado';
import { bajar, MARGEN_MS, TAMANO_PAGINA } from './bajada';
import { subir } from './subida';

/**
 * PU-11 · Sincronización, bajada y carga inicial (apartados 3.7.5 a 3.7.8, Tabla 21).
 * Especificación: docs/tecnica/10-sincronizacion-bajada.md, sección 8
 */

let servicio: ServicioSimulado;
const PROPIETARIO: Uuid = uuidv7();

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  servicio = new ServicioSimulado();
});

const pesajeRemoto = (animalId: Uuid, peso: number) => ({
  id: uuidv7(),
  autor_id: PROPIETARIO,
  creado_en: '2026-10-08T06:00:00.000Z',
  animal_id: animalId,
  fecha: '2026-10-08',
  peso,
  metodo: 'bascula',
});

describe('PU-11 · 1 y 2. Filas nuevas y existentes', () => {
  it('una fila de otro dispositivo se agrega sincronizada y con su recibido_en', async () => {
    const remota = servicio.sembrar('pesaje', pesajeRemoto(uuidv7(), 300));
    await bajar(servicio);
    expect(await db.pesaje.get(remota.id)).toMatchObject({ peso: 300, estado_sync: 'sincronizado', recibido_en: remota.recibido_en });
  });

  it('el registro propio que vuelve no se duplica ni cambia sus datos', async () => {
    const vaca = await crear(
      'animal',
      { codigo_chapeta: '012', sexo: 'hembra', fecha_nacimiento: null, fecha_nacimiento_exacta: false, fecha_ingreso: null, procedencia: null, peso_inicial: null, madre_id: null, madre_externa: null, padre_id: null, padre_externo: null },
      PROPIETARIO,
    );
    await subir(servicio);
    await bajar(servicio);
    expect(await db.animal.count()).toBe(1);
    expect(await db.animal.get(vaca.id)).toMatchObject({ codigo_chapeta: '012', creado_en: vaca.creado_en, estado_sync: 'sincronizado' });
  });

  it('si el envío llegó pero la confirmación se perdió, la bajada lo marca sincronizado y retira su operación', async () => {
    const vaca = await crear(
      'animal',
      { codigo_chapeta: '012', sexo: 'hembra', fecha_nacimiento: null, fecha_nacimiento_exacta: false, fecha_ingreso: null, procedencia: null, peso_inicial: null, madre_id: null, madre_externa: null, padre_id: null, padre_externo: null },
      PROPIETARIO,
    );
    servicio.sembrar('animal', { ...vaca, estado_sync: undefined });
    await bajar(servicio);
    expect((await db.animal.get(vaca.id))?.estado_sync).toBe('sincronizado');
    expect(await contarPendientes()).toBe(0);
  });
});

describe('PU-11 · 3. Marca de avance', () => {
  it('tras aplicar una página, la marca es el mayor recibido_en recibido, con la precisión del servicio', async () => {
    servicio.sembrar('pesaje', pesajeRemoto(uuidv7(), 300));
    const ultima = servicio.sembrar('pesaje', pesajeRemoto(uuidv7(), 310));
    await bajar(servicio);
    expect(await leerMarca('pesaje')).toBe(ultima.recibido_en);
    expect(ultima.recibido_en).toMatch(/\.\d{6}\+00:00$/); // microsegundos conservados
  });
});

describe('PU-11 · 4 y 5. Ventana de solapamiento (sección 3)', () => {
  it('la descarga siguiente pide desde la marca menos 2 minutos', async () => {
    const remota = servicio.sembrar('pesaje', pesajeRemoto(uuidv7(), 300));
    await bajar(servicio);
    servicio.consultas = [];
    await bajar(servicio);
    const consulta = servicio.consultas.find((c) => c.tabla === 'pesaje')!;
    expect(consulta.desde).toEqual({
      tipo: 'despues_de',
      recibido_en: new Date(Date.parse(remota.recibido_en) - MARGEN_MS).toISOString(),
    });
  });

  it('una fila con recibido_en anterior a la marca, que no estaba visible, llega en la descarga siguiente', async () => {
    const posterior = servicio.sembrar('pesaje', pesajeRemoto(uuidv7(), 310), '2026-10-08T10:00:00.300000+00:00');
    await bajar(servicio);
    expect(await leerMarca('pesaje')).toBe(posterior.recibido_en);

    // La transacción del trabajador terminó después: su fila tiene una marca anterior (0.100).
    const saltada = servicio.sembrar('pesaje', pesajeRemoto(uuidv7(), 300), '2026-10-08T10:00:00.100000+00:00');
    await bajar(servicio);

    expect(await db.pesaje.get(saltada.id)).toBeDefined();
    expect(await leerMarca('pesaje')).toBe(posterior.recibido_en); // la marca no retrocede
  });
});

describe('PU-11 · 6. Páginas', () => {
  it('con más de 1.000 filas se piden varias páginas hasta vaciar la tabla', async () => {
    for (let i = 0; i < 2_350; i++) servicio.sembrar('pesaje', pesajeRemoto(uuidv7(), 200 + i));
    await bajar(servicio);
    expect(await db.pesaje.count()).toBe(2_350);
    expect(servicio.consultas.filter((c) => c.tabla === 'pesaje')).toHaveLength(3);
  });

  it('con 2.500 filas recibidas en el mismo instante la descarga termina sin repetir páginas (sección 3.3)', async () => {
    const mismoInstante = '2026-10-08T10:00:00.000000+00:00';
    for (let i = 0; i < 2_500; i++) servicio.sembrar('pesaje', pesajeRemoto(uuidv7(), 200 + i), mismoInstante);
    await bajar(servicio);
    expect(await db.pesaje.count()).toBe(2_500);
    const paginas = servicio.consultas.filter((c) => c.tabla === 'pesaje');
    expect(paginas).toHaveLength(3);
    expect(paginas[1]!.desde.tipo).toBe('cursor');
  });
});

describe('PU-11 · 7. Interrupción', () => {
  it('si la descarga falla a mitad de una tabla, las páginas anteriores quedan aplicadas con su marca', async () => {
    for (let i = 0; i < TAMANO_PAGINA + 500; i++) servicio.sembrar('medicamento', { id: uuidv7(), nombre: `Medicamento ${i}` });
    servicio.fallarConsultaEnLlamada = 2; // falla la segunda página

    await expect(bajar(servicio)).rejects.toThrow('Sin conexión');
    expect(await db.medicamento.count()).toBe(TAMANO_PAGINA);
    const marca = await leerMarca('medicamento');
    expect(marca).toBe(servicio.filas('medicamento')[TAMANO_PAGINA - 1]!.recibido_en);

    // El intento siguiente continúa desde la marca, sin perder ni duplicar.
    servicio.fallarConsultaEnLlamada = undefined;
    await bajar(servicio);
    expect(await db.medicamento.count()).toBe(TAMANO_PAGINA + 500);
  });
});

describe('PU-11 · 8. Orden', () => {
  it('las tablas se descargan en el orden de sus dependencias', async () => {
    await bajar(servicio);
    const orden = [...new Set(servicio.consultas.map((c) => c.tabla))];
    expect(orden).toEqual([...TABLAS_SINCRONIZABLES]);
    expect(orden.indexOf('animal')).toBeLessThan(orden.indexOf('pesaje'));
    expect(orden.indexOf('medicamento')).toBeLessThan(orden.indexOf('evento_sanitario'));
  });
});

describe('PU-11 · 9. Datos de referencia', () => {
  it('usuario y parametro reemplazan la copia local', async () => {
    await db.usuario.put({ id: uuidv7(), nombre: 'Usuario que ya no existe', perfil: 'trabajador' });
    servicio.usuariosRemotos = [{ id: PROPIETARIO, nombre: 'José Ramos', perfil: 'propietario' }];
    servicio.parametrosRemotos = [{ clave: 'dias_sin_ordeno', valor: 3, unidad: 'días', descripcion: '…' }];

    await bajar(servicio);

    expect(await db.usuario.toArray()).toEqual(servicio.usuariosRemotos);
    expect(await db.parametro.get('dias_sin_ordeno')).toMatchObject({ valor: 3 });
  });
});

describe('PU-11 · 10. Carga inicial', () => {
  it('con el teléfono vacío se descarga todo el estado del predio', async () => {
    const vaca = servicio.sembrar('animal', { id: uuidv7(), codigo_chapeta: '012' });
    servicio.sembrar('pesaje', pesajeRemoto(vaca.id, 300));
    servicio.sembrar('produccion_leche', { id: uuidv7(), animal_id: vaca.id, fecha: '2026-10-08', litros: 6.5 });

    const { filas } = await bajar(servicio);

    expect(filas).toBe(3);
    expect(await db.animal.count()).toBe(1);
    expect(await db.pesaje.count()).toBe(1);
    expect(await db.produccion_leche.count()).toBe(1);
    expect(servicio.consultas.every((c) => c.desde.tipo === 'inicio')).toBe(true);
  });
});
