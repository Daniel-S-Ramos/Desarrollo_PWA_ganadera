import { useState, type FormEvent } from 'react';
import { definirCodigo, validarCodigo } from '../../sesion/desbloqueo';

/**
 * Definición del código de desbloqueo tras el ingreso con credenciales
 * (docs/tecnica/07-codigo-de-desbloqueo.md, sección 3.1). Se pide dos veces para evitar errores.
 */
export function PantallaDefinirCodigo({ alDefinir }: { alDefinir: () => void }) {
  const [paso, setPaso] = useState<'elegir' | 'repetir'>('elegir');
  const [primero, setPrimero] = useState('');
  const [codigo, setCodigo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (paso === 'elegir') {
      const validacion = validarCodigo(codigo);
      if (validacion === 'formato') return setError('El código debe tener de 4 a 6 dígitos.');
      if (validacion === 'trivial') return setError('Ese código es muy fácil de adivinar. Evite números repetidos o seguidos, como 1111 o 1234.');
      setPrimero(codigo);
      setCodigo('');
      setPaso('repetir');
      return;
    }

    if (codigo !== primero) {
      setError('Los códigos no coinciden. Elija el código de nuevo.');
      setPrimero('');
      setCodigo('');
      setPaso('elegir');
      return;
    }

    setGuardando(true);
    await definirCodigo(codigo);
    setGuardando(false);
    alDefinir();
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <p className="titulo-seccion">{paso === 'elegir' ? 'Elija su código de desbloqueo' : 'Repita su código'}</p>
      <p className="texto-secundario">
        {paso === 'elegir'
          ? 'De 4 a 6 dígitos. Se le pedirá cada vez que abra la aplicación en este teléfono. No es la contraseña de su cuenta.'
          : 'Escríbalo otra vez para confirmar.'}
      </p>

      <label className="campo">
        <span>Código</span>
        <input
          className="campo__codigo"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
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

      <button className="boton boton--principal boton--ancho" type="submit" disabled={guardando}>
        {guardando ? 'Guardando…' : paso === 'elegir' ? 'Continuar' : 'Guardar código'}
      </button>
    </form>
  );
}
