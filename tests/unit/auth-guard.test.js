/**
 * 仪表盘访问控制测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requireAuth } from '../../src/analytics/auth-guard.js';

describe('auth-guard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('未配置密码时直接放行', async () => {
    vi.stubGlobal('import', { meta: { env: {} } });
    const result = await requireAuth();
    expect(result).toBe(true);
    vi.unstubAllGlobals();
  });

  it('已认证时直接放行', async () => {
    sessionStorage.setItem('dashboard_auth', '1');
    vi.stubGlobal('import', { meta: { env: { VITE_DASHBOARD_PASSWORD_HASH: 'abc' } } });
    const result = await requireAuth();
    expect(result).toBe(true);
    vi.unstubAllGlobals();
  });
});
