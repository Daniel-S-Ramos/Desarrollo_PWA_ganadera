import { liveQuery } from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import type { DatosNuevos, RegistroLocal, Uuid } from '../../dominio/tipos';
import { PermisoDenegado } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import {
  cargarRecordatorios,
  derivarRecordatorios,
  destinoRecordatorio,
  estaPospuesto,
  PARAMETROS_POR_DEFECTO,
  posponerRecordatorio,
  textoRecordatorio,
  type DatosRecordatorios,
  type GrupoRecordatorios,
} from './recordatorios';

/**
 * PU-32 · Recordatorios derivados y posponer (RF-22, RF-23, CU-15, HU-14).
 * Especificación: docs/tecnica/30-recordatorios.md, sección 10
 */

const HOY = '2026-10-21';
const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };

let n = 0;
/** Un animal en memoria, registrado mucho antes, para las pruebas de la función pura. */
function animal(codigo: string, cambios: Partial<RegistroLocal<'animal'>> = {}): RegistroLocal<'animal'> {
  n++;
  return {
    id: `a${n}`,
    autor_id: 'p',
    creado_en: '2026-01-01T15:00:00.000Z',
    estado_sync: 'sincronizado',
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: '2022-01-01',
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
const destino = (animal_id: Uuid, d: RegistroLocal<'destino_productivo'>['destino'], desde: string): RegistroLocal<'destino_productivo'> => ({
  id: `d${++n}`,
  autor_id: 'p',
  creado_en: `${desde}T12:00:00.000Z`,
  estado_sync: 'sincronizado',
  animal_id,
  destino: d,
  desde,
});

function datos(cambios: Partial<DatosRecordatorios>): DatosRecordatorios {
  return {
    animales: [],
    retirados: new Set(),
    destinos: [],
    pesajes: [],
    ordenos: [],
    eventos: [],
    partos: [],
    fotografias: [],
    colocaciones: [],
    colaMasAntigua: null,
    pospuestos: [],
    parametros: { ...PARAMETROS_POR_DEFECTO },
    ...cambios,
  };
}

const delTipo = (grupos: GrupoRecordatorios[], tipo: string) => grupos.find((g) => g.tipo === tipo)?.recordatorios ?? [];

describe('PU-32 · 1. Sin pesaje reciente (sección 3, regla 1)', () => {
  it('solo ceba; el día 30 no avisa, el 31 sí; con el último pesaje vigente', () => {
    const ceba = animal('Z1');
    const leche = animal('Z2');
    const base = { animales: [ceba, leche], destinos: [destino(ceba.id, 'ceba', '2026-01-10'), destino(leche.id, 'leche', '2026-01-10')], eventos: [{ animal_id: ceba.id, fecha: HOY }, { animal_id: leche.id, fecha: HOY }] };
    expect(delTipo(derivarRecordatorios(datos({ ...base, pesajes: [{ animal_id: ceba.id, fecha: '2026-09-21' }, { animal_id: leche.id, fecha: '2026-01-01' }] }), HOY), 'sin_pesaje_reciente')).toEqual([]);
    const r = delTipo(derivarRecordatorios(datos({ ...base, pesajes: [{ animal_id: ceba.id, fecha: '2026-09-20' }] }), HOY), 'sin_pesaje_reciente');
    expect(r).toMatchObject([{ codigo_chapeta: 'Z1', desde: '2026-09-20', dias: 31, nunca: false }]);
  });

  it('con varios pesajes cuenta el más reciente', () => {
    const ceba = animal('Z1');
    const r = derivarRecordatorios(datos({ animales: [ceba], destinos: [destino(ceba.id, 'ceba', '2026-01-10')], pesajes: [{ animal_id: ceba.id, fecha: '2026-03-01' }, { animal_id: ceba.id, fecha: '2026-10-10' }] }), HOY);
    expect(delTipo(r, 'sin_pesaje_reciente')).toEqual([]);
  });

  it('nunca pesado: se cuenta desde la llegada', () => {
    const comprado = animal('Z1', { fecha_ingreso: '2026-08-01', fecha_nacimiento: '2024-01-01' });
    const r = delTipo(derivarRecordatorios(datos({ animales: [comprado], destinos: [destino(comprado.id, 'ceba', '2026-08-01')] }), HOY), 'sin_pesaje_reciente');
    expect(r).toMatchObject([{ desde: '2026-08-01', nunca: true }]);
    expect(textoRecordatorio(r[0]!)).toBe('Nunca se ha pesado; llegó el 1 de agosto de 2026 (81 días)');
  });
});

describe('PU-32 · 2. Sin registro de ordeño (regla 2)', () => {
  it('solo vacas en leche; el día 3 no avisa, el 4 sí', () => {
    const vaca = animal('Z1');
    const ceba = animal('Z2');
    const base = { animales: [vaca, ceba], destinos: [destino(vaca.id, 'leche', '2026-09-01'), destino(ceba.id, 'ceba', '2026-09-01')] };
    expect(delTipo(derivarRecordatorios(datos({ ...base, ordenos: [{ animal_id: vaca.id, fecha: '2026-10-18', litros: 10 }] }), HOY), 'sin_registro_ordeno')).toEqual([]);
    const r = delTipo(derivarRecordatorios(datos({ ...base, ordenos: [{ animal_id: vaca.id, fecha: '2026-10-17', litros: 10 }] }), HOY), 'sin_registro_ordeno');
    expect(r).toMatchObject([{ codigo_chapeta: 'Z1', desde: '2026-10-17', dias: 4 }]);
    expect(textoRecordatorio(r[0]!)).toBe('Sin ordeño registrado desde el 17 de octubre de 2026 (4 días)');
    expect(destinoRecordatorio(r[0]!)).toBe('/ordeno');
  });

  it('sin ordeños: desde que pasó a leche; un macho en leche no cuenta', () => {
    const vaca = animal('Z1');
    const toro = animal('Z2', { sexo: 'macho' });
    const r = derivarRecordatorios(datos({ animales: [vaca, toro], destinos: [destino(vaca.id, 'ceba', '2026-01-01'), destino(vaca.id, 'leche', '2026-10-10'), destino(toro.id, 'leche', '2026-10-10')] }), HOY);
    expect(delTipo(r, 'sin_registro_ordeno')).toMatchObject([{ codigo_chapeta: 'Z1', desde: '2026-10-10', nunca: true }]);
  });
});

describe('PU-32 · 3. Producción bajo el promedio (regla 3)', () => {
  const vaca = animal('Z9');
  const previos = ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'].map((fecha) => ({ animal_id: vaca.id, fecha, litros: 12 }));
  const base = { animales: [vaca], destinos: [destino(vaca.id, 'leche', '2026-09-01')] };

  it('muy por debajo avisa, con los litros y el promedio; solo por debajo no', () => {
    const muy = delTipo(derivarRecordatorios(datos({ ...base, ordenos: [...previos, { animal_id: vaca.id, fecha: '2026-10-20', litros: 8 }] }), HOY), 'produccion_bajo_promedio');
    expect(muy).toMatchObject([{ litros: 8, promedio: 12, desde: '2026-10-20' }]);
    expect(textoRecordatorio(muy[0]!)).toBe('8 litros el 20 de octubre de 2026: muy por debajo de su promedio (12 litros)');
    expect(destinoRecordatorio(muy[0]!)).toBe(`/produccion?vaca=${vaca.id}`);
    expect(delTipo(derivarRecordatorios(datos({ ...base, ordenos: [...previos, { animal_id: vaca.id, fecha: '2026-10-20', litros: 10 }] }), HOY), 'produccion_bajo_promedio')).toEqual([]);
  });

  it('un ordeño más viejo que el umbral no avisa: de eso se encarga la regla 2', () => {
    const viejos = ['2026-10-10', '2026-10-11', '2026-10-12'].map((fecha) => ({ animal_id: vaca.id, fecha, litros: 12 }));
    const r = derivarRecordatorios(datos({ ...base, ordenos: [...viejos, { animal_id: vaca.id, fecha: '2026-10-17', litros: 2 }] }), HOY);
    expect(delTipo(r, 'produccion_bajo_promedio')).toEqual([]);
    expect(delTipo(r, 'sin_registro_ordeno')).toHaveLength(1);
  });
});

describe('PU-32 · 4. Sin registros recientes (regla 4)', () => {
  it('cualquier registro lo reinicia; el día 90 no avisa, el 91 sí', () => {
    const a = animal('Z1');
    const conDia = (fecha: string) => delTipo(derivarRecordatorios(datos({ animales: [a], eventos: [{ animal_id: a.id, fecha }] }), HOY), 'sin_registros_recientes');
    expect(conDia('2026-07-23')).toEqual([]);
    expect(conDia('2026-07-22')).toMatchObject([{ desde: '2026-07-22', dias: 91 }]);
    const tipos: Partial<DatosRecordatorios>[] = [
      { ordenos: [{ animal_id: a.id, fecha: '2026-10-01', litros: 1 }] },
      { pesajes: [{ animal_id: a.id, fecha: '2026-10-01' }] },
      { partos: [{ madre_id: a.id, fecha: '2026-10-01' }] },
      { destinos: [destino(a.id, 'reproductora', '2026-10-01')] },
      { fotografias: [{ animal_id: a.id, creado_en: '2026-10-01T15:00:00.000Z' }] },
      { colocaciones: [{ animal_id: a.id, fecha: '2026-10-01' }] },
    ];
    for (const t of tipos) expect(delTipo(derivarRecordatorios(datos({ animales: [a], ...t }), HOY), 'sin_registros_recientes')).toEqual([]);
  });

  it('con registros viejos y recientes cuenta el más reciente', () => {
    const a = animal('Z1');
    const r = derivarRecordatorios(datos({ animales: [a], eventos: [{ animal_id: a.id, fecha: '2026-10-15' }, { animal_id: a.id, fecha: '2026-02-01' }], pesajes: [{ animal_id: a.id, fecha: '2026-03-01' }] }), HOY);
    expect(delTipo(r, 'sin_registros_recientes')).toEqual([]);
  });

  it('sin registros: desde que se registró el animal', () => {
    const nuevo = animal('Z1', { creado_en: '2026-10-01T15:00:00.000Z' });
    const viejo = animal('Z2', { creado_en: '2026-06-01T15:00:00.000Z' });
    const r = delTipo(derivarRecordatorios(datos({ animales: [nuevo, viejo] }), HOY), 'sin_registros_recientes');
    expect(r).toMatchObject([{ codigo_chapeta: 'Z2', desde: '2026-06-01' }]);
    expect(destinoRecordatorio(r[0]!)).toBe(`/animales/${viejo.id}`);
  });
});

describe('PU-32 · 5. Sincronización pendiente (regla 5)', () => {
  it('el registro más antiguo de la cola, con más de 3 días; sin animal ni destino', () => {
    expect(delTipo(derivarRecordatorios(datos({ colaMasAntigua: '2026-10-18T15:00:00.000Z' }), HOY), 'sincronizacion_pendiente')).toEqual([]);
    const r = delTipo(derivarRecordatorios(datos({ colaMasAntigua: '2026-10-17T15:00:00.000Z' }), HOY), 'sincronizacion_pendiente');
    expect(r).toMatchObject([{ animal_id: null, codigo_chapeta: null, dias: 4 }]);
    expect(destinoRecordatorio(r[0]!)).toBeNull();
    expect(textoRecordatorio(r[0]!)).toMatch(/^Hay registros sin enviar desde el 17 de octubre de 2026 \(4 días\)/);
  });
});

describe('PU-32 · 6. Exclusiones y parámetros', () => {
  it('un animal retirado no genera recordatorios', () => {
    const a = animal('Z1');
    const r = derivarRecordatorios(datos({ animales: [a], retirados: new Set([a.id]), destinos: [destino(a.id, 'ceba', '2026-01-01')] }), HOY);
    expect(r).toEqual([]);
  });

  it('los parámetros del teléfono cambian los umbrales', () => {
    const vaca = animal('Z1');
    const base = { animales: [vaca], destinos: [destino(vaca.id, 'leche', '2026-09-01')], ordenos: [{ animal_id: vaca.id, fecha: '2026-10-19', litros: 10 }] };
    expect(delTipo(derivarRecordatorios(datos(base), HOY), 'sin_registro_ordeno')).toEqual([]);
    expect(delTipo(derivarRecordatorios(datos({ ...base, parametros: { ...PARAMETROS_POR_DEFECTO, dias_sin_ordeno: 1 } }), HOY), 'sin_registro_ordeno')).toHaveLength(1);
  });

  it('la chapeta pendiente aparece como sexto tipo, sin posponer', () => {
    const cria = animal('Z1', { chapeta_puesta: false, fecha_nacimiento: '2026-10-01', creado_en: '2026-10-01T15:00:00.000Z' });
    const r = delTipo(derivarRecordatorios(datos({ animales: [cria] }), HOY), 'chapeta_pendiente');
    expect(r).toMatchObject([{ codigo_chapeta: 'Z1', posponible: false, chapeta: { dias: 20, quedan: 70 } }]);
    expect(textoRecordatorio(r[0]!)).toBe('nació hace 20 días · quedan 70 días del plazo');
  });
});

describe('PU-32 · 7. Posponer (sección 7)', () => {
  const vaca = animal('Z1');
  const base = { animales: [vaca], destinos: [destino(vaca.id, 'leche', '2026-09-01')] };

  it('oculta mientras dure el plazo, por tipo y animal; vuelve al vencer; vale el más lejano', () => {
    const pospuesto = (hasta: string, tipo = 'sin_registro_ordeno' as const, animal_id: string | null = vaca.id) => ({ tipo, animal_id, pospuesto_hasta: hasta });
    const con = (pospuestos: DatosRecordatorios['pospuestos']) => delTipo(derivarRecordatorios(datos({ ...base, pospuestos }), HOY), 'sin_registro_ordeno');
    expect(con([pospuesto('2026-10-22')])).toEqual([]);
    expect(con([pospuesto(HOY)])).toHaveLength(1);
    expect(con([pospuesto(HOY), pospuesto('2026-10-28')])).toEqual([]);
    expect(con([pospuesto('2026-10-22', 'sin_registro_ordeno', 'otro')])).toHaveLength(1);
    expect(con([{ tipo: 'sin_registros_recientes', animal_id: vaca.id, pospuesto_hasta: '2026-10-22' }])).toHaveLength(1);
    expect(estaPospuesto([{ tipo: 'sincronizacion_pendiente', animal_id: null, pospuesto_hasta: '2026-10-22' }], 'sincronizacion_pendiente', null, HOY)).toBe(true);
  });
});

describe('PU-32 · 8. Orden y grupos (sección 6)', () => {
  it('los grupos en el orden de las reglas; dentro, del más antiguo al más reciente', () => {
    const a = animal('Z1', { creado_en: '2026-05-01T15:00:00.000Z' });
    const b = animal('Z2', { creado_en: '2026-03-01T15:00:00.000Z' });
    const c = animal('Z3');
    const r = derivarRecordatorios(datos({ animales: [a, b, c], destinos: [destino(c.id, 'ceba', '2026-01-01')], colaMasAntigua: '2026-10-01T15:00:00.000Z' }), HOY);
    expect(r.map((g) => g.tipo)).toEqual(['sin_pesaje_reciente', 'sin_registros_recientes', 'sincronizacion_pendiente']);
    // Z3 también: su destino del 1 de enero es su último registro.
    expect(delTipo(r, 'sin_registros_recientes').map((x) => x.codigo_chapeta)).toEqual(['Z3', 'Z2', 'Z1']);
  });
});

describe('PU-32 · 9. Desde la base del teléfono', () => {
  function datosAnimal(codigo: string): DatosNuevos<'animal'> {
    return { codigo_chapeta: codigo, sexo: 'hembra', fecha_nacimiento: '2022-01-01', fecha_nacimiento_exacta: true, fecha_ingreso: null, procedencia: null, peso_inicial: null, madre_id: null, madre_externa: null, padre_id: null, padre_externo: null };
  }

  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });

  /** Observa la consulta como Inicio, hace el cambio y devuelve lo último que vio. */
  async function trasCambiar(cambiar: () => Promise<unknown>, hoy: string): Promise<GrupoRecordatorios[]> {
    const vistos: GrupoRecordatorios[][] = [];
    const sub = liveQuery(() => cargarRecordatorios(hoy)).subscribe((v) => vistos.push(v));
    for (let i = 0; i < 200 && vistos.length < 1; i++) await new Promise((r) => setTimeout(r, 5));
    await cambiar();
    for (let i = 0; i < 200 && vistos.length < 2; i++) await new Promise((r) => setTimeout(r, 5));
    await new Promise((r) => setTimeout(r, 30));
    sub.unsubscribe();
    return vistos[vistos.length - 1]!;
  }

  it('el ordeño registrado lo hace desaparecer; el anulado no cuenta; la salida lo retira', async () => {
    const hoy = '2099-01-10';
    const vaca = await crear('animal', datosAnimal('Z1'), PROPIETARIO.usuario_id);
    await crear('destino_productivo', { animal_id: vaca.id, destino: 'leche', desde: '2099-01-01' }, PROPIETARIO.usuario_id);
    const tieneOrdeno = (g: GrupoRecordatorios[]) => delTipo(g, 'sin_registro_ordeno').length > 0;
    expect(tieneOrdeno(await cargarRecordatorios(hoy))).toBe(true);
    const visto = await trasCambiar(() => crear('produccion_leche', { animal_id: vaca.id, fecha: '2099-01-09', litros: 10 }, PROPIETARIO.usuario_id), hoy);
    expect(tieneOrdeno(visto)).toBe(false);
    const o = (await db.produccion_leche.toArray())[0]!;
    await crear('correccion', { entidad_afectada: 'produccion_leche', registro_id: o.id, tipo: 'anulacion', campo: null, valor_anterior: null, valor_nuevo: null, motivo: 'registro_duplicado', nota: null }, PROPIETARIO.usuario_id);
    expect(tieneOrdeno(await cargarRecordatorios(hoy))).toBe(true);
    await crear('salida', { animal_id: vaca.id, fecha: '2099-01-10', motivo: 'muerte', peso_venta: null, valor_venta: null, comprador: null, causa_muerte: 'Rayo', observacion: null }, PROPIETARIO.usuario_id);
    // Solo queda el de la cola de este teléfono, que no es del animal.
    expect((await cargarRecordatorios(hoy)).flatMap((g) => g.recordatorios).filter((x) => x.animal_id === vaca.id)).toEqual([]);
  });

  it('posponer lo oculta al instante; la cola del teléfono genera el de sincronización', async () => {
    const vaca = await crear('animal', datosAnimal('Z1'), PROPIETARIO.usuario_id);
    await crear('destino_productivo', { animal_id: vaca.id, destino: 'leche', desde: '2026-01-01' }, PROPIETARIO.usuario_id);
    const hoy = '2099-01-10';
    const antes = await cargarRecordatorios(hoy);
    expect(delTipo(antes, 'sincronizacion_pendiente')).toHaveLength(1);
    const visto = await trasCambiar(() => posponerRecordatorio('sin_registro_ordeno', vaca.id, 3, PROPIETARIO, hoy), hoy);
    expect(delTipo(visto, 'sin_registro_ordeno')).toEqual([]);
    const guardado = (await db.recordatorio.toArray())[0];
    expect(guardado).toMatchObject({ tipo: 'sin_registro_ordeno', animal_id: vaca.id, pospuesto_hasta: '2099-01-13', estado_sync: 'pendiente' });
    // Vence: el 13 vuelve a aparecer.
    expect(delTipo(await cargarRecordatorios('2099-01-13'), 'sin_registro_ordeno')).toHaveLength(1);
  });

  it('una salida anulada devuelve el animal; los parámetros y la cola salen del teléfono', async () => {
    const hoy = '2099-01-10';
    const vaca = await crear('animal', datosAnimal('Z1'), PROPIETARIO.usuario_id);
    await crear('destino_productivo', { animal_id: vaca.id, destino: 'leche', desde: '2099-01-01' }, PROPIETARIO.usuario_id);
    await crear('produccion_leche', { animal_id: vaca.id, fecha: '2099-01-08', litros: 10 }, PROPIETARIO.usuario_id);
    const delAnimal = async () => (await cargarRecordatorios(hoy)).flatMap((g) => g.recordatorios).filter((x) => x.animal_id === vaca.id);
    // Con el ejemplo (3 días) no avisa; con el parámetro del teléfono (1 día), sí.
    expect(await delAnimal()).toEqual([]);
    await db.parametro.put({ clave: 'dias_sin_ordeno', valor: 1, unidad: 'días', descripcion: '' } as never);
    expect((await delAnimal()).map((x) => x.tipo)).toEqual(['sin_registro_ordeno']);
    const salida = await crear('salida', { animal_id: vaca.id, fecha: hoy, motivo: 'muerte', peso_venta: null, valor_venta: null, comprador: null, causa_muerte: 'Rayo', observacion: null }, PROPIETARIO.usuario_id);
    expect(await delAnimal()).toEqual([]);
    await crear('correccion', { entidad_afectada: 'salida', registro_id: salida.id, tipo: 'anulacion', campo: null, valor_anterior: null, valor_nuevo: null, motivo: 'animal_equivocado', nota: null }, PROPIETARIO.usuario_id);
    expect((await delAnimal()).map((x) => x.tipo)).toEqual(['sin_registro_ordeno']);
    // La cola: cuenta su registro más antiguo.
    await db.cola_operaciones.add({ entidad: 'pesaje', registro_id: uuidv7(), tipo: 'insertar', intentos: 0, ultimo_intento: null, creado_en: '2026-01-02T15:00:00.000Z' });
    expect(delTipo(await cargarRecordatorios(hoy), 'sincronizacion_pendiente')).toMatchObject([{ desde: '2026-01-02' }]);
  });

  it('solo el propietario pospone', async () => {
    await expect(posponerRecordatorio('sincronizacion_pendiente', null, 1, TRABAJADOR, HOY)).rejects.toThrow(PermisoDenegado);
    expect(await db.recordatorio.count()).toBe(0);
  });
});
