# 任务：Web 端默认按键 Start/Select 互换

**Input**: 设计文档来自 `/specs/013-swap-start-select-keys/`

**Prerequisites**: plan.md, spec.md

---

## Phase 1: 实现

- [ ] T001 [P] 修改 `src/game/input.js` — DEFAULT_BINDINGS 中 `start: 'Digit1'`, `select: 'Digit2'`
- [ ] T002 [P] 检查并更新 `src/list/detail-modal.js` — 确认默认按键展示是否需要同步调整
- [ ] T003 检查 `tests/e2e/game.spec.js` 及其他测试 — 确认没有对 Digit1/2 的硬编码假设需要更新

## Phase 2: 验证

- [ ] T004 清除 localStorage → 打开游戏页 → 按 1 触发 Start、按 2 触发 Select
- [ ] T005 列表页详情浮层 → 按键说明展示正确的 Start/Select 默认键
- [ ] T006 已有自定义配置用户验证 → 配置不受影响
- [ ] T007 运行 `npm run build` 和 `npx playwright test` 确认构建和测试通过
