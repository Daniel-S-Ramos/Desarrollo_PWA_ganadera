import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * Generación de los íconos de la aplicación a partir de public/favicon.svg.
 * Uso: npm run iconos
 *
 * El logo no lleva fondo. Solo dos variantes exigen uno, porque el sistema operativo lo impone:
 * la «maskable» de Android (el lanzador recorta el ícono con su propia forma y rellena de negro
 * lo transparente) y la de Apple (iOS rellena de negro lo transparente). En ambas se usa el
 * fondo claro de la aplicación (#F7F8F2, Tabla 29).
 */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#F7F8F2' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#F7F8F2' } },
  },
  images: ['public/favicon.svg'],
});
