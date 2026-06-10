/**
 * 顶栏组件 —— 标题 + 设置按钮 + 主题切换
 */
import { STORAGE_KEYS } from '../config.js';
import { storageAdapter } from '../services/storage-adapter.js';

/**
 * 初始化顶栏
 * @param {Object} settingsStore - SettingsStore 单例
 */
export function initTopBar(settingsStore) {
  const themeToggle = document.getElementById('theme-toggle');
  const settingsBtn = document.getElementById('settings-btn');

  // 设置按钮 → 由 settings-dialog.js 处理

  // 主题切换
  themeToggle.addEventListener('click', () => {
    const current = settingsStore.getState().theme || 'system';
    let next;
    if (current === 'system') {
      next = 'light';
    } else if (current === 'light') {
      next = 'dark';
    } else {
      next = 'system';
    }
    settingsStore.updateSettings({ theme: next });
    applyTheme(next);
  });

  // 初始化主题
  applyTheme(settingsStore.getState().theme || 'system');

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (settingsStore.getState().theme === 'system') {
      applyTheme('system');
    }
  });
}

/**
 * 应用主题
 * @param {string} theme - 'light' | 'dark' | 'system'
 */
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    // system
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
}