/**
 * 设置状态 Store —— 管理 API 配置、模型参数等
 */
import { Store } from './store-base.js';
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../config.js';
import { storageAdapter } from '../services/storage-adapter.js';

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => normalizeText(part))
      .filter(Boolean)
      .join('');
  }
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (typeof value.content === 'string') return value.content;
    if (typeof value.value === 'string') return value.value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sanitizeSettings(settings) {
  return {
    ...settings,
    apiUrl: normalizeText(settings.apiUrl),
    apiKey: normalizeText(settings.apiKey),
    model: normalizeText(settings.model),
    systemPrompt: normalizeText(settings.systemPrompt),
    visionApiUrl: normalizeText(settings.visionApiUrl),
    visionApiKey: normalizeText(settings.visionApiKey),
    visionModel: normalizeText(settings.visionModel),
    visionSystemPrompt: normalizeText(settings.visionSystemPrompt),
  };
}

class SettingsStore extends Store {
  constructor() {
    super();
    // 从 localStorage 加载，未找到则用默认值
    const saved = storageAdapter.get(STORAGE_KEYS.SETTINGS) || {};
    this._state = {
      ...DEFAULT_SETTINGS,
      ...sanitizeSettings(saved),
    };
    // 每次状态变更后自动持久化
    this.subscribeAll(() => {
      this.saveToStorage();
    });
  }

  /**
   * 从 localStorage 加载设置
   */
  loadFromStorage() {
    const saved = storageAdapter.get(STORAGE_KEYS.SETTINGS) || {};
    this._state = { ...DEFAULT_SETTINGS, ...sanitizeSettings(saved) };
  }

  /**
   * 保存到 localStorage
   */
  saveToStorage() {
    storageAdapter.set(STORAGE_KEYS.SETTINGS, sanitizeSettings(this._state));
  }

  /**
   * 合并更新设置
   * @param {Object} partial - 要合并的部分字段
   */
  updateSettings(partial) {
    this.setState(partial);
  }

  /**
   * 恢复默认值
   */
  resetToDefault() {
    this.setState({ ...DEFAULT_SETTINGS });
  }

  /**
   * 检查大语言模型是否已配置
   * @returns {boolean}
   */
  isConfigured() {
    const { apiUrl, apiKey } = this._state;
    return Boolean(apiUrl && apiKey);
  }

  /**
   * 检查多模态模型是否已配置
   * @returns {boolean}
   */
  isVisionConfigured() {
    const { visionApiUrl, visionApiKey } = this._state;
    return Boolean(visionApiUrl && visionApiKey);
  }
}

// 导出单例
export const settingsStore = new SettingsStore();