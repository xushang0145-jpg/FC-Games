# 任务：移动端虚拟手柄按钮布局调整

**Input**: 设计文档来自 `/specs/012-mobile-gamepad-layout/`

**Prerequisites**: plan.md, spec.md

---

## Phase 1: 实现

- [ ] T001 修改 `src/game/virtual-gamepad.js` — 调整 DOM 插入顺序：dpadEl → funcsEl → actionsEl（原顺序：dpadEl → actionsEl → funcsEl）
- [ ] T002 验证 `src/game/virtual-gamepad.css` — 确认 flexbox 布局在 DOM 顺序变更后仍正常排列

## Phase 2: 验证

- [ ] T003 Chrome DevTools 移动模拟器 → 验证布局：十字键(左) → 功能键(中) → AB(右)
- [ ] T004 触摸测试：每个按钮触摸响应正确
- [ ] T005 小屏 (<360px)、横屏、竖屏三种模式验证
- [ ] T006 运行 `npx playwright test tests/e2e/mobile-gamepad.spec.js` 验证 E2E 通过
