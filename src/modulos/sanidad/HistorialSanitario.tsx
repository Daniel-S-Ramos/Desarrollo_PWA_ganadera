import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatearFecha, formatearInstante } from '../../dominio/fechas';
import { describirDosis, formatearPesos, NOMBRE_TIPO_EVENTO } from '../../dominio/sanidad';
import type { Uuid } from '../../dominio/tipos';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import { cargarHistorialSanitario } from './eventos';

/**
 * Historial sanitario del animal (CU-05, RF-08, HU-02.4). Especificación: docs/tecnica/20-registro-sanitario.md,
 * sección 8. El costo solo se muestra al propietario (sección 5.2).
 */
export function HistorialSanitario({ animalId, verCosto, puedeRegistrar }: { animalId: Uuid; verCosto: boolean; puedeRegistrar: boolean }) {
  const historial = useLiveQuery(() => cargarHistorialSanitario(animalId), [animalId]);
  const [abierto, setAbierto] = useState<Uuid | null>(null);
  if (!historial) return <p className="texto-secundario">Cargando…</p>;

  return (
    <section className="tarjeta">
      <h2>Historial sanitario</h2>
      {historial.length === 0 ? (
        // CU-05, 2a: se informa y se ofrece registrar el primero.
        <>
          <p>Este animal no tiene eventos sanitarios.</p>
          {puedeRegistrar && (
            <Link className="boton boton--secundario boton--ancho" to={`/animales/${animalId}/evento-sanitario`}>
              Registrar el primero
            </Link>
          )}
        </>
      ) : (
        <ol className="historial">
          {historial.map(({ evento, medicamento, unidad, autor }) => (
            <li key={evento.id} className="historial__entrada">
              <button type="button" className="evento-fila" aria-expanded={abierto === evento.id} onClick={() => setAbierto((a) => (a === evento.id ? null : evento.id))}>
                <p>
                  <strong>{formatearFecha(evento.fecha)}</strong> · {NOMBRE_TIPO_EVENTO[evento.tipo]}
                </p>
                <p>
                  {medicamento} · {describirDosis(evento.dosis, unidad)}
                </p>
                <p className="texto-secundario">Registrado por {autor}</p>
              </button>
              <DistintivoSync estado={evento.estado_sync} {...(evento.detalle_conflicto ? { detalle: evento.detalle_conflicto } : {})} />
              {abierto === evento.id && (
                // CU-05, paso 4: el detalle completo del evento.
                <div className="evento-fila__detalle">
                  <p>Síntomas: {evento.sintomas ?? 'no se registraron'}</p>
                  {verCosto && <p>Costo: {evento.costo === null ? 'no se registró' : formatearPesos(evento.costo)}</p>}
                  <p className="texto-secundario">Registrado el {formatearInstante(evento.creado_en)}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
