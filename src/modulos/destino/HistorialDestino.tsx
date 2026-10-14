import { useLiveQuery } from 'dexie-react-hooks';
import { NOMBRE_DESTINO } from '../../dominio/destino';
import { formatearFecha, formatearInstante } from '../../dominio/fechas';
import type { Uuid } from '../../dominio/tipos';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import { cargarHistorialDestino } from './destino';

/**
 * Historial del destino (RF-19, HU-13 criterios 3 y 4). Especificación: docs/tecnica/19-destino-productivo.md,
 * sección 2. Solo se monta para el propietario.
 */
export function HistorialDestino({ animalId }: { animalId: Uuid }) {
  const historial = useLiveQuery(() => cargarHistorialDestino(animalId), [animalId]);
  if (!historial) return <p className="texto-secundario">Cargando…</p>;

  return (
    <section className="tarjeta">
      <h2>Historial del destino</h2>
      {historial.length === 0 ? (
        <p>Este animal todavía no tiene destino.</p>
      ) : (
        <ol className="historial">
          {historial.map(({ registro, anterior, autor }) => (
            <li key={registro.id} className="historial__entrada">
              <p>
                <strong>{NOMBRE_DESTINO[registro.destino]}</strong> desde el {formatearFecha(registro.desde)}
              </p>
              <p className="texto-secundario">{anterior ? `Reemplazó a ${NOMBRE_DESTINO[anterior.destino]}` : 'Inicial'}</p>
              {/* HU-15: quién lo asignó y cuándo. Sin punto final, como en la ficha (PE-20). */}
              <p className="texto-secundario">
                Asignado por {autor} el {formatearInstante(registro.creado_en)}
              </p>
              <DistintivoSync estado={registro.estado_sync} {...(registro.detalle_conflicto ? { detalle: registro.detalle_conflicto } : {})} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
