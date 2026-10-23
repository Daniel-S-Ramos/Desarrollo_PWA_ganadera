/**
 * Íconos de la aplicación, dibujados con trazo y del color del texto que los rodea. Son decorativos:
 * siempre acompañan un texto que dice lo mismo.
 */
import type { ReactNode } from 'react';

function Icono({ children, tamano = 26 }: { children: ReactNode; tamano?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function IconoPersona({ tamano = 24 }: { tamano?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8" r="4.2" />
      <path d="M3.8 20.2c.6-4.1 4-6.7 8.2-6.7s7.6 2.6 8.2 6.7c.1.5-.3.8-.8.8H4.6c-.5 0-.9-.3-.8-.8Z" />
    </svg>
  );
}

export function IconoCasa({ tamano }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v10.5h13V9" />
      <path d="M10 19.5v-5.5h4v5.5" />
    </Icono>
  );
}

export function IconoVaca({ tamano }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M6 7.5c-1.6-.2-2.8-1.3-3-2.8 1.6-.4 3 .2 3.8 1.3" />
      <path d="M18 7.5c1.6-.2 2.8-1.3 3-2.8-1.6-.4-3 .2-3.8 1.3" />
      <path d="M6.8 6.3C8 5.2 9.9 4.5 12 4.5s4 .7 5.2 1.8c.6 2.2.5 4.6-.3 6.7" />
      <path d="M6.8 6.3c-.6 2.2-.5 4.6.3 6.7" />
      <rect x="7.5" y="13" width="9" height="6.5" rx="3.2" />
      <path d="M10.3 16.3h.01M13.7 16.3h.01" strokeWidth="2.6" />
      <path d="M9.5 9.5h.01M14.5 9.5h.01" strokeWidth="2.6" />
    </Icono>
  );
}

export function IconoCampana({ tamano }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </Icono>
  );
}

export function IconoBotella({ tamano }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M9.5 3h5" />
      <path d="M10 3v3.2L7.5 9.5v10a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-10L14 6.2V3" />
      <path d="M7.5 13h9" />
    </Icono>
  );
}

export function IconoPortapapeles({ tamano }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4.5V3.5h6v1" />
      <path d="m8.8 13 2.2 2.2 4.2-4.4" />
    </Icono>
  );
}

export function IconoBarras({ tamano }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M4 20.5h16" />
      <rect x="5.5" y="11" width="3" height="7" rx="0.8" />
      <rect x="10.5" y="6" width="3" height="12" rx="0.8" />
      <rect x="15.5" y="9" width="3" height="9" rx="0.8" />
    </Icono>
  );
}

export function IconoPastilla({ tamano }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <rect x="2.8" y="8.5" width="18.4" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="m8.9 8.9 6.2 6.2" />
    </Icono>
  );
}

export function IconoHistorial({ tamano }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
      <path d="M3.5 4v4h4" />
      <path d="M12 7.5V12l3 2" />
    </Icono>
  );
}

export function IconoAdvertencia({ tamano }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4.5" />
      <path d="M12 17.2h.01" strokeWidth="2.6" />
    </Icono>
  );
}

export function IconoFlecha({ tamano = 24 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="m9 5.5 6.5 6.5L9 18.5" />
    </Icono>
  );
}
