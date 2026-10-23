import type { ReactNode } from 'react';

/** El título de una pantalla con su ilustración en un círculo verde claro (rediseño del 2026-10-23). */
export function TituloPantalla({ dibujo, children }: { dibujo: ReactNode; children: ReactNode }) {
  return (
    <p className="titulo-seccion titulo-ilustrado">
      <span className="ilustracion ilustracion--chica">{dibujo}</span>
      <span>{children}</span>
    </p>
  );
}
