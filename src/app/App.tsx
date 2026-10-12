import { useEffect, useState } from 'react';
import { formatearBytes } from '../datos/almacenamiento';
import { crearServicioRemoto } from '../servicios/servicioRemotoSupabase';
import { supabase } from '../servicios/supabase';
import { iniciarSincronizacionAutomatica, type ResultadoSincronizacion } from '../sync/motor';
import { AvisoActualizacion } from '../ui/componentes/AvisoActualizacion';
import { cerrarSesion, escucharRenovaciones } from '../sesion/autenticacion';
import { hayCodigoDefinido } from '../sesion/desbloqueo';
import { restaurarSesionLocal } from '../sesion/sesionLocal';
import type { Identidad } from '../sesion/token';
import { AvisoAlmacenamiento } from '../ui/componentes/AvisoAlmacenamiento';
import { PantallaDefinirCodigo } from '../ui/pantallas/PantallaDefinirCodigo';
import { PantallaDesbloqueo } from '../ui/pantallas/PantallaDesbloqueo';
import { PantallaInicioSesion } from '../ui/pantallas/PantallaInicioSesion';
import { useAlmacenamiento } from '../ui/useAlmacenamiento';

type EstadoConexion = 'verificando' | 'conectado' | 'sin_red' | 'error';

/**
 * Estructura general de la aplicación: encabezado, contenido y barra inferior.
 * La barra inferior queda reservada para el contador de registros pendientes, que según
 * el apartado 3.10.4.5 debe estar siempre presente (se conecta en el paso 1.11).
 */
export function App() {
  const estado = useEstadoSupabase();
  const almacenamiento = useAlmacenamiento();
  const { identidad, cerradura, ingresar, desbloquear, salirAlIngreso } = useSesion();
  const [avisoIngreso, setAvisoIngreso] = useState<string | null>(null);
  const sincronizacion = useSincronizacion(cerradura === 'abierta');
  const [avisoCierre, setAvisoCierre] = useState<string | null>(null);

  async function salir() {
    const resultado = await cerrarSesion();
    if (resultado.ok) salirAlIngreso();
    else setAvisoCierre(`Hay ${resultado.pendientes} registros sin enviar. Sincronice antes de cerrar la sesión.`);
  }

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
          <>
            <p className="titulo-seccion">Prototipo en construcción</p>
            <p className="texto-secundario">Iteración 1 · Fundación técnica</p>

            <section className="tarjeta">
              <h2>Sincronización</h2>
              <p>{textoSincronizacion(sincronizacion)}</p>
            </section>

            <section className="tarjeta tarjeta--correcto">
              <h2>Sesión</h2>
              <p>
                {identidad.nombre} · {identidad.perfil === 'propietario' ? 'Propietario' : 'Trabajador'}
              </p>
            </section>
          </>
        )}

        <section className={`tarjeta tarjeta--${estado === 'conectado' ? 'correcto' : estado === 'verificando' ? 'neutro' : 'aviso'}`}>
          <h2>Conexión con Supabase</h2>
          <p>{TEXTO_ESTADO[estado]}</p>
        </section>

        {identidad && cerradura === 'abierta' && (
          <>
            {avisoCierre && (
              <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
                <p>⚠ {avisoCierre}</p>
              </div>
            )}
            <button className="boton boton--secundario boton--ancho separado" onClick={() => void salir()}>
              Cerrar sesión
            </button>
          </>
        )}
      </main>

      <AvisoActualizacion />

      <footer className="barra-inferior" aria-live="polite">
        Pendientes de enviar: —
        {almacenamiento.espacio && (
          <span className="barra-inferior__detalle">
            Espacio usado (estimado): {formatearBytes(almacenamiento.espacio.usado)} de{' '}
            {formatearBytes(almacenamiento.espacio.cuota)}
          </span>
        )}
      </footer>
    </div>
  );
}

const TEXTO_ESTADO: Record<EstadoConexion, string> = {
  verificando: 'Verificando…',
  conectado: '✓ Configurada y en línea',
  sin_red: '⚠ Sin conexión a internet. La aplicación sigue funcionando desde este dispositivo.',
  error: '⚠ Configurada, pero el servicio no respondió. Revise la URL y la clave en .env.local.',
};

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
 * (docs/tecnica/09-sincronizacion-subida.md, sección 2). El indicador definitivo se construye en el
 * paso 1.11; por ahora se muestra el resultado de la última sincronización.
 */
function useSincronizacion(activa: boolean): ResultadoSincronizacion | null {
  const [ultima, setUltima] = useState<ResultadoSincronizacion | null>(null);
  useEffect(() => {
    if (!activa) return;
    return iniciarSincronizacionAutomatica(crearServicioRemoto(supabase), (resultado) => {
      if (resultado.estado !== 'omitida') setUltima(resultado);
    });
  }, [activa]);
  return ultima;
}

function textoSincronizacion(resultado: ResultadoSincronizacion | null): string {
  if (!resultado) return 'Pendiente de la primera sincronización…';
  switch (resultado.estado) {
    case 'completa':
      return `Al día · ${resultado.subida.enviadas} enviados · ${resultado.bajada.filas} recibidos`;
    case 'sin_red':
      return 'Sin conexión: lo registrado se enviará cuando vuelva la señal.';
    case 'sesion_vencida':
      return 'La sesión con el servicio venció. Ingrese de nuevo con conexión para enviar lo pendiente.';
    case 'error_bajada':
      return `Enviado, pero no se pudo descargar: ${resultado.mensaje}`;
    case 'omitida':
      return '';
  }
}

/** Consulta la configuración pública del servicio de autenticación para confirmar la conexión. */
function useEstadoSupabase(): EstadoConexion {
  const [estado, setEstado] = useState<EstadoConexion>('verificando');

  useEffect(() => {
    if (!navigator.onLine) {
      setEstado('sin_red');
      return;
    }
    const controlador = new AbortController();
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      signal: controlador.signal,
    })
      .then((respuesta) => setEstado(respuesta.ok ? 'conectado' : 'error'))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setEstado(navigator.onLine ? 'error' : 'sin_red');
      });
    return () => controlador.abort();
  }, []);

  return estado;
}
