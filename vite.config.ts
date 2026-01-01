import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        viteStaticCopy({
          targets: [
            { src: 'manifest.json', dest: '' },
            { src: 'sw.js', dest: '' },
            { src: 'icons/icon-192.png', dest: 'icons' },
            { src: 'icons/icon-512.png', dest: 'icons' },
            { src: 'icons/screenshot-portrait.png', dest: 'icons' },
            { src: 'icons/screenshot-landscape.png', dest: 'icons' },
          ],
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
