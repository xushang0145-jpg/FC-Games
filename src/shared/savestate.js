/**
 * 存档/读档核心模块
 * localStorage 格式：{ "超级玛莉.nes": { auto: {...}, manual: {...} }, ... }
 */

const STORAGE_KEY = 'fc_savestates';
const SAVESTATE_VERSION = 1;

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
    return true;
  } catch {
    // localStorage 满或不可用，静默失败
    return false;
  }
}

function createSavestate(gameId, slot, state) {
  return {
    romId: gameId,
    slot,
    version: SAVESTATE_VERSION,
    createdAt: new Date().toISOString(),
    state,
  };
}

export function saveAutoSavestate(gameId, state) {
  return saveSavestate(gameId, 'auto', state);
}

export function saveManualSavestate(gameId, state) {
  return saveSavestate(gameId, 'manual', state);
}

function saveSavestate(gameId, slot, state) {
  if (!gameId || typeof gameId !== 'string' || !state) return false;
  const all = readAll();
  if (!all[gameId]) all[gameId] = {};
  all[gameId][slot] = createSavestate(gameId, slot, state);
  return writeAll(all);
}

export function loadSavestate(gameId, slot) {
  if (!gameId || typeof gameId !== 'string') return null;
  const all = readAll();
  const record = all[gameId]?.[slot];
  if (!record) return null;
  if (record.version !== SAVESTATE_VERSION) return null;
  if (record.romId !== gameId) return null;
  return record;
}

export function hasSavestate(gameId, slot) {
  return loadSavestate(gameId, slot) !== null;
}

export function deleteSavestate(gameId, slot) {
  const all = readAll();
  if (!all[gameId]) return false;
  delete all[gameId][slot];
  if (Object.keys(all[gameId]).length === 0) {
    delete all[gameId];
  }
  return writeAll(all);
}

export function listSavestates(gameId) {
  if (!gameId) return [];
  const all = readAll();
  return Object.keys(all[gameId] || {});
}

export { SAVESTATE_VERSION };
