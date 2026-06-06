/**
 * 统计仪表盘 API 封装
 * Supabase 查询（聚合统计、原始数据导出）
 */

import { supabase } from '../shared/analytics.js';

/**
 * 获取时间范围的起始和结束 ISO 字符串
 */
function getTimeRange(range) {
  const now = new Date();
  let start;

  switch (range) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week': {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
    default:
      return { start: null, end: null };
  }

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
}

/**
 * KPI 汇总
 */
export async function getKpiSummary(range) {
  const { start, end } = getTimeRange(range);
  let query = supabase.from('events').select('event_type, user_id, duration_seconds', { count: 'exact' });
  if (start) query = query.gte('client_timestamp', start);
  if (end) query = query.lte('client_timestamp', end);

  const { data, count, error } = await query;
  if (error || !data) return { totalPages: 0, totalStarts: 0, totalDuration: 0, uv: 0 };

  const totalPages = data.filter(e => e.event_type === 'page_view').length;
  const totalStarts = data.filter(e => e.event_type === 'game_start').length;
  const totalDuration = data.filter(e => e.event_type === 'game_duration').reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
  const uniqueUsers = new Set(data.map(e => e.user_id)).size;

  return {
    totalPages,
    totalStarts,
    totalDuration: Math.floor(totalDuration / 60), // 转换为分钟
    uv: uniqueUsers,
  };
}

/**
 * 页面浏览排行
 */
export async function getPageViewStats(range) {
  const { start, end } = getTimeRange(range);
  let query = supabase.from('events')
    .select('page_path, count')
    .eq('event_type', 'page_view');

  if (start) query = query.gte('client_timestamp', start);
  if (end) query = query.lte('client_timestamp', end);

  const { data, error } = await query;
  if (error || !data) return [];

  const counts = {};
  for (const row of data) {
    counts[row.page_path] = (counts[row.page_path] || 0) + 1;
  }

  const total = Object.values(counts).reduce((s, c) => s + c, 0) || 1;
  return Object.entries(counts)
    .map(([path, count]) => ({ path, count, percent: Math.round(count / total * 100) }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 游戏数据排行
 */
export async function getGameStats(range) {
  const { start, end } = getTimeRange(range);
  let query = supabase.from('events')
    .select('game_name, event_type, duration_seconds')
    .in('event_type', ['game_start', 'game_duration'])
    .not('game_name', 'is', null);

  if (start) query = query.gte('client_timestamp', start);
  if (end) query = query.lte('client_timestamp', end);

  const { data, error } = await query;
  if (error || !data) return [];

  const stats = {};
  for (const row of data) {
    if (!stats[row.game_name]) {
      stats[row.game_name] = { name: row.game_name, startCount: 0, totalDuration: 0 };
    }
    if (row.event_type === 'game_start') stats[row.game_name].startCount++;
    if (row.event_type === 'game_duration') stats[row.game_name].totalDuration += (row.duration_seconds || 0);
  }

  return Object.values(stats)
    .map(s => ({ ...s, totalDuration: Math.floor(s.totalDuration / 60) }))
    .sort((a, b) => b.startCount - a.startCount);
}

/**
 * 终端类型分布
 */
export async function getDeviceStats(range) {
  const { start, end } = getTimeRange(range);
  let query = supabase.from('events')
    .select('device_type, count')
    .eq('event_type', 'page_view');

  if (start) query = query.gte('client_timestamp', start);
  if (end) query = query.lte('client_timestamp', end);

  const { data, error } = await query;
  if (error || !data) return [];

  const counts = {};
  for (const row of data) {
    const type = row.device_type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  }

  const total = Object.values(counts).reduce((s, c) => s + c, 0) || 1;
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count, percent: Math.round(count / total * 100) }));
}

/**
 * Top 10 访问城市
 */
export async function getCityStats(range) {
  const { start, end } = getTimeRange(range);
  let query = supabase.from('events')
    .select('city, country, count')
    .eq('event_type', 'page_view')
    .not('city', 'is', null);

  if (start) query = query.gte('client_timestamp', start);
  if (end) query = query.lte('client_timestamp', end);

  const { data, error } = await query;
  if (error || !data) return [];

  const counts = {};
  for (const row of data) {
    const key = `${row.city}, ${row.country || ''}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * 导出原始事件数据为 JSON 文件
 */
export async function exportRawEvents(range) {
  const { start, end } = getTimeRange(range);
  let query = supabase.from('events')
    .select('*')
    .order('client_timestamp', { ascending: false });

  if (start) query = query.gte('client_timestamp', start);
  if (end) query = query.lte('client_timestamp', end);

  const { data, error } = await query;
  if (error) {
    alert('导出失败：' + error.message);
    return;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
