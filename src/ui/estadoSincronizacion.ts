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
  /** Adónde llevar a la persona, por ejemplo a la lista de conflictos (documento 26, sección 10.6). */
  enlace?: { texto: string; a: string };
}

export interface SituacionSincronizacion {
  pendientes: number;
  /** Fotografías cuya imagen falta subir (documento 14, sección 8.2). */
  imagenes: number;
  conflictos: number;
  enLinea: boolean;
  sincronizando: boolean;
  ultima: ResultadoSincronizacion | null;
  ultimaEn: Date | null;
  ahora: Date;
  /** Fotos de otros teléfonos que se están bajando (documento 17, sección 5). */
  fotosBajando?: { bajadas: number; total: number } | null;
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

/**
 * Líneas de la barra inferior (sección 3): la de los registros, la de las fotografías pendientes
 * (documento 14, sección 8.2) y, si hay conflictos, la de los conflictos. «Todo enviado» solo aparece
 * cuando no queda ni un registro ni una fotografía por enviar.
 */
export function describirBarra(s: SituacionSincronizacion): Linea[] {
  const lineas: Linea[] = [];
  const ultima = s.ultima;
  const sesionVencida =
    ultima?.estado === 'sesion_vencida' || (!!ultima && 'imagenes' in ultima && ultima.imagenes.estado === 'sesion_vencida');
  const sinSenal = 'Sin conexión: se enviarán cuando vuelva la señal';

  if (s.sincronizando) {
    lineas.push(
      s.fotosBajando
        ? { icono: '↻', texto: 'Bajando fotos de los animales', detalle: `${s.fotosBajando.bajadas} de ${s.fotosBajando.total}`, tono: 'informacion' }
        : { icono: '↻', texto: 'Enviando…', detalle: null, tono: 'informacion' },
    );
  } else {
    if (s.pendientes > 0) {
      const texto = plural(s.pendientes, 'registro pendiente de enviar', 'registros pendientes de enviar');
      lineas.push(
        sesionVencida
          ? { icono: '⚠', texto, detalle: 'Ingrese de nuevo con conexión para enviarlos', tono: 'advertencia' }
          : // Registrar sin conexión no es un error (Tabla 31): tono de información, no de advertencia.
            { icono: '⏳', texto, detalle: s.enLinea ? 'Se enviarán en unos segundos' : sinSenal, tono: 'informacion' },
      );
    }
    if (s.imagenes > 0) {
      const texto = plural(s.imagenes, 'fotografía pendiente de enviar', 'fotografías pendientes de enviar');
      lineas.push(
        sesionVencida
          ? { icono: '⚠', texto, detalle: 'Ingrese de nuevo con conexión para enviarlas', tono: 'advertencia' }
          : { icono: '📷', texto, detalle: s.enLinea ? 'Se enviarán después de los registros' : sinSenal, tono: 'informacion' },
      );
    }
  }

  if (!s.sincronizando && s.pendientes === 0 && s.imagenes === 0) {
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
      detalle: 'Los resuelve quien los registró o el propietario',
      tono: 'advertencia',
      enlace: { texto: 'Ver cuáles', a: '/conflictos' },
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

// ---------------------------------------------------------------------------
// Pasos de la carga inicial (docs/tecnica/17-carga-inicial.md, sección 4)
// ---------------------------------------------------------------------------

export type EstadoPaso = 'hecho' | 'en_curso' | 'pendiente';

export interface PasosCarga {
  referencia: EstadoPaso;
  animales: EstadoPaso;
  registros: EstadoPaso;
}

/**
 * Estado de cada paso de la carga inicial. Se calcula con lo que ya hay en el teléfono más la tabla
 * que se está descargando, no solo con la sincronización en curso: así una descarga interrumpida y
 * reanudada no vuelve a mostrar como pendiente lo que ya llegó (corrección tras PE-21).
 */
export function pasosDeCarga(s: {
  sincronizando: boolean;
  /** Tabla que se está descargando; null antes de las tablas del predio o fuera de una sincronización. */
  tabla: string | null;
  usuarios: number;
  animales: number;
}): PasosCarga {
  const enTablas = s.sincronizando && s.tabla !== null;
  const antesDeAnimales = s.tabla === 'medicamento';
  const enAnimales = enTablas && s.tabla === 'animal';
  const despuesDeAnimales = enTablas && !antesDeAnimales && !enAnimales;
  return {
    referencia: s.usuarios > 0 ? 'hecho' : s.sincronizando ? 'en_curso' : 'pendiente',
    // Los animales del predio (unos 55) llegan en una sola página, que se aplica completa o no se aplica:
    // si hay animales en el teléfono, llegaron todos.
    animales: enAnimales ? 'en_curso' : despuesDeAnimales || s.animales > 0 ? 'hecho' : 'pendiente',
    // Mientras la pantalla se muestra, los registros no han terminado de llegar: nunca se dan por hechos.
    registros: despuesDeAnimales ? 'en_curso' : 'pendiente',
  };
}
