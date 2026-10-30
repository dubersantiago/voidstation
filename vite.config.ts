import { defineConfig } from 'vite';
import { contentPlugin } from './scripts/content-plugin';

export default defineConfig(({ mode }) => ({
  // Rutas relativas: el build es un sitio estático desplegable en cualquier subruta.
  base: './',
  plugins: [contentPlugin()],
  build: {
    // El build privado va a otra carpeta para no publicarlo por error en lugar de dist/ (§13).
    outDir: mode === 'private' ? 'dist-private' : 'dist',
  },
}));
