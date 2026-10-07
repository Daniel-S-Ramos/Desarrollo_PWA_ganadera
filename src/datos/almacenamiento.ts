/**
 * Almacenamiento persistente (RNF-15, apartado 3.8.7).
 * Especificación: docs/tecnica/04-almacenamiento-persistente.md
 *
 * Por defecto el navegador puede borrar todos los datos de la aplicación cuando el dispositivo se
 * queda sin espacio, incluida la cola de operaciones pendientes. Este componente solicita la
 * modalidad persistente, en la que solo el usuario puede borrarlos, e informa el resultado para
 * que la interfaz advierta cuando el navegador la niega.
 */

export type EstadoPersistencia = 'persistente' | 'negado' | 'no_disponible';

export interface Espacio {
  /** Bytes que ocupa la aplicación, según la estimación del navegador. */
  usado: number;
  /** Bytes que el navegador permite usar a la aplicación, según su estimación. */
  cuota: number;
}

/**
 * Consulta si los datos ya son persistentes y, si no lo son, lo solicita.
 *
 * Se llama en cada inicio mientras el permiso no esté concedido, y no solo en el primero: Chrome
 * decide según el uso del sitio y puede conceder después de instalar la aplicación un permiso que
 * negó antes (sección 4.1 del documento técnico). En Chrome la solicitud no muestra nada al usuario.
 */
export async function asegurarPersistencia(): Promise<EstadoPersistencia> {
  const storage = globalThis.navigator?.storage;
  if (!storage?.persisted || !storage.persist) return 'no_disponible';

  try {
    if (await storage.persisted()) return 'persistente';
    return (await storage.persist()) ? 'persistente' : 'negado';
  } catch {
    // Una falla al solicitar equivale, para el usuario, a no tener la garantía.
    return 'negado';
  }
}

/** Estimación del espacio ocupado y disponible, o null si el navegador no la informa. */
export async function consultarEspacio(): Promise<Espacio | null> {
  const storage = globalThis.navigator?.storage;
  if (!storage?.estimate) return null;

  try {
    const { usage, quota } = await storage.estimate();
    if (usage === undefined || quota === undefined) return null;
    return { usado: usage, cuota: quota };
  } catch {
    return null;
  }
}

const UNIDADES = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

/** Convierte bytes a una cifra legible con coma decimal: 1536 → «1,5 KB». */
export function formatearBytes(bytes: number): string {
  let valor = bytes;
  let unidad = 0;
  while (valor >= 1024 && unidad < UNIDADES.length - 1) {
    valor /= 1024;
    unidad++;
  }
  return `${formato.format(valor)} ${UNIDADES[unidad]}`;
}
