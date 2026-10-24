import type { ReactNode } from 'react';

/**
 * El título de una pantalla como un letrero de finca (modelo del autor, 2026-10-24): una placa verde claro de
 * contorno irregular con dos tornillos, la ilustración en un círculo y el nombre grande, y a la derecha un tramo
 * de cerca de corral con hojas. Es grande para que el propietario y los trabajadores sepan siempre en qué parte
 * de la aplicación están. Verde oscuro sobre verde claro: 7,65 a 1 (3.10.4.1).
 */
export function TituloPantalla({ dibujo, children }: { dibujo: ReactNode; children: ReactNode }) {
  return (
    <div className="letrero">
      <svg className="letrero__destellos" viewBox="0 0 30 30" width="26" height="26" aria-hidden="true" focusable="false">
        <path d="M20 4l-3 7M9 9l5 5M4 18l7 1" stroke="#5f9a4c" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="letrero__placa">
        {/* El contorno irregular, como una tabla recortada a mano: se estira al tamaño del título. */}
        <svg className="letrero__fondo" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path
            d="M24 12 C70 4 120 9 170 6 S270 3 318 8 C350 11 372 6 388 18 C398 28 394 44 397 58 C399 74 392 88 372 92 C320 99 262 93 208 96 S112 99 64 94 C40 92 18 96 8 82 C1 70 5 54 3 40 C2 26 8 15 24 12 Z"
            fill="#dcefe2"
            stroke="#b9d8c2"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
          <path d="M28 88 C90 93 160 90 230 92 S340 90 372 86" fill="none" stroke="#c6e0cd" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="letrero__tornillo letrero__tornillo--izquierdo" aria-hidden="true" />
        <span className="ilustracion letrero__dibujo">{dibujo}</span>
        <h2 className="letrero__texto">{children}</h2>
        <span className="letrero__tornillo letrero__tornillo--derecho" aria-hidden="true" />
      </div>
      {/* Tramo de cerca de corral: dos postes y dos travesaños de madera, con hojas detrás. */}
      <svg className="letrero__cerca" viewBox="0 0 90 90" width="78" height="78" aria-hidden="true" focusable="false">
        <path d="M58 40c-6-9-6-21 2-30 6 9 6 20-2 30z" fill="#7fae63" />
        <path d="M70 46c2-11 10-19 20-21-1 11-9 19-20 21z" fill="#5f9a4c" />
        <path d="M46 44c-9-3-15-11-16-21 10 1 17 9 18 19z" fill="#5f9a4c" />
        <rect x="2" y="44" width="80" height="9" rx="2" fill="#a06b46" />
        <rect x="2" y="62" width="80" height="9" rx="2" fill="#a06b46" />
        <path d="M2 47h80M2 65h80" stroke="#8a5a3c" strokeWidth="1.2" opacity="0.6" />
        <path d="M22 34l6-5 6 5v54H22z" fill="#8a5a3c" />
        <path d="M60 30l6-5 6 5v58H60z" fill="#8a5a3c" />
        <circle cx="28" cy="48.5" r="1.6" fill="#5a3a26" />
        <circle cx="28" cy="66.5" r="1.6" fill="#5a3a26" />
        <circle cx="66" cy="48.5" r="1.6" fill="#5a3a26" />
        <circle cx="66" cy="66.5" r="1.6" fill="#5a3a26" />
        <path d="M8 88c2-9 7-14 14-16-1 8-6 13-14 16zM40 88c1-8 6-13 12-15-1 7-5 12-12 15zM76 88c0-7 4-12 10-14-1 6-4 11-10 14z" fill="#3f7d3a" />
      </svg>
    </div>
  );
}
