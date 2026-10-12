import type { EstadoSync } from '../../dominio/tipos';
import { describirDistintivo } from '../estadoSincronizacion';

/**
 * Distintivo de sincronización de un registro (Tabla 22, docs/tecnica/11-indicador-de-sincronizacion.md,
 * sección 4). Un registro sincronizado no muestra nada. Se usará en las listas y fichas de la
 * Iteración 2.
 */
export function DistintivoSync({ estado, detalle }: { estado: EstadoSync; detalle?: string }) {
  const distintivo = describirDistintivo(estado, detalle);
  if (!distintivo) return null;
  return (
    <span className={`distintivo distintivo--${distintivo.tono}`} title={distintivo.detalle ?? undefined}>
      <span aria-hidden="true">{distintivo.icono} </span>
      {distintivo.texto}
      {distintivo.detalle && <span className="distintivo__detalle">{distintivo.detalle}</span>}
    </span>
  );
}
