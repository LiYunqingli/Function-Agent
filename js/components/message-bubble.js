/**
 * 消息气泡组件 —— 根据消息角色创建不同的气泡
 *
 * 有图片的用户消息拆分为纯图片消息 + 纯文字消息，各自独立渲染
 */
import { renderMarkdown } from './markdown-renderer.js';
import { createToolCallCard } from './tool-call-card.js';
import { formatDate } from '../utils/formatters.js';
import { escapeHtml } from '../utils/helpers.js';

/**
 * 创建消息气泡 DOM 元素
 * @param {Object} message - 消息对象
 * @param {Object} toolStore - ToolStore 单例
 * @param {Object} chatStore - ChatStore 单例（用于页面刷新后回退查找 toolResult）
 * @returns {HTMLElement|null}
 */
export function createMessageBubble(message, toolStore, chatStore) {
  if (message.role === 'tool') {
    // 工具消息不单独显示，其结果内嵌在助手消息的工具调用卡片中
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper ${message.role} fade-in`;
  wrapper.dataset.messageId = message.id;

  if (message.role === 'user') {
    if (message._isImageCard && message.images && message.images.length > 0) {
      return createUserImageCard(message);
    }

    if (!message.content || !message.content.trim()) {
      return null;
    }

    // 图片已拆分为独立卡片，此处不包含图片
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (message.content) {
      const textEl = document.createElement('div');
      textEl.className = 'user-message-text';
      textEl.textContent = message.content;
      bubble.appendChild(textEl);
    }

    wrapper.appendChild(bubble);
  } else if (message.role === 'assistant') {
    if (message._isVisionThinking) {
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble vision-thinking-bubble';
      const indicator = document.createElement('div');
      indicator.className = 'vision-thinking-indicator';
      indicator.innerHTML = `
        <div class="vision-thinking-dots">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
        <span class="vision-thinking-text">多模态模型识别中...</span>
      `;
      bubble.appendChild(indicator);
      wrapper.appendChild(bubble);
      return wrapper;
    }

    const hasTextContent = message.content && message.content.trim();
    const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;

    // 有文本或既无文本也无工具调用时创建 .message-bubble（避免无文本+有工具调用时出现空气泡）
    if (hasTextContent || (!hasToolCalls && !hasTextContent)) {
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      if (hasTextContent) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'markdown-content';
        contentDiv.innerHTML = renderMarkdown(message.content);
        bubble.appendChild(contentDiv);
      }

      // 无内容时显示打字光标
      if (message.isStreaming && !hasTextContent) {
        const cursor = document.createElement('span');
        cursor.className = 'cursor-blink';
        cursor.textContent = '▌';
        bubble.appendChild(cursor);
      }

      wrapper.appendChild(bubble);
    }

    // 渲染工具调用卡片
    if (hasToolCalls) {
      for (const tc of message.toolCalls) {
        // 查找对应的工具结果
        const toolResult = findToolResult(message, tc.id, toolStore, chatStore);
        const card = createToolCallCard(tc, toolResult, toolStore, chatStore);
        wrapper.appendChild(card);
      }
    }

    // 复制按钮 & 收藏按钮
    const actions = document.createElement('div');
    actions.className = 'message-actions';

    const favBtn = createFavBtn(message.id, chatStore);
    actions.appendChild(favBtn);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = '复制';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(message.content || '').catch(() => {});
    });
    actions.appendChild(copyBtn);
    wrapper.appendChild(actions);

    // 时间戳
    if (message.createdAt) {
      const time = document.createElement('div');
      time.className = 'message-time';
      time.textContent = formatDate(message.createdAt);
      wrapper.appendChild(time);
    }
  }

  return wrapper;
}

/**
 * 创建图片独立卡片
 *
 * 结构：
 *   .message-wrapper.user.fade-in
 *     .image-card              (蓝色气泡 — 仅包裹图片)
 *       .image-card-grid
 *         img.user-message-image
 *     .image-description-area  (独立区域 — 蓝色气泡之外)
 *       .image-description-toggle
 *       .image-description-content
 *
 * @param {Object} message - 含 images 和可选 imageDescription
 * @returns {HTMLElement}
 */
function createUserImageCard(message) {
  const wrapper = document.createElement('div');
  wrapper.className = `message-wrapper user fade-in`;
  wrapper.dataset.messageId = message.id;

  // 图片卡片（蓝色气泡，仅包裹图片网格）
  const card = document.createElement('div');
  card.className = 'image-card';

  const imageGrid = document.createElement('div');
  imageGrid.className = 'image-card-grid';
  message.images.forEach((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'user-message-image';
    img.loading = 'lazy';
    img.addEventListener('click', () => {
      // 点击查看大图
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:10001;display:flex;align-items:center;justify-content:center;cursor:pointer;';
      const fullImg = document.createElement('img');
      fullImg.src = src;
      fullImg.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;';
      overlay.appendChild(fullImg);
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
    imageGrid.appendChild(img);
  });
  card.appendChild(imageGrid);
  wrapper.appendChild(card);

  // 图片描述区域（蓝色图片卡片之外）
  const description = message.imageDescription;
  if (description) {
    const descArea = document.createElement('div');
    descArea.className = 'image-description-area';

    const toggle = document.createElement('button');
    toggle.className = 'image-description-toggle';
    toggle.innerHTML = `
      <span class="toggle-icon">▶</span>
      <span class="toggle-label">查看图片描述</span>
    `;

    const content = document.createElement('div');
    content.className = 'image-description-content';
    content.style.display = 'none';
    content.innerHTML = `
      <div class="image-description-text">${escapeHtml(description)}</div>
    `;

    toggle.addEventListener('click', () => {
      const isExpanded = content.style.display !== 'none';
      content.style.display = isExpanded ? 'none' : 'block';
      toggle.querySelector('.toggle-icon').textContent = isExpanded ? '▶' : '▼';
      toggle.querySelector('.toggle-label').textContent = isExpanded ? '查看图片描述' : '收起图片描述';
    });

    descArea.appendChild(toggle);
    descArea.appendChild(content);
    wrapper.appendChild(descArea);
  } else if (message._isVisionThinking !== undefined) {
    // 图片识别尚未完成，不显示描述区域
  }

  return wrapper;
}

/**
 * 查找工具调用对应的工具结果
 *
 * 双层查找策略：
 *   1. toolStore（运行时，有实时状态）
 *   2. chatStore（页面刷新后 toolStore 为空但 chatStore 已持久化）
 *
 * @param {Object} assistantMessage - 助手消息
 * @param {string} toolCallId - 工具调用 ID
 * @param {Object} toolStore
 * @param {Object} chatStore - ChatStore 单例
 * @returns {Object|null}
 */
function findToolResult(assistantMessage, toolCallId, toolStore, chatStore) {
  // 1. 从 toolStore 查找（运行时优先）
  const executingTools = toolStore.getState().executingTools;
  if (executingTools[toolCallId]) {
    const exec = executingTools[toolCallId];
    if (exec.status === 'success') {
      return exec.result;
    }
    if (exec.status === 'error') {
      return { status: 'error', error: exec.error };
    }
    // executing 或 pending → 返回 null，让调用方显示执行中状态
    return null;
  }

  // 2. 回退：从 chatStore 持久化 tool 消息查找（页面刷新后 toolStore 为空）
  if (chatStore) {
    const session = chatStore.getActiveSession();
    if (session && session.messages) {
      const toolMsg = session.messages.find(
        (m) => m.role === 'tool' && m.toolCallId === toolCallId
      );
      if (toolMsg && toolMsg.toolResult) {
        console.log('[findToolResult] ★ 从 chatStore tool 消息回退查找成功 (toolCallId=%s)', toolCallId);
        return toolMsg.toolResult;
      }
    }
  }

  return null;
}

/**
 * 创建收藏按钮
 * @param {string} messageId - 消息 ID
 * @param {Object} chatStore - ChatStore 单例
 * @returns {HTMLElement}
 */
function createFavBtn(messageId, chatStore) {
  const btn = document.createElement('button');
  btn.className = 'fav-btn';
  btn.title = '收藏';
  btn.textContent = '☆';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!chatStore) return;

    if (chatStore.isFavorite(messageId)) {
      chatStore.removeFavoriteByMessageId(messageId);
    } else {
      // 获取消息信息和当前会话
      const session = chatStore.getActiveSession();
      if (!session) return;
      const msg = session.messages.find((m) => m.id === messageId);
      if (!msg) return;

      const preview = truncateText((msg.content || '').replace(/\\n/g, ' '), 80);
      const title = truncateText((msg.content || '').replace(/\\n/g, ' '), 30) || '(助手消息)';
      chatStore.addFavorite(session.id, messageId, 'message', title, preview);
    }
  });

  // 初始化状态
  if (chatStore && chatStore.isFavorite(messageId)) {
    btn.classList.add('active');
    btn.textContent = '★';
  }

  return btn;
}

function truncateText(text, maxLen) {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen) + '...';
}
