/**
 * Function-Agent v1.0 — 主入口
 * 原生 HTML/CSS/JavaScript 实现的 AI 智能助手
 */
import { registerAllTools } from './tools/register-all.js';
import { chatStore } from './stores/chat-store.js';
import { settingsStore } from './stores/settings-store.js';
import { toolStore } from './stores/tool-store.js';
import { initSidebar } from './components/sidebar.js';
import { initTopBar } from './components/top-bar.js';
import { initChatArea } from './components/chat-area.js';
import { initMessageList } from './components/message-list.js';
import { initInputBar } from './components/input-bar.js';
import { initSettingsDialog } from './components/settings-dialog.js';

// ===== 注册所有工具 =====
registerAllTools();
console.log('🔧 已注册 %c12 个工具%c', 'font-weight:bold', '');

// ===== 初始化主题 =====
applyTheme(settingsStore.getState().theme);

// 监听系统主题变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (settingsStore.getState().theme === 'system') {
    applyTheme('system');
  }
});

/**
 * 应用主题到 document
 * @param {'light'|'dark'|'system'} theme
 */
function applyTheme(theme) {
  const isDark = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// 暴露 applyTheme 到全局供 top-bar 调用
window._gaoshuApplyTheme = applyTheme;

// ===== 初始化各 UI 组件 =====
initSidebar(chatStore);
initTopBar(settingsStore);
initMessageList(chatStore, toolStore);
const inputBarApi = initInputBar();
initChatArea(chatStore, settingsStore, toolStore, inputBarApi);
initSettingsDialog(settingsStore);

// ===== 欢迎页面逻辑 =====
const welcomePage = document.getElementById('welcome-page');

function updateWelcomeVisibility() {
  const activeSession = chatStore.getActiveSession();
  if (activeSession) {
    welcomePage.classList.add('hidden');
  } else {
    welcomePage.classList.remove('hidden');
  }
}

chatStore.subscribe('activeSessionId', updateWelcomeVisibility);
chatStore.subscribe('sessions', updateWelcomeVisibility);

// 欢迎页"开始新对话"按钮
document.getElementById('welcome-new-chat')?.addEventListener('click', () => {
  chatStore.createSession();
  document.getElementById('message-input')?.focus();
});

// 初始检查
updateWelcomeVisibility();

console.log('📐 %cFunction-Agent v1.0 已启动%c', 'font-size:18px;font-weight:bold', '');
