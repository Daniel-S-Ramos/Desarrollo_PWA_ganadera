import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { PantallaFicha } from '../modulos/consulta/PantallaFicha';
import { PantallaConflictos } from '../modulos/correcciones/PantallaConflictos';
import { PantallaCorreccionesRecientes } from '../modulos/correcciones/PantallaCorreccionesRecientes';
import { PantallaCorregir } from '../modulos/correcciones/PantallaCorregir';
import { PantallaListado } from '../modulos/consulta/PantallaListado';
import { PantallaRegistrarAnimal } from '../modulos/identificacion/PantallaRegistrarAnimal';
import { PantallaComparacion } from '../modulos/leche/PantallaComparacion';
import { PantallaProduccion } from '../modulos/leche/PantallaProduccion';
import { PantallaRondaOrdeno } from '../modulos/leche/PantallaRondaOrdeno';
import { PantallaRegistrarPesaje } from '../modulos/peso/PantallaRegistrarPesaje';
import { PantallaRegistrarParto } from '../modulos/reproduccion/PantallaRegistrarParto';
import { PantallaRegistrarSalida } from '../modulos/salida/PantallaRegistrarSalida';
import { PantallaConsolidado } from '../modulos/economia/PantallaConsolidado';
import { PantallaRegistrarCosto } from '../modulos/economia/PantallaRegistrarCosto';
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
import { RegistroEnEspera } from '../ui/componentes/PreparandoTelefono';
import { useCargaInicialCompleta } from '../ui/useEstadoMotor';
import { PantallaDefinirCodigo } from '../ui/pantallas/PantallaDefinirCodigo';
import { PantallaDesbloqueo } from '../ui/pantallas/PantallaDesbloqueo';
import { IconoPersona } from '../ui/componentes/Iconos';
import { NavegacionInferior } from '../ui/componentes/NavegacionInferior';
import { PantallaAlertas } from '../modulos/inicio/PantallaAlertas';
import { PantallaCuenta } from '../modulos/inicio/PantallaCuenta';
import { PantallaInicio } from '../modulos/inicio/PantallaInicio';
import { cargarRecordatorios } from '../modulos/recordatorios/recordatorios';
import { useLiveQuery } from 'dexie-react-hooks';
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
  const cargaCompleta = useCargaInicialCompleta();
  const enInicio = useLocation().pathname === '/';
  const abierta = !!identidad && cerradura === 'abierta';
  // El contador de Alertas en la barra inferior; la capa ui no lee los módulos.
  const pendientes = useLiveQuery(() => (abierta ? cargarRecordatorios().then((grupos) => grupos.reduce((n, g) => n + g.recordatorios.length, 0)) : Promise.resolve(0)), [abierta]) ?? 0;
  // El aviso de RNF-15 se da en el inicio de sesión y en el uso diario; no se repite en las pantallas del
  // código ni mientras se prepara el teléfono (pedido del autor, 2026-10-22).
  const conAvisoAlmacenamiento = identidad === null || (cerradura === 'abierta' && cargaCompleta !== false);

  return (
    <div className="marco">
      <header className="encabezado">
        <div>
          <h1>Ganadería JR</h1>
          {identidad && cerradura === 'abierta' && enInicio && <span className="encabezado__subtitulo">Panel principal</span>}
        </div>
        {identidad && cerradura === 'abierta' && (
          <span className="encabezado__usuario">
            <span>
              {identidad.nombre}
              <br />
              {identidad.perfil === 'propietario' ? 'Propietario' : 'Trabajador'}
            </span>
            <span className="encabezado__avatar" aria-hidden="true">
              <IconoPersona />
            </span>
          </span>
        )}
      </header>

      <main className="contenido">
        {conAvisoAlmacenamiento && <AvisoAlmacenamiento persistencia={almacenamiento.persistencia} />}

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

      <div className="pie-fijo">
        <BarraEstado espacio={almacenamiento.espacio} conSesion={abierta} />
        {abierta && identidad && <NavegacionInferior conAnimales={puedeUsar(identidad.perfil, 'CU-03')} pendientes={pendientes} />}
      </div>
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
            <Route path="/" element={<PantallaInicio identidad={identidad} alCerrar={alCerrar} cargaCompleta={cargaCompleta} />} />
            {/* Pestañas de la barra inferior (rediseño del 2026-10-22). */}
            <Route path="/alertas" element={<PantallaAlertas identidad={identidad} />} />
            <Route path="/cuenta" element={<PantallaCuenta identidad={identidad} alCerrar={alCerrar} />} />
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
            {/* Documento técnico 26: corregir o anular; los permisos de cada registro los decide la pantalla (RD-05). */}
            <Route path="/correccion/:entidad/:id" element={puedeUsar(identidad.perfil, 'CU-17') ? <PantallaCorregir identidad={identidad} /> : <Navigate to="/" replace />} />
            <Route
              path="/animales/:id/parto"
              element={
                !puedeUsar(identidad.perfil, 'CU-10') ? (
                  <Navigate to="/" replace />
                ) : cargaCompleta === false ? (
                  // Registra una cría: sin el inventario completo podría repetir un número (documento técnico 17).
                  <RegistroEnEspera titulo="Registrar parto" />
                ) : (
                  <PantallaRegistrarParto identidad={identidad} />
                )
              }
            />
            {/* Documento técnico 31: costos y consolidado económico, solo el propietario (CU-14, Tabla 27). */}
            <Route path="/animales/:id/costo" element={puedeUsar(identidad.perfil, 'CU-14') ? <PantallaRegistrarCosto identidad={identidad} /> : <Navigate to="/" replace />} />
            <Route path="/animales/:id/consolidado" element={puedeUsar(identidad.perfil, 'CU-14') ? <PantallaConsolidado identidad={identidad} /> : <Navigate to="/" replace />} />
            {/* Documento técnico 29: la salida del animal, solo el propietario (CU-13, Tabla 27). */}
            <Route
              path="/animales/:id/salida"
              element={puedeUsar(identidad.perfil, 'CU-13') ? <PantallaRegistrarSalida identidad={identidad} /> : <Navigate to="/" replace />}
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
            {/* Documento técnico 28: comparación entre vacas, solo el propietario (CU-07, pasos 5 y 6). */}
            <Route path="/produccion/comparar" element={puedeUsar(identidad.perfil, 'CU-07') ? <PantallaComparacion /> : <Navigate to="/" replace />} />
            {/* Documento técnico 27: solo el propietario (CU-18, Tabla 27). */}
            <Route path="/correcciones" element={puedeUsar(identidad.perfil, 'CU-18') ? <PantallaCorreccionesRecientes /> : <Navigate to="/" replace />} />
            {/* Documento técnico 26, sección 10.6: los conflictos de este teléfono, para ambos perfiles. */}
            <Route path="/conflictos" element={<PantallaConflictos identidad={identidad} />} />
            <Route path="/medicamentos" element={<PantallaMedicamentos identidad={identidad} puedeAgregar={puedeUsar(identidad.perfil, 'CU-04')} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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

