import type { ReactNode } from 'react';

/**
 * El título de una pantalla como un letrero de finca (pedido del autor, 2026-10-24): una placa verde claro con
 * dos tornillos, la ilustración en un círculo y el nombre grande, y a la derecha unas hojas con un poste de
 * madera. Es grande para que el propietario y los trabajadores sepan siempre en qué parte de la aplicación
 * están. Verde oscuro sobre verde claro: 7,65 a 1 (3.10.4.1).
 */
export function TituloPantalla({ dibujo, children }: { dibujo: ReactNode; children: ReactNode }) {
  return (
    <div className="letrero">
      <svg className="letrero__destellos" viewBox="0 0 30 30" width="26" height="26" aria-hidden="true" focusable="false">
        <path d="M20 4l-3 7M9 9l5 5M4 18l7 1" stroke="#5f9a4c" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="letrero__placa">
        <span className="letrero__tornillo letrero__tornillo--izquierdo" aria-hidden="true" />
        <span className="ilustracion letrero__dibujo">{dibujo}</span>
        <h2 className="letrero__texto">{children}</h2>
        <span className="letrero__tornillo letrero__tornillo--derecho" aria-hidden="true" />
      </div>
      <svg className="letrero__planta" viewBox="0 0 70 80" width="62" height="72" aria-hidden="true" focusable="false">
        <path d="M20 36c-8-4-14-12-14-22 10 2 17 9 19 19" fill="#5f9a4c" />
        <path d="M30 30c-2-10 2-20 10-26 4 9 2 19-4 27" fill="#7fae63" />
        <path d="M44 34c4-9 12-15 22-15-2 10-9 17-19 19" fill="#5f9a4c" />
        <rect x="40" y="30" width="12" height="48" rx="2" fill="#8a5a3c" />
        <rect x="30" y="42" width="34" height="9" rx="2" fill="#a06b46" />
        <circle cx="46" cy="38" r="1.8" fill="#5a3a26" />
        <path d="M10 78c2-10 8-16 16-18-2 8-6 14-16 18zM26 78c0-8 4-14 10-17 0 7-3 13-10 17zM56 78c0-7 4-12 10-14-1 6-4 11-10 14z" fill="#3f7d3a" />
      </svg>
    </div>
  );
}
