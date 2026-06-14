/**
 * 自定义右键菜单组件
 * 替换浏览器默认右键菜单，支持文本选中收藏、消息收藏
 */
import { chatStore } from '../stores/chat-store.js';
import { settingsStore } from '../stores/settings-store.js';
import { generateFavoriteTitle } from '../services/ai-client.js';

/** 菜单 DOM 引用 */
let _menuEl = null;
let _overlay = null;

/** 当前右键上下文 */
let _context = null;

/**
 * 初始化右键菜单
 */
export function initContextMenu() {
  createMenuDOM();
  bindEvents();
}

/**
 * 创建菜单 DOM
 */
function createMenuDOM() {
  // 遮罩层
  _overlay = document.createElement('div');
  _overlay.id = 'context-menu-overlay';
  _overlay.style.display = 'none';

  // 菜单本体
  _menuEl = document.createElement('div');
  _menuEl.id = 'context-menu';
  _menuEl.style.display = 'none';
  _menuEl.innerHTML = `
    <div class="context-menu-item" data-action="favorite-selection">
      <span class="context-menu-icon">☆</span>
      <span class="context-menu-label">收藏选中内容</span>
    </div>
    <div class="context-menu-item" data-action="favorite-message">
      <span class="context-menu-icon">📌</span>
      <span class="context-menu-label">收藏此消息</span>
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="copy">
      <span class="context-menu-icon">📋</span>
      <span class="context-menu-label">复制</span>
    </div>
  `;

  document.body.appendChild(_overlay);
  document.body.appendChild(_menuEl);
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 全局右键：拦截默认菜单，显示自定义菜单
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    // 查找最近的消息容器（.message-wrapper 上有 dataset.messageId）或工具卡片
    const msgWrapper = e.target.closest('.message-wrapper');
    const toolCard = e.target.closest('.tool-call-card');
    const targetEl = msgWrapper || toolCard;

    _context = {
      x: e.clientX,
      y: e.clientY,
      selectedText,
      targetEl,
      messageEl: msgWrapper,
      toolCardEl: toolCard,
    };

    // 根据上下文决定显示哪些菜单项
    const favSelectionItem = _menuEl.querySelector('[data-action="favorite-selection"]');
    const favMessageItem = _menuEl.querySelector('[data-action="favorite-message"]');
    const copyItem = _menuEl.querySelector('[data-action="copy"]');

    // 有选中文本 → 显示"收藏选中内容"
    favSelectionItem.style.display = selectedText.length > 0 ? 'flex' : 'none';

    // 右键在消息/工具卡片上 → 显示"收藏此消息"
    favMessageItem.style.display = targetEl ? 'flex' : 'none';

    // 有选中文本 → 显示"复制"
    copyItem.style.display = selectedText.length > 0 ? 'flex' : 'none';

    // 如果两个收藏项都隐藏，不显示菜单
    const hasVisibleItems = (selectedText.length > 0) || targetEl;
    if (!hasVisibleItems) {
      // 显示浏览器默认菜单的替代：至少显示复制（如果有选中文本）
      // 但实际上这里 selectedText 为空且 targetEl 为空，说明在空白区域右键
      // 这种情况下不显示菜单，直接返回
      _context = null;
      return;
    }

    showMenu(e.clientX, e.clientY);
  });

  // 点击遮罩关闭菜单
  _overlay.addEventListener('click', () => hideMenu());

  // 菜单项点击
  _menuEl.addEventListener('click', (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item || !_context) return;

    const action = item.dataset.action;
    handleAction(action);
    hideMenu();
  });

  // 点击页面其他区域关闭菜单
  document.addEventListener('click', () => hideMenu());
  document.addEventListener('scroll', () => hideMenu(), true);

  // ESC 关闭菜单
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideMenu();
  });
}

/**
 * 显示菜单
 */
function showMenu(x, y) {
  if (!_menuEl || !_overlay) return;

  // 先显示以获取尺寸
  _menuEl.style.display = 'flex';
  _overlay.style.display = 'block';

  const rect = _menuEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 防止超出视口
  let left = x;
  let top = y;
  if (x + rect.width > vw) left = vw - rect.width - 8;
  if (y + rect.height > vh) top = vh - rect.height - 8;
  if (left < 0) left = 8;
  if (top < 0) top = 8;

  _menuEl.style.left = `${left}px`;
  _menuEl.style.top = `${top}px`;
}

/**
 * 隐藏菜单
 */
function hideMenu() {
  if (_menuEl) _menuEl.style.display = 'none';
  if (_overlay) _overlay.style.display = 'none';
  _context = null;
}

/**
 * 处理菜单动作
 */
function handleAction(action) {
  if (!_context) return;

  switch (action) {
    case 'favorite-selection':
      handleFavoriteSelection();
      break;
    case 'favorite-message':
      handleFavoriteMessage();
      break;
    case 'copy':
      handleCopy();
      break;
  }
}

/**
 * 收藏选中文本
 */
function handleFavoriteSelection() {
  const { selectedText } = _context;
  if (!selectedText || !chatStore) return;

  const session = chatStore.getActiveSession();
  if (!session) return;

  // 尝试找到所属消息 ID
  let messageId = null;
  if (_context.messageEl) {
    messageId = _context.messageEl.dataset.messageId || null;
  }
  const favId = messageId || `selection_${Date.now()}`;

  const settings = settingsStore.getState();
  const namingMode = settings.favoriteNamingMode || 'first-sentence';
  const maxLen = settings.favoriteTitleMaxLength || 30;
  const fallbackTitle = selectedText.length > maxLen
    ? selectedText.slice(0, maxLen) + '...'
    : selectedText;
  const preview = selectedText.length > 100
    ? selectedText.slice(0, 100) + '...'
    : selectedText;

  if (namingMode === 'ai') {
    // AI 命名：先立即创建收藏，再异步获取 AI 标题
    chatStore.addFavorite(session.id, favId, 'textSelection', 'AI 生成中...', preview);
    showToast('已收藏选中内容');

    generateFavoriteTitle(selectedText, settings).then((aiTitle) => {
      if (aiTitle) {
        const fav = chatStore.getFavoriteByMessageId(favId);
        if (fav) chatStore.updateFavoriteTitle(fav.id, aiTitle);
      }
    }).catch(() => {
      const fav = chatStore.getFavoriteByMessageId(favId);
      if (fav) chatStore.updateFavoriteTitle(fav.id, fallbackTitle);
    });
  } else {
    // 首句截取模式
    chatStore.addFavorite(session.id, favId, 'textSelection', fallbackTitle, preview);
    showToast('已收藏选中内容');
  }
}

/**
 * 收藏当前消息/工具卡片
 */
function handleFavoriteMessage() {
  const { messageEl, toolCardEl } = _context;
  if (!chatStore) return;

  const session = chatStore.getActiveSession();
  if (!session) return;

  if (toolCardEl) {
    const toolCallId = toolCardEl.dataset.toolCallId;
    if (!toolCallId) return;

    // 切换收藏状态
    const isFav = chatStore.isFavorite(toolCallId);
    if (isFav) {
      chatStore.removeFavoriteByMessageId(toolCallId);
      showToast('已取消收藏');
    } else {
      // 获取工具卡片标题
      const titleEl = toolCardEl.querySelector('.tool-call-header');
      const title = titleEl ? titleEl.textContent.trim() : '工具调用';
      chatStore.addFavorite(session.id, toolCallId, 'toolCall', title, '工具调用结果');
      showToast('已收藏此工具');
    }

    // 更新 UI 状态
    updateFavoriteButtonUI(toolCardEl, !isFav);

  } else if (messageEl) {
    const messageId = messageEl.dataset.messageId;
    if (!messageId) return;

    const isFav = chatStore.isFavorite(messageId);
    if (isFav) {
      chatStore.removeFavoriteByMessageId(messageId);
      showToast('已取消收藏');
    } else {
      const settings = settingsStore.getState();
      const namingMode = settings.favoriteNamingMode || 'first-sentence';
      const maxLen = settings.favoriteTitleMaxLength || 30;
      const previewText = messageEl.textContent.slice(0, 100) || '消息';
      const fallbackTitle = previewText.length > maxLen
        ? previewText.slice(0, maxLen) + '...'
        : previewText;

      if (namingMode === 'ai') {
        // AI 命名：先立即创建收藏，再异步获取 AI 标题
        chatStore.addFavorite(session.id, messageId, 'message', 'AI 生成中...', previewText);
        showToast('已收藏此消息');

        generateFavoriteTitle(messageEl.textContent || '', settings).then((aiTitle) => {
          if (aiTitle) {
            const fav = chatStore.getFavoriteByMessageId(messageId);
            if (fav) chatStore.updateFavoriteTitle(fav.id, aiTitle);
          }
        }).catch(() => {
          const fav = chatStore.getFavoriteByMessageId(messageId);
          if (fav) chatStore.updateFavoriteTitle(fav.id, fallbackTitle);
        });
      } else {
        chatStore.addFavorite(session.id, messageId, 'message', fallbackTitle, previewText);
        showToast('已收藏此消息');
      }
    }

    // 更新 UI 状态
    updateFavoriteButtonUI(messageEl, !isFav);
  }
}

/**
 * 复制选中文本
 */
function handleCopy() {
  const { selectedText } = _context;
  if (!selectedText) return;
  navigator.clipboard.writeText(selectedText).then(() => {
    showToast('已复制到剪贴板');
  }).catch(() => {
    // fallback
    document.execCommand('copy');
  });
}

/**
 * 更新收藏按钮 UI 状态
 * @param {HTMLElement} containerEl - 包含收藏按钮的容器元素（toolCardEl 或 messageEl）
 * @param {boolean} isFav - 是否已收藏
 */
function updateFavoriteButtonUI(containerEl, isFav) {
  if (!containerEl) return;

  // 查找收藏按钮
  const favBtn = containerEl.querySelector('.fav-btn');
  if (!favBtn) return;

  if (isFav) {
    favBtn.classList.add('active');
    favBtn.textContent = '★';
  } else {
    favBtn.classList.remove('active');
    favBtn.textContent = '☆';
  }
}

/**
 * 显示操作提示
 */
function showToast(msg) {
  let toast = document.getElementById('context-menu-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'context-menu-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 1500);
}
