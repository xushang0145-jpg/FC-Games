# 数据模型: 帧缓冲格式定义

**日期**: 2026-06-06

## 帧缓冲 (jsnes → 宿主代码)

| 属性 | 值 |
|------|----|
| 尺寸 | 256 × 240 像素 |
| 元素类型 | 24 位无符号整数（JavaScript Number） |
| 字节序 | BGR（0xBBGGRR），大端语义 |
| 示例 | 纯蓝色 (R=0,G=0,B=255) → `0xFF0000` |

### 字节布局（BGR 格式）

```
位 23..16: Blue  (B)  — 偏移 2 字节
位 15..8:  Green (G)  — 偏移 1 字节
位 7..0:   Red   (R)  — 偏移 0 字节
```

## ImageData (Canvas 2D API)

| 属性 | 值 |
|------|----|
| 尺寸 | 256 × 240 像素 |
| 元素类型 | `Uint8ClampedArray`，每像素 4 字节 |
| 字节序 | RGBA（小端字节序） |

### 字节布局（RGBA 格式）

```
字节 0: Red   (R)
字节 1: Green (G)
字节 2: Blue  (B)
字节 3: Alpha (A) — 固定 255
```

## 映射关系

```
帧缓冲 BGR              →  ImageData RGBA
─────────────────────────────────────────
(color >> 0)  & 0xFF    →  data[i*4 + 0]  (R ← 低字节)
(color >> 8)  & 0xFF    →  data[i*4 + 1]  (G ← 中间字节)
(color >> 16) & 0xFF    →  data[i*4 + 2]  (B ← 高字节)
                        →  data[i*4 + 3]  (A ← 常量 255)
```

## 调色板

jsnes 内置 NTSC 64 色调色板（`PaletteTable.loadNTSCPalette()`），格式同上 BGR。

颜色值经过调色板查表后写入帧缓冲，不经过额外色彩空间转换。
