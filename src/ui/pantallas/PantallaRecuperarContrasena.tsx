import { useState, type FormEvent } from 'react';
import { crearServicioRecuperacion } from '../../servicios/recuperacionSupabase';
import { MENSAJES_RECUPERACION, pedirEnlace } from '../../sesion/recuperacion';
import { MarcoCodigo } from '../componentes/MarcoCodigo';
import { useEnLinea } from '../useEstadoMotor';
import { IconoCorreo } from './PantallaInicioSesion';

/**
 * «¿Olvidó su contraseña?»: pedir el enlace para crear una contraseña nueva.
 * Especificación: docs/tecnica/33-recuperar-contrasena.md, sección 3
 */
export function PantallaRecuperarContrasena({ correoInicial, alVolver }: { correoInicial: string; alVolver: () => void }) {
  const enLinea = useEnLinea();
  const [correo, setCorreo] = useState(correoInicial);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setResultado(await pedirEnlace(correo, enLinea, window.location.origin, crearServicioRecuperacion()));
    setEnviando(false);
  }

  return (
    <MarcoCodigo
      ilustracion="cerrado"
      titulo="Recuperar la contraseña"
      explicacion="Escriba el correo con el que ingresa. Le enviaremos un enlace para crear una contraseña nueva."
    >
      {resultado?.ok ? (
        <div className="formulario">
          <div className="aviso aviso--correcto aviso--en-contenido" role="status">
            <p>✓ {resultado.mensaje}</p>
          </div>
          <button type="button" className="boton boton--secundario boton--ancho" onClick={alVolver}>
            Volver al inicio de sesión
          </button>
        </div>
      ) : (
        <form className="formulario" onSubmit={enviar} noValidate>
          <label className="campo">
            <span>Correo</span>
            <span className="campo__grupo">
              <span className="campo__icono" aria-hidden="true">
                <IconoCorreo />
              </span>
              <input type="email" autoComplete="username" placeholder="ejemplo@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </span>
          </label>

          {/* Sin señal el correo no se envía: se avisa antes de intentarlo (sección 3). */}
          {!enLinea && (
            <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
              <p>⚠ {MENSAJES_RECUPERACION.sinConexion}</p>
            </div>
          )}
          {resultado && !resultado.ok && enLinea && (
            <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
              <p>⚠ {resultado.mensaje}</p>
            </div>
          )}

          <button className="boton boton--principal boton--ancho" type="submit" disabled={enviando || !enLinea}>
            {enviando ? 'Enviando…' : 'Enviar el enlace'}
          </button>
          <button type="button" className="boton boton--secundario boton--ancho" onClick={alVolver}>
            Volver al inicio de sesión
          </button>
        </form>
      )}
    </MarcoCodigo>
  );
}
