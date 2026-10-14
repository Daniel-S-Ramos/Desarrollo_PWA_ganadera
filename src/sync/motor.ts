/**
 * Motor de sincronización: ejecuta la subida de datos, la bajada, la subida de imágenes y la bajada de
 * imágenes, una sola vez a la vez, en los momentos definidos (docs/tecnica/09-sincronizacion-subida.md, sección 2, y
 * 14-fotografias.md, sección 6.1).
 */
import { alGuardarLocalmente } from '../datos/eventos';
import { bajar, type ResumenBajada } from './bajada';
import type { ServicioRemoto } from './servicioRemoto';
import { subir, type ResumenSubida } from './subida';
import { subirImagenes, type ResumenImagenes } from './subidaImagenes';
import { bajarImagenes, type ResumenBajadaImagenes } from './bajadaImagenes';
import { marcarCargaInicialCompleta, type AvanceCarga } from './cargaInicial';

export type ResultadoSincronizacion =
  | { estado: 'omitida' }
  | { estado: 'sesion_vencida'; subida: ResumenSubida }
  | { estado: 'sin_red'; subida: ResumenSubida }
  | { estado: 'completa'; subida: ResumenSubida; bajada: ResumenBajada; imagenes: ResumenImagenes; imagenesBajadas?: ResumenBajadaImagenes }
  | { estado: 'error_bajada'; subida: ResumenSubida; mensaje: string; imagenes: ResumenImagenes; imagenesBajadas?: ResumenBajadaImagenes };

let enCurso = false;

// ---------------------------------------------------------------------------
// Estado observable del motor (docs/tecnica/11-indicador-de-sincronizacion.md, sección 5)
// ---------------------------------------------------------------------------

export interface EstadoMotor {
  sincronizando: boolean;
  /** Avance de la sincronización en curso (documento 17, sección 4); null fuera de ella. */
  avance: AvanceCarga | null;
  ultima: ResultadoSincronizacion | null;
  ultimaEn: Date | null;
}

let estadoMotor: EstadoMotor = { sincronizando: false, avance: null, ultima: null, ultimaEn: null };
const oyentesMotor = new Set<(estado: EstadoMotor) => void>();

function publicar(cambio: Partial<EstadoMotor>) {
  estadoMotor = { ...estadoMotor, ...cambio };
  for (const oyente of oyentesMotor) oyente(estadoMotor);
}

export function leerEstadoMotor(): EstadoMotor {
  return estadoMotor;
}

/** Avisa cada vez que una sincronización empieza o termina. Devuelve la función para dejar de escuchar. */
export function suscribirseAlMotor(oyente: (estado: EstadoMotor) => void): () => void {
  oyentesMotor.add(oyente);
  return () => oyentesMotor.delete(oyente);
}

/**
 * Una sola sincronización a la vez (sección 2.1). Usa el candado del navegador, que también
 * coordina varias pestañas; donde no existe (pruebas), un indicador en memoria.
 */
async function conCandado<T>(trabajo: () => Promise<T>): Promise<T | null> {
  const candados = (globalThis.navigator as Navigator | undefined)?.locks;
  if (candados) {
    return candados.request('ganaderia-jr:sincronizacion', { ifAvailable: true }, async (candado) =>
      candado ? trabajo() : null,
    );
  }
  if (enCurso) return null;
  enCurso = true;
  try {
    return await trabajo();
  } finally {
    enCurso = false;
  }
}

/** Primero se envía lo pendiente y después se pregunta qué hay de nuevo (3.7.7). */
export async function sincronizar(servicio: ServicioRemoto): Promise<ResultadoSincronizacion> {
  const resultado = await conCandado<ResultadoSincronizacion>(async () => {
    publicar({ sincronizando: true, avance: { datos: null, fotos: null } });
    try {
      const final = await sincronizarSinCandado(servicio);
      publicar({ sincronizando: false, avance: null, ultima: final, ultimaEn: new Date() });
      return final;
    } catch (error) {
      publicar({ sincronizando: false, avance: null });
      throw error;
    }
  });
  return resultado ?? { estado: 'omitida' };
}

async function sincronizarSinCandado(servicio: ServicioRemoto): Promise<ResultadoSincronizacion> {
  const subida = await subir(servicio);
  if (subida.estado === 'sesion_vencida') return { estado: 'sesion_vencida', subida };
  if (subida.estado === 'detenida_sin_red') return { estado: 'sin_red', subida };
  let bajada: ResumenBajada | undefined;
  let mensaje = '';
  try {
    bajada = await bajar(servicio, (datos) => publicar({ avance: { datos, fotos: estadoMotor.avance?.fotos ?? null } }));
    // La primera bajada completa termina la carga inicial: desde ahora se puede registrar (documento 17, sección 3).
    await marcarCargaInicialCompleta();
  } catch (error) {
    mensaje = error instanceof Error ? error.message : String(error);
  }
  // Las imágenes van al final, porque son lo más pesado (3.8.5), y aunque la bajada falle: no dependen de ella.
  const imagenes = await subirImagenes(servicio);
  // Cuarta etapa: las reducidas de las fotos de otros teléfonos (documento 15, sección 6.2). Solo si la
  // subida de imágenes no encontró la red caída o la sesión vencida.
  const imagenesBajadas = imagenes.estado === 'completa'
      ? await bajarImagenes(servicio, new Date(), (fotos) => publicar({ avance: { datos: estadoMotor.avance?.datos ?? null, fotos } }))
      : undefined;
  return bajada
    ? { estado: 'completa', subida, bajada, imagenes, imagenesBajadas }
    : { estado: 'error_bajada', subida, mensaje, imagenes, imagenesBajadas };
}

const ESPERA_TRAS_GUARDAR_MS = 3_000;
const PERIODO_MS = 5 * 60 * 1_000;

/**
 * Sincroniza al iniciar, al volver la conexión, pocos segundos después de guardar y cada 5 minutos
 * con la aplicación abierta (sección 2). Devuelve la función que detiene todo.
 */
export function iniciarSincronizacionAutomatica(
  servicio: ServicioRemoto,
  alTerminar: (resultado: ResultadoSincronizacion) => void = () => {},
): () => void {
  const ejecutar = () => {
    if (navigator.onLine) void sincronizar(servicio).then(alTerminar);
  };

  let espera: ReturnType<typeof setTimeout> | undefined;
  const trasGuardar = () => {
    clearTimeout(espera);
    espera = setTimeout(ejecutar, ESPERA_TRAS_GUARDAR_MS);
  };

  window.addEventListener('online', ejecutar);
  const dejarDeEscuchar = alGuardarLocalmente(trasGuardar);
  const periodico = setInterval(ejecutar, PERIODO_MS);
  ejecutar();

  return () => {
    window.removeEventListener('online', ejecutar);
    dejarDeEscuchar();
    clearInterval(periodico);
    clearTimeout(espera);
  };
}
