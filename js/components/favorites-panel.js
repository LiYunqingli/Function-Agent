/**
 * 收藏面板组件 —— 管理收藏夹的显示与交互
 */
import { formatDate } from '../utils/formatters.js';
import { escapeHtml } from '../utils/helpers.js';

/** @type {Object} chatStore 引用 */
let _chatStore = null;

/**
 * 初始化收藏面板
 * @param {Object} chatStore - ChatStore 单例
 */
export function initFavoritesPanel(chatStore) {
  _chatStore = chatStore;

  const panel = document.getElementById('favorites-panel');
  const overlay = document.getElementById('favorites-overlay');
  const closeBtn = document.getElementById('favorites-close');
  const listEl = document.getElementById('favorites-list');
  const favToggleBtn = document.getElementById('favorites-toggle-btn');

  if (!panel || !listEl) return;

  // 打开/关闭面板
  favToggleBtn?.addEventListener('click', () => {
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  });

  closeBtn?.addEventListener('click', closePanel);

  overlay?.addEventListener('click', closePanel);

  // ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      closePanel();
    }
  });

  // 监听收藏变化 → 重新渲染列表
  chatStore.subscribe('favorites', () => renderFavoritesList());
  renderFavoritesList();
}

/**
 * 打开收藏面板（同时关闭侧边栏）
 */
function openPanel() {
  const panel = document.getElementById('favorites-panel');
  const overlay = document.getElementById('favorites-overlay');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  // 关闭侧边栏
  if (sidebar) {
    sidebar.classList.remove('open');
    sidebarOverlay?.classList.remove('active');
  }

  // 关闭设置弹窗
  const settingsDialog = document.getElementById('settings-dialog');
  if (settingsDialog) {
    settingsDialog.style.display = 'none';
  }

  panel.classList.add('open');
  overlay?.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderFavoritesList();
}

/**
 * 关闭收藏面板
 */
function closePanel() {
  const panel = document.getElementById('favorites-panel');
  const overlay = document.getElementById('favorites-overlay');

  panel.classList.remove('open');
  overlay?.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * 渲染收藏列表
 */
function renderFavoritesList() {
  const listEl = document.getElementById('favorites-list');
  if (!listEl) return;

  const favorites = _chatStore.getFavorites();

  if (favorites.length === 0) {
    listEl.innerHTML = `
      <div class="favorites-empty">
        <div class="favorites-empty-icon">☆</div>
        <div class="favorites-empty-text">暂无收藏</div>
        <div class="favorites-empty-hint">点击助手消息或工具卡片上的 ☆ 按钮添加收藏</div>
      </div>
    `;
    return;
  }

  // 按创建时间倒序
  const sorted = [...favorites].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  listEl.innerHTML = '';
  for (const fav of sorted) {
    const item = document.createElement('div');
    item.className = 'favorites-item';

    const icon = document.createElement('span');
    icon.className = 'favorites-item-icon';
    icon.textContent = fav.type === 'toolCall' ? '🔧' : '💬';

    const body = document.createElement('div');
    body.className = 'favorites-item-body';

    const title = document.createElement('div');
    title.className = 'favorites-item-title';
    title.textContent = fav.title || '(无标题)';

    const preview = document.createElement('div');
    preview.className = 'favorites-item-preview';
    preview.textContent = fav.preview || '';

    const date = document.createElement('div');
    date.className = 'favorites-item-date';
    date.textContent = formatDate(fav.createdAt);

    body.appendChild(title);
    body.appendChild(preview);
    body.appendChild(date);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'favorites-item-delete';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = '取消收藏';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      _chatStore.removeFavorite(fav.id);
    });

    item.appendChild(icon);
    item.appendChild(body);
    item.appendChild(deleteBtn);

    // 点击导航到对应会话并高亮消息
    item.addEventListener('click', () => {
      navigateToFavorite(fav);
    });

    listEl.appendChild(item);
  }
}

/**
 * 导航到收藏项对应的会话和消息
 * @param {Object} fav - 收藏对象
 */
function navigateToFavorite(fav) {
  // 切换到该会话
  _chatStore.switchSession(fav.sessionId);

  // 关闭面板
  closePanel();

  // 延迟等待消息渲染后滚动到目标消息并高亮
  setTimeout(() => {
    const messageList = document.getElementById('message-list');
    if (!messageList) return;

    let targetEl = null;

    if (fav.type === 'toolCall') {
      // 工具卡片：通过 data-tool-call-id 查找
      targetEl = messageList.querySelector(`[data-tool-call-id="${fav.messageId}"]`);
      if (!targetEl) {
        // 兜底：也尝试 data-message-id
        targetEl = messageList.querySelector(`[data-message-id="${fav.messageId}"]`);
      }
    } else {
      // 普通消息：通过 data-message-id 查找
      targetEl = messageList.querySelector(`[data-message-id="${fav.messageId}"]`);
    }

    if (!targetEl) return;

    // 滚动到目标元素
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 高亮动画
    targetEl.style.transition = 'box-shadow 0.3s ease, background 0.3s ease';
    targetEl.style.boxShadow = '0 0 0 3px var(--color-accent)';
    targetEl.style.background = 'var(--color-accent-light)';

    setTimeout(() => {
      targetEl.style.boxShadow = '';
      targetEl.style.background = '';
    }, 2000);
  }, 300);
}
