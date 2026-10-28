import { useLiveQuery } from 'dexie-react-hooks';
import type { Identidad } from '../../sesion/token';
import { cargarRecordatorios } from '../recordatorios/recordatorios';
import { Recordatorios } from '../recordatorios/SeccionRecordatorios';
import { TituloPantalla } from '../../ui/componentes/TituloPantalla';
import { NavCampana } from '../../ui/componentes/Ilustraciones';

/**
 * Alertas (pestaña de la barra inferior): todos los recordatorios, agrupados por tipo (documento técnico 30).
 * Mientras llega la carga inicial no se derivan: con los datos a medias saldrían recordatorios falsos, como una
 * vaca «sin ordeño» cuyos ordeños aún no han llegado (hallazgo del caso CP-01).
 */
export function PantallaAlertas({ identidad, cargaCompleta }: { identidad: Identidad; cargaCompleta: boolean | undefined }) {
  const grupos = useLiveQuery(() => (cargaCompleta === true ? cargarRecordatorios() : Promise.resolve(undefined)), [cargaCompleta]);
  return (
    <>
      <TituloPantalla dibujo={<NavCampana activo />}>Alertas</TituloPantalla>
      {cargaCompleta === false ? (
        <p className="aviso aviso--atencion aviso--en-contenido">Los recordatorios aparecerán cuando termine de prepararse este teléfono.</p>
      ) : grupos === undefined ? (
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
