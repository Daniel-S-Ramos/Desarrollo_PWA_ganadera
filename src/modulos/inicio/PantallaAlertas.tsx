import { useLiveQuery } from 'dexie-react-hooks';
import type { Identidad } from '../../sesion/token';
import { cargarRecordatorios } from '../recordatorios/recordatorios';
import { Recordatorios } from '../recordatorios/SeccionRecordatorios';
import { TituloPantalla } from '../../ui/componentes/TituloPantalla';
import { NavCampana } from '../../ui/componentes/Ilustraciones';

/** Alertas (pestaña de la barra inferior): todos los recordatorios, agrupados por tipo (documento técnico 30). */
export function PantallaAlertas({ identidad }: { identidad: Identidad }) {
  const grupos = useLiveQuery(() => cargarRecordatorios(), []);
  return (
    <>
      <TituloPantalla dibujo={<NavCampana activo />}>Alertas</TituloPantalla>
      {grupos === undefined ? (
        <p className="texto-secundario">Cargando…</p>
      ) : grupos.length === 0 ? (
        // CU-15, 1a: sin recordatorios.
        <p className="aviso aviso--correcto aviso--en-contenido">No hay recordatorios pendientes.</p>
      ) : (
        <Recordatorios identidad={identidad} />
      )}
    </>
  );
}
