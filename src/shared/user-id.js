/**
 * 匿名用户标识模块
 * 首次访问时生成 UUID，持久化到 localStorage
 */

const STORAGE_KEY = 'fc_user_id';

/**
 * 获取或创建匿名 user_id
 * @returns {string} UUID 字符串
 */
export function getUserId() {
  let uid = localStorage.getItem(STORAGE_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    try {
      localStorage.setItem(STORAGE_KEY, uid);
    } catch {
      // localStorage 不可用或已满，返回临时 UID（不持久化）
    }
  }
  return uid;
}
