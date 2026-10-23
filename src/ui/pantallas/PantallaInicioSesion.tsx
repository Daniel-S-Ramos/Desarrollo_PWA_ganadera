import { useState, type FormEvent } from 'react';
import { iniciarSesion, type ResultadoIngreso } from '../../sesion/autenticacion';
import { describirPendientes } from '../../dominio/pendientes';
import type { Identidad } from '../../sesion/token';
import paisaje from '../imagenes/paisaje.webp';
import vaca from '../imagenes/vaca.webp';

type Falla = Extract<ResultadoIngreso, { ok: false }>;
type MotivoSimple = Exclude<Falla['motivo'], 'otro_usuario_con_pendientes'>;

const MENSAJES: Record<MotivoSimple, string> = {
  sin_conexion: 'El primer ingreso en este teléfono requiere conexión a internet.',
  credenciales: 'Correo o contraseña incorrectos.',
  sin_perfil: 'Esta cuenta no tiene un perfil asignado en la Ganadería JR. Consulte al propietario.',
  error: 'No fue posible iniciar sesión. Intente de nuevo.',
};

/**
 * Texto del rechazo. Cuando otro usuario intenta ingresar con pendientes de una sesión bloqueada, el
 * aviso explica el motivo y qué hacer (documento técnico 07, sección 6).
 */
export function mensajeDeFalla(falla: Falla): string {
  if (falla.motivo === 'otro_usuario_con_pendientes') {
    const uno = falla.pendientes + falla.imagenes === 1;
    return `Este teléfono tiene ${describirPendientes(falla.pendientes, falla.imagenes)} de ${falla.anterior.nombre} que aún no se ${uno ? 'ha' : 'han'} enviado. Solo ${falla.anterior.nombre} puede ingresar hasta que se envíen, para que no se pierdan. Pídale que ingrese con su cuenta y sincronice.`;
  }
  return MENSAJES[falla.motivo];
}

/** Inicio de sesión con credenciales: primer ingreso en el dispositivo (CU-01, Tabla 28). */
export function PantallaInicioSesion({ alIngresar }: { alIngresar: (identidad: Identidad) => void }) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const resultado = await iniciarSesion(correo, contrasena);
    setEnviando(false);
    if (resultado.ok) alIngresar(resultado.identidad);
    else setError(mensajeDeFalla(resultado));
  }

  return (
    <div className="ingreso">
      {/* Imágenes decorativas: el texto ya nombra la aplicación. */}
      <img className="ingreso__vaca" src={vaca} alt="" width={475} height={259} />
      <p className="ingreso__marca">Ganadería JR</p>
      <p className="ingreso__lema">Control y registro de tu ganadería</p>

      <form className="formulario tarjeta ingreso__tarjeta" onSubmit={enviar}>
        <div>
          <h2 className="ingreso__titulo">Iniciar sesión</h2>
          <p className="texto-secundario ingreso__ayuda">Ingrese con el correo y la contraseña de su cuenta.</p>
        </div>

        <label className="campo">
          <span>Correo</span>
          <span className="campo__grupo">
            <span className="campo__icono" aria-hidden="true">
              <IconoCorreo />
            </span>
            <input
              type="email"
              autoComplete="username"
              placeholder="ejemplo@correo.com"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </span>
        </label>

        <label className="campo">
          <span>Contraseña</span>
          <span className="campo__grupo">
            <span className="campo__icono" aria-hidden="true">
              <IconoCandado />
            </span>
            <input
              type={verContrasena ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Ingrese su contraseña"
              required
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
            <button
              type="button"
              className="campo__accion"
              aria-label={verContrasena ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
              aria-pressed={verContrasena}
              onClick={() => setVerContrasena((v) => !v)}
            >
              <IconoOjo tachado={!verContrasena} />
            </button>
          </span>
        </label>

        {error && (
          <div className="aviso aviso--atencion aviso--en-contenido" role="alert">
            <p>⚠ {error}</p>
          </div>
        )}

        <button className="boton boton--principal boton--ancho" type="submit" disabled={enviando}>
          {enviando ? 'Verificando…' : 'Ingresar'}
        </button>
      </form>

      <img className="ingreso__paisaje" src={paisaje} alt="" width={1024} height={281} />
    </div>
  );
}

/* Íconos de trazo, del color del texto que los rodea. */
const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function IconoCorreo() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" {...trazo}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </svg>
  );
}

function IconoCandado() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" {...trazo}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2.5" />
    </svg>
  );
}

function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" {...trazo}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {tachado && <path d="m4 4 16 16" />}
    </svg>
  );
}
