/**
 * 消息气泡组件 —— 根据消息角色创建不同的气泡
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
    // 用户消息
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = message.content;
    wrapper.appendChild(bubble);
  } else if (message.role === 'assistant') {
    // ★ 判断是否有文本内容（非空且非纯空白）
    const hasTextContent = message.content && message.content.trim();
    const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;

    // ★ 只在有文本内容时才创建 .message-bubble
    //   避免无文本 + 有 tool_calls 时出现空气泡
    if (hasTextContent || (!hasToolCalls && !hasTextContent)) {
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      if (hasTextContent) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'markdown-content';
        contentDiv.innerHTML = renderMarkdown(message.content);
        bubble.appendChild(contentDiv);
      }

      // 如果正在流式输出且无内容，显示打字光标
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
        const card = createToolCallCard(tc, toolResult, toolStore);
        wrapper.appendChild(card);
      }
    }

    // 复制按钮
    const actions = document.createElement('div');
    actions.className = 'message-actions';
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
 * 查找工具调用对应的工具结果
 *
 * ★ 双层查找策略：
 *   1. 优先查 toolStore（运行时，有执行状态+耗时等实时信息）
 *   2. 回退查 chatStore 中的 tool 消息（页面刷新后 toolStore 为空但 chatStore 已持久化）
 *
 * @param {Object} assistantMessage - 助手消息
 * @param {string} toolCallId - 工具调用 ID
 * @param {Object} toolStore
 * @param {Object} chatStore - ChatStore 单例（回退查找用）
 * @returns {Object|null}
 */
function findToolResult(assistantMessage, toolCallId, toolStore, chatStore) {
  // 1. 从 toolStore 的执行状态中查找（运行时优先，含实时状态）
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

  // 2. ★ 回退：从 chatStore 的持久化 tool 消息中查找
  //    页面刷新后 toolStore 为空，但 tool 消息的 toolResult 字段已持久化到 localStorage
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
