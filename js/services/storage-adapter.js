/**
 * localStorage 适配器 —— 含容量保护与自动清理
 */
import { STORAGE_KEYS } from '../config.js';

export const storageAdapter = {
  /**
   * 读取并解析 JSON
   * @param {string} key
   * @returns {*|null}
   */
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },

  /**
   * 序列化并写入，容量超限时自动清理
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        this.cleanupOldest();
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // 清理后仍然不够，忽略
          console.warn('localStorage 容量不足，即使清理后仍无法写入');
        }
      }
    }
  },

  /**
   * 移除指定键
   * @param {string} key
   */
  remove(key) {
    localStorage.removeItem(key);
  },

  /**
   * 获取 gaoshu_ 前缀键的存储用量统计
   * @returns {{used: number, total: number, percentage: string}}
   */
  getUsage() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('gaoshu_')) {
        total += localStorage.getItem(key).length * 2; // UTF-16 编码
      }
    }
    const maxBytes = 5 * 1024 * 1024;
    return {
      used: total,
      total: maxBytes,
      percentage: (total / maxBytes * 100).toFixed(1),
    };
  },

  /**
   * 清理最旧的会话数据（保留 80% 最新的）
   */
  cleanupOldest() {
    const data = this.get(STORAGE_KEYS.SESSIONS) || [];
    if (data.length > 5) {
      // 按 updatedAt 倒序排列，保留最新的 80%
      const keep = Math.ceil(data.length * 0.8);
      data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      this.set(STORAGE_KEYS.SESSIONS, data.slice(0, keep));
    }
  },
};