/**
 * Servicio remoto simulado en memoria para las pruebas del motor de sincronización.
 *
 * Imita lo que importa del servicio real: inserción que ignora un identificador existente, las
 * restricciones de unicidad (chapeta y ordeño por vaca y fecha), la clave foránea hacia animal,
 * la marca recibido_en asignada por el servicio y la consulta ordenada por (recibido_en, id).
 * Cada prueba puede forzar respuestas: falla de red, rechazo de política, sesión vencida.
 */
import type { FilaRemota } from '../datos/sincronizacionLocal';
import type { NombreTabla, Parametro, Usuario, Uuid } from '../dominio/tipos';
import type { Desde, ResultadoDescarga, ResultadoEnvio, ServicioRemoto } from '../sync/servicioRemoto';

type Forzado = (tabla: NombreTabla, fila: Record<string, unknown>) => ResultadoEnvio | undefined;

export class ServicioSimulado implements ServicioRemoto {
  tablas = new Map<NombreTabla, FilaRemota[]>();
  usuariosRemotos: Usuario[] = [];
  parametrosRemotos: Parametro[] = [];
  sesion = true;
  /** Si devuelve un resultado, reemplaza la respuesta normal de insertar. */
  forzar: Forzado | undefined;
  /** Si se define, consultar falla a partir de esa llamada. */
  fallarConsultaEnLlamada: number | undefined;
  insertados: { tabla: NombreTabla; fila: Record<string, unknown> }[] = [];
  consultas: { tabla: NombreTabla; desde: Desde; limite: number }[] = [];

  private reloj = Date.parse('2026-10-08T10:00:00.000Z');

  /** Marca de recepción del servicio, con microsegundos como la entrega PostgreSQL. */
  private siguienteRecibido(): string {
    this.reloj += 1;
    return new Date(this.reloj).toISOString().replace('Z', '123+00:00');
  }

  filas(tabla: NombreTabla): FilaRemota[] {
    if (!this.tablas.has(tabla)) this.tablas.set(tabla, []);
    return this.tablas.get(tabla)!;
  }

  /** Agrega una fila «registrada por otro dispositivo», con recibido_en opcionalmente fijado. */
  sembrar(tabla: NombreTabla, fila: Record<string, unknown>, recibidoEn?: string): FilaRemota {
    const completa = { ...fila, recibido_en: recibidoEn ?? this.siguienteRecibido() } as FilaRemota;
    this.filas(tabla).push(completa);
    return completa;
  }

  async sesionVigente() {
    return this.sesion;
  }

  async insertar(tabla: NombreTabla, fila: Record<string, unknown>): Promise<ResultadoEnvio> {
    this.insertados.push({ tabla, fila });
    const forzado = this.forzar?.(tabla, fila);
    if (forzado) return forzado;

    const filas = this.filas(tabla);
    if (filas.some((f) => f.id === fila['id'])) return { ok: true }; // ON CONFLICT (id) DO NOTHING

    if (tabla === 'animal' && filas.some((f) => f['codigo_chapeta'] === fila['codigo_chapeta'])) {
      return { ok: false, codigo: '23505', estado: 409, mensaje: 'duplicate key value violates unique constraint "animal_codigo_chapeta_key"' };
    }
    if (tabla === 'produccion_leche' && filas.some((f) => f['animal_id'] === fila['animal_id'] && f['fecha'] === fila['fecha'])) {
      return { ok: false, codigo: '23505', estado: 409, mensaje: 'duplicate key value violates unique constraint "produccion_leche_una_por_vaca_y_fecha"' };
    }
    const animalId = fila['animal_id'] as Uuid | undefined;
    if (animalId && tabla !== 'animal' && !this.filas('animal').some((a) => a.id === animalId)) {
      return { ok: false, codigo: '23503', estado: 409, mensaje: 'insert or update violates foreign key constraint' };
    }

    const recibido_en = this.siguienteRecibido();
    filas.push({ ...fila, recibido_en } as FilaRemota);
    return { ok: true, recibido_en };
  }

  async consultar(tabla: NombreTabla, desde: Desde, limite: number): Promise<FilaRemota[]> {
    this.consultas.push({ tabla, desde, limite });
    if (this.fallarConsultaEnLlamada !== undefined && this.consultas.length >= this.fallarConsultaEnLlamada) {
      throw new Error('Sin conexión (simulada)');
    }
    const ordenadas = [...this.filas(tabla)].sort(
      (a, b) => Date.parse(a.recibido_en) - Date.parse(b.recibido_en) || a.recibido_en.localeCompare(b.recibido_en) || a.id.localeCompare(b.id),
    );
    const t = (f: FilaRemota) => f.recibido_en;
    const filtradas = ordenadas.filter((f) => {
      if (desde.tipo === 'inicio') return true;
      if (desde.tipo === 'despues_de') return Date.parse(t(f)) > Date.parse(desde.recibido_en);
      return t(f) > desde.recibido_en || (t(f) === desde.recibido_en && f.id > desde.id);
    });
    return filtradas.slice(0, limite);
  }

  async buscarOrdeno(animalId: Uuid, fecha: string) {
    const f = this.filas('produccion_leche').find((o) => o['animal_id'] === animalId && o['fecha'] === fecha);
    return f ? { id: f.id, litros: Number(f['litros']) } : null;
  }

  /** Archivos del servicio de archivos simulado, por ruta. */
  archivos = new Map<string, Blob>();
  /** Si devuelve un resultado, reemplaza la respuesta normal de subirImagen. */
  forzarImagen: ((ruta: string) => ResultadoEnvio | undefined) | undefined;
  subidas: string[] = [];

  /** Imita el bucket: no reemplaza (409) y exige que exista la fotografía de la ruta (documento 14, sección 7). */
  async subirImagen(ruta: string, imagen: Blob): Promise<ResultadoEnvio> {
    this.subidas.push(ruta);
    const forzado = this.forzarImagen?.(ruta);
    if (forzado) return forzado;
    if (this.archivos.has(ruta)) return { ok: false, codigo: '409', estado: 400, mensaje: 'The resource already exists' };
    const [animalId, archivo] = ruta.split('/');
    const fotografiaId = archivo?.replace(/(-reducida)?\.webp$/, '');
    if (!this.filas('fotografia').some((f) => f.id === fotografiaId && f['animal_id'] === animalId)) {
      return { ok: false, codigo: '403', estado: 400, mensaje: 'new row violates row-level security policy' };
    }
    this.archivos.set(ruta, imagen);
    return { ok: true };
  }

  /** Si devuelve un resultado, reemplaza la respuesta normal de descargarImagen. */
  forzarDescarga: ((ruta: string) => ResultadoDescarga | undefined) | undefined;
  descargas: string[] = [];

  async descargarImagen(ruta: string): Promise<ResultadoDescarga> {
    this.descargas.push(ruta);
    const forzado = this.forzarDescarga?.(ruta);
    if (forzado) return forzado;
    const imagen = this.archivos.get(ruta);
    return imagen ? { ok: true, imagen } : { ok: false, codigo: '404', estado: 400, mensaje: 'Object not found' };
  }

  async usuarios() {
    return this.usuariosRemotos;
  }

  async parametros() {
    return this.parametrosRemotos;
  }
}
