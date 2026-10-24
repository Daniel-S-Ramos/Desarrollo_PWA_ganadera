import { contactoAdministrador, mensajeAyuda } from '../../sesion/administrador';
import { IconoMensaje, IconoTelefono } from '../componentes/Iconos';
import { MarcoCodigo } from '../componentes/MarcoCodigo';

/**
 * «¿Olvidó su contraseña?»: la ayuda del administrador del sistema, que asigna una contraseña nueva desde el
 * panel del servicio. No envía nada, así que funciona sin señal.
 * Especificación: docs/tecnica/33-recuperar-contrasena.md, secciones 3 y 4
 */
export function PantallaAyudaContrasena({ alVolver }: { alVolver: () => void }) {
  const contacto = contactoAdministrador(import.meta.env.VITE_ADMIN_NOMBRE, import.meta.env.VITE_ADMIN_TELEFONO);
  const nombre = contacto.nombre ?? 'el administrador';
  return (
    <MarcoCodigo
      ilustracion="cerrado"
      titulo="¿Olvidó su contraseña?"
      explicacion={mensajeAyuda(contacto.nombre)}
    >
      <div className="formulario">
        {/* El nombre va en el mensaje; con el teléfono configurado, además, la tarjeta y los botones (sección 3). */}
        {contacto.telefono && (
          <>
            <div className="tarjeta ayuda-contrasena__contacto">
              <span className="texto-secundario">Administrador del sistema</span>
              {contacto.nombre && <strong>{contacto.nombre}</strong>}
              <span>{contacto.telefono.visible}</span>
            </div>
            {/* El marcador no necesita datos; WhatsApp sí. */}
            <a className="boton boton--principal boton--ancho ayuda-contrasena__accion" href={contacto.telefono.llamar}>
              <IconoTelefono />
              <span>Llamar a {nombre}</span>
            </a>
            <a className="boton boton--secundario boton--ancho ayuda-contrasena__accion" href={contacto.telefono.whatsapp} target="_blank" rel="noreferrer">
              <IconoMensaje />
              <span>Escribir por WhatsApp</span>
            </a>
          </>
        )}
        <button type="button" className="boton boton--secundario boton--ancho" onClick={alVolver}>
          Volver al inicio de sesión
        </button>
      </div>
    </MarcoCodigo>
  );
}
