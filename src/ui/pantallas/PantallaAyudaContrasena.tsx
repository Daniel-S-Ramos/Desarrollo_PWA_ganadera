import { contactoAdministrador } from '../../sesion/administrador';
import { IconoMensaje, IconoTelefono } from '../componentes/Iconos';
import { MarcoCodigo } from '../componentes/MarcoCodigo';

/**
 * «¿Olvidó su contraseña?»: la ayuda del administrador del sistema, que asigna una contraseña nueva desde el
 * panel del servicio. No envía nada, así que funciona sin señal.
 * Especificación: docs/tecnica/33-recuperar-contrasena.md, secciones 3 y 4
 */
export function PantallaAyudaContrasena({ alVolver }: { alVolver: () => void }) {
  const contacto = contactoAdministrador(import.meta.env.VITE_ADMIN_NOMBRE, import.meta.env.VITE_ADMIN_TELEFONO);
  return (
    <MarcoCodigo
      ilustracion="cerrado"
      titulo="¿Olvidó su contraseña?"
      explicacion="Comuníquese con el administrador del sistema. Él le asigna una contraseña nueva en pocos minutos y usted vuelve a ingresar aquí."
    >
      <div className="formulario">
        {contacto.telefono ? (
          <>
            <div className="tarjeta ayuda-contrasena__contacto">
              <span className="texto-secundario">Administrador</span>
              <strong>{contacto.nombre}</strong>
              <span>{contacto.telefono.visible}</span>
            </div>
            {/* El marcador no necesita datos; WhatsApp sí (sección 3). */}
            <a className="boton boton--principal boton--ancho ayuda-contrasena__accion" href={contacto.telefono.llamar}>
              <IconoTelefono />
              <span>Llamar a {contacto.nombre}</span>
            </a>
            <a className="boton boton--secundario boton--ancho ayuda-contrasena__accion" href={contacto.telefono.whatsapp} target="_blank" rel="noreferrer">
              <IconoMensaje />
              <span>Escribir por WhatsApp</span>
            </a>
          </>
        ) : (
          <p className="aviso aviso--atencion aviso--en-contenido">Comuníquese con el administrador del sistema.</p>
        )}
        <button type="button" className="boton boton--secundario boton--ancho" onClick={alVolver}>
          Volver al inicio de sesión
        </button>
      </div>
    </MarcoCodigo>
  );
}
