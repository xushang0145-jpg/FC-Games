import { loadKeyBindings } from '../shared/storage.js';
import { createDetailModal } from './detail-modal.js';
import { getPlayHistory, getAllPlayHistory } from '../shared/play-history.js';
import { formatRelativeTime } from '../shared/relative-time.js';
import { trackPageView, flushQueue } from '../shared/analytics.js';

// 游戏表情图标（按文件名关键词匹配）
const GAME_ICONS = {
  '玛莉': '🍄', '魂斗罗': '🔫', '神龟': '🐢', '方块': '🧱',
  '坦克': '🔫', '飞机': '✈️', '赛车': '🏎️', '冒险': '🏝️',
  '功夫': '🥊', '双截龙': '👊', '兵蜂': '🐝', '吃豆': '🟡',
  '象棋': '♟️', '麻将': '🀄', '篮球': '🏀', '足球': '⚽',
  '唐老鸭': '🦆', '企鹅': '🐧', '猪': '🐷', '老鼠': '🐭',
  '忍者': '🥷', '龙': '🐲', '狼': '🐺', '蛇': '🐍',
};

function getGameIcon(name) {
  for (const [keyword, icon] of Object.entries(GAME_ICONS)) {
    if (name.includes(keyword)) return icon;
  }
  return '🕹️';
}

// 预加载所有 ROM URL
const romModules = import.meta.glob('/roms/*.nes', { query: '?url', eager: true });

function buildGameList() {
  return Object.keys(romModules)
    .map(path => {
      const fileName = path.split('/').pop();
      const name = fileName.replace(/\.nes$/i, '');
      return { id: fileName, name, romPath: path, url: romModules[path] };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
}

const games = buildGameList();
const detailModal = createDetailModal();

function createCard(game, playRecord) {
  const div = document.createElement('div');
  div.className = 'game-card';
  div.setAttribute('data-game-id', game.id);

  const icon = document.createElement('div');
  icon.className = 'game-card__icon';
  icon.textContent = getGameIcon(game.name);

  const name = document.createElement('div');
  name.className = 'game-card__name';
  name.textContent = game.name;

  div.appendChild(icon);
  div.appendChild(name);

  // 最近玩过标签
  if (playRecord && playRecord.lastPlayedAt) {
    const recentBadge = document.createElement('div');
    recentBadge.className = 'game-card__recent';
    const diff = Date.now() - new Date(playRecord.lastPlayedAt).getTime();
    if (diff < 3600000) {
      recentBadge.textContent = Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) {
      recentBadge.textContent = Math.floor(diff / 3600000) + '小时前';
    } else {
      recentBadge.textContent = Math.floor(diff / 86400000) + '天前';
    }
    div.appendChild(recentBadge);
  }

  div.addEventListener('click', () => {
    const bindings = loadKeyBindings(game.id);
    detailModal.open(game, bindings, playRecord);
  });

  return div;
}

function renderContinueGame() {
  const section = document.getElementById('continue-game');
  const card = document.getElementById('continue-game-card');
  if (!section || !card) return;

  const allHistory = getAllPlayHistory();
  const entries = Object.entries(allHistory).sort((a, b) => {
    return new Date(b[1]).getTime() - new Date(a[1]).getTime();
  });

  if (entries.length === 0) {
    section.style.display = 'none';
    return;
  }

  const [gameId, lastPlayedAt] = entries[0];
  const game = games.find(g => g.id === gameId);
  if (!game) {
    section.style.display = 'none';
    return;
  }

  card.innerHTML = '';
  card.setAttribute('data-game-id', game.id);

  const icon = document.createElement('div');
  icon.className = 'continue-game__icon';
  icon.textContent = getGameIcon(game.name);

  const info = document.createElement('div');
  info.className = 'continue-game__info';

  const name = document.createElement('div');
  name.className = 'continue-game__name';
  name.textContent = game.name;

  const time = document.createElement('div');
  time.className = 'continue-game__time';
  time.textContent = formatRelativeTime(lastPlayedAt);

  info.appendChild(name);
  info.appendChild(time);
  card.appendChild(icon);
  card.appendChild(info);

  card.addEventListener('click', () => {
    window.location.href = '/game.html?rom=' + encodeURIComponent(game.id) + '&continue=1';
  });

  section.style.display = 'block';
}

let currentFilter = 'all'; // 'all' | 'recent'

function renderGrid(filterText = '') {
  const grid = document.getElementById('game-grid');
  const emptyState = document.getElementById('empty-state');
  grid.innerHTML = '';

  // 按名称搜索过滤
  let filtered = filterText
    ? games.filter(g => g.name.includes(filterText))
    : games;

  // 按最近玩过过滤
  if (currentFilter === 'recent') {
    const allHistory = getAllPlayHistory();
    filtered = filtered.filter(g => allHistory[g.id]);
    // 按最近游玩时间排序
    filtered.sort((a, b) => {
      const ta = new Date(allHistory[a.id]).getTime();
      const tb = new Date(allHistory[b.id]).getTime();
      return tb - ta;
    });
  }

  if (filtered.length === 0) {
    emptyState.classList.add('empty-state--visible');
  } else {
    emptyState.classList.remove('empty-state--visible');
    filtered.forEach(g => {
      const playRecord = getPlayHistory(g.id);
      grid.appendChild(createCard(g, playRecord));
    });
  }

  document.getElementById('game-count').textContent = '共 ' + games.length + ' 款游戏';
}

// 创建筛选标签 UI
function createFilterTags() {
  const searchBar = document.querySelector('.search-bar');
  const tags = document.createElement('div');
  tags.className = 'filter-tags';

  const allTag = document.createElement('button');
  allTag.className = 'filter-tag filter-tag--active';
  allTag.textContent = '全部';
  allTag.addEventListener('click', () => {
    currentFilter = 'all';
    allTag.classList.add('filter-tag--active');
    recentTag.classList.remove('filter-tag--active');
    renderGrid(document.getElementById('search-input').value.trim());
  });

  const recentTag = document.createElement('button');
  recentTag.className = 'filter-tag';
  recentTag.textContent = '⭐ 最近玩过';
  recentTag.addEventListener('click', () => {
    currentFilter = 'recent';
    recentTag.classList.add('filter-tag--active');
    allTag.classList.remove('filter-tag--active');
    renderGrid(document.getElementById('search-input').value.trim());
  });

  tags.appendChild(allTag);
  tags.appendChild(recentTag);
  searchBar.appendChild(tags);
}

// 搜索过滤
document.getElementById('search-input').addEventListener('input', (e) => {
  renderGrid(e.target.value.trim());
});

// 初始化
createFilterTags();
renderContinueGame();
renderGrid();

// 埋点：页面浏览追踪
flushQueue();
trackPageView('/');
