# ROM 迁出 Git 运维文档

本文档说明 FC-Games 项目如何将 ROM 文件迁出 Git 仓库，并通过 CDN 在 CI/CD 和本地开发中按需拉取。

## 背景

- 88 个 `.nes` ROM 文件，约 15MB，原先直接存放在 `roms/`
- 导致 `git clone` 体积膨胀，且 ROM 涉及版权合规风险
- 本方案将 ROM 迁出 Git，改为 CDN 托管；仓库只保留 `roms/manifest.json` 清单

## 推荐 CDN 方案

**推荐 Cloudflare R2**（S3 兼容对象存储）：

- 出站流量免费额度高
- 提供公开 HTTPS URL，无需额外 CDN 配置
- 与 GitHub Actions 配合简单
- 如需切换阿里云 OSS / AWS S3，只需修改 `ROM_BASE_URL`，下载脚本无需改动

## 本地开发

### 1. 获取 ROM

方式一：从 CDN 下载（推荐）

```bash
export ROM_BASE_URL=https://your-r2-public-url/fc-games
npm run download:roms
```

方式二：手动放置

将已有 ROM 文件复制到 `roms/` 目录，确保与 `roms/manifest.json` 一致。

### 2. 启动开发服务器

```bash
npm install
npm run dev
```

### 3. 强制重新下载

```bash
ROM_FORCE_DOWNLOAD=1 npm run download:roms
```

## 上传 ROM 到 CDN

1. 在 Cloudflare R2 创建 bucket，例如 `fc-games-roms`
2. 开启 bucket 的公共访问（R2.dev subdomain 或自定义域名）
3. 上传所有 ROM 文件，保持文件名与 `roms/manifest.json` 一致
4. 记录公共访问前缀，例如 `https://pub-123.r2.dev/fc-games`
5. 在 GitHub 仓库设置中添加 repository variable：
   - Name: `ROM_BASE_URL`
   - Value: `https://pub-123.r2.dev/fc-games`

### 上传脚本示例（使用 rclone / aws-cli）

```bash
# 使用 aws-cli（R2 提供 S3 兼容 endpoint）
aws s3 sync roms/ s3://fc-games-roms/fc-games/ \
  --endpoint-url https://your-account.r2.cloudflarestorage.com
```

## GitHub Actions 配置

### CI

`.github/workflows/ci.yml` 已集成：

```yaml
- name: Download ROMs
  run: npm run download:roms
  env:
    ROM_BASE_URL: ${{ vars.ROM_BASE_URL }}
```

### Release

`.github/workflows/release.yml` 已集成：

```yaml
- name: Download ROMs
  run: npm run download:roms
  env:
    ROM_BASE_URL: ${{ vars.ROM_BASE_URL }}
```

## 更新 ROM 或新增游戏

1. 将新 ROM 放入 `roms/`
2. 重新生成清单：
   ```bash
   node scripts/generate-manifest.js
   ```
3. 提交 `roms/manifest.json`
4. 上传新 ROM 到 CDN
5. 更新 GitHub repository variable `ROM_BASE_URL`（若路径变化）

## 清理 Git 历史中的 ROM

本 issue **不直接改写 Git 历史**，避免影响协作分支。完成本 issue 后，可择机执行：

```bash
# 使用 git-filter-repo（需 pip install git-filter-repo）
git filter-repo --path roms/ --invert-paths

# 或使用 BFG Repo-Cleaner
# java -jar bfg.jar --delete-folders roms
```

⚠️ 重写历史会改变所有 commit hash，需要团队成员配合重新 clone 或 rebase。

## 故障排查

### CI 中 `npm run download:roms` 失败

- 检查 GitHub repository variable `ROM_BASE_URL` 是否设置
- 检查 `ROM_BASE_URL` 是否以 `https://` 开头且不以 `/` 结尾
- 检查 CDN 是否公开可访问
- 检查 `roms/manifest.json` 是否已提交

### 中文文件名 404

- CDN 需支持 URL 编码后的中文路径
- 下载脚本使用 `encodeURIComponent`，确保文件名与清单一致

### 校验失败

- 重新上传对应 ROM 到 CDN
- 或在本地强制重新下载：`ROM_FORCE_DOWNLOAD=1 npm run download:roms`
