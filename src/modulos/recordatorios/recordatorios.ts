/**
 * Recordatorios derivados de la información registrada y la decisión de posponerlos (RF-22, RF-23, CU-15, HU-14).
 * Especificación: docs/tecnica/30-recordatorios.md
 *
 * Los recordatorios no se almacenan: se derivan de lo que hay en el teléfono (apartado 3.8.11). Solo se guarda la
 * decisión de posponer. El cargador lee todas las tablas en una sola espera y deriva en memoria, para que la
 * consulta en vivo de Inicio se entere de cualquier registro nuevo (documento 26, sección 10.7).
 */
import { consulta, crear, operacionesPendientes } from '../../datos/repositorio';
import { destinoVigente } from '../../dominio/destino';
import { fechaDelPredio, formatearFecha } from '../../dominio/fechas';
import { compararConPromedio, DIAS_PROMEDIO_POR_DEFECTO, formatearLitros, promedioReciente } from '../../dominio/leche';
import { diasEntreInclusive, sumarDias } from '../../dominio/periodos';
import type { FechaPredio, RegistroLocal, TipoRecordatorio, Uuid } from '../../dominio/tipos';
import { soloVigentes } from '../../dominio/vigente';
import { PermisoDenegado, puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { fechaDeLlegada } from '../destino/destino';
import { describirPlazo, DIAS_CHAPETA_POR_DEFECTO, ternerosSinChapeta, type TerneroSinChapeta } from '../identificacion/chapetaPendiente';

/** El sexto tipo, del paso 4.2: no se guarda en `recordatorio` porque no se pospone (sección 4). */
export type TipoDeRecordatorio = TipoRecordatorio | 'chapeta_pendiente';

/** El orden de los grupos en Inicio (sección 6) y su título. */
export const GRUPOS: readonly [TipoDeRecordatorio, string][] = [
  ['sin_pesaje_reciente', 'Sin pesaje reciente'],
  ['sin_registro_ordeno', 'Sin registro de ordeño'],
  ['produccion_bajo_promedio', 'Producción bajo el promedio'],
  ['sin_registros_recientes', 'Sin registros recientes'],
  ['sincronizacion_pendiente', 'Registros sin enviar'],
  ['chapeta_pendiente', 'Terneros sin chapeta puesta'],
];

/** Los valores de ejemplo de la Tabla 30, si el parámetro no está en el teléfono. */
export const PARAMETROS_POR_DEFECTO = {
  dias_sin_pesaje: 30,
  dias_sin_ordeno: 3,
  dias_sin_registros: 90,
  dias_sin_transmitir: 3,
  dias_promedio_produccion: DIAS_PROMEDIO_POR_DEFECTO,
  dias_recordar_chapeta: DIAS_CHAPETA_POR_DEFECTO,
} as const;
export type Parametros = Record<keyof typeof PARAMETROS_POR_DEFECTO, number>;

/** Los plazos que se ofrecen para posponer (Tabla 30). */
export const PLAZOS_POSPONER = [1, 3, 7] as const;

export interface Recordatorio {
  tipo: TipoDeRecordatorio;
  animal_id: Uuid | null;
  codigo_chapeta: string | null;
  /** Desde cuándo se presenta la condición (sección 5). */
  desde: FechaPredio;
  /** Días entre `desde` y hoy. */
  dias: number;
  /** Sin pesaje: nunca se pesó (se cuenta desde la llegada). Sin ordeño: nunca se ordeñó (desde que pasó a leche). */
  nunca?: boolean;
  /** Producción bajo el promedio: los litros del ordeño y el promedio. */
  litros?: number;
  promedio?: number;
  /** Chapeta pendiente: su plazo, como en el paso 4.2. */
  chapeta?: TerneroSinChapeta;
  posponible: boolean;
}

export interface GrupoRecordatorios {
  tipo: TipoDeRecordatorio;
  titulo: string;
  recordatorios: Recordatorio[];
}

/** Días transcurridos entre dos fechas del predio (0 si es el mismo día). */
export function diasEntre(desde: FechaPredio, hasta: FechaPredio): number {
  return diasEntreInclusive(desde, hasta) - 1;
}

export interface DatosRecordatorios {
  animales: readonly RegistroLocal<'animal'>[];
  retirados: ReadonlySet<Uuid>;
  destinos: readonly RegistroLocal<'destino_productivo'>[];
  pesajes: readonly Pick<RegistroLocal<'pesaje'>, 'animal_id' | 'fecha'>[];
  ordenos: readonly Pick<RegistroLocal<'produccion_leche'>, 'animal_id' | 'fecha' | 'litros'>[];
  eventos: readonly Pick<RegistroLocal<'evento_sanitario'>, 'animal_id' | 'fecha'>[];
  partos: readonly Pick<RegistroLocal<'parto'>, 'madre_id' | 'fecha'>[];
  fotografias: readonly Pick<RegistroLocal<'fotografia'>, 'animal_id' | 'creado_en'>[];
  colocaciones: readonly Pick<RegistroLocal<'colocacion_chapeta'>, 'animal_id' | 'fecha'>[];
  /** Fecha de creación del registro más antiguo de la cola de este teléfono; null si está vacía. */
  colaMasAntigua: string | null;
  pospuestos: readonly Pick<RegistroLocal<'recordatorio'>, 'tipo' | 'animal_id' | 'pospuesto_hasta'>[];
  parametros: Parametros;
}

const masReciente = (fechas: readonly FechaPredio[]): FechaPredio | null => (fechas.length === 0 ? null : fechas.reduce((a, b) => (b > a ? b : a)));

/** ¿Está pospuesto? Una decisión de su tipo y su animal con fecha posterior a hoy (sección 7). */
export function estaPospuesto(pospuestos: DatosRecordatorios['pospuestos'], tipo: TipoDeRecordatorio, animalId: Uuid | null, hoy: FechaPredio): boolean {
  return pospuestos.some((p) => p.tipo === tipo && (p.animal_id ?? null) === animalId && p.pospuesto_hasta > hoy);
}

/**
 * Deriva los recordatorios vigentes (sección 3), sin los pospuestos, agrupados en el orden de la sección 6 y, dentro
 * de cada grupo, del más antiguo al más reciente. Recibe datos ya vigentes y sin anulados.
 */
export function derivarRecordatorios(d: DatosRecordatorios, hoy: FechaPredio): GrupoRecordatorios[] {
  const p = d.parametros;
  const lista: Recordatorio[] = [];
  const porAnimal = <T>(registros: readonly T[], campo: (r: T) => Uuid) => {
    const mapa = new Map<Uuid, T[]>();
    for (const r of registros) mapa.set(campo(r), [...(mapa.get(campo(r)) ?? []), r]);
    return mapa;
  };
  const destinos = porAnimal(d.destinos, (r) => r.animal_id);
  const pesajes = porAnimal(d.pesajes, (r) => r.animal_id);
  const ordenos = porAnimal(d.ordenos, (r) => r.animal_id);
  const activos = d.animales.filter((a) => !d.retirados.has(a.id));

  for (const a of activos) {
    const base = { animal_id: a.id, codigo_chapeta: a.codigo_chapeta, posponible: true };
    const destino = destinoVigente(destinos.get(a.id) ?? [])?.destino ?? null;

    // 1. Sin pesaje reciente: solo ceba.
    if (destino === 'ceba') {
      const ultimo = masReciente((pesajes.get(a.id) ?? []).map((r) => r.fecha));
      const desde = ultimo ?? fechaDeLlegada(a);
      if (desde && diasEntre(desde, hoy) > p.dias_sin_pesaje) lista.push({ ...base, tipo: 'sin_pesaje_reciente', desde, dias: diasEntre(desde, hoy), nunca: !ultimo });
    }

    // 2 y 3. Ordeño: solo las vacas en leche.
    if (destino === 'leche' && a.sexo === 'hembra') {
      const registros = ordenos.get(a.id) ?? [];
      const ultimo = [...registros].sort((x, y) => y.fecha.localeCompare(x.fecha))[0];
      const desde = ultimo?.fecha ?? destinoVigente(destinos.get(a.id) ?? [])!.desde;
      if (diasEntre(desde, hoy) > p.dias_sin_ordeno) lista.push({ ...base, tipo: 'sin_registro_ordeno', desde, dias: diasEntre(desde, hoy), nunca: !ultimo });
      if (ultimo && diasEntre(ultimo.fecha, hoy) <= p.dias_sin_ordeno) {
        const promedio = promedioReciente(registros, ultimo.fecha, p.dias_promedio_produccion);
        if (promedio && compararConPromedio(ultimo.litros, promedio.promedio).atencion) {
          lista.push({ ...base, tipo: 'produccion_bajo_promedio', desde: ultimo.fecha, dias: diasEntre(ultimo.fecha, hoy), litros: ultimo.litros, promedio: Math.round(promedio.promedio * 10) / 10 });
        }
      }
    }
  }

  // 4. Sin registros recientes: cualquier registro del animal lo reinicia.
  const ultimos = new Map<Uuid, FechaPredio>();
  const anotar = (id: Uuid, fecha: FechaPredio) => {
    const actual = ultimos.get(id);
    if (!actual || fecha > actual) ultimos.set(id, fecha);
  };
  for (const r of d.eventos) anotar(r.animal_id, r.fecha);
  for (const r of d.ordenos) anotar(r.animal_id, r.fecha);
  for (const r of d.pesajes) anotar(r.animal_id, r.fecha);
  for (const r of d.partos) anotar(r.madre_id, r.fecha);
  for (const r of d.destinos) anotar(r.animal_id, r.desde);
  for (const r of d.fotografias) anotar(r.animal_id, fechaDelPredio(r.creado_en));
  for (const r of d.colocaciones) anotar(r.animal_id, r.fecha);
  for (const a of activos) {
    const desde = ultimos.get(a.id) ?? fechaDelPredio(a.creado_en);
    if (diasEntre(desde, hoy) > p.dias_sin_registros) lista.push({ animal_id: a.id, codigo_chapeta: a.codigo_chapeta, posponible: true, tipo: 'sin_registros_recientes', desde, dias: diasEntre(desde, hoy) });
  }

  // 5. Sincronización pendiente: la cola de este teléfono.
  if (d.colaMasAntigua) {
    const desde = fechaDelPredio(d.colaMasAntigua);
    if (diasEntre(desde, hoy) > p.dias_sin_transmitir) lista.push({ animal_id: null, codigo_chapeta: null, posponible: true, tipo: 'sincronizacion_pendiente', desde, dias: diasEntre(desde, hoy) });
  }

  // 6. Terneros sin chapeta (documento 25), con su propio orden: los vencidos primero.
  const terneros = ternerosSinChapeta(d.animales, d.colocaciones, d.retirados, hoy, p.dias_recordar_chapeta);
  const chapetas: Recordatorio[] = terneros.map((t) => ({
    tipo: 'chapeta_pendiente',
    animal_id: t.id,
    codigo_chapeta: t.codigo_chapeta,
    desde: d.animales.find((a) => a.id === t.id)?.fecha_nacimiento ?? hoy,
    dias: t.dias ?? 0,
    chapeta: t,
    posponible: false,
  }));

  const vigentes = lista.filter((r) => !estaPospuesto(d.pospuestos, r.tipo, r.animal_id, hoy));
  return GRUPOS.map(([tipo, titulo]) => ({
    tipo,
    titulo,
    recordatorios:
      tipo === 'chapeta_pendiente'
        ? chapetas
        : vigentes.filter((r) => r.tipo === tipo).sort((x, y) => x.desde.localeCompare(y.desde) || (x.codigo_chapeta ?? '').localeCompare(y.codigo_chapeta ?? '', 'es', { numeric: true })),
  })).filter((g) => g.recordatorios.length > 0);
}

/** Lee el teléfono y deriva (sección 8). */
export async function cargarRecordatorios(hoy: FechaPredio = fechaDelPredio()): Promise<GrupoRecordatorios[]> {
  const [animales, salidas, destinos, pesajes, ordenos, eventos, partos, fotografias, colocaciones, correcciones, cola, pospuestos, parametros] = await Promise.all([
    consulta.animal.toArray(),
    consulta.salida.toArray(),
    consulta.destino_productivo.toArray(),
    consulta.pesaje.toArray(),
    consulta.produccion_leche.toArray(),
    consulta.evento_sanitario.toArray(),
    consulta.parto.toArray(),
    consulta.fotografia.toArray(),
    consulta.colocacion_chapeta.toArray(),
    consulta.correccion.toArray(),
    operacionesPendientes(),
    consulta.recordatorio.toArray(),
    consulta.parametro.toArray(),
  ]);
  const valor = (clave: keyof Parametros) => parametros.find((x) => x.clave === clave)?.valor ?? PARAMETROS_POR_DEFECTO[clave];
  const masAntigua = cola.reduce<string | null>((min, o) => (min === null || o.creado_en < min ? o.creado_en : min), null);
  return derivarRecordatorios(
    {
      animales: soloVigentes('animal', animales, correcciones),
      retirados: new Set(soloVigentes('salida', salidas, correcciones).map((s) => s.animal_id)),
      destinos: soloVigentes('destino_productivo', destinos, correcciones),
      pesajes: soloVigentes('pesaje', pesajes, correcciones),
      ordenos: soloVigentes('produccion_leche', ordenos, correcciones),
      eventos: soloVigentes('evento_sanitario', eventos, correcciones),
      partos: soloVigentes('parto', partos, correcciones),
      fotografias,
      colocaciones,
      colaMasAntigua: masAntigua,
      pospuestos,
      parametros: {
        dias_sin_pesaje: valor('dias_sin_pesaje'),
        dias_sin_ordeno: valor('dias_sin_ordeno'),
        dias_sin_registros: valor('dias_sin_registros'),
        dias_sin_transmitir: valor('dias_sin_transmitir'),
        dias_promedio_produccion: valor('dias_promedio_produccion'),
        dias_recordar_chapeta: valor('dias_recordar_chapeta'),
      },
    },
    hoy,
  );
}

/**
 * Pospone un recordatorio por 1, 3 o 7 días (sección 7). Solo el propietario.
 *
 * @throws PermisoDenegado si el perfil no puede insertar en `recordatorio` (Tabla 27).
 */
export async function posponerRecordatorio(
  tipo: TipoRecordatorio,
  animalId: Uuid | null,
  dias: (typeof PLAZOS_POSPONER)[number],
  usuario: Identidad,
  hoy: FechaPredio = fechaDelPredio(),
): Promise<RegistroLocal<'recordatorio'>> {
  if (!puedeCrear(usuario.perfil, 'recordatorio')) throw new PermisoDenegado(usuario.perfil, 'recordatorio');
  return crear('recordatorio', { tipo, animal_id: animalId, pospuesto_hasta: sumarDias(hoy, dias) }, usuario.usuario_id);
}

const enDias = (n: number) => (n === 1 ? '1 día' : `${n} días`);

/** El motivo y desde cuándo, sin la chapeta, que la pantalla destaca aparte (sección 5). */
export function textoRecordatorio(r: Recordatorio): string {
  const fecha = formatearFecha(r.desde);
  switch (r.tipo) {
    case 'sin_pesaje_reciente':
      return r.nunca ? `Nunca se ha pesado; llegó el ${fecha} (${enDias(r.dias)})` : `Sin pesaje desde el ${fecha} (${enDias(r.dias)})`;
    case 'sin_registro_ordeno':
      return r.nunca ? `Sin ordeños desde que pasó a leche, el ${fecha} (${enDias(r.dias)})` : `Sin ordeño registrado desde el ${fecha} (${enDias(r.dias)})`;
    case 'produccion_bajo_promedio':
      return `${formatearLitros(r.litros!)} litros el ${fecha}: muy por debajo de su promedio (${formatearLitros(r.promedio!)} litros)`;
    case 'sin_registros_recientes':
      return `Sin ningún registro desde el ${fecha} (${enDias(r.dias)})`;
    case 'sincronizacion_pendiente':
      return `Hay registros sin enviar desde el ${fecha} (${enDias(r.dias)}). Conéctese a una red con señal.`;
    case 'chapeta_pendiente':
      return describirPlazo(r.chapeta!);
  }
}

/** Adónde lleva tocarlo: el registro que lo resolvería (sección 5); null en la sincronización. */
export function destinoRecordatorio(r: Recordatorio): string | null {
  switch (r.tipo) {
    case 'sin_pesaje_reciente':
      return `/animales/${r.animal_id}/pesaje`;
    case 'sin_registro_ordeno':
      return '/ordeno';
    case 'produccion_bajo_promedio':
      return `/produccion?vaca=${r.animal_id}`;
    case 'sincronizacion_pendiente':
      return null;
    default:
      return `/animales/${r.animal_id}`;
  }
}
