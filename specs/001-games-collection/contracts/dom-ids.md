# DOM 标识契约：E2E 测试选择器

## 列表页 (index.html)

| 元素 | 选择器 | 用途 |
| --- | --- | --- |
| 游戏卡片容器 | `#game-grid` | 网格布局容器 |
| 游戏卡片 | `[data-game-id="<romFileName>"]` | 单个游戏卡片 |
| 游戏卡片名称 | `.game-card__name` | 卡片内名称文本 |
| 搜索输入框 | `#search-input` | 搜索过滤输入 |
| 空结果提示 | `#no-results` | 无匹配时的提示文字 |

## 游戏页 (game.html)

| 元素 | 选择器 | 用途 |
| --- | --- | --- |
| 游戏标题 | `#game-title` | 当前游戏名称显示 |
| 画布 | `#game-canvas` | NES 渲染目标 |
| 启动确认面板 | `#start-panel` | 投币/开始界面 |
| 投币按钮 | `#coin-btn` | 投币操作（发送 Select） |
| 开始按钮 | `#start-btn` | 开始游戏 |
| 按键设置按钮 | `#keybind-btn` | 打开按键设置面板 |
| 按键设置面板 | `#keybind-panel` | 按键映射编辑面板 |
| 按键映射条目 | `[data-action="<up/down/left/right/a/b/start/select>"]` | 单个按键映射 |
| 保存按键按钮 | `#keybind-save` | 保存按键配置 |
| 返回列表链接 | `#back-to-list` | 返回列表页链接 |
| 错误面板 | `#error-panel` | ROM 加载失败提示 |
| 重试按钮 | `#retry-btn` | 重新加载 ROM |
| 浏览器不支持提示 | `#unsupported-banner` | 浏览器不兼容提示 |
