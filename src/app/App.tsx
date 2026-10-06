import { useEffect, useState } from 'react';

type EstadoConexion = 'verificando' | 'conectado' | 'sin_red' | 'error';

/**
 * Estructura general de la aplicación: encabezado, contenido y barra inferior.
 * La barra inferior queda reservada para el contador de registros pendientes, que según
 * el apartado 3.10.4.5 debe estar siempre presente (se conecta en el paso 1.11).
 */
export function App() {
  const estado = useEstadoSupabase();

  return (
    <div className="marco">
      <header className="encabezado">
        <h1>Ganadería JR</h1>
      </header>

      <main className="contenido">
        <p className="titulo-seccion">Prototipo en construcción</p>
        <p className="texto-secundario">Fase 0 · Entorno listo</p>

        <section className={`tarjeta tarjeta--${estado === 'conectado' ? 'correcto' : estado === 'verificando' ? 'neutro' : 'aviso'}`}>
          <h2>Conexión con Supabase</h2>
          <p>{TEXTO_ESTADO[estado]}</p>
        </section>
      </main>

      <footer className="barra-inferior" aria-live="polite">
        Pendientes de enviar: —
      </footer>
    </div>
  );
}

const TEXTO_ESTADO: Record<EstadoConexion, string> = {
  verificando: 'Verificando…',
  conectado: '✓ Configurada y en línea',
  sin_red: '⚠ Sin conexión a internet. La aplicación seguirá funcionando sin red cuando esté terminada.',
  error: '⚠ Configurada, pero el servicio no respondió. Revise la URL y la clave en .env.local.',
};

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
