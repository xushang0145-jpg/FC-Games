/**
 * 全局共享常量与工具函数
 * 放置：跨模块复用的常量、无状态工具函数
 */

/**
 * 生成 UUID v4，兼容非安全上下文（如通过 IP 访问）
 * crypto.randomUUID() 仅限 HTTPS / localhost，回退到 crypto.getRandomValues()
 * @returns {string} UUID 字符串
 */
export function generateUUID() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const arr = crypto.getRandomValues(new Uint8Array(16));
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  const hex = Array.from(arr, (b) => b.toString(16).padStart(2, '0'));
  return hex.slice(0, 4).join('') + '-' + hex[4] + hex[5] + '-' + hex[6] + hex[7] + '-' +
    hex[8] + hex[9] + '-' + hex.slice(10).join('');
}

/**
 * 默认按键映射（8 个基础键位）
 * turboA/turboB 为 input.js 在运行时扩展的连发键，不纳入基础默认配置
 */
export const DEFAULT_BINDINGS = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  a: 'KeyK',
  b: 'KeyJ',
  start: 'Digit1',
  select: 'Digit2',
};

/**
 * 操作名称展示标签
 * 用于按键说明、按键设置面板等 UI 场景
 */
export const ACTION_LABELS = {
  up: '↑ 上',
  down: '↓ 下',
  left: '← 左',
  right: '→ 右',
  a: '🅰 A 按钮',
  b: '🅱 B 按钮',
  turboA: '🅰 A 连发',
  turboB: '🅱 B 连发',
  start: '▶ Start',
  select: '🔘 Select',
};
