/**
 * Textos del indicador de sincronización (docs/tecnica/11-indicador-de-sincronizacion.md, secciones
 * 3 y 4). Funciones puras: reciben la situación y devuelven qué mostrar, de modo que cada mensaje se
 * verifica con pruebas automáticas sin necesidad de una pantalla.
 */
import type { EstadoSync } from '../dominio/tipos';
import type { ResultadoSincronizacion } from '../sync/motor';

/** informacion: no exige nada · correcto: todo a salvo · advertencia: exige una acción. */
export type Tono = 'informacion' | 'correcto' | 'advertencia';

export interface Linea {
  icono: string;
  texto: string;
  detalle: string | null;
  tono: Tono;
}

export interface SituacionSincronizacion {
  pendientes: number;
  conflictos: number;
  enLinea: boolean;
  sincronizando: boolean;
  ultima: ResultadoSincronizacion | null;
  ultimaEn: Date | null;
  ahora: Date;
}

const plural = (n: number, singular: string, plural: string) => (n === 1 ? `1 ${singular}` : `${n} ${plural}`);

/** «hace unos segundos», «hace 5 min», «hace 2 h», «hace 3 días». */
export function haceCuanto(desde: Date, ahora: Date): string {
  const segundos = Math.max(0, Math.round((ahora.getTime() - desde.getTime()) / 1000));
  if (segundos < 60) return 'hace unos segundos';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${plural(Math.round(horas / 24), 'día', 'días')}`;
}

/** Líneas de la barra inferior: la principal y, si hay conflictos, una segunda (sección 3). */
export function describirBarra(s: SituacionSincronizacion): Linea[] {
  const lineas: Linea[] = [];
  const textoPendientes = plural(s.pendientes, 'registro pendiente de enviar', 'registros pendientes de enviar');

  if (s.sincronizando) {
    lineas.push({ icono: '↻', texto: 'Enviando…', detalle: null, tono: 'informacion' });
  } else if (s.ultima?.estado === 'sesion_vencida' && s.pendientes > 0) {
    lineas.push({ icono: '⚠', texto: textoPendientes, detalle: 'Ingrese de nuevo con conexión para enviarlos', tono: 'advertencia' });
  } else if (s.pendientes > 0) {
    lineas.push({
      icono: '⏳',
      texto: textoPendientes,
      // Registrar sin conexión no es un error (Tabla 31): tono de información, no de advertencia.
      detalle: s.enLinea ? 'Se enviarán en unos segundos' : 'Sin conexión: se enviarán cuando vuelva la señal',
      tono: 'informacion',
    });
  } else {
    let detalle: string | null = null;
    if (!s.enLinea) detalle = 'Sin conexión';
    else if (s.ultima?.estado === 'error_bajada') detalle = 'No se pudo descargar lo nuevo; se reintentará';
    else if (s.ultimaEn) detalle = `Última sincronización: ${haceCuanto(s.ultimaEn, s.ahora)}`;
    lineas.push({ icono: '✓', texto: 'Todo enviado', detalle, tono: 'correcto' });
  }

  if (s.conflictos > 0) {
    lineas.push({
      icono: '⚠',
      texto: plural(s.conflictos, 'registro en conflicto', 'registros en conflicto'),
      detalle: 'Requieren la revisión del propietario',
      tono: 'advertencia',
    });
  }
  return lineas;
}

export interface Distintivo {
  icono: string;
  texto: string;
  tono: 'atencion' | 'riesgo';
  /** Causa del conflicto, cuando la hay. */
  detalle: string | null;
}

/** Distintivo de un registro según la Tabla 22. Un registro sincronizado no lleva distintivo (sección 4). */
export function describirDistintivo(estado: EstadoSync, detalleConflicto?: string): Distintivo | null {
  switch (estado) {
    case 'pendiente':
      return { icono: '⏳', texto: 'Pendiente', tono: 'atencion', detalle: null };
    case 'en_transmision':
      return { icono: '↻', texto: 'Enviando', tono: 'atencion', detalle: null };
    case 'conflicto':
      return { icono: '⚠', texto: 'En conflicto', tono: 'riesgo', detalle: detalleConflicto ?? null };
    case 'sincronizado':
      return null;
  }
}
