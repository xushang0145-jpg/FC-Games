# 研究: RPG 颜色错位根本原因

**日期**: 2026-06-06

**问题**: NES 模拟器渲染画面中红色和蓝色通道互换，表现为角色肤色偏蓝紫、天空偏橙红。

## 调色板格式确认

### jsnes 调色板来源

jsnes 在 `src/ppu.js` 的 `PaletteTable.loadNTSCPalette()` 中定义了 64 色 NTSC 调色板：

```javascript
this.curTable = [0x525252, 0xB40000, 0xA00000, 0xB1003D, ...];
```

这些数值通过 `getRgb(r, g, b)` 生成：

```javascript
getRgb: function (r, g, b) {
    return (r << 16) | (g << 8) | b;
}
```

### 格式验证

通过标准 NES NTSC 调色板交叉验证确认**调色板实际为 BGR 格式**（0xBBGGRR）：

| 索引 | 调色板值 | BGR 解读 (B,G,R) | NES 预期颜色 | 匹配 |
|------|----------|-------------------|-------------|------|
| $00 | 0x525252 | (82,82,82) | 灰 | ✅ |
| $01 | 0xB40000 | (180,0,0) | 蓝 | ✅ |
| $02 | 0xA00000 | (160,0,0) | 深蓝 | ✅ |
| $03 | 0xB1003D | (177,0,61) | 深紫 | ✅ |
| $05 | 0x00005B | (0,0,91) | 深红 | ✅ |
| $09 | 0x084A08 | (8,74,8) | 深绿 | ✅ |
| $11 | 0xFF4000 | (255,64,0) | 亮蓝 | ✅ |
| $16 | 0x0019BC | (0,25,188) | 亮红 | ✅ |
| $1C | 0x00AB00 | (0,171,0) | 亮绿 | ✅ |

### 当前代码的通道映射错误

`src/game/emulator.js:21-30` 的 `updateImageDataFromFrame` 函数按 0xRRGGBB 格式提取通道：

```javascript
d[i * 4]     = (color >> 16) & 0xFF;  // 提取 BGR 的 B 字节 → 写入 ImageData R 位置 ❌
d[i * 4 + 1] = (color >> 8) & 0xFF;   // 提取 BGR 的 G 字节 → 写入 ImageData G 位置 ✅
d[i * 4 + 2] = color & 0xFF;          // 提取 BGR 的 R 字节 → 写入 ImageData B 位置 ❌
```

### 修复方案

**决策**: 交换 R 和 B 通道的提取表达式

**理由**: jsnes 调色板固定为 BGR 格式，Canvas ImageData 固定为 RGBA 格式。修复在宿主代码中进行一次通道重映射，而非修改 jsnes 源码。

**修复后代码**:
```javascript
d[i * 4]     = color & 0xFF;          // 提取 BGR 的 R 字节 → 写入 ImageData R 位置 ✅
d[i * 4 + 1] = (color >> 8) & 0xFF;   // 提取 BGR 的 G 字节 → 写入 ImageData G 位置 ✅
d[i * 4 + 2] = (color >> 16) & 0xFF;  // 提取 BGR 的 B 字节 → 写入 ImageData B 位置 ✅
```

**备选方案被拒绝**:
- 修改 jsnes 调色板数组（重新编码为 0xRRGGBB）: 会破坏 jsnes 内部一致性，且 PAL 调色板有相同格式，增加修改面
- Uint32Array 共享缓冲区方案: 增加代码复杂度，且 jsnes 官方示例本身也使用该技巧并存在同样的隐式端序依赖

**性能影响**: 无。交换两条赋值语句，不改变循环内的操作数量和类型。
