/**
 * 统计仪表盘 UI 渲染
 */

function getRankClass(index) {
  if (index === 0) return 'rank--1';
  if (index === 1) return 'rank--2';
  if (index === 2) return 'rank--3';
  return 'rank--other';
}

/**
 * 渲染 KPI 卡片
 */
export function renderKpiCards(container, { totalPages, totalStarts, totalDuration, uv }) {
  container.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-card__label">总浏览量</div>
      <div class="kpi-card__value">${totalPages.toLocaleString()}</div>
      <div class="kpi-card__unit">次页面访问</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card__label">游戏启动次数</div>
      <div class="kpi-card__value">${totalStarts.toLocaleString()}</div>
      <div class="kpi-card__unit">次游戏启动</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card__label">总游戏时长</div>
      <div class="kpi-card__value">${totalDuration.toLocaleString()}</div>
      <div class="kpi-card__unit">分钟</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card__label">独立访客</div>
      <div class="kpi-card__value">${uv.toLocaleString()}</div>
      <div class="kpi-card__unit">位用户</div>
    </div>
  `;
}

/**
 * 渲染页面浏览排行
 */
export function renderPageViewTable(tbody, rows) {
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:40px">暂无数据</td></tr>';
    return;
  }

  const maxCount = rows[0].count || 1;
  tbody.innerHTML = rows.map((row, i) => `
    <tr>
      <td><div class="rank ${getRankClass(i)}">${i + 1}</div></td>
      <td>${escapeHtml(row.path)}</td>
      <td><strong>${row.count}</strong></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="bar-track"><div class="bar-fill bar-fill--red" style="width:${Math.round(row.count / maxCount * 100)}%"></div></div>
          <span style="font-size:12px;color:var(--text-dim)">${row.percent}%</span>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * 渲染游戏数据排行
 */
export function renderGameStatsTable(tbody, rows) {
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:40px">暂无数据</td></tr>';
    return;
  }

  const maxStarts = rows[0].startCount || 1;
  tbody.innerHTML = rows.map((row, i) => `
    <tr>
      <td><div class="rank ${getRankClass(i)}">${i + 1}</div></td>
      <td>${escapeHtml(row.name)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <strong>${row.startCount}</strong>
          <div class="bar-track"><div class="bar-fill bar-fill--gold" style="width:${Math.round(row.startCount / maxStarts * 100)}%"></div></div>
        </div>
      </td>
      <td><span style="font-weight:600">${row.totalDuration}</span> <span style="color:var(--text-dim);font-size:13px">分钟</span></td>
    </tr>
  `).join('');
}

/**
 * 渲染终端类型分布
 */
export function renderDeviceGrid(container, rows) {
  if (rows.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:40px;grid-column:1/-1">暂无数据</div>';
    return;
  }

  const icons = { desktop: '💻', mobile: '📱', tablet: '📘', unknown: '❓' };
  const colors = { desktop: 'var(--accent)', mobile: 'var(--accent-gold)', tablet: 'var(--success)', unknown: 'var(--text-dim)' };

  container.innerHTML = rows.map(r => `
    <div class="device-item">
      <div class="device-item__icon">${icons[r.type] || '❓'}</div>
      <div class="device-item__label">${r.type}</div>
      <div class="device-item__value" style="color:${colors[r.type] || 'var(--text-dim)'}">${r.percent}%</div>
      <div class="device-item__percent">${r.count} 次访问</div>
    </div>
  `).join('');
}

/**
 * 渲染城市排行
 */
export function renderCityTable(tbody, rows) {
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:40px">暂无数据</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map((row, i) => `
    <tr>
      <td><div class="rank ${getRankClass(i)}">${i + 1}</div></td>
      <td>${escapeHtml(row.city)}</td>
      <td><strong>${row.count}</strong></td>
    </tr>
  `).join('');
}

/**
 * 渲染空状态
 */
export function renderEmptyState(el, totalDataCount) {
  if (totalDataCount === 0) {
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
