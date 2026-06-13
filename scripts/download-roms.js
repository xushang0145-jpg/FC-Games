#!/usr/bin/env node
/**
 * ROM 下载脚本
 *
 * 从 ROM_BASE_URL 拉取 ROM 文件并校验 SHA-256。
 * 已存在且校验通过的文件会跳过。
 *
 * 用法:
 *   ROM_BASE_URL=https://example.com/roms node scripts/download-roms.js
 *   ROM_FORCE_DOWNLOAD=1 node scripts/download-roms.js
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { get as httpGet } from 'http';
import { get as httpsGet } from 'https';
import { resolve } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const ROMS_DIR = resolve(ROOT, 'roms');
const MANIFEST_PATH = resolve(ROMS_DIR, 'manifest.json');

const ROM_BASE_URL = process.env.ROM_BASE_URL;
const FORCE = process.env.ROM_FORCE_DOWNLOAD === '1' || process.env.ROM_FORCE_DOWNLOAD === 'true';

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function getModuleForUrl(url) {
  const protocol = new URL(url).protocol;
  if (protocol === 'https:') return httpsGet;
  if (protocol === 'http:') return httpGet;
  throw new Error(`不支持的协议: ${protocol}`);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const requestGet = getModuleForUrl(url);
    const req = requestGet(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(new URL(res.headers.location, url).toString(), dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        writeFileSync(dest, Buffer.concat(chunks));
        resolve();
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error(`Timeout downloading ${url}`));
    });
  });
}

async function main() {
  if (!ROM_BASE_URL) {
    console.error('错误：缺少环境变量 ROM_BASE_URL');
    console.error('示例：ROM_BASE_URL=https://example.com/roms node scripts/download-roms.js');
    process.exit(1);
  }

  const base = ROM_BASE_URL.replace(/\/$/, '');

  if (!existsSync(MANIFEST_PATH)) {
    console.error(`错误：找不到 ROM 清单 ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  if (!manifest.files || !Array.isArray(manifest.files)) {
    console.error('错误：manifest.json 格式不正确，缺少 files 数组');
    process.exit(1);
  }

  mkdirSync(ROMS_DIR, { recursive: true });

  // 清理不在清单中的旧 ROM（避免重名或废弃文件堆积）
  const allowed = new Set(manifest.files.map((f) => f.name));
  for (const entry of readdirSync(ROMS_DIR)) {
    if (entry.endsWith('.nes') && !allowed.has(entry)) {
      console.warn(`警告：发现不在清单中的 ROM，已忽略 ${entry}`);
    }
  }

  let skipped = 0;
  let downloaded = 0;
  let failed = 0;

  for (const item of manifest.files) {
    const { name, sha256: expectedSha, size: expectedSize } = item;
    const dest = resolve(ROMS_DIR, name);
    const url = `${base}/${encodeURIComponent(name)}`;

    const needsDownload = FORCE || !existsSync(dest);
    if (!needsDownload) {
      const actualSha = sha256(dest);
      const actualSize = Buffer.byteLength(readFileSync(dest));
      if (actualSha === expectedSha && actualSize === expectedSize) {
        console.log(`跳过 ${name}`);
        skipped++;
        continue;
      }
      console.warn(`校验失败，重新下载 ${name}`);
    }

    try {
      console.log(`下载 ${name} ...`);
      await download(url, dest);
      const actualSha = sha256(dest);
      const actualSize = Buffer.byteLength(readFileSync(dest));
      if (actualSha !== expectedSha || actualSize !== expectedSize) {
        throw new Error(`校验失败: ${name} (sha256=${actualSha}, size=${actualSize})`);
      }
      console.log(`完成 ${name}`);
      downloaded++;
    } catch (err) {
      console.error(`失败 ${name}: ${err.message}`);
      failed++;
      try {
        if (existsSync(dest)) {
          // 保留失败文件以便排查，但标记退出码
        }
      } catch {}
    }
  }

  console.log(`\n汇总: 跳过=${skipped}, 下载=${downloaded}, 失败=${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
