import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import type { PuntoPeso } from '../../dominio/peso';
import type { DatosNuevos, Destino, MetodoPesaje, Uuid } from '../../dominio/tipos';
import { puedeUsar } from '../../sesion/permisos';
import {
  cargarCicloDeCeba,
  cargarProduccionDelMes,
  cargarResumenCarne,
  cicloDeAnimal,
  describirEstimacion,
  estuvoEnCeba,
  mesConsultado,
  tramoDelMes,
  type ProduccionDelMes,
} from './produccionCarne';

/**
 * PU-36 · Producción de carne: kilos ganados por los animales de ceba (2.2.7, RF-13, RF-14, CU-09, HU-05).
 * Especificación: docs/tecnica/34-produccion-de-carne.md, sección 12
 */

const YO: Uuid = uuidv7();
// Domingo 18 de octubre de 2026: el mes en curso va del 1 al 31, contado hasta hoy.
const HOY = '2026-10-18';
const OCTUBRE = 0;
const SEPTIEMBRE = -1;
const AGOSTO = -2;

/** Un macho comprado el 1 de agosto con 300 kg. */
function datosAnimal(codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo: 'macho',
    fecha_nacimiento: '2025-01-01',
    fecha_nacimiento_exacta: false,
    fecha_ingreso: '2026-08-01',
    procedencia: null,
    peso_inicial: 300,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
    ...cambios,
  };
}

const animal = (codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}) => crear('animal', datosAnimal(codigo, cambios), YO);
const destino = (animalId: Uuid, d: Destino, desde: string) => crear('destino_productivo', { animal_id: animalId, destino: d, desde }, YO);
const pesar = (animalId: Uuid, fecha: string, peso: number, metodo: MetodoPesaje = 'cinta') => crear('pesaje', { animal_id: animalId, fecha, peso, metodo }, YO);
const parametro = (clave: string, valor: number) => db.parametro.put({ clave, valor, unidad: 'kg', descripcion: clave });
/** Un animal de ceba desde su llegada. */
async function novillo(codigo: string, cambios: Partial<DatosNuevos<'animal'>> = {}) {
  const a = await animal(codigo, cambios);
  await destino(a.id, 'ceba', '2026-08-01');
  return a;
}
const chapetas = (m: ProduccionDelMes) => m.conTramo.map((a) => a.codigo_chapeta);
const tramoDe = (m: ProduccionDelMes, codigo: string) => [...m.conTramo, ...m.sinTramo].find((a) => a.codigo_chapeta === codigo)!;

const punto = (fecha: string | null, kg: number, metodo: MetodoPesaje | null = 'cinta', id: string | null = `p${kg}`): PuntoPeso => ({
  id,
  fecha,
  kg,
  metodo,
  etiqueta: id === null ? 'Peso de compra' : 'Pesaje',
  autor_id: null,
});

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

describe('PU-36 · 1. El periodo (sección 3)', () => {
  it('es el mes calendario: 0 el que contiene hoy, −1 el anterior', () => {
    expect(mesConsultado(HOY, 0)).toMatchObject({ inicio: '2026-10-01', fin: '2026-10-31', etiqueta: 'octubre de 2026', enCurso: true });
    expect(mesConsultado(HOY, -1)).toMatchObject({ inicio: '2026-09-01', fin: '2026-09-30', enCurso: false });
    expect(mesConsultado(HOY, -13)).toMatchObject({ inicio: '2025-09-01' });
  });

  it('en el mes en curso cuenta solo hasta hoy', () => {
    const serie = [punto('2026-10-01', 400), punto('2026-10-10', 410), punto('2026-10-25', 430)];
    expect(tramoDelMes(serie, mesConsultado(HOY, 0), HOY, null).tramo).toMatchObject({ kg: 10, dias: 9 });
    expect(tramoDelMes(serie, mesConsultado('2026-10-31', 0), '2026-10-31', null).tramo).toMatchObject({ kg: 30, dias: 24 });
  });
});

describe('PU-36 · 2. Qué animales entran (sección 5)', () => {
  it('según el historial de destino: en ceba al empezar, pasado a ceba o sacado de ceba dentro del mes', () => {
    const d = (destino: Destino, desde: string, n: number) => ({ animal_id: 'a', destino, desde, creado_en: `2026-01-0${n}T00:00:00Z`, id: `d${n}` });
    const septiembre = mesConsultado(HOY, -1);
    expect(estuvoEnCeba([d('ceba', '2026-08-01', 1)], septiembre)).toBe(true);
    expect(estuvoEnCeba([d('reproductor', '2026-01-01', 1), d('ceba', '2026-09-20', 2)], septiembre)).toBe(true);
    expect(estuvoEnCeba([d('ceba', '2026-01-01', 1), d('venta', '2026-09-20', 2)], septiembre)).toBe(true);
    expect(estuvoEnCeba([d('ceba', '2026-01-01', 1), d('venta', '2026-09-01', 2)], septiembre)).toBe(false);
    expect(estuvoEnCeba([d('ceba', '2026-10-01', 1)], septiembre)).toBe(false);
    expect(estuvoEnCeba([d('ceba', '2026-09-30', 1)], septiembre)).toBe(true);
    expect(estuvoEnCeba([], septiembre)).toBe(false);
  });

  it('fuera los que nunca estuvieron en ceba aunque tengan pesajes; los retirados, marcados', async () => {
    const ceba = await novillo('Z1');
    await pesar(ceba.id, '2026-10-05', 320);
    const lechera = await animal('Z2', { sexo: 'hembra' });
    await destino(lechera.id, 'leche', '2026-08-01');
    await pesar(lechera.id, '2026-10-05', 420);
    const vendido = await novillo('Z3');
    await pesar(vendido.id, '2026-10-02', 330);
    await destino(vendido.id, 'venta', '2026-10-10');
    await crear('salida', { animal_id: vendido.id, fecha: '2026-10-12', motivo: 'venta', peso_venta: 330, valor_venta: 1, comprador: null, causa_muerte: null }, YO);
    const mes = await cargarProduccionDelMes(OCTUBRE, HOY);
    expect(chapetas(mes)).toEqual(['Z3', 'Z1']);
    expect(mes.conTramo.map((a) => a.retirado)).toEqual([true, false]);
  });
});

describe('PU-36 · 3. El tramo del mes (sección 4)', () => {
  it('del último pesaje de un mes anterior al último pesaje del mes', async () => {
    const a = await novillo('Z1');
    await pesar(a.id, '2026-09-15', 320);
    await pesar(a.id, '2026-10-05', 330);
    await pesar(a.id, '2026-10-16', 340);
    const t = tramoDe(await cargarProduccionDelMes(OCTUBRE, HOY), 'Z1').tramo!;
    expect([t.referencia.kg, t.referencia.fecha, t.final.kg, t.final.fecha, t.kg, t.dias, t.gananciaDiaria]).toEqual([320, '2026-09-15', 340, '2026-10-16', 20, 31, 0.6]);
  });

  it('sin pesajes anteriores, desde el peso de compra, aunque sea del mismo mes', async () => {
    const a = await novillo('Z1');
    await pesar(a.id, '2026-08-15', 321);
    const t = tramoDe(await cargarProduccionDelMes(AGOSTO, HOY), 'Z1').tramo!;
    expect([t.referencia.id, t.referencia.kg, t.kg, t.dias, t.gananciaDiaria]).toEqual([null, 300, 21, 14, 1.5]);
  });

  it('sin peso inicial, desde el primer pesaje del mes; con uno solo, «primer pesaje»', async () => {
    const a = await novillo('Z1', { peso_inicial: null });
    await pesar(a.id, '2026-10-01', 400);
    await pesar(a.id, '2026-10-11', 410.5);
    const b = await novillo('Z2', { peso_inicial: null });
    await pesar(b.id, '2026-10-03', 380);
    const mes = await cargarProduccionDelMes(OCTUBRE, HOY);
    expect(tramoDe(mes, 'Z1').tramo).toMatchObject({ kg: 10.5, dias: 10, gananciaDiaria: 1.1 });
    expect(tramoDe(mes, 'Z2')).toMatchObject({ tramo: null, primerPesaje: 380 });
  });

  it('dos pesajes el mismo día: sin peso anterior no hay tramo, y el final es el registrado después', () => {
    const p = mesConsultado(HOY, 0);
    expect(tramoDelMes([punto('2026-10-05', 400, 'cinta', 'a'), punto('2026-10-05', 402, 'cinta', 'b')], p, HOY, null)).toEqual({ tramo: null, primerPesaje: 402 });
    expect(tramoDelMes([punto('2026-09-05', 390, 'cinta', 'x'), punto('2026-10-05', 400, 'cinta', 'a'), punto('2026-10-05', 402, 'cinta', 'b')], p, HOY, null).tramo).toMatchObject({
      kg: 12,
      dias: 30,
    });
  });

  it('un peso inicial sin fecha no sirve de referencia', () => {
    const p = mesConsultado(HOY, 0);
    expect(tramoDelMes([punto(null, 300, null, null), punto('2026-10-05', 400)], p, HOY, null)).toEqual({ tramo: null, primerPesaje: 400 });
  });

  it('la pérdida es negativa', async () => {
    const a = await novillo('Z1');
    await pesar(a.id, '2026-09-30', 350);
    await pesar(a.id, '2026-10-10', 344);
    expect(tramoDe(await cargarProduccionDelMes(OCTUBRE, HOY), 'Z1').tramo).toMatchObject({ kg: -6, dias: 10, gananciaDiaria: -0.6 });
  });
});

describe('PU-36 · 4. Un tramo por mes (sección 4)', () => {
  it('un tramo de agosto a octubre cuenta solo en octubre; septiembre queda sin pesaje', async () => {
    const a = await novillo('Z1');
    await pesar(a.id, '2026-08-15', 300);
    await pesar(a.id, '2026-10-15', 348);
    const septiembre = await cargarProduccionDelMes(SEPTIEMBRE, HOY);
    expect(septiembre.conTramo).toEqual([]);
    expect(tramoDe(septiembre, 'Z1')).toMatchObject({ tramo: null, primerPesaje: null });
    expect(tramoDe(await cargarProduccionDelMes(OCTUBRE, HOY), 'Z1').tramo).toMatchObject({ kg: 48, dias: 61, gananciaDiaria: 0.8 });
    // Agosto: del peso de compra (1 de agosto, 300 kg) al pesaje del 15.
    expect(tramoDe(await cargarProduccionDelMes(AGOSTO, HOY), 'Z1').tramo).toMatchObject({ kg: 0, dias: 14 });
  });
});

describe('PU-36 · 5. Casos especiales (sección 4)', () => {
  it('cinta y báscula: compárese con cautela; el peso inicial no activa la nota', () => {
    const p = mesConsultado(HOY, 0);
    expect(tramoDelMes([punto('2026-09-01', 300, 'cinta'), punto('2026-10-01', 320, 'bascula')], p, HOY, null).tramo!.metodosDistintos).toBe(true);
    expect(tramoDelMes([punto('2026-09-01', 300, 'cinta'), punto('2026-10-01', 320, 'cinta')], p, HOY, null).tramo!.metodosDistintos).toBe(false);
    expect(tramoDelMes([punto('2026-09-01', 300, null, null), punto('2026-10-01', 320, 'bascula')], p, HOY, null).tramo!.metodosDistintos).toBe(false);
    expect(tramoDelMes([punto('2026-09-01', 300, 'bascula'), punto('2026-10-01', 320, null)], p, HOY, null).tramo!.metodosDistintos).toBe(false);
  });

  it('bajo la meta de ganancia diaria, si el propietario la definió', async () => {
    const lento = await novillo('Z1');
    await pesar(lento.id, '2026-09-18', 300);
    await pesar(lento.id, '2026-10-18', 315);
    const justo = await novillo('Z2');
    await pesar(justo.id, '2026-09-18', 300);
    await pesar(justo.id, '2026-10-18', 324);
    expect((await cargarProduccionDelMes(OCTUBRE, HOY)).conTramo.map((a) => [a.codigo_chapeta, a.tramo!.bajoMeta])).toEqual([
      ['Z2', false],
      ['Z1', false],
    ]);
    await parametro('ganancia_diaria_esperada', 0.8);
    const mes = await cargarProduccionDelMes(OCTUBRE, HOY);
    expect(mes.meta).toBe(0.8);
    expect(mes.conTramo.map((a) => [a.codigo_chapeta, a.tramo!.gananciaDiaria, a.tramo!.bajoMeta])).toEqual([
      ['Z2', 0.8, false],
      ['Z1', 0.5, true],
    ]);
  });
});

describe('PU-36 · 6. El lote del mes (sección 6)', () => {
  it('suma los kilos con las pérdidas, promedia las ganancias diarias y cuenta los pesados', async () => {
    const a = await novillo('Z1');
    await pesar(a.id, '2026-09-18', 300);
    await pesar(a.id, '2026-10-18', 330); // +30 kg, 1 kg/día
    const b = await novillo('Z2');
    await pesar(b.id, '2026-10-08', 300); // −0 kg en 68 días desde la compra
    const c = await novillo('Z3');
    await pesar(c.id, '2026-09-28', 310);
    await pesar(c.id, '2026-10-08', 305); // −5 kg, −0,5 kg/día
    const d = await novillo('Z4', { peso_inicial: null });
    await pesar(d.id, '2026-10-02', 280); // primer pesaje
    await novillo('Z5'); // sin pesaje
    const mes = await cargarProduccionDelMes(OCTUBRE, HOY);
    expect(chapetas(mes)).toEqual(['Z1', 'Z2', 'Z3']);
    expect(mes.kgGanados).toBe(25);
    expect(mes.gananciaPromedio).toBe(0.2);
    expect(mes.pesados).toBe(4);
    expect(mes.sinTramo.map((x) => x.codigo_chapeta)).toEqual(['Z4', 'Z5']);
  });

  it('sin animales en ceba, o sin ningún pesaje, el lote no tiene kilos', async () => {
    const vacio = await cargarProduccionDelMes(OCTUBRE, HOY);
    expect([vacio.conTramo.length, vacio.sinTramo.length, vacio.kgGanados, vacio.gananciaPromedio, vacio.pesados]).toEqual([0, 0, null, null, 0]);
    await novillo('Z1');
    const sinPesajes = await cargarProduccionDelMes(OCTUBRE, HOY);
    expect([sinPesajes.conTramo.length, sinPesajes.sinTramo.length, sinPesajes.kgGanados, sinPesajes.pesados]).toEqual([0, 1, null, 0]);
  });
});

describe('PU-36 · 7. El orden (sección 6)', () => {
  it('por ganancia diaria; a igual ganancia, más días y después la chapeta; invertible; sin pesaje al final', async () => {
    const rapido = await novillo('Z4');
    await pesar(rapido.id, '2026-09-18', 300);
    await pesar(rapido.id, '2026-10-18', 360); // 2 kg/día, 30 días
    const largo = await novillo('Z3');
    await pesar(largo.id, '2026-09-08', 300);
    await pesar(largo.id, '2026-10-18', 340); // 1 kg/día, 40 días
    const b = await novillo('Z2');
    await pesar(b.id, '2026-09-18', 300);
    await pesar(b.id, '2026-10-18', 330); // 1 kg/día, 30 días
    const a = await novillo('Z10');
    await pesar(a.id, '2026-09-18', 300);
    await pesar(a.id, '2026-10-18', 330); // 1 kg/día, 30 días
    await novillo('Z1');
    const mayor = await cargarProduccionDelMes(OCTUBRE, HOY);
    expect(chapetas(mayor)).toEqual(['Z4', 'Z3', 'Z2', 'Z10']);
    const menor = await cargarProduccionDelMes(OCTUBRE, HOY, 'menor');
    expect(chapetas(menor)).toEqual(['Z10', 'Z2', 'Z3', 'Z4']);
    expect(menor.sinTramo.map((x) => x.codigo_chapeta)).toEqual(['Z1']);
  });
});

describe('PU-36 · 8. Valor vigente (sección 9)', () => {
  it('usa los pesos corregidos y descarta los pesajes anulados', async () => {
    const a = await novillo('Z1');
    const corregido = await pesar(a.id, '2026-09-18', 300);
    await pesar(a.id, '2026-10-08', 320);
    const anulado = await pesar(a.id, '2026-10-16', 500);
    const base = { entidad_afectada: 'pesaje' as const, motivo: 'error_digitacion' as const, nota: null };
    await crear('correccion', { ...base, registro_id: corregido.id, tipo: 'correccion', campo: 'peso', valor_anterior: '300', valor_nuevo: '310' }, YO);
    await crear('correccion', { ...base, registro_id: anulado.id, tipo: 'anulacion', campo: null, valor_anterior: null, valor_nuevo: null }, YO);
    expect(tramoDe(await cargarProduccionDelMes(OCTUBRE, HOY), 'Z1').tramo).toMatchObject({ kg: 10, dias: 20, gananciaDiaria: 0.5 });
  });
});

describe('PU-36 · 9. El resumen del inicio (sección 7)', () => {
  it('el mes en curso; si no tiene pesajes, el último mes que los tuvo; sin pesajes, nada', async () => {
    expect(await cargarResumenCarne(HOY)).toBeNull();
    const a = await novillo('Z1');
    await novillo('Z2');
    await pesar(a.id, '2026-08-21', 330);
    expect(await cargarResumenCarne(HOY)).toMatchObject({ periodo: { inicio: '2026-08-01' }, kgGanados: 30, pesados: 1, total: 2, ultimaFecha: '2026-08-21' });
    await pesar(a.id, '2026-10-01', 350);
    expect(await cargarResumenCarne(HOY)).toMatchObject({ periodo: { inicio: '2026-10-01' }, kgGanados: 20, pesados: 1, total: 2, ultimaFecha: '2026-10-01' });
  });

  it('un primer pesaje cuenta como pesado, aunque todavía no haya kilos ganados', async () => {
    const a = await novillo('Z1', { peso_inicial: null });
    await pesar(a.id, '2026-10-02', 280);
    expect(await cargarResumenCarne(HOY)).toMatchObject({ kgGanados: null, pesados: 1, total: 1 });
  });

  it('busca hasta doce meses atrás', async () => {
    const a = await novillo('Z1', { fecha_ingreso: '2025-01-01', peso_inicial: null });
    await destino(a.id, 'ceba', '2025-01-01');
    await pesar(a.id, '2025-10-05', 200);
    expect(await cargarResumenCarne(HOY)).toMatchObject({ periodo: { inicio: '2025-10-01' } });
    const b = await novillo('Z2', { fecha_ingreso: '2025-01-01', peso_inicial: null });
    await destino(b.id, 'ceba', '2025-01-01');
    await db.pesaje.clear();
    await pesar(b.id, '2025-09-05', 200);
    expect(await cargarResumenCarne(HOY)).toBeNull();
  });
});

describe('PU-36 · 10. Permisos (sección 8)', () => {
  it('solo el propietario consulta la producción de carne', () => {
    expect(puedeUsar('propietario', 'CU-07')).toBe(true);
    expect(puedeUsar('trabajador', 'CU-07')).toBe(false);
  });
});

describe('PU-36 · 11. Ciclo: qué animales entran (sección 6 bis)', () => {
  it('solo los activos con destino vigente ceba hoy', async () => {
    await novillo('Z1');
    const vendido = await novillo('Z2');
    await crear('salida', { animal_id: vendido.id, fecha: '2026-10-12', motivo: 'venta', peso_venta: 330, valor_venta: 1, comprador: null, causa_muerte: null }, YO);
    const cambiado = await novillo('Z3');
    await destino(cambiado.id, 'reproductor', '2026-10-01');
    const futuro = await animal('Z4');
    await destino(futuro.id, 'ceba', '2026-10-30');
    const lechera = await animal('Z5', { sexo: 'hembra' });
    await destino(lechera.id, 'leche', '2026-08-01');
    expect((await cargarCicloDeCeba(HOY)).animales.map((a) => a.codigo_chapeta)).toEqual(['Z1']);
  });
});

describe('PU-36 · 12. Ciclo: el cálculo (sección 6 bis)', () => {
  it('del peso inicial al último peso, con lo que falta para el peso de finalización y el avance', async () => {
    await parametro('peso_final_ceba', 500);
    const a = await novillo('Z1');
    await pesar(a.id, '2026-09-01', 330);
    await pesar(a.id, '2026-10-10', 380);
    const [c] = (await cargarCicloDeCeba(HOY)).animales;
    expect([c!.inicial!.kg, c!.inicial!.id, c!.ultimo!.kg, c!.kg, c!.dias, c!.gananciaDiaria, c!.falta, c!.terminado, c!.avance]).toEqual([
      300,
      null,
      380,
      80,
      70,
      1.1,
      120,
      false,
      40,
    ]);
    // 120 kg a 80/70 kg por día: 105 días.
    expect(c!.estimacionDias).toBe(105);
  });

  it('sin peso inicial, desde el primer pesaje', () => {
    const c = cicloDeAnimal([punto('2026-09-01', 400), punto('2026-10-01', 430)], 500, 30, HOY);
    expect([c.inicial!.kg, c.kg, c.dias, c.gananciaDiaria, c.falta, c.avance]).toEqual([400, 30, 30, 1, 70, 30]);
  });

  it('el avance no baja de 0 ni pasa de 100', () => {
    expect(cicloDeAnimal([punto('2026-09-01', 400), punto('2026-10-01', 390)], 500, null, HOY).avance).toBe(0);
    expect(cicloDeAnimal([punto('2026-09-01', 520), punto('2026-10-01', 510)], 500, null, HOY).avance).toBe(100);
    expect(cicloDeAnimal([punto('2026-09-01', 450), punto('2026-10-01', 499.6)], 500, null, HOY).avance).toBe(99);
  });
});

describe('PU-36 · 13. Ciclo: casos especiales (sección 6 bis)', () => {
  it('terminado desde el peso de finalización, sin estimación', () => {
    const justo = cicloDeAnimal([punto('2026-09-01', 450), punto('2026-10-01', 500)], 500, null, HOY);
    expect([justo.terminado, justo.falta, justo.avance, justo.estimacionDias]).toEqual([true, 0, 100, null]);
    const casi = cicloDeAnimal([punto('2026-09-01', 450), punto('2026-10-01', 499.9)], 500, null, HOY);
    expect([casi.terminado, casi.falta]).toEqual([false, 0.1]);
  });

  it('un solo peso: lo que falta, sin kilos ni estimación; sin pesos, nada', () => {
    const uno = cicloDeAnimal([punto('2026-09-01', 320, null, null)], 500, null, HOY);
    expect([uno.inicial?.kg, uno.ultimo?.kg, uno.kg, uno.dias, uno.gananciaDiaria, uno.falta, uno.avance, uno.estimacionDias]).toEqual([320, 320, null, null, null, 180, 0, null]);
    const ninguno = cicloDeAnimal([], 500, 30, HOY);
    expect([ninguno.inicial, ninguno.ultimo, ninguno.falta, ninguno.terminado, ninguno.avance, ninguno.pesajeViejo]).toEqual([null, null, null, false, null, null]);
  });

  it('dos pesos del mismo día o con fecha desconocida no hacen ciclo', () => {
    expect(cicloDeAnimal([punto('2026-10-01', 320), punto('2026-10-01', 330)], 500, null, HOY).kg).toBeNull();
    expect(cicloDeAnimal([punto(null, 300, null, null), punto('2026-10-01', 330)], 500, null, HOY).kg).toBeNull();
  });

  it('ganancia cero o negativa: sin estimación', () => {
    expect(cicloDeAnimal([punto('2026-09-01', 400), punto('2026-10-01', 400)], 500, null, HOY).estimacionDias).toBeNull();
    expect(cicloDeAnimal([punto('2026-09-01', 400), punto('2026-10-01', 390)], 500, null, HOY).estimacionDias).toBeNull();
    // 1 kg en 30 días se redondea a 0 kg por día: tampoco se estima.
    expect(cicloDeAnimal([punto('2026-09-01', 400), punto('2026-10-01', 401)], 500, null, HOY).estimacionDias).toBeNull();
  });

  it('el último pesaje de hace más de los días sin pesaje se nota', () => {
    expect(cicloDeAnimal([punto('2026-09-01', 400), punto('2026-09-18', 410)], 500, 30, HOY).pesajeViejo).toBe(null);
    expect(cicloDeAnimal([punto('2026-09-01', 400), punto('2026-09-17', 410)], 500, 30, HOY).pesajeViejo).toBe(31);
    expect(cicloDeAnimal([punto('2026-09-01', 400), punto('2026-09-17', 410)], 500, null, HOY).pesajeViejo).toBe(null);
  });

  it('sin el parámetro, sin «falta» ni avance', async () => {
    const a = await novillo('Z1');
    await pesar(a.id, '2026-09-01', 330);
    const ciclo = await cargarCicloDeCeba(HOY);
    expect(ciclo.pesoFinal).toBeNull();
    expect([ciclo.animales[0]!.falta, ciclo.animales[0]!.avance, ciclo.animales[0]!.terminado, ciclo.animales[0]!.estimacionDias, ciclo.terminados]).toEqual([null, null, false, null, 0]);
    // Sin el parámetro de días sin pesaje, los 30 de la Tabla 30: el 1 de septiembre fue hace 47 días.
    expect(ciclo.animales[0]!.pesajeViejo).toBe(47);
  });
});

describe('PU-36 · 14. Ciclo: estimación, orden y lote (sección 6 bis)', () => {
  it('la estimación en días o meses aproximados', () => {
    expect(describirEstimacion(1)).toBe('un día');
    expect(describirEstimacion(20)).toBe('unos 20 días');
    expect(describirEstimacion(59)).toBe('unos 59 días');
    expect(describirEstimacion(60)).toBe('unos 2 meses');
    expect(describirEstimacion(105)).toBe('unos 4 meses');
  });

  it('terminados primero, después por lo que falta y sin pesos al final; el lote suma los kilos', async () => {
    await parametro('peso_final_ceba', 500);
    const lejos = await novillo('Z1');
    await pesar(lejos.id, '2026-10-01', 350);
    const listo = await novillo('Z2');
    await pesar(listo.id, '2026-10-01', 510);
    const cerca = await novillo('Z3');
    await pesar(cerca.id, '2026-10-01', 480);
    await novillo('Z4', { peso_inicial: null });
    const empate = await novillo('Z10');
    await pesar(empate.id, '2026-10-01', 350);
    const ciclo = await cargarCicloDeCeba(HOY);
    expect(ciclo.animales.map((a) => a.codigo_chapeta)).toEqual(['Z2', 'Z3', 'Z1', 'Z10', 'Z4']);
    expect(ciclo.terminados).toBe(1);
    expect(ciclo.kgGanados).toBe(50 + 210 + 180 + 50);
    expect(ciclo.pesoFinal).toBe(500);
  });

  it('sin animales con dos pesos, el lote no tiene kilos', async () => {
    await novillo('Z1', { peso_inicial: null });
    expect((await cargarCicloDeCeba(HOY)).kgGanados).toBeNull();
  });
});

describe('PU-36 · 9b. El último registro del inicio (sección 7)', () => {
  it('es el pesaje más reciente del mes entre los animales de ceba; no cuentan otros animales ni otros meses', async () => {
    const a = await novillo('Z1');
    const b = await novillo('Z2', { peso_inicial: null });
    await pesar(a.id, '2026-10-03', 330);
    await pesar(b.id, '2026-10-11', 280);
    await pesar(a.id, '2026-09-28', 320);
    const lechera = await animal('Z3', { sexo: 'hembra' });
    await destino(lechera.id, 'leche', '2026-08-01');
    await pesar(lechera.id, '2026-10-15', 420);
    expect((await cargarResumenCarne(HOY))!.ultimaFecha).toBe('2026-10-11');
  });
});
