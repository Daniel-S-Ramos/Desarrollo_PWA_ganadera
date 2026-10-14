import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import { etiquetaPeso, nombrePesoInicial } from '../../dominio/origen';
import type { DatosNuevos, RegistroLocal, TipoFotografia } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { agregarFotografia } from '../identificacion/actualizarFotos';
import { AUTOR_DESCONOCIDO, consolidarFicha, masReciente, ultimaVacuna, ultimoPeso } from './ficha';

/**
 * PU-17 · Ficha del animal (RF-05, CU-03, HU-15). Especificación: docs/tecnica/16-ficha-del-animal.md, sección 8
 */

const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: PROPIETARIO.nombre, perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: TRABAJADOR.nombre, perfil: 'trabajador' },
  ]);
});

function datosAnimal(cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: String(Math.floor(Math.random() * 9000) + 1),
    sexo: 'hembra',
    fecha_nacimiento: '2026-10-02',
    fecha_nacimiento_exacta: true,
    fecha_ingreso: null,
    procedencia: null,
    peso_inicial: null,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
    ...cambios,
  };
}

const registrar = (cambios: Partial<DatosNuevos<'animal'>> = {}, autor = TRABAJADOR) => crear('animal', datosAnimal(cambios), autor.usuario_id);
const imagen = () => ({ completa: new Blob([new Uint8Array(200)]), reducida: new Blob([new Uint8Array(20)]) });

describe('PU-17 · 1. Último peso (sección 3.1)', () => {
  const sinPesajes: RegistroLocal<'pesaje'>[] = [];

  it('animal comprado sin pesajes: el peso inicial es el «peso de compra», con la fecha de ingreso', () => {
    expect(ultimoPeso({ peso_inicial: 180, fecha_ingreso: '2026-09-01', fecha_nacimiento: '2025-04-01' }, sinPesajes)).toEqual({
      tipo: 'peso de compra',
      kg: 180,
      fecha: '2026-09-01',
    });
  });

  it('nacido en el predio sin pesajes: el «peso al nacer», con la fecha de nacimiento', () => {
    expect(ultimoPeso({ peso_inicial: 32, fecha_ingreso: null, fecha_nacimiento: '2026-10-02' }, sinPesajes)).toEqual({
      tipo: 'peso al nacer',
      kg: 32,
      fecha: '2026-10-02',
    });
  });

  it('sin pesajes ni peso inicial: nada', () => {
    expect(ultimoPeso({ peso_inicial: null, fecha_ingreso: null, fecha_nacimiento: null }, sinPesajes)).toBeNull();
  });

  it('con pesajes, el más reciente por fecha (no por orden de registro), aunque haya peso inicial', async () => {
    const vaca = await registrar({ peso_inicial: 32 });
    await crear('pesaje', { animal_id: vaca.id, fecha: '2026-10-10', peso: 41, metodo: 'cinta' }, TRABAJADOR.usuario_id);
    await crear('pesaje', { animal_id: vaca.id, fecha: '2026-10-05', peso: 36, metodo: 'cinta' }, TRABAJADOR.usuario_id);
    expect((await consolidarFicha(vaca.id))?.peso).toEqual({ tipo: 'pesaje', kg: 41, fecha: '2026-10-10' });
  });

  it('a igual fecha, el registrado después', () => {
    const a = { id: '0190a000-0000-7000-8000-000000000001', fecha: '2026-10-10' };
    const b = { id: '0190a000-0000-7000-8000-000000000002', fecha: '2026-10-10' };
    // En los dos órdenes: con uno solo, el resultado podría ser correcto por casualidad (lo mostró una mutación).
    expect(masReciente([b, a], (r) => r.fecha)).toBe(b);
    expect(masReciente([a, b], (r) => r.fecha)).toBe(b);
  });
});

describe('PU-17 · 2. Última vacuna (sección 3.2)', () => {
  it('la más reciente de tipo vacuna, con el nombre del medicamento; la purga posterior no cuenta', async () => {
    const vaca = await registrar();
    const aftosa = await crear('medicamento', { nombre: 'Aftosa', tipo: 'vacuna', unidad: 'ml', intervalo_advertencia_dias: 180 }, PROPIETARIO.usuario_id);
    const purga = await crear('medicamento', { nombre: 'Ivermectina', tipo: 'purga', unidad: 'ml', intervalo_advertencia_dias: 30 }, PROPIETARIO.usuario_id);
    const evento = (fecha: string, tipo: 'vacuna' | 'purga', medicamento_id: string) =>
      crear('evento_sanitario', { animal_id: vaca.id, fecha, tipo, medicamento_id, dosis: 2, costo: null, sintomas: null }, TRABAJADOR.usuario_id);
    await evento('2026-09-15', 'vacuna', aftosa.id);
    await evento('2026-10-01', 'purga', purga.id);
    expect((await consolidarFicha(vaca.id))?.vacuna).toEqual({ nombre: 'Aftosa', fecha: '2026-09-15' });
  });

  it('sin vacunas, nada', () => {
    expect(ultimaVacuna([])).toBeUndefined();
  });
});

describe('PU-17 · 3. Leche (sección 3.3)', () => {
  it('en una hembra, el registro más reciente; sin registros, se dice', async () => {
    const vaca = await registrar();
    expect((await consolidarFicha(vaca.id))?.leche).toBe('sin_registros');
    await crear('produccion_leche', { animal_id: vaca.id, fecha: '2026-10-11', litros: 13 }, TRABAJADOR.usuario_id);
    await crear('produccion_leche', { animal_id: vaca.id, fecha: '2026-10-12', litros: 14.5 }, TRABAJADOR.usuario_id);
    expect((await consolidarFicha(vaca.id))?.leche).toEqual({ litros: 14.5, fecha: '2026-10-12' });
  });

  it('en un macho no se presenta', async () => {
    const toro = await registrar({ sexo: 'macho' });
    expect((await consolidarFicha(toro.id))?.leche).toBeNull();
  });
});

describe('PU-17 · 4. Destino (sección 3.4)', () => {
  it('el de fecha de inicio más reciente; sin destinos, nada', async () => {
    const vaca = await registrar();
    expect((await consolidarFicha(vaca.id))?.destino).toBeNull();
    await crear('destino_productivo', { animal_id: vaca.id, destino: 'leche', desde: '2026-10-01' }, PROPIETARIO.usuario_id);
    await crear('destino_productivo', { animal_id: vaca.id, destino: 'ceba', desde: '2026-06-01' }, PROPIETARIO.usuario_id);
    expect((await consolidarFicha(vaca.id))?.destino).toEqual({ destino: 'leche', desde: '2026-10-01' });
  });
});

describe('PU-17 · 5. Genealogía y origen', () => {
  it('madre del predio con su chapeta; padre externo con su nombre', async () => {
    const madre = await registrar({ codigo_chapeta: '12' });
    const cria = await registrar({ madre_id: madre.id, padre_externo: 'Toro Brahman' });
    const ficha = await consolidarFicha(cria.id);
    expect(ficha?.madre).toEqual({ forma: 'predio', id: madre.id, texto: '12' });
    expect(ficha?.padre).toEqual({ forma: 'externo', texto: 'Toro Brahman' });
    expect(ficha?.origen).toBe('nacido');
  });

  it('desconocidos; animal comprado; madre externa', async () => {
    const comprada = await registrar({ fecha_ingreso: '2026-09-01', procedencia: 'Une', madre_externa: 'Vaca de don Pedro' });
    const ficha = await consolidarFicha(comprada.id);
    expect(ficha).toMatchObject({ origen: 'comprado', procedencia: 'Une', padre: { forma: 'desconocido' } });
    expect(ficha?.madre).toEqual({ forma: 'externo', texto: 'Vaca de don Pedro' });
  });

  it('un animal que no está en el teléfono: no hay ficha', async () => {
    expect(await consolidarFicha(uuidv7())).toBeUndefined();
  });

  it('retirado si tiene salida', async () => {
    const vendida = await registrar();
    await crear('salida', { animal_id: vendida.id, fecha: '2026-10-12', motivo: 'venta', peso_venta: 300, valor_venta: 1, comprador: null, causa_muerte: null }, PROPIETARIO.usuario_id);
    expect((await consolidarFicha(vendida.id))?.retirado).toBe(true);
  });
});

describe('PU-17 · 6. Fotos (sección 5)', () => {
  it('las vistas vigentes en orden izquierdo, derecho, frente, con su autor; la principal en el encabezado', async () => {
    const vaca = await registrar();
    for (const tipo of ['frontal', 'izquierdo'] as TipoFotografia[]) await agregarFotografia(vaca.id, tipo, imagen(), TRABAJADOR);
    const ficha = await consolidarFicha(vaca.id);
    expect(ficha?.fotos.map((f) => [f.tipo, f.autor])).toEqual([
      ['izquierdo', 'Daniel Ramos'],
      ['frontal', 'Daniel Ramos'],
    ]);
    expect(ficha?.fotoPrincipal?.size).toBe(20);
  });
});

describe('PU-17 · 7. Autoría (HU-15)', () => {
  it('nombre del autor y fecha de creación', async () => {
    const vaca = await registrar({}, PROPIETARIO);
    expect(await consolidarFicha(vaca.id)).toMatchObject({ autor: 'José Ramos', creado_en: vaca.creado_en });
  });

  it('un autor que no está en la copia local no muestra su identificador', async () => {
    const vaca = await crear('animal', datosAnimal(), uuidv7());
    expect((await consolidarFicha(vaca.id))?.autor).toBe(AUTOR_DESCONOCIDO);
  });
});

describe('PU-17 · 8. Cambiar una foto (sección 5.2)', () => {
  it('crea una fotografía nueva que pasa a ser la vigente; la anterior se conserva como registro', async () => {
    const vaca = await registrar();
    const primera = await agregarFotografia(vaca.id, 'izquierdo', imagen(), TRABAJADOR);
    const segunda = await agregarFotografia(vaca.id, 'izquierdo', imagen(), PROPIETARIO);
    expect(await db.fotografia.where('animal_id').equals(vaca.id).count()).toBe(2);
    expect(await db.fotografia.get(primera.id)).toBeDefined();
    const ficha = await consolidarFicha(vaca.id);
    expect(ficha?.fotos).toEqual([expect.objectContaining({ tipo: 'izquierdo', fotografia_id: segunda.id, autor: 'José Ramos' })]);
    // Las dos esperan subir, con su entrada en la cola de datos y en la de imágenes.
    expect(await db.cola_imagenes.count()).toBe(2);
  });

  it('al completar el izquierdo de un animal que solo tenía el frente, la principal pasa a ser el izquierdo', async () => {
    const vaca = await registrar();
    await agregarFotografia(vaca.id, 'frontal', { completa: new Blob([new Uint8Array(200)]), reducida: new Blob([new Uint8Array(11)]) }, TRABAJADOR);
    expect((await consolidarFicha(vaca.id))?.fotoPrincipal?.size).toBe(11);
    await agregarFotografia(vaca.id, 'izquierdo', { completa: new Blob([new Uint8Array(200)]), reducida: new Blob([new Uint8Array(22)]) }, TRABAJADOR);
    expect((await consolidarFicha(vaca.id))?.fotoPrincipal?.size).toBe(22);
  });

  it('un animal que no está en el teléfono no admite fotos', async () => {
    await expect(agregarFotografia(uuidv7(), 'izquierdo', imagen(), TRABAJADOR)).rejects.toThrow('no está en este teléfono');
    expect(await db.fotografia.count()).toBe(0);
  });
});

describe('PU-17 · 9. Nombre del peso inicial (sección 3.1)', () => {
  it.each([
    ['comprado', 'peso de compra', 'Peso de compra en kg'],
    ['nacido', 'peso al nacer', 'Peso al nacer en kg'],
    [null, 'peso inicial', 'Peso inicial en kg'],
  ] as const)('%s → «%s» · formulario «%s»', (origen, nombre, etiqueta) => {
    expect(nombrePesoInicial(origen)).toBe(nombre);
    expect(etiquetaPeso(origen)).toBe(etiqueta);
  });
});
