/**
 * 运营仪表盘访问控制
 *
 * 认证成功后会在 sessionStorage 中写入 `dashboard_auth` 标记。
 * 未配置密码（VITE_DASHBOARD_PASSWORD_HASH 为空）时直接放行，便于本地开发。
 */

const AUTH_KEY = 'dashboard_auth';
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 3000;
const LOCKED_KEY = 'dashboard_locked';

function sha256(text) {
  const buffer = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', buffer).then((hash) => {
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  });
}

function createAuthDialog() {
  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';
  overlay.className = 'auth-overlay';
  overlay.innerHTML = `
    <div class="auth-dialog">
      <div class="auth-dialog__title">🔒 运营仪表盘</div>
      <div class="auth-dialog__desc">请输入访问密码</div>
      <input type="password" class="auth-dialog__input" id="auth-password" placeholder="密码" autocomplete="off">
      <div class="auth-dialog__error" id="auth-error"></div>
      <button class="auth-dialog__btn" id="auth-submit">进入</button>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function hideError() {
  const el = document.getElementById('auth-error');
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
}

function isLocked() {
  return sessionStorage.getItem(LOCKED_KEY) === '1';
}

function setLocked() {
  sessionStorage.setItem(LOCKED_KEY, '1');
}

export async function requireAuth() {
  // 环境变量未配置时跳过认证
  const expectedHash = import.meta.env?.VITE_DASHBOARD_PASSWORD_HASH || '';
  if (!expectedHash) {
    return true;
  }

  // 已认证直接放行
  if (sessionStorage.getItem(AUTH_KEY) === '1') {
    return true;
  }

  // 被锁定（当前会话内连续输错 5 次）
  if (isLocked()) {
    createAuthDialog();
    showError('错误次数过多，请刷新页面后重试');
    const input = document.getElementById('auth-password');
    const btn = document.getElementById('auth-submit');
    if (input) input.disabled = true;
    if (btn) btn.disabled = true;
    return new Promise(() => {});
  }

  return new Promise((resolve) => {
    createAuthDialog();

    const input = document.getElementById('auth-password');
    const btn = document.getElementById('auth-submit');
    let attempts = 0;
    let cooldown = false;

    async function tryAuth() {
      if (cooldown) return;

      const password = input.value.trim();
      if (!password) {
        showError('请输入密码');
        return;
      }

      hideError();
      cooldown = true;
      btn.disabled = true;

      try {
        const hash = await sha256(password);
        if (hash.toLowerCase() === expectedHash.toLowerCase()) {
          sessionStorage.setItem(AUTH_KEY, '1');
          document.getElementById('auth-overlay')?.remove();
          resolve(true);
          return;
        }

        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) {
          setLocked();
          showError('错误次数过多，请刷新页面后重试');
          input.disabled = true;
          return;
        }

        showError(`密码错误，还剩 ${MAX_ATTEMPTS - attempts} 次机会`);
        setTimeout(() => {
          cooldown = false;
          btn.disabled = false;
          input.focus();
        }, COOLDOWN_MS);
      } catch (e) {
        showError('认证失败，请重试');
        cooldown = false;
        btn.disabled = false;
      }
    }

    btn.addEventListener('click', tryAuth);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryAuth();
    });
    input.focus();
  });
}
