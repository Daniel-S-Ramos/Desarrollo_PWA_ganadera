import { useState, type FormEvent } from 'react';
import { iniciarSesion, type ResultadoIngreso } from '../../sesion/autenticacion';
import { describirPendientes } from '../../dominio/pendientes';
import type { Identidad } from '../../sesion/token';

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
    <form className="formulario" onSubmit={enviar}>
      <p className="titulo-seccion">Iniciar sesión</p>
      <p className="texto-secundario">Ingrese con el correo y la contraseña de su cuenta.</p>

      <label className="campo">
        <span>Correo</span>
        <input type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
      </label>

      <label className="campo">
        <span>Contraseña</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
        />
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
  );
}
