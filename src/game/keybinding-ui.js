/**
 * 按键设置面板 UI
 * 负责：渲染面板、按键捕获、冲突提示、保存/取消
 */
import { ACTION_LABELS } from '../shared/constants.js';

export function createKeybindingUI(bindings, onSave) {
  let currentBindings = { ...bindings };
  let listeningAction = null;
  let isOpen = false;

  const panel = document.getElementById('keybind-panel');
  const backdrop = document.getElementById('keybind-backdrop');
  const body = document.getElementById('keybind-body');
  const conflictTip = document.getElementById('conflict-tip');
  const saveBtn = document.getElementById('keybind-save');
  const cancelBtn = document.getElementById('keybind-cancel');
  const closeBtn = document.getElementById('keybind-close');
  const toggleBtn = document.getElementById('keybind-btn');

  function render() {
    body.innerHTML = '';
    for (const [action, code] of Object.entries(currentBindings)) {
      const row = document.createElement('div');
      row.className = 'keybind-row';

      const label = document.createElement('span');
      label.className = 'keybind-row__label';
      label.textContent = ACTION_LABELS[action];

      const keyEl = document.createElement('span');
      keyEl.className = 'keybind-row__key';
      keyEl.textContent = formatCode(code);
      keyEl.setAttribute('data-action', action);

      if (listeningAction === action) {
        keyEl.classList.add('keybind-row__key--listening');
        keyEl.textContent = '...';
      }

      keyEl.addEventListener('click', () => {
        startListening(action);
      });

      row.appendChild(label);
      row.appendChild(keyEl);
      body.appendChild(row);
    }
  }

  function formatCode(code) {
    return code
      .replace('Arrow', '')
      .replace('Key', '')
      .replace('Shift', 'Shift+')
      .replace('Right', 'R')
      .replace('Left', 'L')
      .replace('Control', 'Ctrl+')
      .replace('Digit', '');
  }

  function startListening(action) {
    listeningAction = action;
    conflictTip.classList.remove('conflict-tip--visible');
    render();
  }

  function handleKeyDown(e) {
    if (!listeningAction) return;
    e.preventDefault();
    e.stopPropagation();

    const newCode = e.code;
    const dupAction = Object.entries(currentBindings).find(
      ([act, code]) => code === newCode && act !== listeningAction
    );

    if (dupAction) {
      conflictTip.textContent = `⚠ 该按键已被"${ACTION_LABELS[dupAction[0]]}"使用，请选择其他按键`;
      conflictTip.classList.add('conflict-tip--visible');
      listeningAction = null;
      render();
      return;
    }

    currentBindings[listeningAction] = newCode;
    listeningAction = null;
    conflictTip.classList.remove('conflict-tip--visible');
    render();
  }

  function open() {
    currentBindings = { ...bindings };
    listeningAction = null;
    conflictTip.classList.remove('conflict-tip--visible');
    isOpen = true;
    panel.classList.add('keybind-panel--open');
    backdrop.classList.add('keybind-backdrop--visible');
    document.addEventListener('keydown', handleKeyDown, true);
    render();
  }

  function close() {
    isOpen = false;
    listeningAction = null;
    panel.classList.remove('keybind-panel--open');
    backdrop.classList.remove('keybind-backdrop--visible');
    document.removeEventListener('keydown', handleKeyDown, true);
  }

  function updateBindings(newBindings) {
    bindings = { ...newBindings };
  }

  toggleBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);

  saveBtn.addEventListener('click', () => {
    const result = onSave(currentBindings);
    if (result.success) {
      close();
    }
  });

  return { open, close, updateBindings, getCurrentBindings: () => currentBindings };
}
