import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { NavCampana, NavCasa, NavPersona, NavVaca } from './Ilustraciones';

/**
 * Barra de navegación inferior, en todas las pantallas con la sesión abierta: Inicio, Animales, Alertas y
 * Cuenta. Cada pestaña mide al menos 64 px de alto (3.10.4.2), con su ilustración y su nombre; la activa se
 * resalta en verde. Alertas muestra cuántos recordatorios hay pendientes.
 */
export function NavegacionInferior({ conAnimales, pendientes }: { conAnimales: boolean; pendientes: number }) {
  return (
    <nav className="navegacion" aria-label="Navegación principal">
      <Pestana a="/" fin nombre="Inicio" dibujo={(activo) => <NavCasa activo={activo} />} />
      {conAnimales && <Pestana a="/animales" nombre="Animales" dibujo={(activo) => <NavVaca activo={activo} />} />}
      <Pestana
        a="/alertas"
        nombre="Alertas"
        dibujo={(activo) => (
          <span className="navegacion__icono">
            <NavCampana activo={activo} />
            {pendientes > 0 && (
              <span className="navegacion__contador" aria-label={pendientes === 1 ? '1 pendiente' : `${pendientes} pendientes`}>
                {pendientes > 99 ? '99+' : pendientes}
              </span>
            )}
          </span>
        )}
      />
      <Pestana a="/cuenta" nombre="Cuenta" dibujo={(activo) => <NavPersona activo={activo} />} />
    </nav>
  );
}

function Pestana({ a, fin = false, nombre, dibujo }: { a: string; fin?: boolean; nombre: string; dibujo: (activo: boolean) => ReactNode }) {
  return (
    <NavLink to={a} end={fin} className={({ isActive }) => (isActive ? 'navegacion__pestana navegacion__pestana--activa' : 'navegacion__pestana')}>
      {({ isActive }) => (
        <>
          {dibujo(isActive)}
          <span>{nombre}</span>
        </>
      )}
    </NavLink>
  );
}
