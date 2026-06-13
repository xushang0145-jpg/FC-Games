/**
 * 统计仪表盘 API 封装
 * 通过 Supabase RPC 调用服务端聚合函数，不再把原始 events 拉到浏览器端聚合
 * Supabase 未配置时所有函数返回空数据
 */

import { supabase } from '../shared/analytics.js';

/**
 * 获取时间范围的起始和结束 ISO 字符串（统一使用 UTC，避免客户端时区不一致）
 * 返回 null 表示不限制该侧边界
 */
function getTimeRange(range) {
  const now = new Date();
  let start;

  switch (range) {
    case 'today':
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      break;
    case 'week': {
      const day = now.getUTCDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset));
      start.setUTCHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
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

const EMPTY_KPI = { totalPages: 0, totalStarts: 0, totalDuration: 0, uv: 0 };

/**
 * KPI 汇总
 */
export async function getKpiSummary(range) {
  if (!supabase) return { ...EMPTY_KPI };

  const { start, end } = getTimeRange(range);
  try {
    const { data, error } = await supabase.rpc('get_dashboard_kpi_summary', {
      start_time: start,
      end_time: end,
    });

    if (error || !data || data.length === 0) {
      console.error('KPI 汇总查询失败:', error?.message);
      return { ...EMPTY_KPI };
    }

    const row = data[0];
    return {
      totalPages: Number(row.total_pages || 0),
      totalStarts: Number(row.total_starts || 0),
      totalDuration: Number(row.total_duration_minutes || 0),
      uv: Number(row.uv || 0),
    };
  } catch (err) {
    console.error('KPI 汇总查询异常:', err.message);
    return { ...EMPTY_KPI };
  }
}

/**
 * 页面浏览排行
 */
export async function getPageViewStats(range) {
  if (!supabase) return [];

  const { start, end } = getTimeRange(range);
  try {
    const { data, error } = await supabase.rpc('get_dashboard_page_view_stats', {
      start_time: start,
      end_time: end,
    });

    if (error || !data) {
      console.error('页面排行查询失败:', error?.message);
      return [];
    }

    return data.map(row => ({
      path: row.path,
      count: Number(row.count || 0),
      percent: Number(row.percent || 0),
    }));
  } catch (err) {
    console.error('页面排行查询异常:', err.message);
    return [];
  }
}

/**
 * 游戏数据排行
 */
export async function getGameStats(range) {
  if (!supabase) return [];

  const { start, end } = getTimeRange(range);
  try {
    const { data, error } = await supabase.rpc('get_dashboard_game_stats', {
      start_time: start,
      end_time: end,
    });

    if (error || !data) {
      console.error('游戏排行查询失败:', error?.message);
      return [];
    }

    return data.map(row => ({
      name: row.name,
      startCount: Number(row.start_count || 0),
      totalDuration: Number(row.total_duration_minutes || 0),
    }));
  } catch (err) {
    console.error('游戏排行查询异常:', err.message);
    return [];
  }
}

/**
 * 终端类型分布
 */
export async function getDeviceStats(range) {
  if (!supabase) return [];

  const { start, end } = getTimeRange(range);
  try {
    const { data, error } = await supabase.rpc('get_dashboard_device_stats', {
      start_time: start,
      end_time: end,
    });

    if (error || !data) {
      console.error('设备分布查询失败:', error?.message);
      return [];
    }

    return data.map(row => ({
      type: row.type,
      count: Number(row.count || 0),
      percent: Number(row.percent || 0),
    }));
  } catch (err) {
    console.error('设备分布查询异常:', err.message);
    return [];
  }
}

/**
 * Top 10 访问城市
 */
export async function getCityStats(range) {
  if (!supabase) return [];

  const { start, end } = getTimeRange(range);
  try {
    const { data, error } = await supabase.rpc('get_dashboard_city_stats', {
      start_time: start,
      end_time: end,
    });

    if (error || !data) {
      console.error('城市排行查询失败:', error?.message);
      return [];
    }

    return data.map(row => ({
      city: row.city,
      count: Number(row.count || 0),
    }));
  } catch (err) {
    console.error('城市排行查询异常:', err.message);
    return [];
  }
}

/**
 * 导出原始事件数据为 JSON 文件
 * 仍从 events 表拉取，但按时间范围过滤并限制 10000 条，避免大数据量拖垮浏览器
 */
export async function exportRawEvents(range) {
  if (!supabase) {
    alert('Supabase 未配置，无法导出数据。');
    return;
  }

  const { start, end } = getTimeRange(range);
  try {
    let query = supabase.from('events')
      .select('*')
      .order('client_timestamp', { ascending: false })
      .limit(10000);

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
  } catch (err) {
    alert('导出失败：' + err.message);
  }
}
