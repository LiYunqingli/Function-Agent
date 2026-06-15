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
import { initMathSymbolKeyboard } from './components/math-symbol-keyboard.js';
import { initSettingsDialog } from './components/settings-dialog.js';
import { initLearningStatsPanel } from './components/learning-stats-panel.js';
import { initFavoritesPanel } from './components/favorites-panel.js';
import { initContextMenu } from './components/context-menu.js';
import { learningStatsStore } from './stores/learning-stats-store.js';
// 早期加载 WebCrypto 纯 JS 兜底（用于 file:// 协议等 crypto.subtle 不可用的情况）
import './utils/webcrypto-fallback.js';

// ===== 注册所有工具 =====
registerAllTools();
console.log('🔧 已注册 %c29 个工具%c', 'font-weight:bold', '');

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
initMathSymbolKeyboard(inputBarApi);
initChatArea(chatStore, settingsStore, toolStore, inputBarApi);
initSettingsDialog(settingsStore, chatStore);
initLearningStatsPanel(learningStatsStore);
initFavoritesPanel(chatStore);
initContextMenu();

// ===== 欢迎页面逻辑 =====
const welcomePage = document.getElementById('welcome-page');
const welcomeNewChatBtn = document.getElementById('welcome-new-chat');
const inputBar = document.querySelector('.input-bar');

function updateWelcomeVisibility() {
  const activeSession = chatStore.getActiveSession();
  const isSessionEmpty = activeSession && (!activeSession.messages || activeSession.messages.length === 0);

  if (activeSession) {
    // 有会话（不管有没有消息）→ 隐藏欢迎页，显示输入框
    welcomePage.classList.add('hidden');
    if (inputBar) inputBar.style.display = '';
  } else {
    // 无会话 → 显示欢迎页，隐藏输入框
    welcomePage.classList.remove('hidden');
    if (inputBar) inputBar.style.display = 'none';
    return;
  }

  if (isSessionEmpty) {
    // 空会话 → 显示欢迎页（无开始按钮），但输入框可见
    welcomePage.classList.remove('hidden');
    if (welcomeNewChatBtn) welcomeNewChatBtn.style.display = 'none';
    if (inputBar) inputBar.style.display = '';
  }
}

chatStore.subscribe('activeSessionId', updateWelcomeVisibility);
chatStore.subscribe('sessions', updateWelcomeVisibility);

// 欢迎页"开始新对话"按钮
welcomeNewChatBtn?.addEventListener('click', () => {
  chatStore.createSession();
  document.getElementById('message-input')?.focus();
});

// 欢迎页功能卡片 —— 点击自动发送
document.querySelectorAll('.feature-card[data-prompt]').forEach((card) => {
  card.addEventListener('click', () => {
    const prompt = card.getAttribute('data-prompt');
    if (!prompt) return;

    // 确保有活跃会话
    if (!chatStore.getActiveSession()) {
      chatStore.createSession();
    }

    // 填入提示词并发送
    const input = document.getElementById('message-input');
    if (input) {
      input.value = prompt;
      document.getElementById('send-btn')?.click();
    }
  });
});

// 初始检查
updateWelcomeVisibility();

console.log('📐 %cFunction-Agent v1.1 已启动%c', 'font-size:18px;font-weight:bold', '');
