/**
 * 匿名用户标识模块
 * 首次访问时生成 UUID，持久化到 localStorage
 */

const STORAGE_KEY = 'fc_user_id';

function generateUUID() {
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
 * 获取或创建匿名 user_id
 * @returns {string} UUID 字符串
 */
export function getUserId() {
  let uid = localStorage.getItem(STORAGE_KEY);
  if (!uid) {
    uid = generateUUID();
    try {
      localStorage.setItem(STORAGE_KEY, uid);
    } catch {
      // localStorage 不可用或已满，返回临时 UID（不持久化）
    }
  }
  return uid;
}
