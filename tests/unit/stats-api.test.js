import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('../../src/shared/analytics.js', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import {
  getKpiSummary,
  getPageViewStats,
  getGameStats,
  getDeviceStats,
  getCityStats,
  exportRawEvents,
} from '../../src/analytics/stats-api.js';

describe('stats-api', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-13T12:00:00Z'));
    global.URL.createObjectURL = vi.fn(() => 'blob://mock');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getKpiSummary', () => {
    it('返回服务端聚合后的 KPI 数据', async () => {
      mockRpc.mockResolvedValue({
        data: [{ total_pages: 120, total_starts: 45, total_duration_minutes: 88, uv: 32 }],
        error: null,
      });

      const result = await getKpiSummary('today');

      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_kpi_summary', {
        start_time: '2026-06-13T00:00:00.000Z',
        end_time: '2026-06-13T12:00:00.000Z',
      });
      expect(result).toEqual({ totalPages: 120, totalStarts: 45, totalDuration: 88, uv: 32 });
    });

    it('RPC 出错时返回空 KPI', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'timeout' } });
      const result = await getKpiSummary('week');
      expect(result).toEqual({ totalPages: 0, totalStarts: 0, totalDuration: 0, uv: 0 });
    });

    it('all 范围不传递时间边界', async () => {
      mockRpc.mockResolvedValue({
        data: [{ total_pages: 0, total_starts: 0, total_duration_minutes: 0, uv: 0 }],
        error: null,
      });
      await getKpiSummary('all');
      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_kpi_summary', {
        start_time: null,
        end_time: null,
      });
    });
  });

  describe('getPageViewStats', () => {
    it('返回页面浏览排行', async () => {
      mockRpc.mockResolvedValue({
        data: [
          { path: '/', count: 80, percent: 80 },
          { path: '/game.html', count: 20, percent: 20 },
        ],
        error: null,
      });

      const result = await getPageViewStats('today');

      expect(result).toEqual([
        { path: '/', count: 80, percent: 80 },
        { path: '/game.html', count: 20, percent: 20 },
      ]);
    });

    it('出错时返回空数组', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'timeout' } });
      const result = await getPageViewStats('today');
      expect(result).toEqual([]);
    });
  });

  describe('getGameStats', () => {
    it('返回游戏排行', async () => {
      mockRpc.mockResolvedValue({
        data: [
          { name: '超级玛莉', start_count: 30, total_duration_minutes: 60 },
          { name: '魂斗罗', start_count: 15, total_duration_minutes: 28 },
        ],
        error: null,
      });

      const result = await getGameStats('month');

      expect(result).toEqual([
        { name: '超级玛莉', startCount: 30, totalDuration: 60 },
        { name: '魂斗罗', startCount: 15, totalDuration: 28 },
      ]);
    });

    it('出错时返回空数组', async () => {
      mockRpc.mockRejectedValue(new Error('network'));
      const result = await getGameStats('today');
      expect(result).toEqual([]);
    });
  });

  describe('getDeviceStats', () => {
    it('返回设备分布', async () => {
      mockRpc.mockResolvedValue({
        data: [
          { type: 'desktop', count: 70, percent: 70 },
          { type: 'mobile', count: 30, percent: 30 },
        ],
        error: null,
      });

      const result = await getDeviceStats('today');

      expect(result).toEqual([
        { type: 'desktop', count: 70, percent: 70 },
        { type: 'mobile', count: 30, percent: 30 },
      ]);
    });
  });

  describe('getCityStats', () => {
    it('返回城市 Top10', async () => {
      mockRpc.mockResolvedValue({
        data: [
          { city: 'Beijing, CN', count: 25 },
          { city: 'Shanghai, CN', count: 18 },
        ],
        error: null,
      });

      const result = await getCityStats('today');

      expect(result).toEqual([
        { city: 'Beijing, CN', count: 25 },
        { city: 'Shanghai, CN', count: 18 },
      ]);
    });
  });

  describe('exportRawEvents', () => {
    it('导出失败时提示错误', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockFrom.mockReturnValue({
        select: () => ({
          order: () => ({
            limit: () => ({
              gte: () => ({
                lte: () => Promise.resolve({ data: [], error: { message: 'timeout' } }),
              }),
            }),
          }),
        }),
      });

      await exportRawEvents('today');
      expect(alertSpy).toHaveBeenCalledWith('导出失败：timeout');
      alertSpy.mockRestore();
    });

    it('按时间范围和 10000 条上限查询原始事件', async () => {
      const orderMock = vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
          }),
        }),
      });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });
      mockFrom.mockReturnValue({ select: selectMock });

      await exportRawEvents('today');

      expect(mockFrom).toHaveBeenCalledWith('events');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(orderMock).toHaveBeenCalledWith('client_timestamp', { ascending: false });
    });
  });
});
