import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../datos/db';
import { contarPendientes, crear } from '../datos/repositorio';
import { uuidv7 } from '../datos/uuidv7';
import type { DatosNuevos, Uuid } from '../dominio/tipos';
import { ServicioSimulado } from '../test/servicioSimulado';
import {
  descartarYCerrar,
  enviarYCerrar,
  intentarCerrar,
  textoNoCerrada,
  textoPendientes,
  textoSegundaConfirmacion,
  type DependenciasCierre,
} from './cierre';
import { definirCodigo, hayCodigoDefinido } from './desbloqueo';
import { leerSesionLocal } from './sesionLocal';

/**
 * PU-13 · Cierre de sesión con la cola vacía (apartado 3.9.1, Tabla 31).
 * Especificación: docs/tecnica/12-cierre-de-sesion.md, sección 6
 */

const TRABAJADOR: Uuid = uuidv7();
let servicio: ServicioSimulado;
let dependencias: DependenciasCierre & { cerrarServicio: ReturnType<typeof vi.fn> };

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  servicio = new ServicioSimulado();
  dependencias = { servicio, cerrarServicio: vi.fn().mockResolvedValue(undefined) };
  // Sesión abierta con código definido.
  await db.meta.put({
    clave: 'sesion',
    valor: { identidad: { usuario_id: TRABAJADOR, perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 }, token: 't', clave_publica: {}, emisor: 'e', verificada_en: '' },
  });
  await definirCodigo('2580', 1_000);
});

const animal = (codigo: string): DatosNuevos<'animal'> => ({
  codigo_chapeta: codigo,
  sexo: 'hembra',
  fecha_nacimiento: null,
  fecha_nacimiento_exacta: false,
  fecha_ingreso: null,
  procedencia: null,
  peso_inicial: null,
  madre_id: null,
  madre_externa: null,
  padre_id: null,
  padre_externo: null,
});

async function sesionCerrada() {
  return (await leerSesionLocal()) === undefined && !(await hayCodigoDefinido()) && dependencias.cerrarServicio.mock.calls.length === 1;
}

describe('PU-13 · 1. Sin pendientes', () => {
  it('se cierra: se borran la sesión local, el código y la sesión del servicio; la información del predio se conserva', async () => {
    const vaca = servicio.sembrar('animal', { id: uuidv7(), codigo_chapeta: '012' });
    await db.animal.put({ ...(vaca as Record<string, unknown>), estado_sync: 'sincronizado' } as never);

    expect(await intentarCerrar(dependencias)).toEqual({ cerrada: true });
    expect(await sesionCerrada()).toBe(true);
    expect(await db.animal.count()).toBe(1);
  });
});

describe('PU-13 · 2. Con pendientes', () => {
  it('no se cierra sin una decisión y se informa la cantidad', async () => {
    await crear('animal', animal('012'), TRABAJADOR);
    await crear('animal', animal('031'), TRABAJADOR);

    expect(await intentarCerrar(dependencias)).toEqual({ cerrada: false, pendientes: 2, imagenes: 0, motivo: 'pendientes' });
    expect(await leerSesionLocal()).toBeDefined();
    expect(dependencias.cerrarServicio).not.toHaveBeenCalled();
  });
});

describe('PU-13 · 3. Enviar y cerrar con éxito', () => {
  it('se sincroniza, la cola queda vacía y se cierra', async () => {
    await crear('animal', animal('012'), TRABAJADOR);

    expect(await enviarYCerrar(dependencias)).toEqual({ cerrada: true });
    expect(servicio.filas('animal')).toHaveLength(1);
    expect(await contarPendientes()).toBe(0);
    expect(await sesionCerrada()).toBe(true);
  });
});

describe('PU-13 · 4. Enviar y cerrar sin éxito', () => {
  it('sin red no se cierra y se informa el motivo', async () => {
    await crear('animal', animal('012'), TRABAJADOR);
    servicio.forzar = () => ({ ok: false, mensaje: 'Failed to fetch' });
    expect(await enviarYCerrar(dependencias)).toEqual({ cerrada: false, pendientes: 1, imagenes: 0, motivo: 'sin_red' });
    expect(await leerSesionLocal()).toBeDefined();
  });

  it('con la sesión vencida no se cierra y se informa el motivo', async () => {
    await crear('animal', animal('012'), TRABAJADOR);
    servicio.sesion = false;
    expect(await enviarYCerrar(dependencias)).toEqual({ cerrada: false, pendientes: 1, imagenes: 0, motivo: 'sesion_vencida' });
  });

  it('con registros que aún no pueden enviarse (dependencia) no se cierra', async () => {
    await crear('pesaje', { animal_id: uuidv7(), fecha: '2026-10-12', peso: 300, metodo: 'cinta' }, TRABAJADOR);
    expect(await enviarYCerrar(dependencias)).toEqual({ cerrada: false, pendientes: 1, imagenes: 0, motivo: 'no_enviados' });
  });
});

describe('PU-13 · 5. Descartar', () => {
  it('vacía la cola y borra los pendientes; conserva los sincronizados y los en conflicto; cierra la sesión', async () => {
    const sincronizado = servicio.sembrar('animal', { id: uuidv7(), codigo_chapeta: '012' });
    await db.animal.put({ ...(sincronizado as Record<string, unknown>), estado_sync: 'sincronizado' } as never);
    const enConflicto = await crear('animal', animal('045'), TRABAJADOR);
    await db.cola_operaciones.where('registro_id').equals(enConflicto.id).delete();
    await db.animal.update(enConflicto.id, { estado_sync: 'conflicto', detalle_conflicto: 'Chapeta repetida' });
    const pendiente1 = await crear('animal', animal('058'), TRABAJADOR);
    const pendiente2 = await crear('pesaje', { animal_id: pendiente1.id, fecha: '2026-10-12', peso: 32, metodo: 'cinta' }, TRABAJADOR);

    expect(await descartarYCerrar(dependencias)).toEqual({ descartados: 2 });

    expect(await contarPendientes()).toBe(0);
    expect(await db.animal.get(pendiente1.id)).toBeUndefined();
    expect(await db.pesaje.get(pendiente2.id)).toBeUndefined();
    expect(await db.animal.get(sincronizado.id)).toBeDefined();
    expect((await db.animal.get(enConflicto.id))?.estado_sync).toBe('conflicto');
    expect(await sesionCerrada()).toBe(true);
  });
});

describe('PU-13 · 6. Textos (sección 2)', () => {
  it('pendientes con y sin señal', () => {
    expect(textoPendientes(3, true)).toBe('Hay 3 registros sin enviar.');
    expect(textoPendientes(3, false)).toBe('Hay 3 registros sin enviar y no hay conexión. Si cierra la sesión ahora, se perderán.');
    expect(textoPendientes(1, true)).toBe('Hay 1 registro sin enviar.');
  });

  it('segunda confirmación, en singular y plural', () => {
    expect(textoSegundaConfirmacion(3)).toBe('Se perderán 3 registros que no se han enviado. Esta acción no se puede deshacer.');
    expect(textoSegundaConfirmacion(1)).toBe('Se perderá 1 registro que no se ha enviado. Esta acción no se puede deshacer.');
  });

  it('no cerrada, con cada motivo', () => {
    expect(textoNoCerrada(2, 'sin_red')).toBe('No se cerró la sesión: quedan 2 registros sin enviar. No hay conexión.');
    expect(textoNoCerrada(1, 'no_enviados')).toBe('No se cerró la sesión: queda 1 registro sin enviar. Algunos registros todavía no pueden enviarse.');
  });
});

describe('PU-13 · 7. Fotografías pendientes (docs/tecnica/14-fotografias.md, sección 8.3)', () => {
  const blob = () => new Blob([new Uint8Array(10)], { type: 'image/webp' });

  async function fotografiaConImagen(codigo: string) {
    const { unidadDeTrabajo } = await import('../datos/repositorio');
    return unidadDeTrabajo(TRABAJADOR, async (tx) => {
      const vaca = await tx.crear('animal', animal(codigo));
      const foto = await tx.crear('fotografia', { animal_id: vaca.id, tipo: 'izquierdo' });
      await tx.guardarImagen(foto, { completa: blob(), reducida: blob() });
      return foto;
    });
  }

  it('una imagen pendiente impide cerrar aunque no queden registros', async () => {
    const foto = await fotografiaConImagen('45');
    await db.cola_operaciones.clear();
    expect(await intentarCerrar(dependencias)).toEqual({ cerrada: false, pendientes: 0, imagenes: 1, motivo: 'pendientes' });
    expect(await db.imagen.get(foto.id)).toBeDefined();
  });

  it('descartar borra también las imágenes pendientes y vacía su cola', async () => {
    const foto = await fotografiaConImagen('46');
    await descartarYCerrar(dependencias);
    expect(await db.cola_imagenes.count()).toBe(0);
    expect(await db.imagen.get(foto.id)).toBeUndefined();
  });

  it('textos con registros y fotografías', () => {
    expect(textoPendientes(1, true, 3)).toBe('Hay 1 registro y 3 fotografías sin enviar.');
    expect(textoPendientes(0, true, 1)).toBe('Hay 1 fotografía sin enviar.');
    expect(textoNoCerrada(0, 'sin_red', 1)).toBe('No se cerró la sesión: queda 1 fotografía sin enviar. No hay conexión.');
    expect(textoSegundaConfirmacion(2, 1)).toBe('Se perderán 2 registros y 1 fotografía que no se han enviado. Esta acción no se puede deshacer.');
    expect(textoSegundaConfirmacion(0, 1)).toBe('Se perderá 1 fotografía que no se ha enviado. Esta acción no se puede deshacer.');
  });
});
