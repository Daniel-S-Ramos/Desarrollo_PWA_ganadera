import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import type { TipoRecordatorio } from '../../dominio/tipos';
import { puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { cargarRecordatorios, destinoRecordatorio, PLAZOS_POSPONER, posponerRecordatorio, textoRecordatorio, type GrupoRecordatorios, type Recordatorio } from './recordatorios';

/** Cuántos se muestran por grupo antes de «Ver todos» (sección 6). */
const POR_GRUPO = 5;

/**
 * Los recordatorios de Inicio (CU-15, RF-22, RF-23, HU-14), para ambos perfiles; solo el propietario pospone.
 * Especificación: docs/tecnica/30-recordatorios.md. Sin recordatorios no se muestra nada (CU-15, 1a).
 */
export function Recordatorios({ identidad }: { identidad: Identidad }) {
  const grupos = useLiveQuery(() => cargarRecordatorios(), []);
  if (!grupos || grupos.length === 0) return null;
  const puedePosponer = puedeCrear(identidad.perfil, 'recordatorio');
  return (
    <section className="tarjeta separado recordatorios" aria-label="Recordatorios">
      <h2>Recordatorios</h2>
      {grupos.map((g) => (
        <Grupo key={g.tipo} grupo={g} puedePosponer={puedePosponer} identidad={identidad} />
      ))}
    </section>
  );
}

function Grupo({ grupo, puedePosponer, identidad }: { grupo: GrupoRecordatorios; puedePosponer: boolean; identidad: Identidad }) {
  const [todos, setTodos] = useState(false);
  const visibles = todos ? grupo.recordatorios : grupo.recordatorios.slice(0, POR_GRUPO);
  return (
    <div className="recordatorios__grupo">
      <h3>
        {grupo.titulo} · {grupo.recordatorios.length}
      </h3>
      <ul className="recordatorios__lista">
        {visibles.map((r) => (
          <Item key={`${r.tipo}-${r.animal_id ?? 'telefono'}`} r={r} puedePosponer={puedePosponer && r.posponible} identidad={identidad} />
        ))}
      </ul>
      {grupo.recordatorios.length > POR_GRUPO && (
        <button type="button" className="enlace" onClick={() => setTodos((t) => !t)}>
          {todos ? 'Ver menos' : `Ver todos (${grupo.recordatorios.length})`}
        </button>
      )}
    </div>
  );
}

function Item({ r, puedePosponer, identidad }: { r: Recordatorio; puedePosponer: boolean; identidad: Identidad }) {
  const [posponiendo, setPosponiendo] = useState(false);
  const destino = destinoRecordatorio(r);
  const vencido = r.tipo === 'chapeta_pendiente' && r.chapeta?.vencido;
  const contenido = (
    <>
      {r.codigo_chapeta && <span className="ronda__chapeta">{r.codigo_chapeta}</span>}
      <span>{textoRecordatorio(r)}</span>
    </>
  );
  return (
    <li className={vencido ? 'recordatorio recordatorio--vencido' : 'recordatorio'}>
      {/* CU-15, paso 5: el acceso directo al registro que lo resolvería. */}
      {destino ? (
        <Link className="recordatorio__enlace" to={destino}>
          {contenido}
        </Link>
      ) : (
        <div className="recordatorio__enlace">{contenido}</div>
      )}
      {puedePosponer &&
        (posponiendo ? (
          <div className="recordatorio__posponer" role="group" aria-label="Posponer por">
            {PLAZOS_POSPONER.map((dias) => (
              <button
                key={dias}
                type="button"
                className="boton boton--secundario"
                onClick={() => void posponerRecordatorio(r.tipo as TipoRecordatorio, r.animal_id, dias, identidad)}
              >
                {dias === 1 ? '1 día' : `${dias} días`}
              </button>
            ))}
            <button type="button" className="enlace" onClick={() => setPosponiendo(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" className="enlace recordatorio__boton" onClick={() => setPosponiendo(true)}>
            Posponer
          </button>
        ))}
    </li>
  );
}
