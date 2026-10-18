import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import { destinoVigente, historialDestino, validarCambioDestino, type ContextoDestino } from '../../dominio/destino';
import type { DatosNuevos } from '../../dominio/tipos';
import { PermisoDenegado } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { buscar, cargarListado, type AnimalListado } from '../consulta/listado';
import { formularioVacio, registrarAnimal, validarFormulario, type FormularioAnimal } from '../identificacion/registroAnimal';
import { asignarDestino, cargarContextoDestino, cargarHistorialDestino } from './destino';

/**
 * PU-20 · Destino productivo y su historial (RF-18, RF-19, CU-12, HU-13, HU-06.4).
 * Especificación: docs/tecnica/19-destino-productivo.md, sección 8
 */

const HOY = '2026-10-14';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

const registro = (id: string, destino: 'leche' | 'ceba' | 'venta', desde: string) => ({ id, destino, desde });

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

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: 'Daniel Ramos', perfil: 'trabajador' },
  ]);
});

describe('PU-20 · 1. Destino vigente (sección 2)', () => {
  it('el de fecha desde más reciente, aunque se haya registrado antes', () => {
    const vigente = destinoVigente([registro('02', 'leche', '2026-03-01'), registro('01', 'ceba', '2026-05-01')]);
    expect(vigente?.destino).toBe('ceba');
  });

  it('a igual fecha, el registrado después (mayor UUID v7)', () => {
    expect(destinoVigente([registro('02', 'ceba', '2026-05-01'), registro('01', 'leche', '2026-05-01')])?.destino).toBe('ceba');
    expect(destinoVigente([registro('01', 'leche', '2026-05-01'), registro('02', 'ceba', '2026-05-01')])?.destino).toBe('ceba');
  });

  it('sin registros, ninguno', () => {
    expect(destinoVigente([])).toBeNull();
  });
});

describe('PU-20 · 2. Historial (sección 2)', () => {
  it('del más reciente al más antiguo, cada cambio con el que reemplazó y el inicial sin anterior', () => {
    const inicial = registro('01', 'leche', '2026-01-10');
    const segundo = registro('02', 'ceba', '2026-04-01');
    const tercero = registro('03', 'venta', '2026-09-20');
    expect(historialDestino([segundo, tercero, inicial])).toEqual([
      { registro: tercero, anterior: segundo },
      { registro: segundo, anterior: inicial },
      { registro: inicial, anterior: null },
    ]);
  });

  it('con el nombre de quien asignó cada destino', async () => {
    const a = await animal('Z950');
    await asignarDestino(a.id, { destino: 'leche', desde: '2026-02-01' }, PROPIETARIO, HOY);
    const historial = await cargarHistorialDestino(a.id);
    expect(historial).toHaveLength(1);
    expect(historial[0]).toMatchObject({ autor: 'José Ramos', anterior: null, registro: { destino: 'leche', desde: '2026-02-01' } });
  });

  it('si el autor ya no está en el teléfono, lo dice en lugar de dejarlo vacío', async () => {
    const a = await animal('Z950');
    await crear('destino_productivo', { animal_id: a.id, destino: 'ceba', desde: '2026-02-01' }, uuidv7());
    expect((await cargarHistorialDestino(a.id))[0]?.autor).toBe('un usuario que ya no está en el predio');
  });
});

describe('PU-20 · 3. Validaciones (sección 4.1)', () => {
  const sinDestino: ContextoDestino = { vigente: null, retirado: false, llegada: '2026-01-01' };
  const conLeche: ContextoDestino = { vigente: registro('01', 'leche', '2026-05-01'), retirado: false, llegada: '2026-01-01' };
  const errores = (destino: 'leche' | 'ceba' | null, desde: string, contexto: ContextoDestino) => {
    const r = validarCambioDestino({ destino, desde }, contexto, HOY);
    return r.ok ? {} : r.errores;
  };

  it('un cambio válido devuelve el destino y la fecha', () => {
    expect(validarCambioDestino({ destino: 'ceba', desde: '2026-05-01' }, conLeche, HOY)).toEqual({ ok: true, destino: 'ceba', desde: '2026-05-01' });
  });

  it('hay que elegir un destino', () => {
    expect(errores(null, HOY, sinDestino)).toEqual({ destino: 'Elija el destino' });
  });

  it('no puede ser el mismo que el vigente', () => {
    expect(errores('leche', HOY, conLeche)).toEqual({ destino: 'Ya tiene ese destino' });
  });

  it('la fecha debe existir y no ser futura', () => {
    expect(errores('ceba', '2026-02-30', sinDestino)).toEqual({ desde: 'Escriba una fecha válida' });
    expect(errores('ceba', '', sinDestino)).toEqual({ desde: 'Escriba una fecha válida' });
    expect(errores('ceba', '2026-10-15', sinDestino)).toEqual({ desde: 'La fecha no puede ser posterior a hoy' });
    expect(errores('ceba', HOY, sinDestino)).toEqual({});
  });

  it('no puede ser anterior al destino vigente; el mismo día sí', () => {
    expect(errores('ceba', '2026-04-30', conLeche)).toEqual({ desde: 'Debe ser desde el 1 de mayo de 2026 o después, la fecha del destino actual' });
    expect(errores('ceba', '2026-05-01', conLeche)).toEqual({});
  });

  it('no puede ser anterior a la llegada del animal; sin llegada conocida no se valida', () => {
    expect(errores('ceba', '2025-12-31', sinDestino)).toEqual({ desde: 'El animal llegó al predio el 1 de enero de 2026' });
    expect(errores('ceba', '2026-01-01', sinDestino)).toEqual({});
    expect(errores('ceba', '2020-01-01', { ...sinDestino, llegada: null })).toEqual({});
  });

  it('un animal retirado no recibe destino; todos los errores juntos', () => {
    expect(errores('leche', '2026-10-15', { ...conLeche, retirado: true })).toEqual({
      animal: 'Este animal salió del predio',
      destino: 'Ya tiene ese destino',
      desde: 'La fecha no puede ser posterior a hoy',
    });
  });
});

describe('PU-20 · 4. Asignar (sección 4)', () => {
  it('crea el registro con su autor, pendiente y en la cola', async () => {
    const a = await animal('Z950');
    const colaAntes = await db.cola_operaciones.count();
    const r = await asignarDestino(a.id, { destino: 'leche', desde: '2026-06-01' }, PROPIETARIO, HOY);
    if (!r.ok) throw new Error('debía asignarse');
    expect(r.registro).toMatchObject({ animal_id: a.id, destino: 'leche', desde: '2026-06-01', autor_id: PROPIETARIO.usuario_id, estado_sync: 'pendiente' });
    expect(await db.cola_operaciones.count()).toBe(colaAntes + 1);
    expect(await db.cola_operaciones.where('registro_id').equals(r.registro.id).count()).toBe(1);
  });

  it('el contexto del formulario trae el vigente, que la confirmación nombra como reemplazado', async () => {
    const a = await animal('Z950');
    await asignarDestino(a.id, { destino: 'leche', desde: '2026-06-01' }, PROPIETARIO, HOY);
    expect(await cargarContextoDestino(a.id)).toMatchObject({ vigente: { destino: 'leche', desde: '2026-06-01' }, retirado: false, llegada: '2024-03-04' });
    await asignarDestino(a.id, { destino: 'ceba', desde: '2026-08-01' }, PROPIETARIO, HOY);
    expect((await cargarContextoDestino(a.id))?.vigente).toMatchObject({ destino: 'ceba' });
  });

  it('la llegada de un comprado es su ingreso', async () => {
    const a = await animal('Z951', { fecha_ingreso: '2026-09-01', fecha_nacimiento: '2025-01-01', fecha_nacimiento_exacta: false });
    expect((await cargarContextoDestino(a.id))?.llegada).toBe('2026-09-01');
    const r = await asignarDestino(a.id, { destino: 'ceba', desde: '2026-08-31' }, PROPIETARIO, HOY);
    expect(r).toEqual({ ok: false, errores: { desde: 'El animal llegó al predio el 1 de septiembre de 2026' } });
  });

  it('un error no escribe nada', async () => {
    const a = await animal('Z950');
    const colaAntes = await db.cola_operaciones.count();
    expect(await asignarDestino(a.id, { destino: null, desde: HOY }, PROPIETARIO, HOY)).toEqual({ ok: false, errores: { destino: 'Elija el destino' } });
    expect(await db.destino_productivo.count()).toBe(0);
    expect(await db.cola_operaciones.count()).toBe(colaAntes);
  });

  it('un animal retirado o que no está en el teléfono no recibe destino', async () => {
    const a = await animal('Z950');
    await crear('salida', { animal_id: a.id, fecha: '2026-10-01', motivo: 'venta', peso_venta: 300, valor_venta: 1, comprador: null, causa_muerte: null }, PROPIETARIO.usuario_id);
    expect(await asignarDestino(a.id, { destino: 'venta', desde: HOY }, PROPIETARIO, HOY)).toEqual({ ok: false, errores: { animal: 'Este animal salió del predio' } });
    expect(await asignarDestino(uuidv7(), { destino: 'venta', desde: HOY }, PROPIETARIO, HOY)).toEqual({ ok: false, errores: { animal: 'El animal no está en este teléfono' } });
    expect(await db.destino_productivo.count()).toBe(0);
  });
});

describe('PU-20 · 5. Verificación dentro de la transacción (sección 4.1)', () => {
  it('dos asignaciones seguidas con la misma base: la segunda se valida contra la primera', async () => {
    const a = await animal('Z950');
    const [primera, segunda] = await Promise.all([
      asignarDestino(a.id, { destino: 'leche', desde: HOY }, PROPIETARIO, HOY),
      asignarDestino(a.id, { destino: 'leche', desde: HOY }, PROPIETARIO, HOY),
    ]);
    expect([primera.ok, segunda.ok].sort()).toEqual([false, true]);
    expect(await db.destino_productivo.count()).toBe(1);
  });

  it('una segunda con fecha anterior a la que acaba de guardarse se rechaza', async () => {
    const a = await animal('Z950');
    const [primera, segunda] = await Promise.all([
      asignarDestino(a.id, { destino: 'leche', desde: '2026-09-01' }, PROPIETARIO, HOY),
      asignarDestino(a.id, { destino: 'ceba', desde: '2026-08-01' }, PROPIETARIO, HOY),
    ]);
    expect(primera.ok).toBe(true);
    expect(segunda).toEqual({ ok: false, errores: { desde: 'Debe ser desde el 1 de septiembre de 2026 o después, la fecha del destino actual' } });
  });
});

describe('PU-20 · 6. Destino al registrar un animal (sección 5)', () => {
  const formulario = (cambios: Partial<FormularioAnimal> = {}): FormularioAnimal => ({
    ...formularioVacio(HOY),
    chapeta: 'Z952',
    sexo: 'hembra',
    origen: 'nacido',
    fecha_nacimiento: '2026-03-15',
    ...cambios,
  });

  it('sin destino, el formulario sigue siendo válido y no se crea ninguno', async () => {
    const r = await registrarAnimal(formulario(), PROPIETARIO, HOY);
    expect(r.ok).toBe(true);
    expect(await db.destino_productivo.count()).toBe(0);
  });

  it('con destino, el animal y su destino en la misma operación, con el mismo autor', async () => {
    const r = await registrarAnimal(formulario({ destino: 'reproductora', destino_desde: '2026-10-01' }), PROPIETARIO, HOY);
    if (!r.ok) throw new Error('debía registrarse');
    const destinos = await db.destino_productivo.toArray();
    expect(destinos).toMatchObject([{ animal_id: r.animal.id, destino: 'reproductora', desde: '2026-10-01', autor_id: PROPIETARIO.usuario_id }]);
    expect(await db.cola_operaciones.toArray()).toMatchObject([{ entidad: 'animal' }, { entidad: 'destino_productivo' }]);
  });

  it('valida la fecha del destino: no futura ni anterior a la llegada', () => {
    const errores = (f: FormularioAnimal) => {
      const r = validarFormulario(f, HOY);
      return r.ok ? {} : r.errores;
    };
    expect(errores(formulario({ destino: 'leche', destino_desde: '2026-10-15' }))).toEqual({ destino_desde: 'La fecha no puede ser posterior a hoy' });
    expect(errores(formulario({ destino: 'leche', destino_desde: '2026-03-14' }))).toEqual({ destino_desde: 'El animal llegó al predio el 15 de marzo de 2026' });
    expect(
      errores(formulario({ origen: 'comprado', fecha_ingreso: '2026-09-01', nacimiento_comprado: 'desconocido', destino: 'ceba', destino_desde: '2026-08-31' })),
    ).toEqual({ destino_desde: 'El animal llegó al predio el 1 de septiembre de 2026' });
    expect(validarFormulario(formulario({ destino: 'leche', destino_desde: '2026-03-15' }), HOY)).toMatchObject({ ok: true, destino: { destino: 'leche', desde: '2026-03-15' } });
  });

  it('si el animal se rechaza, no queda destino', async () => {
    await animal('Z952');
    const r = await registrarAnimal(formulario({ destino: 'ceba' }), PROPIETARIO, HOY);
    expect(r.ok).toBe(false);
    expect(await db.destino_productivo.count()).toBe(0);
  });
});

describe('PU-20 · 7. Permisos (sección 3, Tabla 27)', () => {
  it('el trabajador no puede asignar un destino', async () => {
    const a = await animal('Z950');
    await expect(asignarDestino(a.id, { destino: 'leche', desde: HOY }, TRABAJADOR, HOY)).rejects.toBeInstanceOf(PermisoDenegado);
    expect(await db.destino_productivo.count()).toBe(0);
  });

  it('ni al registrar un animal; sin destino, sí registra el animal', async () => {
    const f: FormularioAnimal = { ...formularioVacio(HOY), chapeta: 'Z953', sexo: 'macho', origen: 'nacido', fecha_nacimiento: '2026-03-15' };
    await expect(registrarAnimal({ ...f, destino: 'ceba' }, TRABAJADOR, HOY)).rejects.toBeInstanceOf(PermisoDenegado);
    expect(await db.animal.count()).toBe(0);
    expect((await registrarAnimal(f, TRABAJADOR, HOY)).ok).toBe(true);
  });
});

describe('PU-20 · 8. Filtro del listado (sección 6)', () => {
  const fila = (codigo: string, destino: AnimalListado['destino']): AnimalListado => ({
    id: `id-${codigo}`,
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: null,
    fecha_nacimiento_exacta: false,
    retirado: false,
    chapetaPendiente: false,
    destino,
    estado_sync: 'sincronizado',
    foto: null,
  });
  const HATO = [fila('4', 'leche'), fila('45', 'ceba'), fila('450', 'leche'), fila('9', null), fila('10', 'venta')];
  const chapetas = (r: { animales: AnimalListado[] }) => r.animales.map((a) => a.codigo_chapeta);

  it('por destino, sin destino y todos', () => {
    expect(chapetas(buscar(HATO, '', 'activos', 'leche'))).toEqual(['4', '450']);
    expect(chapetas(buscar(HATO, '', 'activos', 'sin_destino'))).toEqual(['9']);
    expect(chapetas(buscar(HATO, '', 'activos', 'todos'))).toEqual(['4', '9', '10', '45', '450']);
    expect(chapetas(buscar(HATO, '', 'activos'))).toEqual(['4', '9', '10', '45', '450']);
  });

  it('combinado con el buscador y con el estado', () => {
    expect(chapetas(buscar(HATO, '45', 'activos', 'leche'))).toEqual(['450']);
    expect(chapetas(buscar([...HATO, { ...fila('46', 'leche'), retirado: true }], '4', 'retirados', 'leche'))).toEqual(['46']);
  });

  it('cada fila trae su destino vigente', async () => {
    const a = await animal('Z950');
    await animal('Z951');
    await asignarDestino(a.id, { destino: 'leche', desde: '2026-02-01' }, PROPIETARIO, HOY);
    await asignarDestino(a.id, { destino: 'ceba', desde: '2026-07-01' }, PROPIETARIO, HOY);
    const listado = await cargarListado();
    expect(listado.find((x) => x.codigo_chapeta === 'Z950')?.destino).toBe('ceba');
    expect(listado.find((x) => x.codigo_chapeta === 'Z951')?.destino).toBeNull();
  });
});
