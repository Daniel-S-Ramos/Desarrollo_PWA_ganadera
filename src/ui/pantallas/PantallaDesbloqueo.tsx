import { useState, type FormEvent } from 'react';
import { cerrarSesionServicio, salirPorBloqueo } from '../../sesion/autenticacion';
import { verificarCodigo } from '../../sesion/desbloqueo';
import type { Identidad } from '../../sesion/token';
import { MarcoCodigo } from '../componentes/MarcoCodigo';

/**
 * Desbloqueo al abrir la aplicación en un dispositivo que ya tiene sesión: solo se pide el código, no
 * las credenciales (Tabla 31). Al quinto error se exige un ingreso completo.
 * Especificación: docs/tecnica/07-codigo-de-desbloqueo.md, secciones 3.2 y 3.3
 */
export function PantallaDesbloqueo({
  identidad,
  alDesbloquear,
  alSalir,
}: {
  identidad: Identidad;
  alDesbloquear: () => void;
  /** La sesión local se borró (bloqueo u «Olvidé mi código»): volver al ingreso con credenciales. */
  alSalir: (motivo: 'bloqueo' | 'olvido') => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setVerificando(true);
    setError(null);
    const resultado = await verificarCodigo(codigo);
    setVerificando(false);
    setCodigo('');

    switch (resultado.resultado) {
      case 'correcto':
        return alDesbloquear();
      case 'incorrecto':
        return setError(
          resultado.restantes === 1
            ? 'Código incorrecto. Le queda 1 intento antes de tener que ingresar con su contraseña.'
            : `Código incorrecto. Le quedan ${resultado.restantes} intentos.`,
        );
      case 'bloqueado':
        await cerrarSesionServicio();
        return alSalir('bloqueo');
      case 'sin_codigo':
        return alSalir('olvido');
    }
  }

  async function olvide() {
    await salirPorBloqueo();
    alSalir('olvido');
  }

  return (
    <MarcoCodigo ilustracion="cerrado" titulo={`Hola, ${identidad.nombre}`} explicacion="Ingrese su código de desbloqueo.">
      <form className="formulario" onSubmit={enviar}>
        <label className="campo">
          <span>Código</span>
          <input
            className="campo__codigo"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            placeholder="●●●●●●"
            required
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          />
        </label>

        {error && (
          <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
            <p>⚠ {error}</p>
          </div>
        )}

        <button className="boton boton--principal boton--ancho" type="submit" disabled={verificando || codigo.length < 4}>
          {verificando ? 'Verificando…' : 'Desbloquear'}
        </button>
        <button className="boton boton--secundario boton--ancho" type="button" onClick={() => void olvide()}>
          Olvidé mi código
        </button>
      </form>
    </MarcoCodigo>
  );
}
