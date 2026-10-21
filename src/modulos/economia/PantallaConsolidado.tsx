import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { consulta } from '../../datos/repositorio';
import { NOMBRE_CONCEPTO } from '../../dominio/economia';
import { formatearFecha } from '../../dominio/fechas';
import { formatearLitros } from '../../dominio/leche';
import { formatearPesos } from '../../dominio/salida';
import type { Identidad } from '../../sesion/token';
import { EnlaceCorregir, MarcaCorreccion } from '../correcciones/MarcaCorreccion';
import { cargarConsolidado, rotuloResultado, type ConceptoInvertido } from './consolidado';

const NOMBRE_INVERTIDO: Record<ConceptoInvertido, string> = { ...NOMBRE_CONCEPTO, servicio_veterinario: 'Servicios veterinarios', medicamentos: 'Medicamentos' };

/**
 * Consolidado económico del animal (CU-14, RF-21, HU-16), solo el propietario. Especificación:
 * docs/tecnica/31-consolidado-economico.md, sección 6. Ruta: /animales/:id/consolidado.
 */
export function PantallaConsolidado({ identidad }: { identidad: Identidad }) {
  const { id = '' } = useParams();
  // Una sola espera: dos seguidas pierden el seguimiento de la consulta en vivo (documento 26, sección 10.7).
  const datos = useLiveQuery(() => Promise.all([consulta.animal.get(id), cargarConsolidado(id)]).then(([animal, c]) => ({ animal, c })), [id]);
  const [verDetalle, setVerDetalle] = useState(false);
  if (!datos) return <p className="texto-secundario">Cargando…</p>;
  const { animal, c } = datos;
  if (!animal || !c) {
    return (
      <div className="formulario">
        <p className="titulo-seccion">Consolidado económico</p>
        <p>Este animal no está en este teléfono.</p>
      </div>
    );
  }

  const rotulo = rotuloResultado(c);

  return (
    <div className="formulario consolidado">
      <Link className="enlace" to={`/animales/${animal.id}`}>
        ← Volver a la ficha
      </Link>
      <p className="titulo-seccion">Consolidado económico</p>
      <p className="evento__animal">
        Animal <strong className="registrado__chapeta">{animal.codigo_chapeta}</strong>
      </p>

      <section className="tarjeta">
        <h2>Invertido · {formatearPesos(c.totalInvertido)}</h2>
        {c.invertido.length === 0 ? (
          <p className="texto-secundario">Sin costos registrados.</p>
        ) : (
          <ul className="consolidado__lineas">
            {c.invertido.map((l) => (
              <li key={l.concepto}>
                <span>
                  {NOMBRE_INVERTIDO[l.concepto]} <span className="texto-secundario">({l.registros})</span>
                </span>
                <strong>{formatearPesos(l.total)}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta">
        <h2>Generado · {formatearPesos(c.totalGenerado)}</h2>
        {!c.leche && c.venta === null ? (
          <p className="texto-secundario">Sin ingresos registrados.</p>
        ) : (
          <ul className="consolidado__lineas">
            {c.leche && (
              <li>
                <span>
                  Leche: {formatearLitros(c.leche.litros)} litros a {formatearPesos(c.leche.precio)}
                </span>
                <strong>{formatearPesos(c.leche.total)}</strong>
              </li>
            )}
            {c.venta !== null && (
              <li>
                <span>Venta</span>
                <strong>{formatearPesos(c.venta)}</strong>
              </li>
            )}
          </ul>
        )}
      </section>

      {/* Sección 6: los avisos de CU-14 (2a, 3a, 4a, 4b) y de HU-16.4. */}
      <ul className="consolidado__avisos">
        {c.avisos.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <section className={`tarjeta consolidado__resultado consolidado__resultado--${rotulo.clase}`}>
        <p>
          {rotulo.texto}
          {rotulo.clase !== 'neutro' && (
            <>
              : <strong>{formatearPesos(Math.abs(c.resultado))}</strong>
            </>
          )}
        </p>
      </section>

      {c.detalle.length > 0 && (
        <button type="button" className="boton boton--secundario boton--ancho" aria-expanded={verDetalle} onClick={() => setVerDetalle((v) => !v)}>
          {verDetalle ? 'Ocultar el detalle' : 'Ver el detalle'}
        </button>
      )}
      {verDetalle && (
        <ul className="consolidado__detalle">
          {c.detalle.map((e, i) => (
            <li key={e.movimiento?.registro.id ?? `${e.concepto}-${e.fecha}-${i}`}>
              <div className="consolidado__fila">
                <span>
                  {formatearFecha(e.fecha)} · {e.concepto}
                  {e.movimiento?.registro.descripcion ? <span className="texto-secundario"> · {e.movimiento.registro.descripcion}</span> : null}
                </span>
                <strong className={e.clase === 'ingreso' ? 'consolidado__ingreso' : ''}>{formatearPesos(e.valor)}</strong>
              </div>
              {e.movimiento && (
                <>
                  <MarcaCorreccion entidad="movimiento_economico" vigente={e.movimiento} />
                  <EnlaceCorregir entidad="movimiento_economico" registro={e.movimiento.original} identidad={identidad} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link className="boton boton--secundario boton--ancho" to={`/animales/${animal.id}/costo`}>
        Registrar costo
      </Link>
    </div>
  );
}
