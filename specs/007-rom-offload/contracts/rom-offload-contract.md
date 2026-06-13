# ROM 迁出契约

## 环境变量

### `ROM_BASE_URL`

- **用途**: ROM CDN 公共访问前缀
- **格式**: `https://<host>/<path>`
- **约束**:
  - 必须以 `https://` 开头
  - 不得以 `/` 结尾
  - 路径中不得包含查询参数
- **正确示例**: `https://pub-123.r2.dev/fc-games`
- **错误示例**: `https://pub-123.r2.dev/fc-games/`

### `ROM_FORCE_DOWNLOAD`

- **用途**: 强制重新下载所有 ROM，即使本地文件已存在且校验通过
- **格式**: `1` 或 `true` 表示启用
- **默认**: 未设置时跳过已存在的有效 ROM

## 文件路径

### 本地 ROM 目录

- **路径**: `<repo-root>/roms/`
- **内容**: 仅 `.nes` 文件和 `manifest.json`
- **Git 状态**: 被 `.gitignore` 忽略，不进入版本控制

### ROM 清单

- **路径**: `<repo-root>/roms/manifest.json`
- **提交策略**: 必须提交到 Git，作为下载和校验的事实来源
- **格式**:
  ```json
  {
    "version": 1,
    "generatedAt": "2026-06-13T00:00:00Z",
    "files": [
      { "name": "超级玛莉.nes", "sha256": "...", "size": 40976 }
    ]
  }
  ```

## 下载 URL 构造

```
${ROM_BASE_URL}/${encodeURIComponent(fileName)}
```

例如：`ROM_BASE_URL=https://pub-123.r2.dev/fc-games`，文件名为 `超级玛莉.nes`：

```
https://pub-123.r2.dev/fc-games/%E8%B6%85%E7%BA%A7%E7%8E%9B%E8%8E%89.nes
```

## Vite 构建行为

- 构建时若 `roms/` 存在，则复制所有 `.nes` 到 `dist/roms/`
- 若 `roms/` 不存在或为空，打印警告，构建继续（兼容未来纯 CDN 模式）
- 不修改前端 ROM 引用路径

## CI/CD 行为

- **CI**: `npm ci` → `npm run download:roms` → `npm test` → `npm run test:e2e` → `npm run build`
- **Release**: `npm ci` → `npm run download:roms` → `npm run build` → 打包附件
- **性能基准**: 作为独立 job 在 `test` job 之后运行

## 变更边界

- 不修改 `src/` 业务代码
- 不替换 `jsnes` 或变更模拟器核心
- 不直接改写 Git 历史（另见 `docs/rom-offload.md` 清理步骤）
