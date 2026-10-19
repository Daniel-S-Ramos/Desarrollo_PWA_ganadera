import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../datos/db';
import { crear } from '../../datos/repositorio';
import { uuidv7 } from '../../datos/uuidv7';
import { agregar, inicioDeSemana, periodosDeVentana, resumir } from '../../dominio/periodos';
import type { DatosNuevos, Sexo } from '../../dominio/tipos';
import { puedeUsar } from '../../sesion/permisos';
import { diaDeVaca, registrosDe, vacasConsultables } from './produccion';

/**
 * PU-24 · Consulta de producción diaria, semanal y mensual (RF-11, CU-07 pasos 1 a 4, HU-04.2).
 * Especificación: docs/tecnica/23-consulta-de-produccion.md, sección 9
 */

const HOY = '2026-10-15'; // jueves
const AUTOR = uuidv7();

function datosAnimal(codigo: string, sexo: Sexo): DatosNuevos<'animal'> {
  return {
    codigo_chapeta: codigo,
    sexo,
    fecha_nacimiento: '2022-03-04',
    fecha_nacimiento_exacta: true,
    fecha_ingreso: null,
    procedencia: null,
    peso_inicial: null,
    madre_id: null,
    madre_externa: null,
    padre_id: null,
    padre_externo: null,
  };
}

const animal = (codigo: string, sexo: Sexo = 'hembra') => crear('animal', datosAnimal(codigo, sexo), AUTOR);
const fechas = (agregacion: 'diaria' | 'semanal' | 'mensual', desplazamiento = 0) =>
  periodosDeVentana(agregacion, HOY, desplazamiento).map((p) => [p.inicio, p.fin]);

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

describe('PU-24 · 1. Ventanas (sección 4)', () => {
  it('diaria: los 30 días que terminan hoy, del más reciente al más antiguo', () => {
    const f = fechas('diaria');
    expect(f).toHaveLength(30);
    expect(f[0]).toEqual([HOY, HOY]);
    expect(f[29]).toEqual(['2026-09-16', '2026-09-16']);
    expect(fechas('diaria', -1)[0]).toEqual(['2026-09-15', '2026-09-15']);
  });

  it('semanal: 12 semanas que terminan en la semana actual; mensual: 12 meses', () => {
    const s = fechas('semanal');
    expect(s).toHaveLength(12);
    expect(s[0]).toEqual(['2026-10-12', '2026-10-18']);
    expect(s[11]).toEqual(['2026-07-27', '2026-08-02']);
    expect(fechas('semanal', -1)[0]).toEqual(['2026-07-20', '2026-07-26']);
    const m = fechas('mensual');
    expect(m[0]).toEqual(['2026-10-01', '2026-10-31']);
    expect(m[11]).toEqual(['2025-11-01', '2025-11-30']);
    expect(fechas('mensual', -1)[0]).toEqual(['2025-10-01', '2025-10-31']);
  });

  it('el periodo que contiene hoy está en curso; las etiquetas', () => {
    const [semana] = periodosDeVentana('semanal', HOY);
    expect(semana).toMatchObject({ enCurso: true, etiqueta: '12 – 18 oct' });
    expect(periodosDeVentana('semanal', HOY)[2]?.etiqueta).toBe('28 sep – 4 oct');
    expect(periodosDeVentana('mensual', HOY)[0]?.etiqueta).toBe('octubre de 2026');
    expect(periodosDeVentana('diaria', HOY)[1]).toMatchObject({ etiqueta: '14 oct', enCurso: false });
  });
});

describe('PU-24 · 2. Semanas de lunes a domingo (sección 4)', () => {
  it.each([
    ['2026-10-15', '2026-10-12'], // jueves
    ['2026-10-12', '2026-10-12'], // lunes
    ['2026-10-18', '2026-10-12'], // domingo
    ['2026-10-01', '2026-09-28'], // cruza el mes
    ['2027-01-02', '2026-12-28'], // cruza el año
  ])('%s → lunes %s', (fecha, lunes) => {
    expect(inicioDeSemana(fecha)).toBe(lunes);
  });
});

describe('PU-24 · 3. Meses con su longitud real (sección 4)', () => {
  it('febrero de 2027 tiene 28 días; de 2028, 29', () => {
    expect(periodosDeVentana('mensual', '2027-03-10')[1]).toMatchObject({ inicio: '2027-02-01', fin: '2027-02-28' });
    expect(periodosDeVentana('mensual', '2028-03-10')[1]).toMatchObject({ inicio: '2028-02-01', fin: '2028-02-29' });
    expect(periodosDeVentana('mensual', '2026-01-31')[1]).toMatchObject({ inicio: '2025-12-01', fin: '2025-12-31' });
  });
});

describe('PU-24 · 4. Agregados (sección 5)', () => {
  const registros = [
    { fecha: '2026-10-12', litros: 10 },
    { fecha: '2026-10-13', litros: 12.5 },
    { fecha: '2026-10-15', litros: 11 },
    { fecha: '2026-10-08', litros: 9 },
  ];

  it('total, promedio por día registrado y días registrados; la semana en curso cuenta hasta hoy', () => {
    const [actual, anterior] = agregar(periodosDeVentana('semanal', HOY), registros, HOY);
    expect(actual).toMatchObject({ total: 33.5, promedio: 11.2, diasRegistrados: 3, diasDelPeriodo: 4 });
    expect(anterior).toMatchObject({ total: 9, promedio: 9, diasRegistrados: 1, diasDelPeriodo: 7 });
  });

  it('el mes en curso cuenta hasta hoy; el resumen de la ventana', () => {
    const filas = agregar(periodosDeVentana('mensual', HOY), registros, HOY);
    expect(filas[0]).toMatchObject({ total: 42.5, diasRegistrados: 4, diasDelPeriodo: 15 });
    expect(resumir(filas)).toMatchObject({ total: 42.5, diasRegistrados: 4, promedio: 10.6 });
  });

  it('un periodo sin registros no tiene total ni promedio', () => {
    const filas = agregar(periodosDeVentana('semanal', HOY), registros, HOY);
    expect(filas[3]).toMatchObject({ total: null, promedio: null, diasRegistrados: 0, diasDelPeriodo: 7 });
    expect(resumir(agregar(periodosDeVentana('semanal', HOY, -1), registros, HOY))).toMatchObject({ total: null, promedio: null });
  });
});

describe('PU-24 · 5. El cero frente al día sin registro (apartado 3.8.6)', () => {
  it('el cero cuenta como día registrado y baja el promedio; el día vacío no', () => {
    const [semana] = agregar(periodosDeVentana('semanal', HOY), [{ fecha: '2026-10-12', litros: 10 }, { fecha: '2026-10-13', litros: 0 }], HOY);
    expect(semana).toMatchObject({ total: 10, promedio: 5, diasRegistrados: 2 });
    const dias = agregar(periodosDeVentana('diaria', HOY), [{ fecha: '2026-10-13', litros: 0 }], HOY);
    expect(dias[2]).toMatchObject({ total: 0, diasRegistrados: 1 }); // 13 oct: «0 litros»
    expect(dias[1]).toMatchObject({ total: null, diasRegistrados: 0 }); // 14 oct: «Sin registro»
  });
});

describe('PU-24 · 6. Valor vigente (documento 22, sección 8)', () => {
  it('los reemplazos se aplican en la consulta', async () => {
    const a = await animal('Z920');
    const r = await crear('produccion_leche', { animal_id: a.id, fecha: '2026-10-14', litros: 10.5 }, AUTOR);
    await crear('correccion', { entidad_afectada: 'produccion_leche', registro_id: r.id, tipo: 'correccion', campo: 'litros', valor_anterior: '10.5', valor_nuevo: '11', motivo: 'registro_duplicado', nota: null }, AUTOR);
    expect(await registrosDe(a.id)).toEqual([{ fecha: '2026-10-14', litros: 11 }]);
    expect(await registrosDe(uuidv7())).toEqual([]);
  });
});

describe('PU-24 · 7. Vacas consultables (sección 3)', () => {
  it('hembras con registros o con destino leche, en orden; las retiradas marcadas; machos no', async () => {
    const conRegistro = await animal('Z931');
    const conDestino = await animal('Z920');
    await animal('Z925'); // hembra sin registros ni destino
    const macho = await animal('Z923', 'macho');
    await crear('produccion_leche', { animal_id: conRegistro.id, fecha: '2026-10-13', litros: 5 }, AUTOR);
    await crear('produccion_leche', { animal_id: macho.id, fecha: '2026-10-13', litros: 5 }, AUTOR);
    await crear('destino_productivo', { animal_id: conDestino.id, destino: 'leche', desde: '2026-10-01' }, AUTOR);
    await crear('salida', { animal_id: conRegistro.id, fecha: '2026-10-14', motivo: 'venta', peso_venta: 400, valor_venta: 1, comprador: null, causa_muerte: null }, AUTOR);
    expect(await vacasConsultables()).toEqual([
      { id: conDestino.id, codigo_chapeta: 'Z920', retirada: false },
      { id: conRegistro.id, codigo_chapeta: 'Z931', retirada: true },
    ]);
  });
});

describe('PU-24 · 8. Permisos (sección 2, Tabla 27)', () => {
  it('solo el propietario consulta la producción (CU-07)', () => {
    expect(puedeUsar('propietario', 'CU-07')).toBe(true);
    expect(puedeUsar('trabajador', 'CU-07')).toBe(false);
  });
});

describe('PU-24 · 9. Vista diaria: un día a la vez (ajuste de PE-34)', () => {
  const registros = [
    { fecha: '2026-10-10', litros: 10 },
    { fecha: '2026-10-12', litros: 10 },
    { fecha: '2026-10-13', litros: 6 },
    { fecha: '2026-10-14', litros: 0 },
  ];

  it('un día con registro: sus litros y la comparación con el promedio de los días anteriores', () => {
    const dia = diaDeVaca(registros, '2026-10-13', 7);
    expect(dia).toMatchObject({ fecha: '2026-10-13', litros: 6, promedio: { promedio: 10, registros: 2 } });
    // El anterior y el siguiente son otros días, no el mismo.
    expect(dia).toMatchObject({ anterior: { fecha: '2026-10-12' }, siguiente: { fecha: '2026-10-14' } });
    expect(dia.comparacion).toMatchObject({ palabras: 'Muy por debajo de su promedio', diferencia: '4 litros menos que su promedio', atencion: true });
  });

  it('un cero registrado es un día con registro, no un día sin registro (3.8.6)', () => {
    expect(diaDeVaca(registros, '2026-10-14', 7).litros).toBe(0);
  });

  it('un día sin registro ofrece el ordeño anterior y el siguiente', () => {
    const dia = diaDeVaca(registros, '2026-10-11', 7);
    expect(dia).toMatchObject({ litros: null, comparacion: null, anterior: { fecha: '2026-10-10', litros: 10 }, siguiente: { fecha: '2026-10-12', litros: 10 } });
    expect(diaDeVaca(registros, '2026-10-19', 7)).toMatchObject({ anterior: { fecha: '2026-10-14' }, siguiente: null });
    expect(diaDeVaca(registros, '2026-10-01', 7)).toMatchObject({ anterior: null, siguiente: { fecha: '2026-10-10' } });
  });

  it('sin días anteriores en la ventana no hay comparación', () => {
    expect(diaDeVaca(registros, '2026-10-10', 7)).toMatchObject({ litros: 10, promedio: null, comparacion: null });
  });
});
