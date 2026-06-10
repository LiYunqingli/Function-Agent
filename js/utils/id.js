/**
 * UUID 生成工具
 */

/**
 * 生成唯一 ID
 * 优先使用 crypto.randomUUID()，降级用时间戳+随机数
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // 降级方案：时间戳 + 随机数
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  const randomPart2 = Math.random().toString(36).slice(2, 6);
  return `${timestamp}-${randomPart}-${randomPart2}`;
}