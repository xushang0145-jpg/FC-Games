# 任务: 修复 RPG 游戏颜色错位

**输入**: 设计文档来自 `/specs/003-fix-rpg-color-misalign/`

**前置条件**: plan.md (已加载), spec.md (已加载), research.md (已加载), data-model.md (已加载), quickstart.md (已加载)

**测试**: 本功能不新增测试任务——规范中未要求独立单元测试，已有 E2E 测试覆盖渲染路径，修复后运行回归。

**组织**: 单一 P1 用户故事，任务按实现→验证组织。

## 格式: `[ID] [P?] [Story] 描述`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事标签（如 US1）
- 每个描述中包含精确的文件路径

---

## Phase 1: 实现 — User Story 1 (Priority: P1) 🎯 MVP

**目标**: 修复 `src/game/emulator.js` 中帧缓冲到 Canvas ImageData 的 R/B 通道映射，使游戏画面颜色与实际 NES 输出一致。

**独立测试**: 启动开发服务器，加载任意 RPG 类 .nes ROM，目视确认角色皮肤、天空、UI 文字颜色不再偏色，红色区域为正红、蓝色区域为正蓝。

- [x] T001 [US1] 交换 R/B 通道提取表达式：将 `src/game/emulator.js` 中 `updateImageDataFromFrame` 函数内 `d[i*4]` 和 `d[i*4+2]` 的赋值表达式互换，使 ImageData R 字节从 `color & 0xFF`（BGR 低字节）获取、B 字节从 `(color >> 16) & 0xFF`（BGR 高字节）获取
- [x] T002 [P] [US1] 修正 `src/game/emulator.js` 中 `updateImageDataFromFrame` 函数前的 JSDoc 注释，将 `0xRRGGBB` 改为 `0xBBGGRR`（BGR 格式）

**检查点**: 此时代码修复已完成，可进入验证阶段。

---

## Phase 2: 验证

**目标**: 确认修复正确且无回归。

- [x] T003 运行 E2E 回归测试：`npx playwright test tests/e2e/game.spec.js`，确认全部通过无新增失败
- [x] T004 按 `quickstart.md` 验证步骤手动确认：至少加载一款 RPG ROM 和一款非 RPG ROM（如超级玛莉），目视确认红蓝通道正确

---

## 依赖与执行顺序

### 阶段依赖

- **实现 (Phase 1)**：无依赖，可立即开始
- **验证 (Phase 2)**：依赖 Phase 1 完成（T001 → T003, T002 可与 T001 并行）

### 用户故事依赖

- **User Story 1 (P1)**：唯一故事，无跨故事依赖

### 并行机会

- T001 和 T002 可并行执行（不同内容：代码逻辑 vs 注释）
- T003 和 T004 可并行执行（E2E 测试 vs 手动验证）

---

## 并行示例: User Story 1

```bash
# Phase 1 - 并行执行修复:
Task: "交换 R/B 通道提取表达式 src/game/emulator.js"
Task: "修正 JSDoc 注释 src/game/emulator.js"

# Phase 2 - 并行验证:
Task: "运行 E2E 回归测试"
Task: "按 quickstart.md 手动验证"
```

---

## 实现策略

### MVP 优先（仅 User Story 1）

1. 完成 T001: 交换 R/B 通道表达式
2. 完成 T002: 修正注释
3. 完成 T003: 运行 E2E 测试确认回归
4. 完成 T004: 手动目视验证
5. **停止并确认**：颜色正确后即可合并

### 增量交付

本次为单一 bug 修复，无多增量交付阶段。全部 4 个任务完成后即为可交付状态。

---

## 备注

- T001 和 T002 均修改 `src/game/emulator.js` 同一函数，但无逻辑冲突：T001 改代码、T002 改注释
- 本次修复不新增文件，不修改 jsnes 源码，不引入新依赖
- 修复前后帧率不应有变化，如有下降需立即回滚检查
