import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router';
import { PantallaFicha } from '../modulos/consulta/PantallaFicha';
import { PantallaListado } from '../modulos/consulta/PantallaListado';
import { PantallaRegistrarAnimal } from '../modulos/identificacion/PantallaRegistrarAnimal';
import { PantallaProduccion } from '../modulos/leche/PantallaProduccion';
import { PantallaRondaOrdeno } from '../modulos/leche/PantallaRondaOrdeno';
import { PantallaRegistrarPesaje } from '../modulos/peso/PantallaRegistrarPesaje';
import { PantallaMedicamentos } from '../modulos/sanidad/PantallaMedicamentos';
import { PantallaRegistrarEvento } from '../modulos/sanidad/PantallaRegistrarEvento';
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
import { PreparandoTelefono, RegistroEnEspera } from '../ui/componentes/PreparandoTelefono';
import { useCargaInicialCompleta } from '../ui/useEstadoMotor';
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
          <RutasDelPredio identidad={identidad} alCerrar={salirAlIngreso} />
        )}
      </main>

      <AvisoActualizacion />

      <BarraEstado espacio={almacenamiento.espacio} conSesion={!!identidad && cerradura === 'abierta'} />
    </div>
  );
}

/**
 * Las pantallas del predio. Durante la carga inicial de un teléfono nuevo se consulta pero no se
 * registra (documento técnico 17, sección 2).
 */
function RutasDelPredio({ identidad, alCerrar }: { identidad: Identidad; alCerrar: () => void }) {
  const cargaCompleta = useCargaInicialCompleta();
  const puedeRegistrar = puedeUsar(identidad.perfil, 'CU-02') && cargaCompleta === true;
  return (
          <Routes>
            <Route path="/" element={<Inicio identidad={identidad} alCerrar={alCerrar} cargaCompleta={cargaCompleta} />} />
            <Route
              path="/animales/nuevo"
              element={
                !puedeUsar(identidad.perfil, 'CU-02') ? (
                  <Navigate to="/" replace />
                ) : cargaCompleta === false ? (
                  <RegistroEnEspera />
                ) : (
                  <PantallaRegistrarAnimal identidad={identidad} />
                )
              }
            />
            <Route
              path="/animales"
              element={puedeUsar(identidad.perfil, 'CU-03') ? <PantallaListado puedeRegistrar={puedeRegistrar} informacionIncompleta={cargaCompleta === false} /> : <Navigate to="/" replace />}
            />
            <Route
              path="/animales/:id"
              element={puedeUsar(identidad.perfil, 'CU-03') ? <PantallaFicha identidad={identidad} /> : <Navigate to="/" replace />}
            />
            <Route
              path="/animales/:id/evento-sanitario"
              element={puedeUsar(identidad.perfil, 'CU-04') ? <PantallaRegistrarEvento identidad={identidad} /> : <Navigate to="/" replace />}
            />
            <Route
              path="/animales/:id/pesaje"
              element={puedeUsar(identidad.perfil, 'CU-08') ? <PantallaRegistrarPesaje identidad={identidad} /> : <Navigate to="/" replace />}
            />
            <Route
              path="/ordeno"
              element={
                !puedeUsar(identidad.perfil, 'CU-06') ? (
                  <Navigate to="/" replace />
                ) : cargaCompleta === false ? (
                  // Documento técnico 22, sección 3: sin el historial, el promedio y el registro existente serían incompletos.
                  <RegistroEnEspera titulo="Ronda de ordeño" razon="Así se evita registrar dos veces la misma vaca." />
                ) : (
                  <PantallaRondaOrdeno identidad={identidad} />
                )
              }
            />
            {/* Documento técnico 23, sección 2: solo el propietario (CU-07). */}
            <Route path="/produccion" element={puedeUsar(identidad.perfil, 'CU-07') ? <PantallaProduccion /> : <Navigate to="/" replace />} />
            <Route path="/medicamentos" element={<PantallaMedicamentos identidad={identidad} puedeAgregar={puedeUsar(identidad.perfil, 'CU-04')} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
  );
}

/**
 * Pantalla de inicio. Los accesos se muestran solo a los perfiles que pueden usarlos (Tabla 27);
 * los recordatorios llegarán en la Iteración 5 (3.10.4.4).
 */
function Inicio({ identidad, alCerrar, cargaCompleta }: { identidad: Identidad; alCerrar: () => void; cargaCompleta: boolean | undefined }) {
  return (
    <>
      <p className="titulo-seccion">Prototipo en construcción</p>
      <p className="texto-secundario">Iteración 4 · Peso, partos y correcciones</p>

      {cargaCompleta === false && <PreparandoTelefono />}

      {puedeUsar(identidad.perfil, 'CU-03') && cargaCompleta !== false && (
        <Link className="boton boton--principal boton--ancho" to="/animales">
          Animales
        </Link>
      )}

      {puedeUsar(identidad.perfil, 'CU-02') && cargaCompleta === true && (
        <Link className="boton boton--secundario boton--ancho separado" to="/animales/nuevo">
          Registrar animal
        </Link>
      )}

      {puedeUsar(identidad.perfil, 'CU-06') && cargaCompleta === true && (
        <Link className="boton boton--secundario boton--ancho separado" to="/ordeno">
          Ronda de ordeño
        </Link>
      )}

      {puedeUsar(identidad.perfil, 'CU-07') && cargaCompleta !== false && (
        <Link className="boton boton--secundario boton--ancho separado" to="/produccion">
          Producción de leche
        </Link>
      )}

      {cargaCompleta !== false && (
        <Link className="boton boton--secundario boton--ancho separado" to="/medicamentos">
          Medicamentos
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
