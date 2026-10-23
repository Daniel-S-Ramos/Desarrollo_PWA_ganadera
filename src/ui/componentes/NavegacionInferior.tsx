import { NavLink } from 'react-router';
import { IconoCampana, IconoCasa, IconoPersona, IconoVaca } from './Iconos';

/**
 * Barra de navegación inferior, en todas las pantallas con la sesión abierta: Inicio, Animales, Alertas y
 * Cuenta. Cada pestaña mide 64 px de alto (3.10.4.2) y la activa se resalta. Alertas muestra cuántos
 * recordatorios hay pendientes.
 */
export function NavegacionInferior({ conAnimales, pendientes }: { conAnimales: boolean; pendientes: number }) {
  const clase = ({ isActive }: { isActive: boolean }) => (isActive ? 'navegacion__pestana navegacion__pestana--activa' : 'navegacion__pestana');
  return (
    <nav className="navegacion" aria-label="Navegación principal">
      <NavLink to="/" end className={clase}>
        <IconoCasa />
        <span>Inicio</span>
      </NavLink>
      {conAnimales && (
        <NavLink to="/animales" className={clase}>
          <IconoVaca />
          <span>Animales</span>
        </NavLink>
      )}
      <NavLink to="/alertas" className={clase}>
        <span className="navegacion__icono">
          <IconoCampana />
          {pendientes > 0 && (
            <span className="navegacion__contador" aria-label={pendientes === 1 ? '1 pendiente' : `${pendientes} pendientes`}>
              {pendientes > 99 ? '99+' : pendientes}
            </span>
          )}
        </span>
        <span>Alertas</span>
      </NavLink>
      <NavLink to="/cuenta" className={clase}>
        <IconoPersona />
        <span>Cuenta</span>
      </NavLink>
    </nav>
  );
}
