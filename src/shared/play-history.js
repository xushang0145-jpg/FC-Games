/**
 * 游玩记录存储模块
 * localStorage 格式：{ "超级玛莉.nes": "2026-06-05T10:30:00.000Z", ... }
 */
const STORAGE_KEY = 'fc_play_history';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage 满或不可用，静默失败 */
  }
}

export function recordPlayHistory(gameId) {
  if (!gameId || typeof gameId !== 'string') return;
  const data = readAll();
  data[gameId] = new Date().toISOString();
  writeAll(data);
}

export function getPlayHistory(gameId) {
  const data = readAll();
  if (data[gameId]) {
    return { lastPlayedAt: data[gameId] };
  }
  return { lastPlayedAt: null };
}

export function getAllPlayHistory() {
  return readAll();
}
