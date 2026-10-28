import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import type { Identidad } from '../../sesion/token';
import { cargarConflictos } from './conflictos';
import { TituloPantalla } from '../../ui/componentes/TituloPantalla';
import { Libreta } from '../../ui/componentes/Ilustraciones';

/**
 * Registros en conflicto de este teléfono: qué es cada uno, por qué y adónde ir para resolverlo (documento
 * técnico 26, sección 10.6). Se llega desde la barra inferior, con «Ver cuáles».
 */
export function PantallaConflictos({ identidad }: { identidad: Identidad }) {
  const conflictos = useLiveQuery(() => cargarConflictos(identidad), [identidad.usuario_id, identidad.perfil]);
  if (!conflictos) return <p className="texto-secundario">Cargando…</p>;

  return (
    <div className="listado">
      <Link className="enlace" to="/">
        ← Volver al inicio
      </Link>
      <TituloPantalla dibujo={<Libreta />}>Registros en conflicto</TituloPantalla>
      {conflictos.length === 0 ? (
        <p className="aviso aviso--correcto aviso--en-contenido">✓ No hay registros en conflicto en este teléfono.</p>
      ) : (
        <>
          <p className="texto-secundario">
            El servicio rechazó {conflictos.length === 1 ? 'este registro' : 'estos registros'}: no {conflictos.length === 1 ? 'llegó' : 'llegaron'} a los
            demás teléfonos. Se resuelven aquí, en el teléfono donde se registraron.
          </p>
          <ul className="conflictos">
            {conflictos.map((c) => (
              <li key={c.id} className="tarjeta conflictos__item">
                <h2>{c.titulo}</h2>
                <p className="campo__error">{c.causa}</p>
                {!c.puedeResolver && <p className="texto-secundario">Lo resuelve quien lo registró o el propietario.</p>}
                {c.destino && (
                  <Link className="boton boton--secundario boton--ancho" to={c.destino.a}>
                    {c.destino.texto}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
