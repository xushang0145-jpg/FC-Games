import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';

function copyRomsPlugin() {
  return {
    name: 'copy-roms',
    closeBundle() {
      const srcDir = resolve(__dirname, 'roms');
      const destDir = resolve(__dirname, 'dist/roms');
      if (!existsSync(srcDir)) {
        console.warn('[copy-roms] roms/ 目录不存在，跳过复制（如需 ROM 请运行 npm run download:roms）');
        return;
      }
      const files = readdirSync(srcDir).filter((f) => f.endsWith('.nes'));
      if (files.length === 0) {
        console.warn('[copy-roms] roms/ 目录为空，跳过复制');
        return;
      }
      mkdirSync(destDir, { recursive: true });
      for (const file of files) {
        copyFileSync(resolve(srcDir, file), resolve(destDir, file));
      }
      console.log(`[copy-roms] 已复制 ${files.length} 个 ROM 到 dist/roms/`);
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
        stats: resolve(__dirname, 'stats.html'),
      },
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
