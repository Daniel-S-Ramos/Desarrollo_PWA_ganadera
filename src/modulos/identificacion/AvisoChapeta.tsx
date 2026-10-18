import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { fechaDelPredio, formatearFecha, formatearInstante } from '../../dominio/fechas';
import type { Uuid } from '../../dominio/tipos';
import type { Identidad } from '../../sesion/token';
import { cargarTernerosSinChapeta, confirmarChapetaPuesta, errorDeFechaColocacion, estadoDeChapeta, type TerneroSinChapeta } from './chapetaPendiente';

function describirPlazo(t: Pick<TerneroSinChapeta, 'dias' | 'quedan' | 'vencido'>): string {
  if (t.dias === null) return 'sin fecha de nacimiento';
  const nacio = t.dias === 0 ? 'nació hoy' : t.dias === 1 ? 'nació hace 1 día' : `nació hace ${t.dias} días`;
  if (t.vencido) return `${nacio} · plazo vencido hace ${-t.quedan!} ${-t.quedan! === 1 ? 'día' : 'días'}`;
  return `${nacio} · ${t.quedan === 1 ? 'queda 1 día' : `quedan ${t.quedan} días`} del plazo`;
}

/**
 * La chapeta en la ficha: pendiente, con el botón para confirmarla, o puesta, con su autor (documento
 * técnico 25, sección 7.2). Ambos perfiles.
 */
export function AvisoChapeta({ animalId, numero, nacimiento, identidad }: { animalId: Uuid; numero: string; nacimiento: string | null; identidad: Identidad }) {
  const [hoy] = useState(() => fechaDelPredio());
  const estado = useLiveQuery(() => estadoDeChapeta(animalId, hoy), [animalId, hoy]);
  const [confirmando, setConfirmando] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!estado || estado.estado === 'no_aplica') return null;
  if (estado.estado === 'puesta') {
    return (
      <p className="texto-secundario">
        Chapeta puesta el {formatearFecha(estado.colocacion.fecha)} por {estado.autor} · registrado el {formatearInstante(estado.colocacion.creado_en)}
      </p>
    );
  }

  async function guardar() {
    const invalida = errorDeFechaColocacion(fecha, nacimiento, hoy);
    if (invalida) return setError(invalida);
    setGuardando(true);
    try {
      const r = await confirmarChapetaPuesta(animalId, fecha, identidad, hoy);
      if (!r.ok) setError(r.error);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="aviso aviso--atencion aviso--en-contenido" role="status">
      <p>
        ⚠ Chapeta pendiente de poner · número {numero}
      </p>
      <p className="aviso__detalle">{describirPlazo(estado)}</p>
      {confirmando ? (
        // No es un <form>: la ficha no lo es, pero así puede usarse dentro de otro sin recargar (PE-25).
        <div className="formulario" role="group" aria-label="Confirmar la chapeta puesta">
          <label className="campo">
            <span>¿Qué día se le puso?</span>
            <input
              type="date"
              max={hoy}
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setError(null);
              }}
            />
            {error && <span className="campo__error">{error}</span>}
          </label>
          <div className="aviso__acciones">
            <button type="button" className="boton boton--principal" disabled={guardando} onClick={() => void guardar()}>
              {guardando ? 'Guardando…' : 'Confirmar'}
            </button>
            <button type="button" className="boton boton--secundario" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="boton boton--principal boton--ancho" onClick={() => setConfirmando(true)}>
          Ya tiene la chapeta puesta
        </button>
      )}
    </div>
  );
}

/** El recordatorio de Inicio: los terneros sin chapeta puesta, los vencidos primero (sección 7.3). */
export function TernerosSinChapeta() {
  const terneros = useLiveQuery(() => cargarTernerosSinChapeta(), []);
  if (!terneros || terneros.length === 0) return null;
  return (
    <section className="tarjeta separado">
      <h2>Terneros sin chapeta puesta</h2>
      <ul className="ronda__lista">
        {terneros.map((t) => (
          <li key={t.id}>
            <Link className={`ternero${t.vencido ? ' ternero--vencido' : ''}`} to={`/animales/${t.id}`}>
              <span className="ronda__chapeta">{t.codigo_chapeta}</span>
              <span>{describirPlazo(t)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
