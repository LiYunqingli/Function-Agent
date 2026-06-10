/**
 * 通用工具函数
 */

/**
 * 防抖：在最后一次调用后延迟 delay 毫秒执行
 * @param {Function} fn - 目标函数
 * @param {number} delay - 延迟毫秒数
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 节流：在 limit 毫秒内最多执行一次
 * @param {Function} fn - 目标函数
 * @param {number} limit - 间隔毫秒数
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/**
 * 深拷贝（基于 JSON 序列化，不支持函数/循环引用）
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 拷贝结果
 */
export function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

/**
 * 转义 HTML 特殊字符，防止 XSS
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (ch) => map[ch]);
}