import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Uuid } from '../../dominio/tipos';
import { DistintivoSync } from '../../ui/componentes/DistintivoSync';
import { cargarCorreccionesRecientes, POR_PAGINA, type EntradaCorreccion } from './consultaCorrecciones';

/**
 * Correcciones recientes, solo para el propietario (CU-18, RF-32, HU-17.5). Especificación:
 * docs/tecnica/27-consulta-de-correcciones.md
 */
export function PantallaCorreccionesRecientes() {
  const [autor, setAutor] = useState<Uuid | null>(null);
  const [cantidad, setCantidad] = useState(POR_PAGINA);
  const consultaActual = useLiveQuery(() => cargarCorreccionesRecientes(autor, cantidad), [autor, cantidad]);

  if (!consultaActual) return <p className="texto-secundario">Cargando…</p>;
  const { grupos, hayMas, autores, totalDelPredio } = consultaActual;

  return (
    <div className="listado">
      <Link className="enlace" to="/">
        ← Volver al inicio
      </Link>
      <p className="titulo-seccion">Correcciones recientes</p>

      {totalDelPredio === 0 ? (
        <p>Todavía no hay correcciones ni anulaciones en el predio.</p>
      ) : (
        <>
          <label className="campo">
            <span>Quién</span>
            <select
              value={autor ?? ''}
              onChange={(e) => {
                setAutor(e.target.value === '' ? null : e.target.value);
                setCantidad(POR_PAGINA);
              }}
            >
              <option value="">Todos</option>
              {autores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>

          {grupos.length === 0 && <p>Este usuario no ha hecho correcciones ni anulaciones.</p>}

          {grupos.map((g) => (
            <section key={g.dia} className="tarjeta">
              <h2>{g.etiqueta}</h2>
              <ul className="correcciones">
                {g.entradas.map((e) => (
                  <li key={e.id} className="correcciones__item">
                    <Entrada entrada={e} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {hayMas && (
            <button type="button" className="boton boton--secundario boton--ancho" onClick={() => setCantidad((c) => c + POR_PAGINA)}>
              Ver más
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Entrada({ entrada: e }: { entrada: EntradaCorreccion }) {
  const contenido = (
    <>
      <span className="correcciones__titulo">{e.titulo}</span>
      <span className={e.anulacion ? 'correcciones__cambio correcciones__cambio--anulado' : 'correcciones__cambio'}>{e.cambio}</span>
      <span className="texto-secundario">{e.motivo}</span>
      <span className="texto-secundario">
        {e.autor} · {e.cuando}
      </span>
      <DistintivoSync estado={e.estado_sync} />
    </>
  );
  // CU-18, paso 4: tocar abre el registro. Sin registro en el teléfono, no hay adónde ir.
  return e.destino ? (
    <Link className="correcciones__enlace" to={e.destino}>
      {contenido}
    </Link>
  ) : (
    <div className="correcciones__enlace">{contenido}</div>
  );
}
