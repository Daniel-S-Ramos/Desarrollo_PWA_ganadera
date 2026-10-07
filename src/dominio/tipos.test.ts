import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  CONCEPTOS_MOVIMIENTO,
  DESTINOS,
  ESTADOS_SYNC,
  METODOS_PESAJE,
  MOTIVOS_CORRECCION,
  MOTIVOS_SALIDA,
  PERFILES,
  RESULTADOS_PARTO,
  SEXOS,
  TIPOS_CORRECCION,
  TIPOS_EVENTO_SANITARIO,
  TIPOS_FOTOGRAFIA,
  TIPOS_MEDICAMENTO,
  TIPOS_RECORDATORIO,
  UNIDADES_DOSIS,
  type Auditable,
  type DatosNuevos,
  type EntidadCorregible,
  type NombreTabla,
} from './tipos';

/**
 * PU-02 · Tipos del dominio frente al modelo lógico (Tablas 23 y 24 del documento).
 *
 * Verifica que cada conjunto de valores admitidos coincide con lo que declara el documento
 * y que los tipos auxiliares de la capa de datos se comportan como se espera.
 */

describe('PU-02 · Valores admitidos según el documento', () => {
  it.each([
    ['perfiles (RF-25)', PERFILES, ['propietario', 'trabajador']],
    ['sexos', SEXOS, ['macho', 'hembra']],
    ['vistas fotográficas (RF-02)', TIPOS_FOTOGRAFIA, ['izquierdo', 'derecho', 'frontal']],
    ['métodos de pesaje (Tabla 24)', METODOS_PESAJE, ['cinta', 'bascula']],
    ['resultados del parto (3.8.8)', RESULTADOS_PARTO, ['cria_viva', 'cria_nacida_muerta', 'aborto']],
    ['destinos productivos (RF-18)', DESTINOS, ['reproductor', 'reproductora', 'leche', 'ceba', 'venta', 'sacrificio']],
    ['conceptos económicos (3.8.12)', CONCEPTOS_MOVIMIENTO, ['compra', 'servicio_veterinario', 'alimentacion']],
    ['motivos de salida (RF-15)', MOTIVOS_SALIDA, ['venta', 'muerte', 'perdida_robo']],
    ['tipos de medicamento (3.8.9)', TIPOS_MEDICAMENTO, ['vacuna', 'purga', 'vitamina', 'antibiotico', 'otro']],
    ['tipos de corrección (3.9.5)', TIPOS_CORRECCION, ['correccion', 'anulacion']],
    [
      'motivos de corrección (3.9.5)',
      MOTIVOS_CORRECCION,
      ['error_digitacion', 'animal_equivocado', 'fecha_equivocada', 'registro_duplicado', 'otro'],
    ],
    [
      'recordatorios derivados (3.8.11)',
      TIPOS_RECORDATORIO,
      [
        'sin_pesaje_reciente',
        'sin_registro_ordeno',
        'produccion_bajo_promedio',
        'sin_registros_recientes',
        'sincronizacion_pendiente',
      ],
    ],
    ['estados de sincronización (Tabla 22)', ESTADOS_SYNC, ['pendiente', 'en_transmision', 'sincronizado', 'conflicto']],
    // Validados con el propietario del proyecto el 2026-10-06 (no figuran enumerados en el documento).
    ['tipos de evento sanitario', TIPOS_EVENTO_SANITARIO, ['vacuna', 'purga', 'vitamina', 'tratamiento', 'otro']],
    ['unidades de dosis', UNIDADES_DOSIS, ['ml', 'cc', 'mg', 'dosis']],
  ] as const)('%s', (_nombre, valores, esperados) => {
    expect([...valores]).toEqual([...esperados]);
  });

  it('ningún conjunto contiene valores repetidos', () => {
    const conjuntos = [
      PERFILES, SEXOS, TIPOS_FOTOGRAFIA, METODOS_PESAJE, RESULTADOS_PARTO, DESTINOS, CONCEPTOS_MOVIMIENTO,
      MOTIVOS_SALIDA, TIPOS_MEDICAMENTO, TIPOS_CORRECCION, MOTIVOS_CORRECCION, TIPOS_RECORDATORIO, ESTADOS_SYNC,
      TIPOS_EVENTO_SANITARIO, UNIDADES_DOSIS,
    ];
    for (const conjunto of conjuntos) {
      expect(new Set(conjunto).size).toBe(conjunto.length);
    }
  });
});

describe('PU-02 · Tipos auxiliares de la capa de datos', () => {
  it('las tablas sincronizables son las doce entidades que crea el dispositivo (Tabla 23 sin usuario ni parametro)', () => {
    expectTypeOf<NombreTabla>().toEqualTypeOf<
      | 'animal'
      | 'fotografia'
      | 'evento_sanitario'
      | 'produccion_leche'
      | 'pesaje'
      | 'parto'
      | 'destino_productivo'
      | 'movimiento_economico'
      | 'salida'
      | 'recordatorio'
      | 'correccion'
      | 'medicamento'
    >();
  });

  it('una corrección no puede aplicarse sobre otra corrección ni sobre un recordatorio pospuesto (3.9.5)', () => {
    expectTypeOf<'correccion'>().not.toExtend<EntidadCorregible>();
    expectTypeOf<'recordatorio'>().not.toExtend<EntidadCorregible>();
    expectTypeOf<'evento_sanitario'>().toExtend<EntidadCorregible>();
  });

  it('quien registra no aporta el identificador, el autor ni la fecha de creación: los fija la capa de datos (RD-02, RD-04)', () => {
    expectTypeOf<DatosNuevos<'pesaje'>>().not.toHaveProperty('id');
    expectTypeOf<DatosNuevos<'pesaje'>>().not.toHaveProperty('autor_id');
    expectTypeOf<DatosNuevos<'pesaje'>>().not.toHaveProperty('creado_en');
    expectTypeOf<DatosNuevos<'pesaje'>>().toHaveProperty('peso');
  });

  it('el autor y la fecha de creación son de solo lectura (RNF-08)', () => {
    type Escribible<T> = { -readonly [K in keyof T]: T[K] };
    expectTypeOf<Auditable>().not.toEqualTypeOf<Escribible<Auditable>>();
  });
});
