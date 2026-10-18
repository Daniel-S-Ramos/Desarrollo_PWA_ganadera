import type { EstadoPersistencia } from '../../datos/almacenamiento';

interface Mensaje {
  titulo: string;
  detalle: string;
}

const TITULO = '⚠ Los datos de este teléfono no están protegidos.';
const RIESGO = 'Si el teléfono se queda sin espacio, el navegador podría borrar la información que aún no se ha enviado.';

/**
 * Texto del aviso de RNF-15 según el estado del almacenamiento y la forma en que está abierta la
 * aplicación (sección 4.3 del documento técnico 04).
 *
 * Si la aplicación aún no está instalada, se recomienda instalarla. Si ya lo está y el navegador
 * igual niega la persistencia (verificado en PE-12 con Chrome en Windows), no se pide algo que el
 * usuario ya hizo: se recomienda mantener espacio libre y sincronizar con frecuencia.
 */
export function mensajeAvisoAlmacenamiento(
  persistencia: EstadoPersistencia | null,
  instalada: boolean,
): Mensaje | null {
  if (persistencia === null || persistencia === 'persistente') return null;
  return instalada
    ? {
        titulo: TITULO,
        detalle: `${RIESGO} Mantenga espacio libre en el teléfono y abra la aplicación con señal con frecuencia para que la información se envíe.`,
      }
    : { titulo: TITULO, detalle: `${RIESGO} Para protegerla, instale la aplicación en el teléfono.` };
}

/** Indica si la aplicación está abierta como aplicación instalada y no en una pestaña del navegador. */
export function estaInstalada(): boolean {
  if (typeof window === 'undefined') return false;
  const iosInstalada = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosInstalada || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/**
 * Aviso de RNF-15. No bloquea el uso de la aplicación: advierte el riesgo e indica qué hacer.
 *
 * Es una franja discreta, con el detalle plegado: aparece en todas las pantallas y, como recuadro
 * amarillo, opacaba los avisos propios de cada registro (PE-29, pedido del autor el 2026-10-17).
 */
export function AvisoAlmacenamiento({ persistencia }: { persistencia: EstadoPersistencia | null }) {
  const mensaje = mensajeAvisoAlmacenamiento(persistencia, estaInstalada());
  if (!mensaje) return null;

  return (
    <details className="aviso-discreto" role="note">
      <summary>
        {mensaje.titulo} <span className="aviso-discreto__mas">¿Por qué?</span>
      </summary>
      <p>{mensaje.detalle}</p>
    </details>
  );
}
