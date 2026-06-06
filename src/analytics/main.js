/**
 * 统计仪表盘页面入口
 */

import {
  getKpiSummary, getPageViewStats, getGameStats,
  getDeviceStats, getCityStats, exportRawEvents,
} from './stats-api.js';
import {
  renderKpiCards, renderPageViewTable, renderGameStatsTable,
  renderDeviceGrid, renderCityTable, renderEmptyState,
} from './stats-ui.js';

let currentRange = 'today';

// 时间筛选器切换
document.getElementById('time-filter').addEventListener('click', (e) => {
  if (!e.target.classList.contains('time-filter__btn')) return;
  document.querySelectorAll('.time-filter__btn').forEach(b => b.classList.remove('time-filter__btn--active'));
  e.target.classList.add('time-filter__btn--active');
  currentRange = e.target.dataset.range;
  loadData();
});

// 导出按钮
document.getElementById('export-btn').addEventListener('click', () => {
  exportRawEvents(currentRange);
});

// 返回首页
document.getElementById('back-btn').addEventListener('click', () => {
  window.location.href = '/';
});

// 加载所有数据
async function loadData() {
  const [
    kpi, pages, games, devices, cities,
  ] = await Promise.all([
    getKpiSummary(currentRange),
    getPageViewStats(currentRange),
    getGameStats(currentRange),
    getDeviceStats(currentRange),
    getCityStats(currentRange),
  ]);

  renderKpiCards(document.getElementById('kpi-grid'), kpi);
  renderPageViewTable(document.getElementById('page-view-body'), pages);
  renderGameStatsTable(document.getElementById('game-stats-body'), games);
  renderDeviceGrid(document.getElementById('device-grid'), devices);
  renderCityTable(document.getElementById('city-stats-body'), cities);

  const totalData = kpi.totalPages + kpi.totalStarts;
  renderEmptyState(document.getElementById('empty-state'), totalData);
}

// 首次加载
loadData();
