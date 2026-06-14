/**
 * 侧边栏组件 —— 会话管理
 */
import { truncateText, formatDate } from '../utils/formatters.js';
import { Modal } from './modal.js';

/**
 * 初始化侧边栏
 * @param {Object} chatStore - ChatStore 单例
 */
export function initSidebar(chatStore) {
  const newChatBtn = document.getElementById('new-chat-btn');
  const sessionList = document.getElementById('session-list');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  // 新建对话
  newChatBtn.addEventListener('click', () => {
    const activeSession = chatStore.getActiveSession();
    if (activeSession && (!activeSession.messages || activeSession.messages.length === 0)) {
      // 当前对话为空，不重复创建
      document.getElementById('message-input')?.focus();
      return;
    }
    chatStore.createSession();
    // 移动端自动关闭侧边栏
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    // 自动聚焦输入框
    document.getElementById('message-input')?.focus();
  });

  // 移动端侧边栏切换
  sidebarToggle.addEventListener('click', () => {
    // 如果收藏面板打开，先关闭它
    const favPanel = document.getElementById('favorites-panel');
    const favOverlay = document.getElementById('favorites-overlay');
    if (favPanel && favPanel.classList.contains('open')) {
      favPanel.classList.remove('open');
      if (favOverlay) favOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
  });

  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  });

  // 监听 store 变化 → 重新渲染会话列表
  chatStore.subscribe('sessions', () => renderSessionList());
  chatStore.subscribe('activeSessionId', () => renderSessionList());

  // 首次渲染
  renderSessionList();

  /**
   * 渲染会话列表
   */
  function renderSessionList() {
    const { sessions, activeSessionId } = chatStore.getState();

    if (!sessions || sessions.length === 0) {
      sessionList.innerHTML = '<div class="session-empty">暂无对话<br/>点击上方按钮开始</div>';
      return;
    }

    // 按 updatedAt 倒序排列
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    sessionList.innerHTML = '';
    for (const session of sorted) {
      const item = document.createElement('div');
      item.className = `session-item${session.id === activeSessionId ? ' active' : ''}`;
      item.dataset.id = session.id;

      const title = document.createElement('span');
      title.className = 'session-item-title';
      title.textContent = truncateText(session.title, 28);
      title.title = session.title;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'session-item-delete';
      deleteBtn.innerHTML = '✕';
      deleteBtn.title = '删除对话';
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await Modal.confirm({
          title: '删除对话',
          message: `确定删除「${session.title}」？`,
          confirmText: '删除',
          confirmClass: 'btn-danger',
        });
        if (ok) {
          chatStore.deleteSession(session.id);
        }
      });

      item.appendChild(title);
      item.appendChild(deleteBtn);

      // 点击切换会话
      item.addEventListener('click', () => {
        chatStore.switchSession(session.id);
        // 移动端自动关闭侧边栏
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        // 自动聚焦输入框
        document.getElementById('message-input')?.focus();
      });

      // 双击重命名
      item.addEventListener('dblclick', async () => {
        const newTitle = await Modal.prompt({
          title: '重命名对话',
          defaultValue: session.title,
          placeholder: '输入新名称',
          confirmText: '保存',
        });
        if (newTitle) {
          chatStore.renameSession(session.id, newTitle);
        }
      });

      sessionList.appendChild(item);
    }
  }
}