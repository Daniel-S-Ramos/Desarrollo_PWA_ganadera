import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import {
  copiarEvento,
  describirDosis,
  formatearPesos,
  formularioEventoVacio,
  leerCosto,
  medicamentosDelTipo,
  ordenarHistorial,
  tipoMedicamentoPropuesto,
  ultimaDosis,
  validarEvento,
  type ContextoEvento,
  type FormularioEvento,
} from '../../dominio/sanidad';
import type { DatosNuevos, TipoMedicamento } from '../../dominio/tipos';
import { PermisoDenegado } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { consolidarFicha } from '../consulta/ficha';
import { cargarHistorialSanitario, formularioComo, puedeVerCosto, registrarEvento, ultimaDosisDe } from './eventos';

/**
 * PU-21 · Registro sanitario e historial (RF-07, RF-08, CU-04, CU-05, HU-03).
 * Especificación: docs/tecnica/20-registro-sanitario.md, sección 10
 */

const HOY = '2026-10-14';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

function datosAnimal(codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: '2024-03-04',
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

const animal = (codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}) => crear('animal', datosAnimal(codigo, cambios), PROPIETARIO.usuario_id);
const medicamento = (nombre: string, tipo: TipoMedicamento = 'vacuna', unidad: 'ml' | 'dosis' = 'ml') =>
  crear('medicamento', { nombre, tipo, unidad, intervalo_advertencia_dias: 35 }, PROPIETARIO.usuario_id);

const formulario = (medicamentoId: string, cambios: Partial<FormularioEvento> = {}): FormularioEvento => ({
  ...formularioEventoVacio(HOY),
  tipo: 'vacuna',
  medicamento_id: medicamentoId,
  ...cambios,
});

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: 'Daniel Ramos', perfil: 'trabajador' },
  ]);
});

describe('PU-21 · 1. Validaciones (sección 6)', () => {
  const contexto: ContextoEvento = { nacimiento: '2024-03-04', retirado: false, medicamentoExiste: true };
  const errores = (cambios: Partial<FormularioEvento>, ctx: ContextoEvento = contexto) => {
    const r = validarEvento(formulario('m1', cambios), ctx, HOY);
    return r.ok ? {} : r.errores;
  };

  it('un evento completo se convierte en los datos de la Tabla 24', () => {
    expect(validarEvento(formulario('m1', { dosis: '2,5', costo: '25.000', sintomas: '  Fiebre  ' }), contexto, HOY)).toEqual({
      ok: true,
      datos: { fecha: HOY, tipo: 'vacuna', medicamento_id: 'm1', dosis: 2.5, costo: 25000, sintomas: 'Fiebre' },
    });
  });

  it('dosis, costo y síntomas son opcionales (HU-03.2)', () => {
    expect(validarEvento(formulario('m1'), contexto, HOY)).toMatchObject({ ok: true, datos: { dosis: null, costo: null, sintomas: null } });
  });

  it('exige tipo y medicamento del catálogo; todos los errores juntos', () => {
    expect(errores({ tipo: null, medicamento_id: null, fecha: '' })).toEqual({
      tipo: 'Elija el tipo de evento',
      medicamento_id: 'Elija el medicamento',
      fecha: 'Escriba una fecha válida',
    });
    expect(errores({}, { ...contexto, medicamentoExiste: false })).toEqual({ medicamento_id: 'Elija el medicamento' });
  });

  it('la fecha existe, no es futura ni anterior al nacimiento', () => {
    expect(errores({ fecha: '2026-02-30' })).toEqual({ fecha: 'Escriba una fecha válida' });
    expect(errores({ fecha: '2026-10-15' })).toEqual({ fecha: 'La fecha no puede ser posterior a hoy' });
    expect(errores({ fecha: '2024-03-03' })).toEqual({ fecha: 'El animal nació el 4 de marzo de 2024' });
    expect(errores({ fecha: '2024-03-04' })).toEqual({});
    expect(errores({ fecha: '2020-01-01' }, { ...contexto, nacimiento: null })).toEqual({});
  });

  it('la dosis es mayor que 0 y hasta 9.999, con coma o punto decimal', () => {
    expect(errores({ dosis: '0' })).toEqual({ dosis: 'La dosis debe ser mayor que 0 y hasta 9.999' });
    expect(errores({ dosis: '10000' })).toEqual({ dosis: 'La dosis debe ser mayor que 0 y hasta 9.999' });
    expect(errores({ dosis: 'dos' })).toEqual({ dosis: 'La dosis debe ser mayor que 0 y hasta 9.999' });
    expect(errores({ dosis: '9999' })).toEqual({});
    expect(errores({ dosis: '0.5' })).toEqual({});
  });

  it('el costo es un entero de pesos hasta 10.000.000; admite puntos de miles', () => {
    expect(leerCosto('25.000')).toBe(25000);
    expect(leerCosto('1 500')).toBe(1500);
    expect(leerCosto('25,5')).toBeNull();
    expect(errores({ costo: '25,5' })).toEqual({ costo: 'Escriba el costo en pesos, sin decimales, hasta 10.000.000' });
    expect(errores({ costo: '10.000.001' })).toEqual({ costo: 'Escriba el costo en pesos, sin decimales, hasta 10.000.000' });
    expect(errores({ costo: '10.000.000' })).toEqual({});
    expect(errores({ costo: '0' })).toEqual({});
  });

  it('los síntomas hasta 300 caracteres; un animal retirado no recibe eventos', () => {
    expect(errores({ sintomas: 'a'.repeat(301) })).toEqual({ sintomas: 'Hasta 300 caracteres' });
    expect(errores({ sintomas: 'a'.repeat(300) })).toEqual({});
    expect(errores({}, { ...contexto, retirado: true })).toEqual({ animal: 'Este animal salió del predio' });
  });
});

describe('PU-21 · 2. Filtro del catálogo por tipo de evento (sección 4)', () => {
  const catalogo = (['vacuna', 'purga', 'vitamina', 'antibiotico', 'otro'] as const).map((tipo) => ({ tipo, nombre: tipo }));
  const nombres = (tipo: Parameters<typeof medicamentosDelTipo>[1]) => medicamentosDelTipo(catalogo, tipo).map((m) => m.nombre);

  it('cada tipo lista los suyos; tratamiento, antibióticos y otros; otro, todo', () => {
    expect(nombres('vacuna')).toEqual(['vacuna']);
    expect(nombres('purga')).toEqual(['purga']);
    expect(nombres('vitamina')).toEqual(['vitamina']);
    expect(nombres('tratamiento')).toEqual(['antibiotico', 'otro']);
    expect(nombres('otro')).toEqual(['vacuna', 'purga', 'vitamina', 'antibiotico', 'otro']);
  });

  it('al agregar un medicamento se propone el tipo del evento; tratamiento propone antibiótico', () => {
    expect(tipoMedicamentoPropuesto('tratamiento')).toBe('antibiotico');
    expect(tipoMedicamentoPropuesto('vacuna')).toBe('vacuna');
    expect(tipoMedicamentoPropuesto('otro')).toBe('otro');
  });
});

describe('PU-21 · 3. Dosis precargada (sección 5.1)', () => {
  const evento = (id: string, fecha: string, dosis: number | null, medicamento_id = 'm1') => ({ id, fecha, dosis, medicamento_id });

  it('la última con dosis del medicamento, por fecha y a igual fecha la registrada después', () => {
    expect(ultimaDosis([evento('01', '2026-05-01', 5), evento('02', '2026-03-01', 7)], 'm1')).toBe(5);
    expect(ultimaDosis([evento('02', '2026-05-01', 6), evento('01', '2026-05-01', 5)], 'm1')).toBe(6);
    expect(ultimaDosis([evento('01', '2026-05-01', 5), evento('02', '2026-05-01', 6)], 'm1')).toBe(6);
  });

  it('ignora los eventos sin dosis y los de otros medicamentos; sin registros, ninguna', () => {
    expect(ultimaDosis([evento('01', '2026-05-01', 5), evento('02', '2026-09-01', null), evento('03', '2026-10-01', 9, 'm2')], 'm1')).toBe(5);
    expect(ultimaDosis([], 'm1')).toBeNull();
  });

  it('se toma de cualquier animal del predio', async () => {
    const [a, b, aftosa] = await Promise.all([animal('Z920'), animal('Z921'), medicamento('Prueba Aftosa')]);
    await registrarEvento(a.id, formulario(aftosa.id, { dosis: '2', fecha: '2026-10-01' }), PROPIETARIO, HOY);
    await registrarEvento(b.id, formulario(aftosa.id, { dosis: '3', fecha: '2026-10-02' }), PROPIETARIO, HOY);
    expect(await ultimaDosisDe(aftosa.id)).toBe(3);
  });
});

describe('PU-21 · 4. Registrar (secciones 2 y 6)', () => {
  it('crea el evento con autor, pendiente y en la cola', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    const cola = await db.cola_operaciones.count();
    const r = await registrarEvento(a.id, formulario(aftosa.id, { dosis: '2' }), TRABAJADOR, HOY);
    if (!r.ok) throw new Error('debía registrarse');
    expect(r.evento).toMatchObject({ animal_id: a.id, medicamento_id: aftosa.id, tipo: 'vacuna', dosis: 2, autor_id: TRABAJADOR.usuario_id, estado_sync: 'pendiente' });
    expect(await db.cola_operaciones.count()).toBe(cola + 1);
    expect(await db.cola_operaciones.where('registro_id').equals(r.evento.id).count()).toBe(1);
  });

  it('la fecha puede ser anterior al ingreso de un comprado, no a su nacimiento', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920', { fecha_ingreso: '2026-09-01', fecha_nacimiento: '2025-01-01', fecha_nacimiento_exacta: false }), medicamento('Prueba Aftosa')]);
    expect((await registrarEvento(a.id, formulario(aftosa.id, { fecha: '2026-05-10' }), PROPIETARIO, HOY)).ok).toBe(true);
    expect(await registrarEvento(a.id, formulario(aftosa.id, { fecha: '2024-12-31' }), PROPIETARIO, HOY)).toEqual({
      ok: false,
      errores: { fecha: 'El animal nació el 1 de enero de 2025' },
    });
  });

  it('un error no escribe nada', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    const cola = await db.cola_operaciones.count();
    expect((await registrarEvento(a.id, formulario(aftosa.id, { tipo: null }), PROPIETARIO, HOY)).ok).toBe(false);
    expect(await db.evento_sanitario.count()).toBe(0);
    expect(await db.cola_operaciones.count()).toBe(cola);
  });
});

describe('PU-21 · 5. Verificación dentro de la transacción (sección 6)', () => {
  it('un animal retirado, uno que no está o un medicamento inexistente se rechazan', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    await crear('salida', { animal_id: a.id, fecha: '2026-10-01', motivo: 'venta', peso_venta: 300, valor_venta: 1, comprador: null, causa_muerte: null }, PROPIETARIO.usuario_id);
    expect(await registrarEvento(a.id, formulario(aftosa.id), PROPIETARIO, HOY)).toEqual({ ok: false, errores: { animal: 'Este animal salió del predio' } });
    expect(await registrarEvento(uuidv7(), formulario(aftosa.id), PROPIETARIO, HOY)).toEqual({ ok: false, errores: { animal: 'El animal no está en este teléfono' } });
    const b = await animal('Z921');
    expect(await registrarEvento(b.id, formulario(uuidv7()), PROPIETARIO, HOY)).toEqual({ ok: false, errores: { medicamento_id: 'Elija el medicamento' } });
    expect(await db.evento_sanitario.count()).toBe(0);
  });
});

describe('PU-21 · 6. Costo y permisos (sección 5.2, Tabla 27)', () => {
  it('solo el propietario ve el costo', () => {
    expect(puedeVerCosto('propietario')).toBe(true);
    expect(puedeVerCosto('trabajador')).toBe(false);
  });

  it('el trabajador registra sin costo; con costo, PermisoDenegado y nada se escribe', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    await expect(registrarEvento(a.id, formulario(aftosa.id, { costo: '5000' }), TRABAJADOR, HOY)).rejects.toBeInstanceOf(PermisoDenegado);
    expect(await db.evento_sanitario.count()).toBe(0);
    expect((await registrarEvento(a.id, formulario(aftosa.id, { costo: '  ' }), TRABAJADOR, HOY)).ok).toBe(true);
  });

  it('el propietario registra con costo', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    const r = await registrarEvento(a.id, formulario(aftosa.id, { costo: '12.500' }), PROPIETARIO, HOY);
    expect(r).toMatchObject({ ok: true, evento: { costo: 12500 } });
    expect(formatearPesos(12500)).toBe('$ 12.500');
  });
});

describe('PU-21 · 7. Aplicar lo mismo a otro animal (sección 7)', () => {
  const anterior = { tipo: 'vacuna' as const, medicamento_id: 'm1', fecha: '2026-10-10', dosis: 2.5, costo: 3000 };

  it('copia tipo, medicamento, fecha, dosis y costo; nunca los síntomas', () => {
    expect(copiarEvento(anterior, true)).toEqual({ tipo: 'vacuna', medicamento_id: 'm1', fecha: '2026-10-10', dosis: '2,5', costo: '3000', sintomas: '' });
  });

  it('sin permiso de costo, no lo copia; sin dosis queda vacía', () => {
    expect(copiarEvento({ ...anterior, dosis: null }, false)).toMatchObject({ dosis: '', costo: '' });
  });

  it('desde un evento guardado; si no está en el teléfono, ninguno', async () => {
    const [a, aftosa] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa')]);
    const r = await registrarEvento(a.id, formulario(aftosa.id, { dosis: '2', costo: '3000', sintomas: 'Tos' }), PROPIETARIO, HOY);
    if (!r.ok) throw new Error('debía registrarse');
    expect(await formularioComo(r.evento.id, 'trabajador')).toEqual({ tipo: 'vacuna', medicamento_id: aftosa.id, fecha: HOY, dosis: '2', costo: '', sintomas: '' });
    expect(await formularioComo(r.evento.id, 'propietario')).toMatchObject({ costo: '3000' });
    expect(await formularioComo(uuidv7(), 'propietario')).toBeNull();
  });
});

describe('PU-21 · 8. Historial (sección 8) y última vacuna de la ficha', () => {
  it('orden: del más reciente al más antiguo, a igual fecha el registrado después', () => {
    const e = (id: string, fecha: string) => ({ id, fecha });
    expect(ordenarHistorial([e('01', '2026-03-01'), e('03', '2026-05-01'), e('02', '2026-05-01')]).map((x) => x.id)).toEqual(['03', '02', '01']);
  });

  it('cada entrada con medicamento, unidad y autor; la dosis con su unidad', async () => {
    const [a, aftosa, ivermectina] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa', 'vacuna', 'dosis'), medicamento('Prueba Ivermectina', 'purga')]);
    await registrarEvento(a.id, formulario(aftosa.id, { fecha: '2026-09-01', dosis: '1' }), PROPIETARIO, HOY);
    await registrarEvento(a.id, formulario(ivermectina.id, { tipo: 'purga', fecha: '2026-10-01', dosis: '2,5' }), TRABAJADOR, HOY);
    const historial = await cargarHistorialSanitario(a.id);
    expect(historial.map((h) => [h.medicamento, h.unidad, h.autor])).toEqual([
      ['Prueba Ivermectina', 'ml', 'Daniel Ramos'],
      ['Prueba Aftosa', 'dosis', 'José Ramos'],
    ]);
    expect(describirDosis(2.5, 'ml')).toBe('2,5 ml');
    expect(describirDosis(null, 'ml')).toBe('Sin dosis');
  });

  it('sin eventos, vacío; la última vacuna de la ficha es la vacuna más reciente, no la purga', async () => {
    const [a, aftosa, ivermectina] = await Promise.all([animal('Z920'), medicamento('Prueba Aftosa'), medicamento('Prueba Ivermectina', 'purga')]);
    expect(await cargarHistorialSanitario(a.id)).toEqual([]);
    await registrarEvento(a.id, formulario(aftosa.id, { fecha: '2026-09-01' }), PROPIETARIO, HOY);
    await registrarEvento(a.id, formulario(ivermectina.id, { tipo: 'purga', fecha: '2026-10-01' }), PROPIETARIO, HOY);
    expect((await consolidarFicha(a.id))?.vacuna).toEqual({ nombre: 'Prueba Aftosa', fecha: '2026-09-01' });
  });
});
