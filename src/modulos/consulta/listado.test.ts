import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import type { DatosNuevos } from '../../dominio/tipos';
import { buscar, cargarListado, compararChapetas, elegirFoto, type AnimalListado } from './listado';

/**
 * PU-16 · Listado (parte 2: búsqueda, filtro y foto de cada fila).
 * Especificación: docs/tecnica/15-listado-de-animales.md, secciones 2 a 4
 */

function animal(codigo: string, retirado = false): AnimalListado {
  return {
    id: `id-${codigo}`,
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: null,
    fecha_nacimiento_exacta: false,
    retirado,
    destino: null,
    estado_sync: 'sincronizado',
    foto: null,
  };
}

const HATO = ['45', '4', '450', '9', '10', 'A2', 'A10', '40', '1450', 'B4'].map((c) => animal(c));
const chapetas = (r: { animales: AnimalListado[] }) => r.animales.map((a) => a.codigo_chapeta);

describe('PU-16 · 1. Búsqueda (sección 2)', () => {
  it('sin texto, todos los activos en orden numérico; los números antes que las letras', () => {
    expect(chapetas(buscar(HATO, '', 'activos'))).toEqual(['4', '9', '10', '40', '45', '450', '1450', 'A2', 'A10', 'B4']);
  });

  it('filtra por el inicio de la chapeta y pone la exacta primero', () => {
    expect(chapetas(buscar(HATO, '4', 'activos'))).toEqual(['4', '40', '45', '450']);
    expect(chapetas(buscar(HATO, '45', 'activos'))).toEqual(['45', '450']);
  });

  it('normaliza lo escrito como el registro: ceros, espacios, guiones y minúsculas', () => {
    expect(chapetas(buscar(HATO, ' 045 ', 'activos'))).toEqual(['45', '450']);
    expect(chapetas(buscar(HATO, 'a-0', 'activos'))).toEqual([]);
    expect(chapetas(buscar(HATO, 'a1', 'activos'))).toEqual(['A10']);
    expect(chapetas(buscar(HATO, 'a 02', 'activos'))).toEqual(['A2']);
  });

  it('busca por el inicio, no por cualquier parte: 45 no encuentra el 1450', () => {
    expect(chapetas(buscar(HATO, '45', 'activos'))).not.toContain('1450');
  });

  it('orden numérico', () => {
    expect(['10', '9', 'A10', 'A2', '100'].sort(compararChapetas)).toEqual(['9', '10', '100', 'A2', 'A10']);
  });
});

describe('PU-16 · 2. Chapeta no registrada (sección 2.4)', () => {
  it('se ofrece registrar si es válida y nadie la tiene exactamente', () => {
    expect(buscar(HATO, '46', 'activos')).toMatchObject({ ofrecerRegistro: '46', errorFormato: null });
    expect(buscar(HATO, '0046', 'activos').ofrecerRegistro).toBe('46');
  });

  it('aunque haya coincidencias por el inicio: «1» muestra 10 y 1450, y ofrece registrar el 1', () => {
    expect(buscar(HATO, '1', 'activos')).toMatchObject({ ofrecerRegistro: '1' });
    expect(chapetas(buscar(HATO, '1', 'activos'))).toEqual(['10', '1450']);
  });

  it('no se ofrece si existe, ni si existe entre los retirados', () => {
    expect(buscar(HATO, '45', 'activos').ofrecerRegistro).toBeNull();
    const conRetirado = [...HATO, animal('77', true)];
    expect(buscar(conRetirado, '77', 'activos')).toMatchObject({ animales: [], ofrecerRegistro: null });
  });

  it('no se ofrece con un formato inválido; se informa el formato', () => {
    expect(buscar(HATO, 'O5', 'activos')).toMatchObject({ ofrecerRegistro: null, errorFormato: expect.stringContaining('letra O') });
    expect(buscar(HATO, '10000', 'activos')).toMatchObject({ ofrecerRegistro: null, errorFormato: expect.stringContaining('9999') });
  });

  it('sin texto no se ofrece nada', () => {
    expect(buscar(HATO, '   ', 'activos')).toMatchObject({ ofrecerRegistro: null, errorFormato: null });
  });
});

describe('PU-16 · 3. Filtro por estado (sección 3)', () => {
  const mezcla = [animal('1'), animal('2', true), animal('3')];
  it.each([
    ['activos', ['1', '3']],
    ['retirados', ['2']],
    ['todos', ['1', '2', '3']],
  ] as const)('%s', (filtro, esperado) => {
    expect(chapetas(buscar(mezcla, '', filtro))).toEqual(esperado);
  });
});

describe('PU-16 · 5. Foto de cada fila (sección 4)', () => {
  const izquierda = { id: 'f1', tipo: 'izquierdo' as const };
  const frente = { id: 'f2', tipo: 'frontal' as const };
  const blob = (n: number) => new Blob([new Uint8Array(n)]);

  it('la reducida de la vista principal', () => {
    const principal = blob(1);
    expect(elegirFoto([frente, izquierda], new Map([['f1', principal], ['f2', blob(2)]]))).toBe(principal);
  });

  it('si la principal no está en el teléfono, otra reducida del animal', () => {
    const otra = blob(2);
    expect(elegirFoto([izquierda, frente], new Map([['f2', otra]]))).toBe(otra);
  });

  it('sin reducidas, ninguna', () => {
    expect(elegirFoto([izquierda], new Map())).toBeNull();
    expect(elegirFoto([], new Map())).toBeNull();
  });
});

describe('PU-16 · 5b. Carga del listado desde la base local', () => {
  const autor = uuidv7();
  const datos = (codigo: string): DatosNuevos<'animal'> => ({
    codigo_chapeta: codigo,
    sexo: 'macho',
    fecha_nacimiento: '2025-10-13',
    fecha_nacimiento_exacta: true,
    fecha_ingreso: null,
    procedencia: null,
    peso_inicial: null,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
  });

  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });

  it('cada animal con su estado de sincronización, si está retirado y su foto', async () => {
    const activo = await crear('animal', datos('7'), autor);
    const vendido = await crear('animal', datos('8'), autor);
    await crear('salida', { animal_id: vendido.id, fecha: '2026-10-01', motivo: 'venta', peso_venta: 300, valor_venta: 1, comprador: null, causa_muerte: null }, autor);
    const foto = await crear('fotografia', { animal_id: activo.id, tipo: 'derecho' }, autor);
    const reducida = new Blob([new Uint8Array(30)], { type: 'image/webp' });
    await db.imagen.add({ fotografia_id: foto.id, animal_id: activo.id, reducida, completa: null });

    const listado = await cargarListado();
    const siete = listado.find((a) => a.codigo_chapeta === '7')!;
    const ocho = listado.find((a) => a.codigo_chapeta === '8')!;
    expect(siete).toMatchObject({ retirado: false, estado_sync: 'pendiente', fecha_nacimiento: '2025-10-13' });
    expect(siete.foto?.size).toBe(30);
    expect(ocho).toMatchObject({ retirado: true, foto: null });
  });
});
