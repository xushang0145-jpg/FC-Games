/**
 * 详情浮层模块
 * 负责：浮层渲染、打开/关闭、事件绑定、按键说明展示
 */
import { loadKeyBindings } from '../shared/storage.js';
import { formatRelativeTime } from '../shared/relative-time.js';

const ACTION_LABELS = {
  up: '↑ 上',
  down: '↓ 下',
  left: '← 左',
  right: '→ 右',
  a: '🅱 A 按钮',
  b: '🅲 B 按钮',
  start: '▶ Start',
  select: '🔘 Select',
};

const DEFAULT_BINDINGS = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  a: 'KeyK', b: 'KeyJ', start: 'Digit1', select: 'Digit2',
};

function formatKeyCode(code) {
  return code
    .replace('Arrow', '')
    .replace('Key', '')
    .replace('Shift', 'Shift+')
    .replace('Right', ' →')
    .replace('Left', ' ←')
    .replace('Control', 'Ctrl+')
    .replace('Digit', '');
}

export function createDetailModal() {
  let isOpen = false;
  let currentGame = null;
  let currentDOM = null;
  let cleanupEvents = null;

  function createDOM() {
    // 遮罩
    const backdrop = document.createElement('div');
    backdrop.className = 'detail-backdrop';

    // 浮层面板
    const modal = document.createElement('div');
    modal.className = 'detail-modal';

    // 头部
    const header = document.createElement('div');
    header.className = 'detail-modal__header';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'detail-modal__close';
    closeBtn.setAttribute('aria-label', '关闭');
    closeBtn.textContent = '✕';

    const icon = document.createElement('div');
    icon.className = 'detail-modal__icon';

    const title = document.createElement('div');
    title.className = 'detail-modal__title';

    const subtitle = document.createElement('div');
    subtitle.className = 'detail-modal__subtitle';
    subtitle.textContent = '经典 FC 游戏 · NES 模拟器';

    const recentTag = document.createElement('div');
    recentTag.className = 'detail-modal__recent-tag';
    recentTag.textContent = '⭐ 最近玩过';

    const recentTime = document.createElement('div');
    recentTime.className = 'detail-modal__recent-time';

    header.appendChild(closeBtn);
    header.appendChild(icon);
    header.appendChild(title);
    header.appendChild(subtitle);
    header.appendChild(recentTag);
    header.appendChild(recentTime);

    // 按键说明
    const controls = document.createElement('div');
    controls.className = 'detail-modal__controls';

    const controlsTitle = document.createElement('div');
    controlsTitle.className = 'controls-title';
    controlsTitle.textContent = '按键操作';

    const controlsTable = document.createElement('div');
    controlsTable.className = 'controls-table';

    controls.appendChild(controlsTitle);
    controls.appendChild(controlsTable);

    // 底部
    const footer = document.createElement('div');
    footer.className = 'detail-modal__footer';

    const startBtn = document.createElement('button');
    startBtn.className = 'btn-start';
    startBtn.setAttribute('type', 'button');

    const hint = document.createElement('div');
    hint.className = 'footer-hint';
    hint.innerHTML = '按 <kbd>Enter</kbd> 开始游戏 · 按 <kbd>ESC</kbd> 关闭';

    footer.appendChild(startBtn);
    footer.appendChild(hint);

    modal.appendChild(header);
    modal.appendChild(controls);
    modal.appendChild(footer);

    return { backdrop, modal, header, closeBtn, icon, title, recentTag, recentTime, controlsTable, startBtn, hint };
  }

  function open(game, bindings, playRecord) {
    // 如果已有浮层打开，先关闭
    if (isOpen) close();

    currentGame = game;
    const dom = createDOM();
    currentDOM = dom;

    // 填充内容
    dom.title.textContent = game.name;
    dom.startBtn.textContent = '▶ 开始游戏';

    // 显示最近玩过标签
    if (playRecord && playRecord.lastPlayedAt) {
      dom.recentTag.style.display = 'inline-block';
      dom.recentTime.textContent = '上次游玩：' + formatRelativeTime(playRecord.lastPlayedAt);
    } else {
      dom.recentTag.style.display = 'none';
      dom.recentTime.textContent = '';
    }

    // 填充按键说明表
    const bindingsToShow = bindings || loadKeyBindings(game.id) || DEFAULT_BINDINGS;
    dom.controlsTable.innerHTML = '';
    for (const [action, code] of Object.entries(bindingsToShow)) {
      const row = document.createElement('div');
      row.className = 'control-row';

      const label = document.createElement('span');
      label.className = 'control-row__label';
      label.textContent = ACTION_LABELS[action] || action;

      const keyEl = document.createElement('span');
      keyEl.className = 'control-row__key';
      keyEl.textContent = formatKeyCode(code);

      row.appendChild(label);
      row.appendChild(keyEl);
      dom.controlsTable.appendChild(row);
    }

    // 关闭按钮事件
    dom.closeBtn.addEventListener('click', function onCloseClick(e) {
      e.preventDefault();
      close();
    });

    // 遮罩点击关闭
    dom.backdrop.addEventListener('click', function onBackdropClick(e) {
      if (e.target === dom.backdrop) {
        close();
      }
    });

    // 键盘快捷键
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        openGame();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);

    // 开始游戏
    function openGame() {
      window.location.href = '/game.html?rom=' + encodeURIComponent(game.id);
    }
    dom.startBtn.addEventListener('click', function onStartClick(e) {
      e.preventDefault();
      openGame();
    });

    // 插入 DOM
    document.body.appendChild(dom.backdrop);
    document.body.appendChild(dom.modal);

    // 禁止背景滚动
    document.body.style.overflow = 'hidden';

    // 动画入场：下一帧触发
    requestAnimationFrame(function () {
      dom.backdrop.classList.add('detail-backdrop--visible');
      dom.modal.classList.add('detail-modal--visible');
    });

    // 聚焦开始按钮
    setTimeout(function () { dom.startBtn.focus(); }, 100);

    // 窗口 resize 处理
    function onResize() {
      if (!isOpen) return;
      dom.modal.style.maxHeight = '85vh';
      var controlsEl = dom.modal.querySelector('.detail-modal__controls');
      if (controlsEl) {
        controlsEl.style.maxHeight = (window.innerHeight * 0.4) + 'px';
      }
    }
    window.addEventListener('resize', onResize);

    // 清理函数：关闭时调用以解除所有事件监听
    cleanupEvents = function () {
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onResize);
    };

    isOpen = true;
  }

  function close() {
    if (!isOpen) return;

    isOpen = false;

    if (cleanupEvents) {
      cleanupEvents();
      cleanupEvents = null;
    }

    var dom = currentDOM;
    if (dom) {
      dom.modal.classList.remove('detail-modal--visible');
      dom.backdrop.classList.remove('detail-backdrop--visible');

      // 恢复滚动
      document.body.style.overflow = '';

      // CSS transition 结束后移除 DOM（fallback 260ms）
      setTimeout(function () {
        if (dom.modal.parentNode) dom.modal.remove();
        if (dom.backdrop.parentNode) dom.backdrop.remove();
      }, 260);
    }

    currentDOM = null;
    currentGame = null;
  }

  return { open, close };
}
