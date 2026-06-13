#!/usr/bin/env node
/**
 * 生成 roms/manifest.json
 *
 * 遍历 roms/ 下所有 .nes 文件，计算 sha256 和 size。
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const ROMS_DIR = resolve(ROOT, 'roms');
const MANIFEST_PATH = resolve(ROMS_DIR, 'manifest.json');

const files = readdirSync(ROMS_DIR)
  .filter((f) => f.endsWith('.nes'))
  .sort((a, b) => a.localeCompare(b, 'zh'))
  .map((f) => {
    const buf = readFileSync(resolve(ROMS_DIR, f));
    return {
      name: f,
      sha256: createHash('sha256').update(buf).digest('hex'),
      size: buf.length,
    };
  });

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  files,
};

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(`已生成 ${MANIFEST_PATH}，共 ${files.length} 个 ROM，总大小 ${files.reduce((a, f) => a + f.size, 0)} 字节`);
