/**
 * IP 地理位置获取模块
 * 调用 ipapi.co 获取地理位置，失败时降级为空
 */

let cachedGeo = null;

/**
 * 获取用户地理位置
 * @returns {Promise<{country: string|null, province: string|null, city: string|null}>}
 */
export async function getGeoLocation() {
  if (cachedGeo) return cachedGeo;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('Geo API failed');

    const data = await res.json();
    cachedGeo = {
      country: data.country_name || null,
      province: data.region || null,
      city: data.city || null,
    };
    return cachedGeo;
  } catch {
    // 失败时返回空值，不影响其他功能
    cachedGeo = { country: null, province: null, city: null };
    return cachedGeo;
  }
}
