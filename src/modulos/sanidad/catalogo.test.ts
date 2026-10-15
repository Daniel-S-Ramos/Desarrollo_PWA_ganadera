import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { leerParametro } from '../../datos/parametros';
import { uuidv7 } from '../../datos/uuidv7';
import { compararMedicamentos, normalizarNombre, sonParecidos, validarMedicamento, type FormularioMedicamento } from '../../dominio/medicamentos';
import type { Identidad } from '../../sesion/token';
import { buscarCoincidencias, crearMedicamento, listarCatalogo } from './catalogo';

/**
 * PU-19 · Catálogo de medicamentos y parámetros (3.8.9, RF-09, Tablas 30 y 31).
 * Especificación: docs/tecnica/18-catalogo-de-medicamentos.md, sección 11
 */

const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

const formulario = (cambios: Partial<FormularioMedicamento> = {}): FormularioMedicamento => ({
  nombre: 'Prueba Ivermectina',
  tipo: 'purga',
  unidad: 'ml',
  intervalo: '35',
  ...cambios,
});

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

describe('PU-19 · 1. Normalización del nombre (sección 3)', () => {
  it.each([
    ['Ivermectina', 'ivermectina'],
    ['  IVERMECTINA  ', 'ivermectina'],
    ['Ivermectína', 'ivermectina'],
    ['Ivermectina   1%', 'ivermectina 1%'],
    ['Pingüino', 'pinguino'],
    ['Fórmula Àvé Ôtra', 'formula ave otra'],
    ['Piña', 'piña'],
  ])('«%s» → «%s»', (escrito, esperado) => {
    expect(normalizarNombre(escrito)).toBe(esperado);
  });

  it('la ñ se conserva: «Piña» y «Pina» son distintos', () => {
    expect(normalizarNombre('Piña')).not.toBe(normalizarNombre('Pina'));
  });
});

describe('PU-19 · 2. Coincidencia exacta (sección 4, Tabla 31)', () => {
  it('con otra escritura se detecta el existente y no se crea un duplicado', async () => {
    const primero = await crearMedicamento(formulario(), PROPIETARIO);
    if (!primero.ok) throw new Error('debía crearse');
    const segundo = await crearMedicamento(formulario({ nombre: '  prueba   IVERMECTÍNA ', tipo: 'otro' }), TRABAJADOR);
    expect(segundo).toEqual({ ok: false, existente: primero.medicamento });
    expect(await db.medicamento.count()).toBe(1);
  });

  it('dos creaciones simultáneas del mismo nombre: queda una sola (verificación en la transacción)', async () => {
    const resultados = await Promise.all([crearMedicamento(formulario(), PROPIETARIO), crearMedicamento(formulario({ nombre: 'prueba ivermectina' }), PROPIETARIO)]);
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.medicamento.count()).toBe(1);
    expect(await db.cola_operaciones.count()).toBe(1);
  });

  it('buscarCoincidencias distingue la exacta de los parecidos', async () => {
    await crearMedicamento(formulario({ nombre: 'Ceftiofur', tipo: 'antibiotico' }), PROPIETARIO);
    await crearMedicamento(formulario({ nombre: 'Ceftiofur de acción prolongada', tipo: 'antibiotico' }), PROPIETARIO);
    const catalogo = await listarCatalogo();
    const r = buscarCoincidencias('ceftiofur', catalogo);
    expect(r.exacta?.nombre).toBe('Ceftiofur');
    expect(r.parecidos.map((m) => m.nombre)).toEqual(['Ceftiofur de acción prolongada']);
    expect(buscarCoincidencias('   ', catalogo)).toEqual({ exacta: null, parecidos: [] });
  });
});

describe('PU-19 · 3. Parecidos (sección 4)', () => {
  it.each([
    ['Ceftiofur', 'Ceftiofur de acción prolongada', true],
    ['Oxitetraciclina', 'Oxitetraciclina de larga acción', true],
    ['Ivermectina 1% inyectable', 'Ivermectina de larga acción', true],
    ['Florfenicol', 'Albendazol oral', false],
    ['Ivermectina', 'ivermectína', false],
    ['De prueba', 'De otra cosa', false],
  ])('«%s» y «%s» → %s', (a, b, esperado) => {
    expect(sonParecidos(a, b)).toBe(esperado);
  });

  it('un nombre parecido se puede crear igual: es otro producto', async () => {
    await crearMedicamento(formulario({ nombre: 'Ceftiofur', tipo: 'antibiotico' }), PROPIETARIO);
    expect((await crearMedicamento(formulario({ nombre: 'Ceftiofur de acción prolongada', tipo: 'antibiotico' }), PROPIETARIO)).ok).toBe(true);
  });
});

describe('PU-19 · 4. Validación (sección 5)', () => {
  it('un formulario correcto se convierte en los datos de la Tabla 24, con el nombre sin espacios sobrantes', () => {
    expect(validarMedicamento(formulario({ nombre: '  Prueba   Ivermectina ' }))).toEqual({
      ok: true,
      datos: { nombre: 'Prueba Ivermectina', tipo: 'purga', unidad: 'ml', intervalo_advertencia_dias: 35 },
    });
  });

  it.each(['', '0', '731', '1.5', 'abc', '-3'])('intervalo «%s» rechazado', (intervalo) => {
    expect(validarMedicamento(formulario({ intervalo }))).toMatchObject({ ok: false, errores: { intervalo: expect.any(String) } });
  });

  it.each(['1', '730'])('intervalo «%s» admitido', (intervalo) => {
    expect(validarMedicamento(formulario({ intervalo })).ok).toBe(true);
  });

  it('todos los errores juntos: nombre muy corto, sin tipo, sin unidad, sin intervalo', () => {
    const r = validarMedicamento({ nombre: 'X', tipo: null, unidad: null, intervalo: '' });
    expect(r.ok ? [] : Object.keys(r.errores).sort()).toEqual(['intervalo', 'nombre', 'tipo', 'unidad']);
  });

  it('nombre de más de 60 caracteres rechazado', () => {
    expect(validarMedicamento(formulario({ nombre: 'x'.repeat(61) })).ok).toBe(false);
  });

  it('un formulario inválido no escribe nada', async () => {
    expect((await crearMedicamento(formulario({ intervalo: '' }), PROPIETARIO)).ok).toBe(false);
    expect(await db.medicamento.count()).toBe(0);
  });
});

describe('PU-19 · 5. Orden del catálogo', () => {
  it('por tipo (vacuna, purga, vitamina, antibiótico, otro) y por nombre, sin importar tildes ni mayúsculas', () => {
    const lista = [
      { tipo: 'antibiotico' as const, nombre: 'Florfenicol' },
      { tipo: 'purga' as const, nombre: 'ivermectina' },
      { tipo: 'vacuna' as const, nombre: 'Vacuna contra la fiebre aftosa' },
      { tipo: 'antibiotico' as const, nombre: 'Ceftiofur' },
      { tipo: 'purga' as const, nombre: 'Albendazol oral' },
      { tipo: 'otro' as const, nombre: 'Flunixin meglumina' },
    ];
    expect(lista.sort(compararMedicamentos).map((m) => m.nombre)).toEqual([
      'Vacuna contra la fiebre aftosa',
      'Albendazol oral',
      'ivermectina',
      'Ceftiofur',
      'Florfenicol',
      'Flunixin meglumina',
    ]);
  });
});

describe('PU-19 · 6. Parámetros (sección 8)', () => {
  it('lee el valor de la copia local; undefined si no está, sin valores por defecto', async () => {
    await db.parametro.put({ clave: 'dias_promedio_produccion', valor: 7, unidad: 'días', descripcion: '' });
    expect(await leerParametro('dias_promedio_produccion')).toBe(7);
    expect(await leerParametro('precio_litro_leche')).toBeUndefined();
  });
});

describe('PU-19 · 7. Permisos (Tabla 27)', () => {
  it('ambos perfiles crean medicamentos, con su autoría', async () => {
    const r = await crearMedicamento(formulario({ nombre: 'Prueba vitamina' , tipo: 'vitamina' }), TRABAJADOR);
    expect(r.ok && r.medicamento).toMatchObject({ autor_id: TRABAJADOR.usuario_id, estado_sync: 'pendiente' });
    expect((await crearMedicamento(formulario(), PROPIETARIO)).ok).toBe(true);
  });
});
