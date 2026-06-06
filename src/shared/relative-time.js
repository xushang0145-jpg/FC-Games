/**
 * 相对时间格式化模块
 * 输入：ISO 8601 时间戳字符串
 * 输出：用户友好的相对时间描述
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(isoString) {
  if (!isoString) return '';

  const then = new Date(isoString).getTime();
  if (isNaN(then)) return '';

  const now = Date.now();
  const diff = now - then;

  if (diff < 0) return '刚刚';
  if (diff < MINUTE) return '刚刚';
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m} 分钟前`;
  }
  if (diff < 2 * HOUR) return '1 小时前';
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} 小时前`;
  }
  if (diff < 2 * DAY) return '昨天';
  const d = Math.floor(diff / DAY);
  return `${d} 天前`;
}
