/**
 * 终端类型检测模块
 * 基于 User-Agent 和屏幕尺寸检测设备类型
 */

/**
 * 检测终端类型
 * @returns {'desktop' | 'mobile' | 'tablet'}
 */
export function detectDeviceType() {
  const ua = navigator.userAgent;
  const width = window.innerWidth;

  // 先检查 User-Agent 关键词
  if (/iPad|Android(?!.*Mobile)|Tablet|Silk/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iPhone|Android|IEMobile/i.test(ua)) {
    return 'mobile';
  }

  // 后备：按屏幕宽度判断
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
}
