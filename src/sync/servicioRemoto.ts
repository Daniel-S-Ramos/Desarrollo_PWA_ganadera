/**
 * Lo que el motor de sincronización necesita del servicio remoto, expresado como una interfaz.
 *
 * El motor depende de esta interfaz y no de Supabase directamente. Así las pruebas automáticas usan
 * un servicio simulado que responde lo que cada caso necesita (éxito, falla de red, conflicto), y la
 * aplicación usa la implementación real (src/servicios/servicioRemotoSupabase.ts).
 */
import type { NombreTabla, Parametro, Usuario, Uuid } from '../dominio/tipos';
import type { FilaRemota } from '../datos/sincronizacionLocal';

export type ResultadoEnvio =
  | { ok: true; recibido_en?: string }
  | {
      ok: false;
      /** Código de error de PostgreSQL (SQLSTATE) o del servicio, cuando lo hay. */
      codigo?: string;
      /** Código HTTP de la respuesta; 0 o ausente si no hubo respuesta. */
      estado?: number;
      mensaje: string;
    };

export type ResultadoDescarga = { ok: true; imagen: Blob } | Extract<ResultadoEnvio, { ok: false }>;

/** Desde dónde pedir filas (documento 10, secciones 2 y 3.3). */
export type Desde =
  | { tipo: 'inicio' }
  | { tipo: 'despues_de'; recibido_en: string }
  | { tipo: 'cursor'; recibido_en: string; id: Uuid };

export interface ServicioRemoto {
  /** ¿Hay una sesión vigente para enviar? Renueva el token si hace falta. */
  sesionVigente(): Promise<boolean>;
  /** Inserta por identificador, ignorando un identificador ya existente (3.7.8). */
  insertar(tabla: NombreTabla, fila: Record<string, unknown>): Promise<ResultadoEnvio>;
  /** Filas ordenadas por recibido_en y, a igual recibido_en, por id. Lanza un error si falla. */
  consultar(tabla: NombreTabla, desde: Desde, limite: number): Promise<FilaRemota[]>;
  /** Ordeño ya aceptado de una vaca en una fecha (documento 09, sección 5.2). */
  buscarOrdeno(animalId: Uuid, fecha: string): Promise<{ id: Uuid; litros: number } | null>;
  usuarios(): Promise<Usuario[]>;
  /**
   * Sube una imagen al servicio de archivos sin reemplazar una existente (documento 14, sección 6.3).
   * El código es el del servicio de archivos (por ejemplo, «409» si el archivo ya existe).
   */
  subirImagen(ruta: string, imagen: Blob): Promise<ResultadoEnvio>;
  /** Descarga una imagen del servicio de archivos (documento 15, sección 6). */
  descargarImagen(ruta: string): Promise<ResultadoDescarga>;
  parametros(): Promise<Parametro[]>;
}
