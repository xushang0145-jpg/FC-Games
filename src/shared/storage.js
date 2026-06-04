const STORAGE_KEY = 'nes_keybindings';

/**
 * 读取某游戏的按键配置
 * @param {string} gameId - ROM 文件名（如 "超级玛莉.nes"）
 * @returns {object|null} 按键映射对象，无配置时返回 null
 */
export function loadKeyBindings(gameId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[gameId] || null;
  } catch {
    return null;
  }
}

/**
 * 保存某游戏的按键配置
 * @param {string} gameId - ROM 文件名
 * @param {object} bindings - 包含 up/down/left/right/a/b/start/select 8 个键位的对象
 */
export function saveKeyBindings(gameId, bindings) {
  const raw = localStorage.getItem(STORAGE_KEY);
  const all = raw ? JSON.parse(raw) : {};
  all[gameId] = bindings;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * 删除某游戏的按键配置（恢复默认）
 * @param {string} gameId - ROM 文件名
 */
export function resetKeyBindings(gameId) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const all = JSON.parse(raw);
  delete all[gameId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
