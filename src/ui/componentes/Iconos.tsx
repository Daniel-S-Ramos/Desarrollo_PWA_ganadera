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
