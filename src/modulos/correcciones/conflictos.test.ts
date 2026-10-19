import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear, operacionesPendientes, unidadDeTrabajo } from '../../datos/repositorio';
import { cambiarNumero, ResolucionDetenida } from '../../datos/resolucionConflictos';
import { uuidv7 } from '../../datos/uuidv7';
import type { DatosNuevos, Uuid } from '../../dominio/tipos';
import { PermisoDenegado } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { sincronizar } from '../../sync/motor';
import { subir } from '../../sync/subida';
import { ServicioSimulado } from '../../test/servicioSimulado';
import { estadoDeChapeta } from '../identificacion/chapetaPendiente';
import {
  cargarConflictoDeChapeta,
  describirMovimientos,
  errorDeNumeroNuevo,
  medicamentoExistente,
  puedeResolver,
  resolverCambiandoNumero,
  resolverColocacion,
  resolverMedicamento,
  resolverUniendo,
} from './conflictos';

/**
 * PU-28 · Resolución de conflictos de chapeta, de medicamento y de chapeta puesta (Tabla 21, regla del
 * propietario del 2026-10-13). Especificación: docs/tecnica/26-correccion-y-anulacion.md, sección 10.4
 */

const PROPIETARIO: Identidad = { usuario_id: uuidv7(), perfil: 'propietario', nombre: 'José Ramos', vence_en: 0 };
const TRABAJADOR: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Daniel Ramos', vence_en: 0 };
const OTRO: Identidad = { usuario_id: uuidv7(), perfil: 'trabajador', nombre: 'Pedro Gómez', vence_en: 0 };
let servicio: ServicioSimulado;

function datosAnimal(codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'hembra',
    fecha_nacimiento: '2022-03-04',
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

const pesaje = (animalId: Uuid, peso = 300) => crear('pesaje', { animal_id: animalId, fecha: '2026-10-15', peso, metodo: 'cinta' }, TRABAJADOR.usuario_id);

/** Un registro que el servicio ya aceptó y llegó a este teléfono por la bajada. */
async function delServicio<T extends 'animal' | 'medicamento' | 'colocacion_chapeta'>(tabla: T, datos: DatosNuevos<T>): Promise<Uuid> {
  const id = uuidv7();
  await (db[tabla] as unknown as { add: (f: unknown) => Promise<unknown> }).add({
    ...datos,
    id,
    autor_id: PROPIETARIO.usuario_id,
    creado_en: '2026-10-14T12:00:00.000Z',
    estado_sync: 'sincronizado',
    recibido_en: '2026-10-14T12:00:01.000Z',
  });
  return id;
}

/** Lo que hace la subida ante un 23505: sale de la cola y queda en conflicto. */
async function enConflicto(tabla: 'animal' | 'medicamento' | 'colocacion_chapeta', id: Uuid): Promise<void> {
  await db.cola_operaciones.where('registro_id').equals(id).delete();
  await db[tabla].update(id, { estado_sync: 'conflicto', detalle_conflicto: 'repetido' });
}

/** Un animal de este teléfono rechazado por chapeta repetida, frente al Z930 del servicio. */
async function escenarioChapeta() {
  const correcto = await delServicio('animal', datosAnimal('Z930'));
  const duplicado = await crear('animal', datosAnimal('Z930'), TRABAJADOR.usuario_id);
  await enConflicto('animal', duplicado.id);
  return { correcto, duplicado: duplicado.id };
}

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  servicio = new ServicioSimulado();
  await db.usuario.bulkPut([
    { id: PROPIETARIO.usuario_id, nombre: 'José Ramos', perfil: 'propietario' },
    { id: TRABAJADOR.usuario_id, nombre: 'Daniel Ramos', perfil: 'trabajador' },
  ]);
});

describe('PU-28 · 1. Cambiar el número (sección 10.1)', () => {
  it('valida el número nuevo como en el registro: formato, distinto y que no exista', async () => {
    await delServicio('animal', datosAnimal('Z931'));
    expect(await errorDeNumeroNuevo('', 'Z930')).toBe('Escriba el número de la chapeta');
    expect(await errorDeNumeroNuevo('O12', 'Z930')).toMatch(/letra O/);
    expect(await errorDeNumeroNuevo('z-930', 'Z930')).toBe('Escriba un número distinto al que está repetido');
    expect(await errorDeNumeroNuevo('Z931', 'Z930')).toBe('Ya hay un animal con el número Z931');
    expect(await errorDeNumeroNuevo(' z0932 ', 'Z930')).toBeNull();
  });

  it('el animal queda pendiente con el número nuevo, sin la causa, y vuelve a la cola una sola vez', async () => {
    const { duplicado } = await escenarioChapeta();
    expect(await resolverCambiandoNumero(duplicado, 'z932', PROPIETARIO)).toEqual({ ok: true });
    const animal = await db.animal.get(duplicado);
    expect(animal).toMatchObject({ codigo_chapeta: 'Z932', estado_sync: 'pendiente' });
    expect(animal?.detalle_conflicto).toBeUndefined();
    expect((await operacionesPendientes()).filter((o) => o.registro_id === duplicado)).toHaveLength(1);
  });

  it('un número inválido no cambia nada', async () => {
    const { duplicado } = await escenarioChapeta();
    expect(await resolverCambiandoNumero(duplicado, 'Z930', PROPIETARIO)).toEqual({ ok: false, error: 'Escriba un número distinto al que está repetido' });
    expect((await db.animal.get(duplicado))?.estado_sync).toBe('conflicto');
    expect(await operacionesPendientes()).toHaveLength(0);
  });

  it('dentro de la transacción vuelve a verificar que el número siga libre (otro registro llegó entre tanto)', async () => {
    const { duplicado } = await escenarioChapeta();
    await delServicio('animal', datosAnimal('Z932'));
    await expect(cambiarNumero(duplicado, 'Z932')).rejects.toThrow(ResolucionDetenida);
    expect((await db.animal.get(duplicado))?.codigo_chapeta).toBe('Z930');
  });

  it('las operaciones de sus dependientes, y de los de sus crías, pasan detrás de la suya en el mismo orden', async () => {
    const { duplicado } = await escenarioChapeta();
    const otro = await crear('animal', datosAnimal('Z940'), TRABAJADOR.usuario_id);
    const p1 = await pesaje(duplicado, 300);
    const cria = await crear('animal', datosAnimal('Z941', { madre_id: duplicado }), TRABAJADOR.usuario_id);
    const p2 = await pesaje(cria.id, 40);
    await resolverCambiandoNumero(duplicado, 'Z932', PROPIETARIO);
    expect((await operacionesPendientes()).map((o) => o.registro_id)).toEqual([otro.id, duplicado, p1.id, cria.id, p2.id]);
  });

  it('en la subida siguiente salen el animal y sus registros, que esperaban por dependencia', async () => {
    servicio.sembrar('animal', { id: uuidv7(), codigo_chapeta: 'Z930' });
    const vaca = await crear('animal', datosAnimal('Z930'), TRABAJADOR.usuario_id);
    const p = await pesaje(vaca.id);
    const primera = await subir(servicio);
    expect(primera).toMatchObject({ conflictos: 1, pendientes_por_dependencia: 1 });
    expect(await resolverCambiandoNumero(vaca.id, 'Z932', PROPIETARIO)).toEqual({ ok: true });
    const segunda = await subir(servicio);
    expect(segunda).toMatchObject({ enviadas: 2, conflictos: 0, pendientes_por_dependencia: 0 });
    expect(servicio.filas('animal').map((a) => a['codigo_chapeta'])).toEqual(['Z930', 'Z932']);
    expect((await db.pesaje.get(p.id))?.estado_sync).toBe('sincronizado');
  });
});

describe('PU-28 · 2. Unir con el animal registrado (sección 10.1)', () => {
  it('presenta el animal que ya tiene el número y lo que pasaría', async () => {
    const { correcto, duplicado } = await escenarioChapeta();
    await pesaje(duplicado);
    await pesaje(duplicado);
    await crear('fotografia', { animal_id: duplicado, tipo: 'izquierdo' }, TRABAJADOR.usuario_id);
    const conflicto = await cargarConflictoDeChapeta(duplicado);
    expect(conflicto?.existente?.animal.id).toBe(correcto);
    expect(conflicto?.existente?.autor).toBe('José Ramos');
    expect(describirMovimientos(conflicto!.plan, 'pasar')).toBe('1 fotografía, 2 pesajes');
  });

  it('sin el animal existente en el teléfono solo se ofrece cambiar el número; sin conflicto, nada', async () => {
    const vaca = await crear('animal', datosAnimal('Z930'), TRABAJADOR.usuario_id);
    expect(await cargarConflictoDeChapeta(vaca.id)).toBeUndefined();
    await enConflicto('animal', vaca.id);
    expect(await cargarConflictoDeChapeta(vaca.id)).toEqual({ autor_id: TRABAJADOR.usuario_id, existente: null, plan: [] });
  });

  it('no ofrece unir con otro animal de este teléfono que tampoco llegó al servicio', async () => {
    const a = await crear('animal', datosAnimal('Z930'), TRABAJADOR.usuario_id);
    const b = await crear('animal', datosAnimal('Z930'), PROPIETARIO.usuario_id);
    await enConflicto('animal', a.id);
    await enConflicto('animal', b.id);
    expect((await cargarConflictoDeChapeta(a.id))?.existente).toBeNull();
  });

  it('reescribe los registros no enviados (animal, madre, cría, imágenes) y retira el duplicado', async () => {
    const { correcto, duplicado } = await escenarioChapeta();
    const p = await pesaje(duplicado);
    const cria = await crear('animal', datosAnimal('Z941', { madre_id: duplicado }), TRABAJADOR.usuario_id);
    const parto = await crear('parto', { madre_id: duplicado, fecha: '2026-10-10', resultado: 'cria_viva', cria_id: cria.id, observacion: null }, TRABAJADOR.usuario_id);
    const foto = await unidadDeTrabajo(TRABAJADOR.usuario_id, async (tx) => {
      const f = await tx.crear('fotografia', { animal_id: duplicado, tipo: 'izquierdo' });
      await tx.guardarImagen(f, { completa: new Blob(['c']), reducida: new Blob(['r']) });
      return f;
    });

    expect(await resolverUniendo(duplicado, correcto, PROPIETARIO)).toEqual({ ok: true });
    expect(await db.animal.get(duplicado)).toBeUndefined();
    expect((await db.pesaje.get(p.id))?.animal_id).toBe(correcto);
    expect((await db.animal.get(cria.id))?.madre_id).toBe(correcto);
    expect((await db.parto.get(parto.id))?.madre_id).toBe(correcto);
    expect((await db.fotografia.get(foto.id))?.animal_id).toBe(correcto);
    expect((await db.imagen.get(foto.id))?.animal_id).toBe(correcto);
    expect((await operacionesPendientes()).map((o) => o.registro_id)).toEqual([p.id, cria.id, parto.id, foto.id]);
  });

  it('las correcciones del duplicado se descartan; las que lo ponían como madre pasan al correcto', async () => {
    const { correcto, duplicado } = await escenarioChapeta();
    const otra = await crear('animal', datosAnimal('Z950'), PROPIETARIO.usuario_id);
    const base = { motivo: 'error_digitacion' as const, nota: null, tipo: 'correccion' as const };
    const sobreDuplicado = await crear('correccion', { ...base, entidad_afectada: 'animal', registro_id: duplicado, campo: 'peso_inicial', valor_anterior: null, valor_nuevo: '30' }, PROPIETARIO.usuario_id);
    const comoMadre = await crear('correccion', { ...base, entidad_afectada: 'animal', registro_id: otra.id, campo: 'madre_id', valor_anterior: null, valor_nuevo: duplicado }, PROPIETARIO.usuario_id);
    const plan = (await cargarConflictoDeChapeta(duplicado))!.plan;
    expect(describirMovimientos(plan, 'descartar')).toBe('1 corrección');

    await resolverUniendo(duplicado, correcto, PROPIETARIO);
    expect(await db.correccion.get(sobreDuplicado.id)).toBeUndefined();
    expect((await db.correccion.get(comoMadre.id))?.valor_nuevo).toBe(correcto);
    expect((await operacionesPendientes()).some((o) => o.registro_id === sobreDuplicado.id)).toBe(false);
  });

  it('la chapeta puesta del duplicado se descarta si el correcto ya tiene la suya; si no, pasa', async () => {
    const { correcto, duplicado } = await escenarioChapeta();
    const colocacion = await crear('colocacion_chapeta', { animal_id: duplicado, fecha: '2026-10-16' }, TRABAJADOR.usuario_id);
    await delServicio('colocacion_chapeta', { animal_id: correcto, fecha: '2026-10-15' });
    await resolverUniendo(duplicado, correcto, PROPIETARIO);
    expect(await db.colocacion_chapeta.get(colocacion.id)).toBeUndefined();

    const otro = await escenarioChapetaCon('Z960');
    const suya = await crear('colocacion_chapeta', { animal_id: otro.duplicado, fecha: '2026-10-16' }, TRABAJADOR.usuario_id);
    await resolverUniendo(otro.duplicado, otro.correcto, PROPIETARIO);
    expect((await db.colocacion_chapeta.get(suya.id))?.animal_id).toBe(otro.correcto);
  });

  it('si un registro del duplicado ya llegó al servicio, se detiene sin tocar nada', async () => {
    const { correcto, duplicado } = await escenarioChapeta();
    const p = await pesaje(duplicado);
    await db.pesaje.update(p.id, { estado_sync: 'sincronizado' });
    const r = await resolverUniendo(duplicado, correcto, PROPIETARIO);
    expect(r).toEqual({ ok: false, error: 'Un registro del duplicado ya llegó al servicio (pesaje): no se puede unir desde el teléfono.' });
    expect((await db.animal.get(duplicado))?.estado_sync).toBe('conflicto');
    expect((await db.pesaje.get(p.id))?.animal_id).toBe(duplicado);
  });

  it('en la subida siguiente los registros salen con el animal del servicio', async () => {
    const remoto = servicio.sembrar('animal', { id: uuidv7(), codigo_chapeta: 'Z930', autor_id: PROPIETARIO.usuario_id });
    const vaca = await crear('animal', datosAnimal('Z930'), TRABAJADOR.usuario_id);
    const p = await pesaje(vaca.id);
    await sincronizar(servicio); // conflicto en la subida; la bajada trae el Z930 del servicio
    expect((await db.animal.get(remoto.id))?.estado_sync).toBe('sincronizado');
    expect(await resolverUniendo(vaca.id, remoto.id, PROPIETARIO)).toEqual({ ok: true });
    expect(await subir(servicio)).toMatchObject({ enviadas: 1, conflictos: 0 });
    expect(servicio.filas('pesaje')[0]?.['animal_id']).toBe(remoto.id);
    expect((await db.pesaje.get(p.id))?.estado_sync).toBe('sincronizado');
  });
});

async function escenarioChapetaCon(codigo: string) {
  const correcto = await delServicio('animal', datosAnimal(codigo));
  const duplicado = await crear('animal', datosAnimal(codigo), TRABAJADOR.usuario_id);
  await enConflicto('animal', duplicado.id);
  return { correcto, duplicado: duplicado.id };
}

describe('PU-28 · 3. Medicamento repetido (sección 10.2)', () => {
  const datos = (nombre: string): DatosNuevos<'medicamento'> => ({ nombre, tipo: 'vacuna', unidad: 'ml', intervalo_advertencia_dias: 30 });

  it('encuentra el registrado por su nombre sin tildes ni mayúsculas', async () => {
    const existente = await delServicio('medicamento', datos('Prueba Ivermectina'));
    const duplicado = await crear('medicamento', datos('  prueba  ivermectína '), TRABAJADOR.usuario_id);
    expect((await medicamentoExistente(duplicado))?.id).toBe(existente);
  });

  it('los eventos no enviados pasan al registrado y el duplicado se retira', async () => {
    const existente = await delServicio('medicamento', datos('Prueba Ivermectina'));
    const duplicado = await crear('medicamento', datos('prueba ivermectina'), TRABAJADOR.usuario_id);
    const vaca = await delServicio('animal', datosAnimal('Z921'));
    const e = await crear('evento_sanitario', { animal_id: vaca, fecha: '2026-10-15', tipo: 'vacuna', medicamento_id: duplicado.id, dosis: 2, costo: null, sintomas: null }, TRABAJADOR.usuario_id);
    await enConflicto('medicamento', duplicado.id);

    expect(await resolverMedicamento(duplicado.id, PROPIETARIO)).toEqual({ ok: true });
    expect(await db.medicamento.get(duplicado.id)).toBeUndefined();
    expect((await db.evento_sanitario.get(e.id))?.medicamento_id).toBe(existente);
    expect((await operacionesPendientes()).map((o) => o.registro_id)).toEqual([e.id]);
  });

  it('sin el registrado en el teléfono no hace nada', async () => {
    const duplicado = await crear('medicamento', datos('Prueba Ivermectina'), TRABAJADOR.usuario_id);
    await enConflicto('medicamento', duplicado.id);
    expect(await resolverMedicamento(duplicado.id, PROPIETARIO)).toEqual({ ok: false, error: 'El medicamento registrado todavía no llegó a este teléfono.' });
    expect(await db.medicamento.get(duplicado.id)).toBeDefined();
  });
});

describe('PU-28 · 4. Chapeta puesta repetida (sección 10.3)', () => {
  it('la ficha muestra la aceptada por el servicio y ofrece descartar la repetida', async () => {
    const cria = await delServicio('animal', datosAnimal('Z971', { chapeta_puesta: false }));
    const aceptada = await delServicio('colocacion_chapeta', { animal_id: cria, fecha: '2026-10-15' });
    const repetida = await crear('colocacion_chapeta', { animal_id: cria, fecha: '2026-10-16' }, TRABAJADOR.usuario_id);
    await enConflicto('colocacion_chapeta', repetida.id);

    const estado = await estadoDeChapeta(cria, '2026-10-18');
    expect(estado).toMatchObject({ estado: 'puesta', colocacion: { id: aceptada }, repetida: { id: repetida.id } });
    expect(await resolverColocacion(repetida.id, PROPIETARIO)).toEqual({ ok: true });
    expect(await db.colocacion_chapeta.get(repetida.id)).toBeUndefined();
    expect(await estadoDeChapeta(cria, '2026-10-18')).not.toHaveProperty('repetida');
  });

  it('una colocación que no está en conflicto no se descarta', async () => {
    const cria = await delServicio('animal', datosAnimal('Z971', { chapeta_puesta: false }));
    const pendiente = await crear('colocacion_chapeta', { animal_id: cria, fecha: '2026-10-16' }, TRABAJADOR.usuario_id);
    expect(await resolverColocacion(pendiente.id, PROPIETARIO)).toEqual({ ok: false, error: 'Este registro ya no está en conflicto.' });
    expect(await db.colocacion_chapeta.get(pendiente.id)).toBeDefined();
  });
});

describe('PU-28 · 5. Quién resuelve (decisión del 2026-10-18)', () => {
  it('el propietario resuelve cualquiera; el trabajador, solo los registros que él creó', () => {
    expect(puedeResolver(PROPIETARIO, TRABAJADOR.usuario_id)).toBe(true);
    expect(puedeResolver(TRABAJADOR, TRABAJADOR.usuario_id)).toBe(true);
    expect(puedeResolver(TRABAJADOR, OTRO.usuario_id)).toBe(false);
    expect(puedeResolver(TRABAJADOR, PROPIETARIO.usuario_id)).toBe(false);
  });

  it('el trabajador resuelve en su teléfono el animal que registró', async () => {
    const { duplicado } = await escenarioChapeta(); // registrado por TRABAJADOR
    expect(await resolverCambiandoNumero(duplicado, 'Z932', TRABAJADOR)).toEqual({ ok: true });
  });

  it('el teléfono rechaza que un trabajador resuelva lo que creó otro usuario, sin tocar nada', async () => {
    const correcto = await delServicio('animal', datosAnimal('Z930'));
    const ajeno = await crear('animal', datosAnimal('Z930'), OTRO.usuario_id);
    await enConflicto('animal', ajeno.id);
    await expect(resolverCambiandoNumero(ajeno.id, 'Z932', TRABAJADOR)).rejects.toThrow(PermisoDenegado);
    await expect(resolverUniendo(ajeno.id, correcto, TRABAJADOR)).rejects.toThrow(PermisoDenegado);
    const med = await crear('medicamento', { nombre: 'Prueba Aftosa', tipo: 'vacuna', unidad: 'ml', intervalo_advertencia_dias: 30 }, PROPIETARIO.usuario_id);
    await enConflicto('medicamento', med.id);
    await expect(resolverMedicamento(med.id, TRABAJADOR)).rejects.toThrow(PermisoDenegado);
    const coloc = await crear('colocacion_chapeta', { animal_id: correcto, fecha: '2026-10-16' }, OTRO.usuario_id);
    await enConflicto('colocacion_chapeta', coloc.id);
    await expect(resolverColocacion(coloc.id, TRABAJADOR)).rejects.toThrow(PermisoDenegado);
    expect((await db.animal.get(ajeno.id))?.estado_sync).toBe('conflicto');
    expect(await db.colocacion_chapeta.get(coloc.id)).toBeDefined();
  });

  it('un conflicto ya resuelto en otra pantalla no se resuelve dos veces', async () => {
    const { correcto, duplicado } = await escenarioChapeta();
    await resolverCambiandoNumero(duplicado, 'Z932', PROPIETARIO);
    expect(await resolverUniendo(duplicado, correcto, PROPIETARIO)).toEqual({ ok: false, error: 'Este registro ya no está en conflicto.' });
    expect((await db.animal.get(duplicado))?.codigo_chapeta).toBe('Z932');
  });
});
