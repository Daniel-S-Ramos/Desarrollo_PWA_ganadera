import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { formatearFecha } from '../../dominio/fechas';
import { formatearKg, NOMBRE_METODO } from '../../dominio/peso';
import type { Uuid } from '../../dominio/tipos';
import { cargarEvolucion } from './pesajes';

/**
 * Evolución del peso (CU-09, RF-14, HU-05.2 y 3). Especificación: docs/tecnica/24-pesaje-y-evolucion.md,
 * secciones 7 y 8. Se despliega en la ficha, para ambos perfiles.
 */
export function EvolucionPeso({ animalId, puedeRegistrar }: { animalId: Uuid; puedeRegistrar: boolean }) {
  const evolucion = useLiveQuery(() => cargarEvolucion(animalId), [animalId]);
  if (!evolucion) return <p className="texto-secundario">Cargando…</p>;
  const { tramos, resumen, meta } = evolucion;
  const pesajes = tramos.filter((t) => t.punto.id !== null).length;
  const maximo = Math.max(...tramos.map((t) => t.punto.kg), 1);

  return (
    <section className="tarjeta">
      <h2>Evolución del peso</h2>

      {pesajes === 0 && (
        // CU-09, 2b: se informa y se ofrece registrar el primero.
        <>
          <p>Este animal no tiene pesajes.</p>
          {puedeRegistrar && (
            <Link className="boton boton--secundario boton--ancho" to={`/animales/${animalId}/pesaje`}>
              Registrar el primero
            </Link>
          )}
        </>
      )}

      {resumen ? (
        <p>
          <strong>
            {resumen.total >= 0 ? '+' : '−'}
            {formatearKg(Math.abs(resumen.total))} kg
          </strong>{' '}
          en {resumen.dias === 1 ? '1 día' : `${resumen.dias} días`}
          {resumen.gananciaDiaria !== null && ` · ${formatearKg(resumen.gananciaDiaria)} kg por día en promedio`}
        </p>
      ) : (
        tramos.length === 1 && <p className="texto-secundario">Con un solo peso no se puede calcular la ganancia.</p>
      )}
      {meta !== null && <p className="texto-secundario">Meta: {formatearKg(meta)} kg por día.</p>}

      {tramos.length > 0 && (
        <ol className="historial">
          {tramos.map((t) => (
            <li key={t.punto.id ?? 'inicial'} className="historial__entrada">
              <p>
                <strong>{formatearKg(t.punto.kg)} kg</strong> · {t.punto.fecha ? formatearFecha(t.punto.fecha) : 'sin fecha'}
              </p>
              <p className="texto-secundario">
                {t.punto.metodo ? NOMBRE_METODO[t.punto.metodo] : t.punto.etiqueta}
                {t.autor ? ` · registrado por ${t.autor}` : ''}
              </p>
              {t.cambio !== null && (
                <p className={t.bajoMeta ? 'aviso aviso--atencion aviso--en-contenido' : ''}>
                  {t.cambio >= 0 ? '+' : '−'}
                  {formatearKg(Math.abs(t.cambio))} kg
                  {t.dias === 0
                    ? ' · mismo día'
                    : t.dias !== null
                      ? ` en ${t.dias === 1 ? '1 día' : `${t.dias} días`} · ${formatearKg(t.gananciaDiaria!)} kg por día`
                      : ''}
                  {t.bajoMeta && ' · por debajo de la meta'}
                </p>
              )}
              {t.metodosDistintos && <p className="texto-secundario">Métodos distintos: compárese con cautela.</p>}
              <div className="produccion__barra" aria-hidden="true">
                <div className="produccion__relleno" style={{ width: `${(t.punto.kg / maximo) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
