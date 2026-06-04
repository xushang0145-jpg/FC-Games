# URL 参数契约：游戏页面

## game.html 查询参数

| 参数 | 必需 | 格式 | 示例 | 说明 |
|------|------|------|------|------|
| rom | 是 | ROM 文件名（含 .nes） | `?rom=超级玛莉.nes` | 指定要加载的游戏 ROM |

## 完整 URL 示例

```
https://example.com/game.html?rom=超级玛莉.nes
https://example.com/game.html?rom=魂斗罗.nes
```

## 列表页生成链接

```js
const gameUrl = `/game.html?rom=${encodeURIComponent(game.id)}`;
window.open(gameUrl, '_blank');
```

## 游戏页解析

```js
const params = new URLSearchParams(window.location.search);
const romFile = params.get('rom');  // "超级玛莉.nes"

if (!romFile) {
  // 缺少参数 → 显示错误提示
}
```

## 边界条件

- `rom` 参数缺失 → 显示"未指定游戏"错误，提供返回列表页链接
- `rom` 参数指向不存在的 ROM → fetch 404 → 显示"游戏加载失败"并提供重试/返回
- `rom` 参数包含路径遍历（如 `../`）→ 拒绝加载，仅允许匹配 `/roms/*.nes` 的文件名
