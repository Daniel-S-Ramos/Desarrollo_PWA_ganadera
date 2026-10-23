import type { Identidad } from '../../sesion/token';
import { ConfirmacionCierre } from '../../ui/componentes/ConfirmacionCierre';
import { IconoPersona } from '../../ui/componentes/Iconos';

/** La sesión abierta en este teléfono: quién y con qué perfil. */
export function TarjetaSesion({ identidad }: { identidad: Identidad }) {
  return (
    <section className="tarjeta tarjeta--correcto separado sesion">
      <span className="sesion__icono">
        <IconoPersona tamano={28} />
      </span>
      <div>
        <h2>Sesión</h2>
        <p>
          {identidad.nombre} · {identidad.perfil === 'propietario' ? 'Propietario' : 'Trabajador'}
        </p>
      </div>
    </section>
  );
}

/** Cuenta (pestaña de la barra inferior): la sesión y el cierre de sesión (documento técnico 12). */
export function PantallaCuenta({ identidad, alCerrar }: { identidad: Identidad; alCerrar: () => void }) {
  return (
    <>
      <p className="titulo-seccion">Cuenta</p>
      <TarjetaSesion identidad={identidad} />
      <ConfirmacionCierre alCerrar={alCerrar} />
    </>
  );
}
