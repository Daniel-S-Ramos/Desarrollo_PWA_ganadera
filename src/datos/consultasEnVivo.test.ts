import { liveQuery } from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { consolidarFicha } from '../modulos/consulta/ficha';
import { cargarListado } from '../modulos/consulta/listado';
import { cargarConflictoDeChapeta, resolverCambiandoNumero, resolverColocacion } from '../modulos/correcciones/conflictos';
import { cargarVigente } from '../modulos/correcciones/correcciones';
import { cargarHistorialDestino } from '../modulos/destino/destino';
import { cargarTernerosSinChapeta, confirmarChapetaPuesta, estadoDeChapeta } from '../modulos/identificacion/chapetaPendiente';
import { cargarEvolucion } from '../modulos/peso/pesajes';
import { cargarControlReproductivo } from '../modulos/reproduccion/partos';
import { cargarHistorialSanitario } from '../modulos/sanidad/eventos';
import type { DatosNuevos, Uuid } from '../dominio/tipos';
import type { Identidad } from '../sesion/token';
import { db } from './db';
import { crear } from './repositorio';
import { uuidv7 } from './uuidv7';

/**
 * PU-27 · 9. Las pantallas se enteran de los cambios (PE-32). Cada pantalla lee con useLiveQuery, que vuelve a
 * consultar cuando cambia una tabla que la consulta leyó. Si el contexto de Dexie se pierde a mitad de la
 * lectura, las tablas leídas después dejan de vigilarse y la pantalla no se actualiza: confirmar la chapeta
 * parecía no hacer nada hasta el segundo clic. Aquí se observa cada lectura como lo hace la pantalla.
 */

const YO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const HOY = '2026-10-18';

function datosAnimal(codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: '2026-10-01',
    fecha_nacimiento_exacta: true,
    fecha_ingreso: null,
    procedencia: null,
    peso_inicial: 30,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
    ...cambios,
  };
}

/** Observa la lectura, hace el cambio y devuelve lo último que vio la pantalla. */
async function trasCambiar<T>(leer: () => Promise<T>, cambiar: () => Promise<unknown>): Promise<T[]> {
  const vistos: T[] = [];
  const suscripcion = liveQuery(leer).subscribe((v) => vistos.push(v));
  const esperar = async (n: number) => {
    for (let i = 0; i < 200 && vistos.length < n; i++) await new Promise((r) => setTimeout(r, 5));
  };
  await esperar(1);
  await cambiar();
  await esperar(2);
  await new Promise((r) => setTimeout(r, 30)); // por si llegan más
  suscripcion.unsubscribe();
  return vistos;
}

const ultimo = <T,>(lista: T[]) => lista[lista.length - 1];

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  await db.usuario.put({ id: YO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' });
});

describe('PU-27 · 9. Las pantallas se enteran de los cambios (PE-32)', () => {
  it('chapeta: al confirmarla pasa a «puesta» al primer clic', async () => {
    const cria = await crear('animal', datosAnimal('Z1', { chapeta_puesta: false }), YO.usuario_id);
    const vistos = await trasCambiar(() => estadoDeChapeta(cria.id, HOY), () => confirmarChapetaPuesta(cria.id, '2026-10-17', YO, HOY));
    expect(ultimo(vistos)?.estado).toBe('puesta');
  });

  it('chapeta puesta repetida: al descartarla desaparece el aviso al primer clic', async () => {
    const cria = await crear('animal', datosAnimal('Z1', { chapeta_puesta: false }), YO.usuario_id);
    await db.colocacion_chapeta.add({ id: uuidv7(), animal_id: cria.id, fecha: '2026-10-15', autor_id: YO.usuario_id, creado_en: '2026-10-15T12:00:00.000Z', estado_sync: 'sincronizado' });
    const repetida = await crear('colocacion_chapeta', { animal_id: cria.id, fecha: '2026-10-16' }, YO.usuario_id);
    await db.cola_operaciones.where('registro_id').equals(repetida.id).delete();
    await db.colocacion_chapeta.update(repetida.id, { estado_sync: 'conflicto' });
    const vistos = await trasCambiar(() => estadoDeChapeta(cria.id, HOY), () => resolverColocacion(repetida.id, YO));
    expect(ultimo(vistos)).not.toHaveProperty('repetida');
  });

  it('terneros sin chapeta de Inicio', async () => {
    const cria = await crear('animal', datosAnimal('Z1', { chapeta_puesta: false }), YO.usuario_id);
    const vistos = await trasCambiar(() => cargarTernerosSinChapeta(HOY), () => confirmarChapetaPuesta(cria.id, '2026-10-17', YO, HOY));
    expect(ultimo(vistos)).toEqual([]);
  });

  it('ficha: un pesaje nuevo cambia el último peso', async () => {
    const vaca = await crear('animal', datosAnimal('Z1'), YO.usuario_id);
    const vistos = await trasCambiar(() => consolidarFicha(vaca.id), () => crear('pesaje', { animal_id: vaca.id, fecha: '2026-10-17', peso: 41, metodo: 'cinta' }, YO.usuario_id));
    expect(ultimo(vistos)?.peso).toMatchObject({ kg: 41 });
  });

  it('ficha: una corrección del animal se ve sin volver a entrar', async () => {
    const vaca = await crear('animal', datosAnimal('Z1'), YO.usuario_id);
    const vistos = await trasCambiar(() => consolidarFicha(vaca.id), () =>
      crear('correccion', { entidad_afectada: 'animal', registro_id: vaca.id, tipo: 'correccion', campo: 'peso_inicial', valor_anterior: '30', valor_nuevo: '34', motivo: 'error_digitacion', nota: null }, YO.usuario_id),
    );
    expect(ultimo(vistos)?.peso).toMatchObject({ kg: 34 });
  });

  it('marca de corrección del animal', async () => {
    const vaca = await crear('animal', datosAnimal('Z1'), YO.usuario_id);
    const vistos = await trasCambiar(() => cargarVigente('animal', vaca.id), () =>
      crear('correccion', { entidad_afectada: 'animal', registro_id: vaca.id, tipo: 'correccion', campo: 'peso_inicial', valor_anterior: '30', valor_nuevo: '34', motivo: 'error_digitacion', nota: null }, YO.usuario_id),
    );
    expect(ultimo(vistos)?.corregidos.size).toBe(1);
  });

  it('listado: un animal nuevo aparece', async () => {
    await crear('animal', datosAnimal('Z1'), YO.usuario_id);
    const vistos = await trasCambiar(() => cargarListado(), () => crear('animal', datosAnimal('Z2'), YO.usuario_id));
    expect(ultimo(vistos)).toHaveLength(2);
  });

  it('historial sanitario: un evento nuevo aparece', async () => {
    const vaca = await crear('animal', datosAnimal('Z1'), YO.usuario_id);
    const med = await crear('medicamento', { nombre: 'Prueba Aftosa', tipo: 'vacuna', unidad: 'ml', intervalo_advertencia_dias: 30 }, YO.usuario_id);
    const vistos = await trasCambiar(() => cargarHistorialSanitario(vaca.id), () =>
      crear('evento_sanitario', { animal_id: vaca.id, fecha: '2026-10-17', tipo: 'vacuna', medicamento_id: med.id, dosis: 2, costo: null, sintomas: null }, YO.usuario_id),
    );
    expect(ultimo(vistos)).toHaveLength(1);
  });

  it('evolución del peso: un pesaje nuevo aparece', async () => {
    const vaca = await crear('animal', datosAnimal('Z1'), YO.usuario_id);
    const vistos = await trasCambiar(() => cargarEvolucion(vaca.id), () => crear('pesaje', { animal_id: vaca.id, fecha: '2026-10-17', peso: 41, metodo: 'cinta' }, YO.usuario_id));
    expect(ultimo(vistos)?.tramos.some((t) => t.vigente?.registro.peso === 41)).toBe(true);
  });

  it('control reproductivo: un parto nuevo aparece', async () => {
    const vaca = await crear('animal', datosAnimal('Z1', { fecha_nacimiento: '2020-01-01' }), YO.usuario_id);
    const vistos = await trasCambiar(() => cargarControlReproductivo(vaca.id), () =>
      crear('parto', { madre_id: vaca.id, fecha: '2026-10-10', resultado: 'aborto', cria_id: null, observacion: null }, YO.usuario_id),
    );
    expect(ultimo(vistos)?.vigentes.size).toBe(1);
  });

  it('historial del destino: un destino nuevo aparece', async () => {
    const vaca = await crear('animal', datosAnimal('Z1', { fecha_nacimiento: '2020-01-01' }), YO.usuario_id);
    const vistos = await trasCambiar(() => cargarHistorialDestino(vaca.id), () => crear('destino_productivo', { animal_id: vaca.id, destino: 'leche', desde: '2026-10-10' }, YO.usuario_id));
    expect(ultimo(vistos)).toHaveLength(1);
  });

  it('conflicto de chapeta: al cambiar el número desaparece al primer clic', async () => {
    const otro: Uuid = uuidv7();
    await db.animal.add({ ...datosAnimal('Z9'), id: otro, autor_id: YO.usuario_id, creado_en: '2026-10-14T12:00:00.000Z', estado_sync: 'sincronizado' });
    const dup = await crear('animal', datosAnimal('Z9'), YO.usuario_id);
    await db.cola_operaciones.where('registro_id').equals(dup.id).delete();
    await db.animal.update(dup.id, { estado_sync: 'conflicto' });
    const vistos = await trasCambiar(() => cargarConflictoDeChapeta(dup.id), () => resolverCambiandoNumero(dup.id, 'Z10', YO));
    expect(ultimo(vistos)).toBeUndefined();
  });
});
