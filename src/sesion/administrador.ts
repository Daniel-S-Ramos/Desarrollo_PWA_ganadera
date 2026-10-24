/**
 * El contacto del administrador del sistema, para la ayuda de «¿Olvidó su contraseña?».
 * Especificación: docs/tecnica/33-recuperar-contrasena.md, secciones 3 y 5
 *
 * El nombre y el teléfono no van en el código: llegan de la configuración de la aplicación
 * (VITE_ADMIN_NOMBRE y VITE_ADMIN_TELEFONO). Si cambia el administrador, se cambia la configuración.
 */

export interface ContactoAdministrador {
  /** «Daniel Ramos», o null si no se configuró. */
  nombre: string | null;
  /** null si no hay un teléfono válido: la pantalla muestra solo el mensaje general. */
  telefono: { visible: string; llamar: string; whatsapp: string } | null;
}

/**
 * El mensaje de la ayuda, con el nombre del administrador si se configuró (pedido del autor, 2026-10-24):
 * «Comuníquese con Daniel Ramos, que es el administrador del sistema. …».
 */
export function mensajeAyuda(nombre: string | null): string {
  const quien = nombre ? `${nombre}, que es el administrador del sistema` : 'el administrador del sistema';
  return `Comuníquese con ${quien}. Él le asigna una contraseña nueva en pocos minutos y usted vuelve a ingresar aquí.`;
}

/** Indicativo de Colombia. */
const INDICATIVO = '57';

/**
 * Arma el contacto a partir de la configuración. El teléfono se acepta con o sin el 57, con espacios, guiones o
 * «+»; un celular colombiano tiene 10 dígitos y empieza por 3.
 */
export function contactoAdministrador(nombre: string | undefined, telefono: string | undefined): ContactoAdministrador {
  const limpio = (telefono ?? '').replace(/\D/g, '');
  const local = limpio.length === 12 && limpio.startsWith(INDICATIVO) ? limpio.slice(2) : limpio;
  const valido = /^3\d{9}$/.test(local);
  return {
    nombre: nombre?.trim() || null,
    telefono: valido
      ? {
          visible: `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`,
          llamar: `tel:+${INDICATIVO}${local}`,
          whatsapp: `https://wa.me/${INDICATIVO}${local}`,
        }
      : null,
  };
}
