import { loadKeyBindings } from '../shared/storage.js';

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

function createCard(game) {
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

  div.addEventListener('click', () => {
    window.open(`/game.html?rom=${encodeURIComponent(game.id)}`, '_blank');
  });

  return div;
}

function renderGrid(filterText = '') {
  const grid = document.getElementById('game-grid');
  const emptyState = document.getElementById('empty-state');
  grid.innerHTML = '';

  const filtered = filterText
    ? games.filter(g => g.name.includes(filterText))
    : games;

  if (filtered.length === 0) {
    emptyState.classList.add('empty-state--visible');
  } else {
    emptyState.classList.remove('empty-state--visible');
    filtered.forEach(g => grid.appendChild(createCard(g)));
  }

  document.getElementById('game-count').textContent = `共 ${games.length} 款游戏`;
}

// 搜索过滤
document.getElementById('search-input').addEventListener('input', (e) => {
  renderGrid(e.target.value.trim());
});

// 初始渲染
renderGrid();
