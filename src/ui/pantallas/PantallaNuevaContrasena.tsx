import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { crearServicioRecuperacion } from '../../servicios/recuperacionSupabase';
import { guardarNuevaContrasena, LARGO_MINIMO_CONTRASENA, leerEnlace, MENSAJES_RECUPERACION } from '../../sesion/recuperacion';
import { MarcoCodigo } from '../componentes/MarcoCodigo';
import { useEnLinea } from '../useEstadoMotor';
import { IconoCandado, IconoOjo } from './PantallaInicioSesion';

type Estado = { tipo: 'formulario'; error: string | null } | { tipo: 'guardada' } | { tipo: 'vencido' };

/**
 * La contraseña nueva, a la que lleva el enlace del correo (/restablecer-contrasena). Se atiende antes de la
 * cerradura de la aplicación y no toca la sesión del teléfono.
 * Especificación: docs/tecnica/33-recuperar-contrasena.md, sección 4
 */
export function PantallaNuevaContrasena() {
  const { search } = useLocation();
  const navegar = useNavigate();
  const enLinea = useEnLinea();
  const [tokenHash] = useState(() => leerEnlace(search));
  const [contrasena, setContrasena] = useState('');
  const [repetida, setRepetida] = useState('');
  const [ver, setVer] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<Estado>(() => (tokenHash ? { tipo: 'formulario', error: null } : { tipo: 'vencido' }));

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    const r = await guardarNuevaContrasena(tokenHash, contrasena, repetida, enLinea, crearServicioRecuperacion());
    setGuardando(false);
    setEstado(r.ok ? { tipo: 'guardada' } : r.vencido ? { tipo: 'vencido' } : { tipo: 'formulario', error: r.mensaje });
  }

  if (estado.tipo === 'guardada') {
    return (
      <MarcoCodigo ilustracion="listo" titulo="Contraseña actualizada" explicacion={MENSAJES_RECUPERACION.guardada}>
        <button type="button" className="boton boton--principal boton--ancho" onClick={() => void navegar('/', { replace: true })}>
          Ir al inicio de sesión
        </button>
      </MarcoCodigo>
    );
  }

  if (estado.tipo === 'vencido') {
    return (
      <MarcoCodigo ilustracion="cerrado" titulo="El enlace ya no sirve" explicacion={MENSAJES_RECUPERACION.enlaceVencido}>
        <div className="formulario">
          <button type="button" className="boton boton--principal boton--ancho" onClick={() => void navegar('/?recuperar=1', { replace: true })}>
            Pedir otro enlace
          </button>
          <button type="button" className="boton boton--secundario boton--ancho" onClick={() => void navegar('/', { replace: true })}>
            Ir al inicio de sesión
          </button>
        </div>
      </MarcoCodigo>
    );
  }

  const campo = (etiqueta: string, valor: string, cambiar: (v: string) => void, conOjo: boolean) => (
    <label className="campo">
      <span>{etiqueta}</span>
      <span className="campo__grupo">
        <span className="campo__icono" aria-hidden="true">
          <IconoCandado />
        </span>
        <input type={ver ? 'text' : 'password'} autoComplete="new-password" value={valor} onChange={(e) => cambiar(e.target.value)} />
        {conOjo && (
          <button
            type="button"
            className="campo__accion"
            aria-label={ver ? 'Ocultar las contraseñas' : 'Mostrar las contraseñas'}
            aria-pressed={ver}
            onClick={() => setVer((v) => !v)}
          >
            <IconoOjo tachado={!ver} />
          </button>
        )}
      </span>
    </label>
  );

  return (
    <MarcoCodigo
      ilustracion="cerrado"
      titulo="Cree su contraseña nueva"
      explicacion={`Escríbala dos veces. Debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`}
    >
      <form className="formulario" onSubmit={guardar} noValidate>
        {campo('Contraseña nueva', contrasena, setContrasena, true)}
        {campo('Repita la contraseña', repetida, setRepetida, false)}

        {!enLinea && (
          <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
            <p>⚠ {MENSAJES_RECUPERACION.sinConexion}</p>
          </div>
        )}
        {estado.error && enLinea && (
          <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
            <p>⚠ {estado.error}</p>
          </div>
        )}

        <button className="boton boton--principal boton--ancho" type="submit" disabled={guardando || !enLinea}>
          {guardando ? 'Guardando…' : 'Guardar la contraseña'}
        </button>
      </form>
    </MarcoCodigo>
  );
}
