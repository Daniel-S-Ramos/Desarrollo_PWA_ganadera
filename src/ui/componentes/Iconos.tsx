/**
 * Íconos de trazo, del color del texto que los rodea: la silueta del usuario en el encabezado y la sesión, y
 * la flecha de los accesos. Las demás imágenes de la aplicación son ilustraciones (Ilustraciones.tsx).
 * Son decorativos: siempre acompañan un texto que dice lo mismo.
 */

export function IconoPersona({ tamano = 24 }: { tamano?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8" r="4.2" />
      <path d="M3.8 20.2c.6-4.1 4-6.7 8.2-6.7s7.6 2.6 8.2 6.7c.1.5-.3.8-.8.8H4.6c-.5 0-.9-.3-.8-.8Z" />
    </svg>
  );
}

export function IconoFlecha({ tamano = 24 }: { tamano?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 5.5 6.5 6.5L9 18.5" />
    </svg>
  );
}

export function IconoTelefono({ tamano = 24 }: { tamano?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.6 3.5h2.6l1.4 4-2 1.4a12 12 0 0 0 6.5 6.5l1.4-2 4 1.4v2.6a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
    </svg>
  );
}

export function IconoMensaje({ tamano = 24 }: { tamano?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20l1.2-4.2A8.5 8.5 0 1 1 20.5 11.5Z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.8" />
    </svg>
  );
}

export function IconoLupa({ tamano = 26 }: { tamano?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  );
}
