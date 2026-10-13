import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router';
import { PantallaFicha } from '../modulos/consulta/PantallaFicha';
import { PantallaListado } from '../modulos/consulta/PantallaListado';
import { PantallaRegistrarAnimal } from '../modulos/identificacion/PantallaRegistrarAnimal';
import { puedeUsar } from '../sesion/permisos';
import { crearServicioRemoto } from '../servicios/servicioRemotoSupabase';
import { supabase } from '../servicios/supabase';
import { iniciarSincronizacionAutomatica } from '../sync/motor';
import { AvisoActualizacion } from '../ui/componentes/AvisoActualizacion';
import { escucharRenovaciones } from '../sesion/autenticacion';
import { hayCodigoDefinido } from '../sesion/desbloqueo';
import { restaurarSesionLocal } from '../sesion/sesionLocal';
import type { Identidad } from '../sesion/token';
import { AvisoAlmacenamiento } from '../ui/componentes/AvisoAlmacenamiento';
import { BarraEstado } from '../ui/componentes/BarraEstado';
import { ConfirmacionCierre } from '../ui/componentes/ConfirmacionCierre';
import { PantallaDefinirCodigo } from '../ui/pantallas/PantallaDefinirCodigo';
import { PantallaDesbloqueo } from '../ui/pantallas/PantallaDesbloqueo';
import { PantallaInicioSesion } from '../ui/pantallas/PantallaInicioSesion';
import { useAlmacenamiento } from '../ui/useAlmacenamiento';

/**
 * Estructura general de la aplicación: encabezado, contenido y barra inferior. La barra inferior,
 * siempre presente, muestra el estado de la sincronización (apartado 3.10.4.5, documento técnico 11).
 */
export function App() {
  const almacenamiento = useAlmacenamiento();
  const { identidad, cerradura, ingresar, desbloquear, salirAlIngreso } = useSesion();
  const [avisoIngreso, setAvisoIngreso] = useState<string | null>(null);
  useSincronizacionAutomatica(cerradura === 'abierta');

  return (
    <div className="marco">
      <header className="encabezado">
        <h1>Ganadería JR</h1>
        {identidad && cerradura === 'abierta' && (
          <span className="encabezado__usuario">
            {identidad.nombre}
            <br />
            {identidad.perfil === 'propietario' ? 'Propietario' : 'Trabajador'}
          </span>
        )}
      </header>

      <main className="contenido">
        <AvisoAlmacenamiento persistencia={almacenamiento.persistencia} />

        {identidad === undefined && <p className="texto-secundario">Cargando…</p>}

        {identidad === null && (
          <>
            {avisoIngreso && (
              <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
                <p>⚠ {avisoIngreso}</p>
              </div>
            )}
            <PantallaInicioSesion
              alIngresar={(nueva) => {
                setAvisoIngreso(null);
                ingresar(nueva);
              }}
            />
          </>
        )}

        {identidad && cerradura === 'definir' && <PantallaDefinirCodigo alDefinir={desbloquear} />}

        {identidad && cerradura === 'bloqueada' && (
          <PantallaDesbloqueo
            identidad={identidad}
            alDesbloquear={desbloquear}
            alSalir={(motivo) => {
              setAvisoIngreso(
                motivo === 'bloqueo'
                  ? 'Se superaron los 5 intentos del código. Ingrese con su correo y contraseña.'
                  : 'Ingrese con su correo y contraseña para definir un código nuevo.',
              );
              salirAlIngreso();
            }}
          />
        )}

        {identidad && cerradura === 'abierta' && (
          <Routes>
            <Route path="/" element={<Inicio identidad={identidad} alCerrar={salirAlIngreso} />} />
            <Route
              path="/animales/nuevo"
              element={puedeUsar(identidad.perfil, 'CU-02') ? <PantallaRegistrarAnimal identidad={identidad} /> : <Navigate to="/" replace />}
            />
            <Route
              path="/animales"
              element={puedeUsar(identidad.perfil, 'CU-03') ? <PantallaListado puedeRegistrar={puedeUsar(identidad.perfil, 'CU-02')} /> : <Navigate to="/" replace />}
            />
            <Route
              path="/animales/:id"
              element={puedeUsar(identidad.perfil, 'CU-03') ? <PantallaFicha identidad={identidad} /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>

      <AvisoActualizacion />

      <BarraEstado espacio={almacenamiento.espacio} conSesion={!!identidad && cerradura === 'abierta'} />
    </div>
  );
}

/**
 * Pantalla de inicio. Los accesos se muestran solo a los perfiles que pueden usarlos (Tabla 27);
 * los recordatorios llegarán en la Iteración 5 (3.10.4.4).
 */
function Inicio({ identidad, alCerrar }: { identidad: Identidad; alCerrar: () => void }) {
  return (
    <>
      <p className="titulo-seccion">Prototipo en construcción</p>
      <p className="texto-secundario">Iteración 2 · Identificación animal y ficha</p>

      {puedeUsar(identidad.perfil, 'CU-03') && (
        <Link className="boton boton--principal boton--ancho" to="/animales">
          Animales
        </Link>
      )}

      {puedeUsar(identidad.perfil, 'CU-02') && (
        <Link className="boton boton--secundario boton--ancho separado" to="/animales/nuevo">
          Registrar animal
        </Link>
      )}

      <section className="tarjeta tarjeta--correcto separado">
        <h2>Sesión</h2>
        <p>
          {identidad.nombre} · {identidad.perfil === 'propietario' ? 'Propietario' : 'Trabajador'}
        </p>
      </section>

      <ConfirmacionCierre alCerrar={alCerrar} />
    </>
  );
}

/** Estado de la cerradura del dispositivo (documento técnico 07, sección 3). */
type Cerradura = 'definir' | 'bloqueada' | 'abierta';

/**
 * Sesión del usuario y cerradura del dispositivo.
 * identidad: undefined mientras se consulta la sesión local al abrir; null si hay que iniciar sesión.
 * La sesión local se verifica sin red (documento técnico 06, sección 6.2); al abrir la aplicación,
 * siempre empieza bloqueada y pide el código (documento técnico 07, sección 3.2).
 */
function useSesion() {
  const [identidad, setIdentidad] = useState<Identidad | null | undefined>(undefined);
  const [cerradura, setCerradura] = useState<Cerradura>('bloqueada');

  useEffect(() => {
    let vigente = true;
    void (async () => {
      const restaurada = await restaurarSesionLocal();
      const conCodigo = restaurada ? await hayCodigoDefinido() : false;
      if (!vigente) return;
      setCerradura(conCodigo ? 'bloqueada' : 'definir');
      setIdentidad(restaurada);
    })();
    // La renovación del token actualiza la identidad, pero nunca abre la cerradura.
    const dejarDeEscuchar = escucharRenovaciones((renovada) => setIdentidad((actual) => (actual ? renovada : actual)));
    return () => {
      vigente = false;
      dejarDeEscuchar();
    };
  }, []);

  return {
    identidad,
    cerradura,
    /** Tras un ingreso con credenciales siempre se define un código nuevo. */
    ingresar: (nueva: Identidad) => {
      setCerradura('definir');
      setIdentidad(nueva);
    },
    desbloquear: () => setCerradura('abierta'),
    salirAlIngreso: () => {
      setCerradura('bloqueada');
      setIdentidad(null);
    },
  };
}

/**
 * Sincronización automática mientras la aplicación está abierta y desbloqueada
 * (docs/tecnica/09-sincronizacion-subida.md, sección 2). El estado lo muestra la barra inferior.
 */
function useSincronizacionAutomatica(activa: boolean): void {
  useEffect(() => {
    if (!activa) return;
    return iniciarSincronizacionAutomatica(crearServicioRemoto(supabase));
  }, [activa]);
}
