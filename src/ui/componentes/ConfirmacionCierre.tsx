import { useState } from 'react';
import { cerrarSesionServicio } from '../../sesion/autenticacion';
import {
  descartarYCerrar,
  enviarYCerrar,
  intentarCerrar,
  textoNoCerrada,
  textoPendientes,
  textoSegundaConfirmacion,
  type DependenciasCierre,
} from '../../sesion/cierre';
import { crearServicioRemoto } from '../../servicios/servicioRemotoSupabase';
import { supabase } from '../../servicios/supabase';

type Paso =
  | { tipo: 'inicial' }
  | { tipo: 'procesando'; texto: string }
  | { tipo: 'decidir'; pendientes: number; imagenes: number; mensaje: string; puedeEnviar: boolean }
  | { tipo: 'segunda_confirmacion'; pendientes: number; imagenes: number };

/**
 * Cierre de sesión con la cola vacía (docs/tecnica/12-cierre-de-sesion.md, sección 2). Si hay
 * pendientes, ofrece enviarlos primero; descartarlos exige una segunda confirmación.
 */
export function ConfirmacionCierre({ alCerrar }: { alCerrar: () => void }) {
  const [paso, setPaso] = useState<Paso>({ tipo: 'inicial' });
  const dependencias: DependenciasCierre = { servicio: crearServicioRemoto(supabase), cerrarServicio: cerrarSesionServicio };

  async function iniciar() {
    setPaso({ tipo: 'procesando', texto: 'Cerrando sesión…' });
    const resultado = await intentarCerrar(dependencias);
    if (resultado.cerrada) return alCerrar();
    setPaso({
      tipo: 'decidir',
      pendientes: resultado.pendientes,
      imagenes: resultado.imagenes,
      mensaje: textoPendientes(resultado.pendientes, navigator.onLine, resultado.imagenes),
      puedeEnviar: navigator.onLine,
    });
  }

  async function enviar() {
    setPaso({ tipo: 'procesando', texto: 'Enviando los registros pendientes…' });
    const resultado = await enviarYCerrar(dependencias);
    if (resultado.cerrada) return alCerrar();
    setPaso({
      tipo: 'decidir',
      pendientes: resultado.pendientes,
      imagenes: resultado.imagenes,
      mensaje: textoNoCerrada(resultado.pendientes, resultado.motivo === 'pendientes' ? 'no_enviados' : resultado.motivo, resultado.imagenes),
      puedeEnviar: false,
    });
  }

  async function descartar() {
    setPaso({ tipo: 'procesando', texto: 'Cerrando sesión…' });
    await descartarYCerrar(dependencias);
    alCerrar();
  }

  switch (paso.tipo) {
    case 'inicial':
      return (
        <button className="boton boton--secundario boton--ancho boton--con-icono separado" onClick={() => void iniciar()}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14" />
            <path d="M10.5 12h10" />
            <path d="m17 8.5 3.5 3.5-3.5 3.5" />
          </svg>
          <span>Cerrar sesión</span>
        </button>
      );

    case 'procesando':
      return <p className="texto-secundario separado">{paso.texto}</p>;

    case 'decidir':
      return (
        <div className="aviso aviso--atencion separado" role="alertdialog" aria-label="Registros sin enviar">
          <p>⚠ {paso.mensaje}</p>
          <div className="aviso__acciones aviso__acciones--columna">
            {paso.puedeEnviar ? (
              <>
                <button className="boton boton--principal" onClick={() => void enviar()}>
                  Enviar y cerrar sesión
                </button>
                <button className="boton boton--secundario" onClick={() => setPaso({ tipo: 'inicial' })}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                {/* Sin poder enviar, lo seguro es no cerrar: Cancelar es la acción principal. */}
                <button className="boton boton--principal" onClick={() => setPaso({ tipo: 'inicial' })}>
                  Cancelar
                </button>
                <button
                  className="boton boton--secundario"
                  onClick={() => setPaso({ tipo: 'segunda_confirmacion', pendientes: paso.pendientes, imagenes: paso.imagenes })}
                >
                  Cerrar sesión y descartar los registros
                </button>
              </>
            )}
          </div>
        </div>
      );

    case 'segunda_confirmacion':
      return (
        <div className="aviso aviso--riesgo separado" role="alertdialog" aria-label="Confirmar descarte">
          <p>⚠ {textoSegundaConfirmacion(paso.pendientes, paso.imagenes)}</p>
          <div className="aviso__acciones aviso__acciones--columna">
            <button className="boton boton--peligro" onClick={() => void descartar()}>
              Sí, descartar y cerrar sesión
            </button>
            <button className="boton boton--secundario" onClick={() => setPaso({ tipo: 'inicial' })}>
              No, volver
            </button>
          </div>
        </div>
      );
  }
}
