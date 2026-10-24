/**
 * Ilustraciones de la aplicación (rediseño visual del 2026-10-23): dibujos planos y redondeados, con los
 * verdes y el amarillo de la Tabla 29, el gris metálico de la cantina y los colores de una Holstein. Son
 * decorativas: siempre acompañan un texto que dice lo mismo, por eso llevan aria-hidden.
 *
 * Los colores de relleno de los dibujos no son colores de texto: no entran en la verificación de contraste
 * de PU-01, que aplica a texto sobre fondo.
 */
import type { ReactNode } from 'react';

const VERDE = '#165232';
const VERDE_CLARO = '#dcefe2';
const AMARILLO = '#f4c542';
const AMARILLO_CLARO = '#fdf3d3';
const GRIS = '#49584e';
const METAL = '#c9d3cc';
const METAL_OSCURO = '#9fb0a5';
const METAL_CLARO = '#e7ece8';
const BLANCO = '#ffffff';

function Dibujo({ ancho = 40, alto = ancho, vista = '0 0 40 40', children }: { ancho?: number; alto?: number; vista?: string; children: ReactNode }) {
  return (
    <svg width={ancho} height={alto} viewBox={vista} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

type Tamano = { tamano?: number };

/** Cantina de leche con una gota: el ordeño. */
export function Cantina({ tamano = 40 }: Tamano) {
  return (
    <Dibujo ancho={tamano}>
      <rect x="14" y="4" width="12" height="5" rx="2" fill={VERDE} />
      <path d="M12 10h16l3 6v17a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V16z" fill={METAL} />
      <path d="M9 16h22v6H9z" fill={METAL_OSCURO} />
      <path d="M12 10h16l3 6H9z" fill={METAL_CLARO} />
      <path d="M20 23c2 3 3 4.5 3 6a3 3 0 0 1-6 0c0-1.5 1-3 3-6z" fill={BLANCO} />
    </Dibujo>
  );
}

/** Tres cantinas de distinta altura, como barras: la producción. */
export function Cantinas({ tamano = 40 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 42 40">
      <g fill={METAL}>
        <rect x="3" y="20" width="10" height="16" rx="2" />
        <rect x="16" y="12" width="10" height="24" rx="2" />
        <rect x="29" y="5" width="10" height="31" rx="2" />
      </g>
      <g fill={VERDE}>
        <rect x="5" y="17" width="6" height="3" rx="1" />
        <rect x="18" y="9" width="6" height="3" rx="1" />
        <rect x="31" y="2" width="6" height="3" rx="1" />
      </g>
      <g fill={METAL_OSCURO}>
        <rect x="3" y="26" width="10" height="3" />
        <rect x="16" y="20" width="10" height="3" />
        <rect x="29" y="15" width="10" height="3" />
      </g>
    </Dibujo>
  );
}

/** Jeringa veterinaria y frasco: sanidad y medicamentos. */
export function JeringaFrasco({ tamano = 40 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 42 42">
      <rect x="24" y="16" width="12" height="20" rx="3" fill="#e9f2f7" />
      <rect x="24" y="22" width="12" height="9" fill={AMARILLO} />
      <rect x="26" y="11" width="8" height="6" rx="1.5" fill={VERDE} />
      <g transform="rotate(-40 14 22)">
        <rect x="9" y="6" width="9" height="22" rx="2" fill="#e9f2f7" stroke={VERDE} strokeWidth="1.5" />
        <rect x="9" y="16" width="9" height="12" fill="#9fd0b0" />
        <rect x="11.5" y="0" width="4" height="6" fill={VERDE} />
        <rect x="8" y="0" width="11" height="2.5" rx="1" fill={VERDE} />
        <path d="M13.5 28v8" stroke={GRIS} strokeWidth="1.6" />
      </g>
    </Dibujo>
  );
}

/** Libreta de campo con lápiz: correcciones y registros. */
export function Libreta({ tamano = 30 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <rect x="5" y="3" width="17" height="24" rx="2" fill={AMARILLO_CLARO} stroke={VERDE} strokeWidth="1.6" />
      <path d="M9 9h9M9 13h9M9 17h6" stroke={GRIS} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 22l7-11 2.2 1.4-7 11-3 1.2z" fill={AMARILLO} stroke={VERDE} strokeWidth="1.2" />
    </Dibujo>
  );
}

/** Libreta con una cruz verde: el historial sanitario. */
export function LibretaSanitaria({ tamano = 30 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <rect x="6" y="3" width="18" height="24" rx="2" fill={AMARILLO_CLARO} stroke={VERDE} strokeWidth="1.6" />
      <path d="M10 20h10M10 23.5h7" stroke={GRIS} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 8h4v3h3v4h-3v3h-4v-3h-3v-4h3z" fill={VERDE} />
    </Dibujo>
  );
}

/** Libreta con un calendario y un corazón: el control reproductivo. */
export function Calendario({ tamano = 30 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <rect x="4" y="6" width="22" height="20" rx="3" fill={BLANCO} stroke={VERDE} strokeWidth="1.6" />
      <path d="M4 12h22" stroke={VERDE} strokeWidth="1.6" />
      <rect x="4" y="6" width="22" height="6" rx="3" fill={VERDE_CLARO} />
      <path d="M10 4v4M20 4v4" stroke={VERDE} strokeWidth="2" strokeLinecap="round" />
      <path d="M15 23.5s-5-2.9-5-6.2a2.6 2.6 0 0 1 5-1 2.6 2.6 0 0 1 5 1c0 3.3-5 6.2-5 6.2z" fill="#e7a2a0" />
    </Dibujo>
  );
}

/** Báscula ganadera con su aguja: el pesaje. */
export function Bascula({ tamano = 30 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <rect x="3" y="21" width="24" height="5" rx="2" fill={METAL_OSCURO} />
      <path d="M8 21v-3M22 21v-3" stroke={GRIS} strokeWidth="2" />
      <circle cx="15" cy="12" r="8.5" fill={BLANCO} stroke={VERDE} strokeWidth="1.8" />
      <path d="M9.5 12a5.5 5.5 0 0 1 11 0" fill="none" stroke={METAL} strokeWidth="2" />
      <path d="M15 12l3.2-3.6" stroke={VERDE} strokeWidth="2" strokeLinecap="round" />
      <circle cx="15" cy="12" r="1.5" fill={VERDE} />
    </Dibujo>
  );
}

/** Curva que sube: la evolución del peso. */
export function Curva({ tamano = 30 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <rect x="3" y="4" width="24" height="22" rx="3" fill={BLANCO} stroke={VERDE} strokeWidth="1.6" />
      <path d="M7 21l5-5 4 3 7-8" fill="none" stroke={VERDE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="11" r="2" fill={AMARILLO} />
    </Dibujo>
  );
}

/** Señal de madera con dos flechas: el destino productivo. */
export function Senal({ tamano = 30 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <rect x="14" y="4" width="2.6" height="23" rx="1" fill="#8a5a3c" />
      <path d="M5 7h15l4 3-4 3H5z" fill={AMARILLO} stroke="#8a5a3c" strokeWidth="1.2" />
      <path d="M25 15H10l-4 3 4 3h15z" fill={VERDE_CLARO} stroke={VERDE} strokeWidth="1.2" />
    </Dibujo>
  );
}

/** Camión ganadero: la salida del animal. */
export function Camion({ tamano = 32 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 34 30">
      <rect x="2" y="7" width="19" height="14" rx="2" fill={VERDE_CLARO} stroke={VERDE} strokeWidth="1.6" />
      <path d="M6 10v8M10 10v8M14 10v8M18 10v8" stroke={VERDE} strokeWidth="1.2" opacity="0.6" />
      <path d="M21 11h6l4 5v5H21z" fill={AMARILLO} stroke={VERDE} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M23.5 13h3l2 3h-5z" fill={BLANCO} />
      <circle cx="8" cy="22.5" r="3" fill={GRIS} />
      <circle cx="26" cy="22.5" r="3" fill={GRIS} />
    </Dibujo>
  );
}

/** Monedas apiladas: el consolidado económico. */
export function Monedas({ tamano = 30 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <ellipse cx="12" cy="22" rx="8" ry="3" fill="#c9971f" />
      <rect x="4" y="16" width="16" height="6" fill="#c9971f" />
      <ellipse cx="12" cy="16" rx="8" ry="3" fill={AMARILLO} />
      <ellipse cx="12" cy="13" rx="8" ry="3" fill="#c9971f" />
      <rect x="4" y="9" width="16" height="4" fill="#c9971f" />
      <ellipse cx="12" cy="9" rx="8" ry="3" fill={AMARILLO} />
      <circle cx="22" cy="20" r="6" fill={AMARILLO} stroke="#c9971f" strokeWidth="1.6" />
      <path d="M22 17v6M20.2 18.5h2.8a1.2 1.2 0 0 1 0 2.4h-1.6a1.2 1.2 0 0 0 0 2.4h2.6" stroke="#8a5a0e" strokeWidth="1.1" fill="none" />
    </Dibujo>
  );
}

/** Billete con un signo más: registrar un costo. */
export function Billete({ tamano = 30 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <rect x="2" y="8" width="22" height="14" rx="2" fill={VERDE_CLARO} stroke={VERDE} strokeWidth="1.6" />
      <circle cx="13" cy="15" r="3.5" fill="none" stroke={VERDE} strokeWidth="1.4" />
      <circle cx="23" cy="21" r="6" fill={AMARILLO} />
      <path d="M23 18v6M20 21h6" stroke={VERDE} strokeWidth="2" strokeLinecap="round" />
    </Dibujo>
  );
}

/** Cámara: las fotografías del animal. */
export function Camara({ tamano = 30 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <path d="M10 8l2-3h6l2 3" fill={METAL_OSCURO} />
      <rect x="3" y="8" width="24" height="17" rx="3" fill={METAL} stroke={VERDE} strokeWidth="1.6" />
      <circle cx="15" cy="16.5" r="5.5" fill={BLANCO} stroke={VERDE} strokeWidth="1.6" />
      <circle cx="15" cy="16.5" r="2.6" fill={VERDE} />
      <circle cx="23" cy="11.5" r="1.3" fill={AMARILLO} />
    </Dibujo>
  );
}

/** Lápiz: corregir un dato. */
export function Lapiz({ tamano = 28 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <path d="M6 24l1.5-6 13-13 4.5 4.5-13 13z" fill={AMARILLO} stroke={VERDE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18 7.5l4.5 4.5" stroke={VERDE} strokeWidth="1.5" />
      <path d="M6 24l1.5-6 4.5 4.5z" fill={AMARILLO_CLARO} stroke={VERDE} strokeWidth="1.2" />
    </Dibujo>
  );
}

/** Puerta con una flecha: cerrar sesión. */
export function Puerta({ tamano = 28 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 30 30">
      <rect x="5" y="3" width="13" height="24" rx="1.5" fill="#8a5a3c" />
      <rect x="7" y="5" width="9" height="20" rx="1" fill="#b07a52" />
      <circle cx="14" cy="15.5" r="1.1" fill={AMARILLO} />
      <path d="M17 15h10M23.5 11.5L27 15l-3.5 3.5" fill="none" stroke={VERDE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Dibujo>
  );
}

/** Señal de conexión, en el recuadro «Mantenga la conexión». */
export function Senal4G({ tamano = 28 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 24 24">
      <g fill="none" stroke={VERDE} strokeWidth="2.2" strokeLinecap="round">
        <path d="M2.5 9a14 14 0 0 1 19 0" />
        <path d="M5.5 12.5a9.5 9.5 0 0 1 13 0" />
        <path d="M8.7 16a5 5 0 0 1 6.6 0" />
      </g>
      <circle cx="12" cy="19.5" r="1.4" fill={VERDE} />
    </Dibujo>
  );
}

/** Pelajes de la cara de vaca: Holstein, parda y negra con frente blanca. */
type Pelaje = 'holstein' | 'parda' | 'negra';

const PELAJES: Record<Pelaje, { fondo: string; pasto: string; orejas: [string, string]; cara: string; ojos: string; hocico: string; fosas: string }> = {
  holstein: { fondo: '#a9c98f', pasto: '#7fa865', orejas: ['#2b2b2b', '#2b2b2b'], cara: '#fbf6ee', ojos: '#1a1a1a', hocico: '#f2b8a6', fosas: '#9a5a4a' },
  parda: { fondo: '#b6d3e0', pasto: '#8bb27a', orejas: ['#5a3a26', '#5a3a26'], cara: '#8a5a3c', ojos: '#1a1a1a', hocico: '#e7a996', fosas: '#7a4a3a' },
  negra: { fondo: '#d9dfb8', pasto: '#93b56f', orejas: ['#2b2b2b', '#fbf6ee'], cara: '#2b2b2b', ojos: '#f7f7f7', hocico: '#f2b8a6', fosas: '#9a5a4a' },
};

/**
 * Cara de vaca sobre un potrero. Ocupa el lugar de la foto cuando el animal no tiene una en el teléfono, y es
 * el ícono de «Animales». `conFondo` en falso la deja sin el cuadro del potrero (barra de navegación).
 */
export function CaraVaca({ tamano = 46, pelaje = 'holstein', conFondo = true }: Tamano & { pelaje?: Pelaje; conFondo?: boolean }) {
  const p = PELAJES[pelaje];
  return (
    <Dibujo ancho={tamano} vista="0 0 60 60">
      {conFondo && (
        <>
          <rect width="60" height="60" fill={p.fondo} />
          <path d="M0 44c10-6 20-8 30-6s20 2 30-4v26H0z" fill={p.pasto} />
        </>
      )}
      <ellipse cx="13" cy="24" rx="7" ry="4" fill={p.orejas[0]} transform="rotate(-20 13 24)" />
      <ellipse cx="47" cy="24" rx="7" ry="4" fill={p.orejas[1]} transform="rotate(20 47 24)" />
      <path d="M18 20c2-6 7-9 12-9s10 3 12 9c2 8 1 17-2 24H20c-3-7-4-16-2-24z" fill={p.cara} />
      {pelaje === 'holstein' && <path d="M30 11c5 0 10 3 12 9 1 3 1 6 1 9-4-1-8-5-9-11-1-3-2-5-4-7z" fill="#2b2b2b" />}
      {pelaje === 'parda' && <path d="M26 14c3-2 6-2 8 0l-2 14h-4z" fill="#fbf6ee" />}
      {pelaje === 'negra' && <path d="M27 13c2-1 4-1 6 0 2 6 2 14 0 22h-6c-2-8-2-16 0-22z" fill="#fbf6ee" />}
      <ellipse cx="30" cy="46" rx="9" ry="7" fill={p.hocico} />
      <circle cx="26.5" cy="46" r="1.4" fill={p.fosas} />
      <circle cx="33.5" cy="46" r="1.4" fill={p.fosas} />
      <circle cx="24" cy="30" r="1.8" fill={p.ojos} />
      <circle cx="36" cy="30" r="1.8" fill={p.ojos} />
    </Dibujo>
  );
}

/** El pelaje de la cara que reemplaza la foto, fijo para cada animal: así cada uno conserva el suyo. */
export function pelajeDe(id: string): Pelaje {
  let suma = 0;
  for (const c of id) suma = (suma + c.charCodeAt(0)) % 997;
  return (['holstein', 'parda', 'negra'] as const)[suma % 3]!;
}

/* --------------------------------- Filtros del listado de animales (pedido del autor, 2026-10-24). */

/** Silueta de una vaca de perfil, para los botones de estado (activos, retirados, todos). */
export function SiluetaVaca({ tamano = 44, color = VERDE }: Tamano & { color?: string }) {
  return (
    <Dibujo ancho={tamano} alto={tamano * 0.72} vista="0 0 50 36">
      <path
        d="M6 12c0-2 1.6-3.6 3.6-3.6H31c1.4 0 2.6-.7 3.3-1.8l1.2-1.9c.5-.7 1.4-.8 2-.3l1 .8h3.3c.8 0 1.4.4 1.8 1l1.9 2.6c.4.6.3 1.4-.3 1.8L43 12v3.3c0 1.2-.9 2.1-2.1 2.1H40v12.4c0 .9-.7 1.6-1.6 1.6h-2c-.9 0-1.6-.7-1.6-1.6v-8H16.2v8c0 .9-.7 1.6-1.6 1.6h-2c-.9 0-1.6-.7-1.6-1.6V20.4L8.6 18.2v5.7c0 .5-.4.8-.8.8s-.8-.3-.8-.8V16.6A3.7 3.7 0 0 1 6 14.1Z"
        fill={color}
      />
    </Dibujo>
  );
}

/** Tres siluetas juntas: todos los animales. */
export function SiluetasVacas({ tamano = 54, color = GRIS }: Tamano & { color?: string }) {
  return (
    <Dibujo ancho={tamano} alto={tamano * 0.7} vista="0 0 60 42">
      <g transform="translate(10 0) scale(0.75)" opacity="0.65">
        <SiluetaRuta color={color} />
      </g>
      <g transform="translate(0 6) scale(0.8)" opacity="0.85">
        <SiluetaRuta color={color} />
      </g>
      <g transform="translate(16 9) scale(0.9)">
        <SiluetaRuta color={color} />
      </g>
    </Dibujo>
  );
}

function SiluetaRuta({ color }: { color: string }) {
  return (
    <path
      d="M6 12c0-2 1.6-3.6 3.6-3.6H31c1.4 0 2.6-.7 3.3-1.8l1.2-1.9c.5-.7 1.4-.8 2-.3l1 .8h3.3c.8 0 1.4.4 1.8 1l1.9 2.6c.4.6.3 1.4-.3 1.8L43 12v3.3c0 1.2-.9 2.1-2.1 2.1H40v12.4c0 .9-.7 1.6-1.6 1.6h-2c-.9 0-1.6-.7-1.6-1.6v-8H16.2v8c0 .9-.7 1.6-1.6 1.6h-2c-.9 0-1.6-.7-1.6-1.6V20.4L8.6 18.2v5.7c0 .5-.4.8-.8.8s-.8-.3-.8-.8V16.6A3.7 3.7 0 0 1 6 14.1Z"
      fill={color}
    />
  );
}

/**
 * Filete de carne con su borde de grasa y su hueso: la ceba y la producción de carne (pedido del autor,
 * 2026-10-24: «es lo que mejor entiende el propietario»; documento técnico 34, sección 7 bis).
 */
export function Filete({ tamano = 44 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 40 40">
      <path d="M3 18C4 9 13 4 22 4.6 31.5 5.3 38 11 37.6 19.5 37.2 28.5 29.5 35 19.5 35.4 9.5 35.8 2 28 3 18z" fill="#f3dcc4" stroke="#b9805c" strokeWidth="1.4" />
      <path d="M7 18.4C7.8 11.4 14.4 8 21.6 8.4 29 8.9 33.9 13.1 33.6 19.6 33.3 26.4 27.6 31.2 19.8 31.5 12 31.8 6.3 26 7 18.4z" fill="#b83227" />
      <path d="M17 13.5c3 .8 5-.6 8 .4M10.5 22c2.8-.4 4.4 1.2 7.2.6M20 25.5c2.6.8 4.4-.4 7 .4M25.5 18.5c1.6 1 3.4.8 5 1.6" stroke="#ec958a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="13.5" cy="16" r="4" fill={BLANCO} stroke="#dcc3a8" strokeWidth="1.2" />
      <circle cx="13.5" cy="16" r="1.6" fill="#e8cfb4" />
    </Dibujo>
  );
}

/** Etiqueta de precio con su cordón: el animal para la venta. */
export function EtiquetaPrecio({ tamano = 44 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 40 40">
      <path d="M6 6c3-3 8-2 10 2" fill="none" stroke="#8a5a3c" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 8h11l11 11-15 15L8 21V10a2 2 0 0 1 2-2z" fill={VERDE_CLARO} stroke={VERDE} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="15" cy="14" r="2.4" fill={BLANCO} stroke={VERDE} strokeWidth="1.6" />
      <path d="M24 17v11M27 19h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-4" fill="none" stroke={VERDE} strokeWidth="1.8" strokeLinecap="round" />
    </Dibujo>
  );
}

/** Planta de beneficio: el sacrificio, sin mostrar carne. */
export function PlantaBeneficio({ tamano = 44 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 40 40">
      <path d="M3 35h34" stroke={METAL_OSCURO} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6 35V17l10-7 10 7v18z" fill={METAL_CLARO} stroke={VERDE} strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="26" y="20" width="9" height="15" fill={METAL} stroke={VERDE} strokeWidth="1.8" />
      <rect x="28.5" y="11" width="4" height="9" fill={METAL_OSCURO} />
      <rect x="12" y="25" width="8" height="10" rx="1" fill={VERDE} />
      <rect x="9" y="19" width="4" height="3.5" fill={BLANCO} stroke={VERDE} strokeWidth="1" />
      <rect x="19" y="19" width="4" height="3.5" fill={BLANCO} stroke={VERDE} strokeWidth="1" />
    </Dibujo>
  );
}

/** Signo de interrogación en un círculo: sin destino. */
export function Interrogacion({ tamano = 40 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill={BLANCO} stroke={VERDE} strokeWidth="2.4" />
      <path d="M15 15a5 5 0 1 1 7 4.6c-1.4.7-2 1.6-2 3.2v1" fill="none" stroke={VERDE} strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="29" r="2" fill={VERDE} />
    </Dibujo>
  );
}

/** Cruz sencilla sobre una loma: muertos. */
export function Cruz({ tamano = 40 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 40 40">
      <path d="M2 36c8-6 28-6 36 0z" fill="#93b56f" />
      <rect x="17.5" y="6" width="5" height="26" rx="1" fill={GRIS} />
      <rect x="11" y="12" width="18" height="5" rx="1" fill={GRIS} />
    </Dibujo>
  );
}

/** Cerca con un tramo caído: pérdida o robo. */
export function CercaRota({ tamano = 44 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 40 40">
      <path d="M2 35h36" stroke="#93b56f" strokeWidth="3" strokeLinecap="round" />
      <g fill="#8a5a3c">
        <rect x="4" y="12" width="4" height="23" rx="1" />
        <rect x="18" y="12" width="4" height="23" rx="1" />
        <rect x="32" y="12" width="4" height="23" rx="1" />
        <rect x="4" y="16" width="18" height="3.5" rx="1" />
        <rect x="4" y="25" width="18" height="3.5" rx="1" />
        <rect x="22" y="16" width="14" height="3.5" rx="1" />
      </g>
      <rect x="23" y="29" width="13" height="3.5" rx="1" fill="#b07a52" transform="rotate(18 29 31)" />
    </Dibujo>
  );
}

/** Visto bueno en un círculo verde: el estado elegido. */
export function Visto({ tamano = 26 }: Tamano) {
  return (
    <Dibujo ancho={tamano} vista="0 0 26 26">
      <circle cx="13" cy="13" r="12" fill={VERDE} stroke={BLANCO} strokeWidth="2" />
      <path d="m7.5 13.5 3.6 3.6 7.4-7.6" fill="none" stroke={BLANCO} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </Dibujo>
  );
}

/** Campana con el número de pendientes adentro (tarjeta «Pendientes» del inicio). */
export function CampanaConNumero({ numero, tamano = 64 }: Tamano & { numero: string }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 64 64" role="img" aria-label={`${numero} por revisar`}>
      <path d="M32 6a4 4 0 0 1 4 4v1.6c8.6 1.8 14 9.2 14 18.4v11l5 7.5c.8 1.3-.1 3-1.7 3H10.7c-1.6 0-2.5-1.7-1.7-3l5-7.5V30c0-9.2 5.4-16.6 14-18.4V10a4 4 0 0 1 4-4z" fill={AMARILLO_CLARO} stroke={VERDE} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M25.5 55.5a6.5 6.5 0 0 0 13 0" fill={AMARILLO} stroke={VERDE} strokeWidth="2.6" />
      <text x="32" y="41" textAnchor="middle" style={{ fontFamily: 'var(--letra-titulo)' }} fontWeight="900" fontSize={numero.length > 2 ? 15 : 20} fill="#17251c">
        {numero}
      </text>
    </svg>
  );
}

/* --------------------------------------------- Barra de navegación: activos en verde, inactivos en gris. */

export function NavCasa({ activo }: { activo: boolean }) {
  const trazo = activo ? VERDE : GRIS;
  return (
    <Dibujo ancho={30} vista="0 0 30 30">
      <path d="M4 14 15 5l11 9" fill="none" stroke={trazo} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 12.5V25h16V12.5" fill={activo ? VERDE_CLARO : BLANCO} stroke={trazo} strokeWidth="2.2" />
      <rect x="12" y="17" width="6" height="8" fill={trazo} />
    </Dibujo>
  );
}

export function NavVaca({ activo }: { activo: boolean }) {
  return (
    <span className={activo ? 'nav-vaca nav-vaca--activa' : 'nav-vaca'}>
      <CaraVaca tamano={28} conFondo={false} />
    </span>
  );
}

export function NavCampana({ activo }: { activo: boolean }) {
  const trazo = activo ? VERDE : GRIS;
  return (
    <Dibujo ancho={30} vista="0 0 30 30">
      <path d="M8 20v-7a7 7 0 0 1 14 0v7l2 3H6z" fill={activo ? AMARILLO : AMARILLO_CLARO} stroke={trazo} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12.5 25.5a2.6 2.6 0 0 0 5 0" stroke={trazo} strokeWidth="2" fill="none" />
    </Dibujo>
  );
}

export function NavPersona({ activo }: { activo: boolean }) {
  const trazo = activo ? VERDE : GRIS;
  const relleno = activo ? VERDE_CLARO : BLANCO;
  return (
    <Dibujo ancho={30} vista="0 0 30 30">
      <circle cx="15" cy="10" r="5.5" fill={relleno} stroke={trazo} strokeWidth="2" />
      <path d="M5 26c1-6 5-9 10-9s9 3 10 9z" fill={relleno} stroke={trazo} strokeWidth="2" strokeLinejoin="round" />
    </Dibujo>
  );
}

/** Las montañas al pie del encabezado: el paisaje de Chipaque detrás del nombre de la ganadería. */
export function Montanas() {
  return (
    <svg className="encabezado__montanas" viewBox="0 0 390 34" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 22 C40 8 70 6 110 16 S180 30 220 18 S300 2 340 12 S380 22 390 18 V34 H0Z" fill="#2c6a45" />
      <path d="M0 28 C50 18 90 18 140 26 S230 34 270 26 S350 16 390 24 V34 H0Z" fill="#f7f8f2" />
    </svg>
  );
}
