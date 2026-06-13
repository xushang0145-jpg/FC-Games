/**
 * 存档/读档服务
 * 负责：每款游戏的本地自动/手动存档管理、校验、失败恢复
 */

const SAVESTATE_KEY = 'fc_savestates';
export const SAVESTATE_VERSION = 1;

export const SLOTS = {
  AUTO: 'auto',
  MANUAL: 'manual',
};

/**
 * 计算 ArrayBuffer 的 CRC32
 * @param {ArrayBuffer} buffer
 * @returns {number} 无符号 32 位 CRC
 */
export function computeCrc32(buffer) {
  const bytes = new Uint8Array(buffer);
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readAll() {
  try {
    const raw = localStorage.getItem(SAVESTATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  localStorage.setItem(SAVESTATE_KEY, JSON.stringify(all));
}

/**
 * 保存游戏状态
 * @param {string} romId - ROM 文件名
 * @param {'auto'|'manual'} slot - 存档槽
 * @param {object} state - jsnes 状态对象
 * @param {{crc:number,length:number}} romMeta - ROM 元数据
 * @returns {{success:boolean, reason?:string, createdAt?:string}}
 */
export function saveState(romId, slot, state, romMeta) {
  if (!romId || !slot || !state || !romMeta) {
    return { success: false, reason: '参数缺失' };
  }
  if (slot !== SLOTS.AUTO && slot !== SLOTS.MANUAL) {
    return { success: false, reason: '不支持的存档槽' };
  }

  const all = readAll();
  const gameStates = all[romId] || {};
  const previousSlotData = gameStates[slot] || null;

  const record = {
    romId,
    slot,
    version: SAVESTATE_VERSION,
    createdAt: new Date().toISOString(),
    romCrc: romMeta.crc,
    romLength: romMeta.length,
    state,
  };

  gameStates[slot] = record;
  all[romId] = gameStates;

  try {
    writeAll(all);
  } catch (e) {
    // 写满或写入失败：尝试恢复上一次成功存档
    if (previousSlotData) {
      try {
        gameStates[slot] = previousSlotData;
        all[romId] = gameStates;
        writeAll(all);
      } catch {
        // 恢复也失败时忽略，优先保留其他槽数据
      }
    }
    const isQuota = e && (e.name === 'QuotaExceededError' || e.code === 22);
    return {
      success: false,
      reason: isQuota ? '本地存储空间不足' : '写入存档失败',
    };
  }

  return { success: true, createdAt: record.createdAt };
}

/**
 * 读取游戏状态
 * @param {string} romId
 * @param {'auto'|'manual'} slot
 * @param {{crc:number,length:number}} romMeta
 * @returns {{success:boolean, state?:object, reason?:string, createdAt?:string}}
 */
export function loadState(romId, slot, romMeta) {
  if (!romId || !slot || !romMeta) {
    return { success: false, reason: '参数缺失' };
  }

  const all = readAll();
  const gameStates = all[romId];
  if (!gameStates) {
    return { success: false, reason: '无存档记录' };
  }
  const record = gameStates[slot];
  if (!record) {
    return { success: false, reason: '指定存档槽为空' };
  }

  if (record.romId !== romId) {
    return { success: false, reason: '存档与当前 ROM 不匹配' };
  }
  if (record.version !== SAVESTATE_VERSION) {
    return { success: false, reason: '存档版本不兼容' };
  }
  if (record.romLength !== romMeta.length) {
    return { success: false, reason: 'ROM 长度不匹配' };
  }
  if (record.romCrc !== romMeta.crc) {
    return { success: false, reason: 'ROM 校验失败' };
  }

  return { success: true, state: record.state, createdAt: record.createdAt };
}

/**
 * 判断某槽是否存在存档
 * @param {string} romId
 * @param {'auto'|'manual'} slot
 * @returns {boolean}
 */
export function hasState(romId, slot) {
  const all = readAll();
  return !!all[romId]?.[slot];
}

/**
 * 获取存档信息（不含 state）
 * @param {string} romId
 * @param {'auto'|'manual'} slot
 * @returns {{romId:string,slot:string,version:number,createdAt:string,romCrc:number,romLength:number}|null}
 */
export function getStateInfo(romId, slot) {
  const all = readAll();
  const record = all[romId]?.[slot];
  if (!record) return null;
  const { state, ...info } = record;
  return info;
}

/**
 * 删除某游戏的全部存档（测试/清理用）
 * @param {string} romId
 */
export function clearStates(romId) {
  const all = readAll();
  delete all[romId];
  writeAll(all);
}
