import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import type { TipoRecordatorio } from '../../dominio/tipos';
import { puedeCrear } from '../../sesion/permisos';
import type { Identidad } from '../../sesion/token';
import { IconoAdvertencia } from '../../ui/componentes/Iconos';
import { cargarRecordatorios, destinoRecordatorio, PLAZOS_POSPONER, posponerRecordatorio, textoRecordatorio, type GrupoRecordatorios, type Recordatorio } from './recordatorios';

/** Cuántos se muestran por grupo antes de «Ver todos» (sección 6). */
const POR_GRUPO = 5;

/**
 * Los recordatorios (CU-15, RF-22, RF-23, HU-14), para ambos perfiles; solo el propietario pospone.
 * Especificación: docs/tecnica/30-recordatorios.md. Sin recordatorios no se muestra nada (CU-15, 1a).
 *
 * En el inicio se muestran los primeros (`limite`) con «Ver todos», que lleva a Alertas; en Alertas, todos,
 * agrupados por tipo (rediseño del 2026-10-22).
 */
export function Recordatorios({ identidad, limite }: { identidad: Identidad; limite?: number }) {
  const grupos = useLiveQuery(() => cargarRecordatorios(), []);
  if (!grupos || grupos.length === 0) return null;
  const puedePosponer = puedeCrear(identidad.perfil, 'recordatorio');
  const total = grupos.reduce((n, g) => n + g.recordatorios.length, 0);

  if (limite !== undefined) {
    const primeros = grupos.flatMap((g) => g.recordatorios.map((r) => ({ r, titulo: g.titulo }))).slice(0, limite);
    return (
      <section className="recordatorios" aria-label="Recordatorios">
        <div className="seccion-cabeza">
          <h2>Recordatorios</h2>
          <span className="seccion-cabeza__dato">{total === 1 ? '1 pendiente' : `${total} pendientes`}</span>
        </div>
        <ul className="recordatorios__lista">
          {primeros.map(({ r, titulo }) => (
            <Item key={`${r.tipo}-${r.animal_id ?? 'telefono'}`} r={r} titulo={titulo} puedePosponer={puedePosponer && r.posponible} identidad={identidad} />
          ))}
        </ul>
        {total > limite && (
          <Link className="boton boton--secundario boton--ancho separado" to="/alertas">
            Ver todos los recordatorios ({total})
          </Link>
        )}
      </section>
    );
  }

  return (
    <section className="recordatorios" aria-label="Recordatorios">
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
          <Item key={`${r.tipo}-${r.animal_id ?? 'telefono'}`} r={r} titulo={grupo.titulo} puedePosponer={puedePosponer && r.posponible} identidad={identidad} />
        ))}
      </ul>
      {grupo.recordatorios.length > POR_GRUPO && (
        <button type="button" className="boton boton--secundario boton--ancho separado" onClick={() => setTodos((t) => !t)}>
          {todos ? 'Ver menos' : `Ver todos (${grupo.recordatorios.length})`}
        </button>
      )}
    </div>
  );
}

/** El texto del botón que lleva al registro que resolvería el recordatorio (CU-15, paso 5). */
function textoAccion(r: Recordatorio): string {
  switch (r.tipo) {
    case 'sin_pesaje_reciente':
      return 'Registrar pesaje';
    case 'sin_registro_ordeno':
      return 'Ir a la ronda';
    case 'produccion_bajo_promedio':
      return 'Ver producción';
    default:
      return 'Ver animal';
  }
}

function Item({ r, titulo, puedePosponer, identidad }: { r: Recordatorio; titulo: string; puedePosponer: boolean; identidad: Identidad }) {
  const [posponiendo, setPosponiendo] = useState(false);
  const destino = destinoRecordatorio(r);
  const vencido = r.tipo === 'chapeta_pendiente' && r.chapeta?.vencido;
  return (
    <li className={vencido ? 'recordatorio recordatorio--vencido' : 'recordatorio'}>
      <div className="recordatorio__cabeza">
        <span className="recordatorio__icono">
          <IconoAdvertencia />
        </span>
        <div>
          <p className="recordatorio__titulo">{r.codigo_chapeta ? `${r.codigo_chapeta} · ${titulo}` : titulo}</p>
          <p className="recordatorio__detalle">{textoRecordatorio(r)}</p>
        </div>
      </div>

      {posponiendo ? (
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
          <button type="button" className="boton boton--secundario" onClick={() => setPosponiendo(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        (puedePosponer || destino) && (
          <div className="recordatorio__acciones">
            {puedePosponer && (
              <button type="button" className="boton boton--secundario" onClick={() => setPosponiendo(true)}>
                Posponer
              </button>
            )}
            {/* CU-15, paso 5: el acceso directo al registro que lo resolvería. */}
            {destino && (
              <Link className="boton boton--principal" to={destino}>
                {textoAccion(r)}
              </Link>
            )}
          </div>
        )
      )}
    </li>
  );
}
