/**
 * 埋点核心模块
 * Supabase 客户端初始化、事件发送、批量上报
 * 当 Supabase 凭证未配置时，所有埋点函数静默降级为无操作
 */

import { createClient } from '@supabase/supabase-js';
import { generateUUID } from './constants.js';
import { getUserId } from './user-id.js';
import { detectDeviceType } from './device.js';
import { getGeoLocation } from './geo.js';
import { enqueue, dequeueAll } from './analytics-queue.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 检测凭证是否有效（非空且非占位符）
const hasCredentials = !!(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.length > 10
);

// 仅在凭证有效时初始化 Supabase 客户端
export const supabase = hasCredentials
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// 每次页面加载生成新的 session_id
const sessionId = generateUUID();

/**
 * 获取当前会话 ID
 * @returns {string}
 */
export function getSessionId() {
  return sessionId;
}

// 缓存地理位置（避免重复请求）
let geoCache = null;

/**
 * 构建完整的事件数据对象
 * @param {Object} baseEvent
 * @returns {Promise<Object>}
 */
async function buildEvent(baseEvent) {
  if (!geoCache) {
    geoCache = await getGeoLocation();
  }

  return {
    user_id: getUserId(),
    session_id: sessionId,
    device_type: detectDeviceType(),
    country: geoCache.country,
    province: geoCache.province,
    city: geoCache.city,
    client_timestamp: new Date().toISOString(),
    ...baseEvent,
  };
}

/**
 * 发送单个事件到 Supabase
 * 凭证缺失时静默跳过，失败时降级到 localStorage 暂存
 * @param {Object} event
 * @returns {Promise<boolean>} 是否成功
 */
async function sendEvent(event) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('events').insert(event);
    if (error) throw error;
    return true;
  } catch {
    enqueue(event);
    return false;
  }
}

/**
 * 批量上报暂存队列中的事件
 * 在页面加载时调用
 */
export async function flushQueue() {
  if (!supabase) return;
  const queue = dequeueAll();
  if (queue.length === 0) return;

  try {
    const { error } = await supabase.from('events').insert(queue);
    if (error) throw error;
  } catch {
    // 批量上报失败，重新入队（保留原数据）
    queue.forEach(enqueue);
  }
}

/**
 * 记录页面浏览事件
 * @param {string} pagePath
 */
export async function trackPageView(pagePath) {
  const event = await buildEvent({
    event_type: 'page_view',
    page_path: pagePath,
  });
  sendEvent(event);
}

/**
 * 记录游戏启动事件
 * @param {string} gameName
 */
export async function trackGameStart(gameName) {
  const event = await buildEvent({
    event_type: 'game_start',
    game_name: gameName,
  });
  sendEvent(event);
}

/**
 * 记录游戏时长事件
 * @param {string} gameName
 * @param {number} durationSeconds
 */
export async function trackGameDuration(gameName, durationSeconds) {
  // 截断到 30 分钟上限
  const cappedDuration = Math.min(durationSeconds, 1800);

  const event = await buildEvent({
    event_type: 'game_duration',
    game_name: gameName,
    duration_seconds: cappedDuration,
  });
  sendEvent(event);
}
