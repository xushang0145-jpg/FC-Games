import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';

function copyRomsPlugin() {
  return {
    name: 'copy-roms',
    closeBundle() {
      const srcDir = resolve(__dirname, 'roms');
      const destDir = resolve(__dirname, 'dist/roms');
      if (!existsSync(srcDir)) return;
      mkdirSync(destDir, { recursive: true });
      for (const file of readdirSync(srcDir)) {
        if (file.endsWith('.nes')) {
          copyFileSync(resolve(srcDir, file), resolve(destDir, file));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [copyRomsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        game: resolve(__dirname, 'game.html'),
      },
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
// DELIBERATE BUILD BREAK FOR TESTING T013
const broken = (
