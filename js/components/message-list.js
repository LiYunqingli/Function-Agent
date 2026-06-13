/**
 * 消息列表组件 —— 渲染当前会话的消息并自动滚动
 *
 * ★ 性能优化策略：
 *   - 非流式期间：全量重绘（简单可靠）
 *   - 流式期间：增量更新
 *   - 关键变更（tool_calls 被添加、消息状态从 streaming→非streaming）→ 重建该消息 DOM
 *   - 异步加载的数学组件（function-plot 等）只在非必要时不重建
 */
import { createMessageBubble } from './message-bubble.js';
import { renderMarkdown } from './markdown-renderer.js';

/** @type {Object} chatStore 引用 */
let _chatStore = null;
/** @type {Object} toolStore 引用 */
let _toolStore = null;

/**
 * 是否正在流式输出中 —— 流式期间走增量更新，非流式走全量重绘
 */
let _isStreamingPhase = false;

/**
 * 消息属性快照 —— 用于增量渲染时检测属性变化
 * key: messageId, value: { toolCallsCount, isStreaming, contentLen }
 * @type {Map<string, Object>}
 */
const _messageSnapshot = new Map();

/**
 * 初始化消息列表
 * @param {Object} chatStore
 * @param {Object} toolStore
 */
export function initMessageList(chatStore, toolStore) {
  _chatStore = chatStore;
  _toolStore = toolStore;

  // 监听会话和消息变化 → 触发渲染
  chatStore.subscribe('sessions', () => scheduleRender());
  chatStore.subscribe('activeSessionId', () => {
    _messageSnapshot.clear();
    scheduleRender();
  });

  // 监听流式状态变化 → 切换渲染策略
  chatStore.subscribe('isStreaming', (isStreaming) => {
    if (isStreaming) {
      _isStreamingPhase = true;
    } else {
      // 流式结束 → 下一次 render 走全量重绘，确保最终状态正确
      _isStreamingPhase = false;
      _messageSnapshot.clear(); // 清空快照，强制全量重建
      scheduleRender();
    }
  });

  // ★ 监听工具执行状态变化 → 工具开始/完成时立即触发渲染
  //   工具执行在 Agent Loop 中间完成，toolStore 变化不会触发 chatStore 更新，
  //   必须独立订阅才能让 UI 及时反映"执行中→已完成→渲染图表"的状态转换。
  toolStore.subscribe('executingTools', (_newVal, _oldVal) => {
    scheduleRender();
  });

  // ★ 首次渲染：页面刷新后需主动渲染当前活动会话的消息
  scheduleRender();
}

/** 渲染调度标志 —— 合并同一微任务内的多次渲染请求 */
let _renderScheduled = false;

/**
 * 调度渲染 —— 使用 micro-task 合并同一事件循环内的多次 setState
 */
function scheduleRender() {
  if (_renderScheduled) return;
  _renderScheduled = true;
  queueMicrotask(() => {
    _renderScheduled = false;
    renderMessages();
  });
}

/**
 * 渲染当前会话的所有消息
 *
 * ★ 核心策略：
 *   流式期间 → 增量更新
 *   非流式期间 → 全量重绘（保证一致性）
 */
function renderMessages() {
  const messageList = document.getElementById('message-list');
  if (!messageList) return;

  const session = _chatStore.getActiveSession();
  if (!session) {
    messageList.innerHTML = '';
    _messageSnapshot.clear();
    return;
  }

  const messages = session.messages;

  if (_isStreamingPhase) {
    // ★ 流式期间：增量更新
    renderIncremental(messageList, messages);
  } else {
    // ★ 非流式期间：全量重绘
    renderFull(messageList, messages);
  }

  // 自动滚动到底部
  requestAnimationFrame(() => {
    messageList.scrollTop = messageList.scrollHeight;
  });
}

/**
 * 全量重绘 —— 清空并重建所有消息 DOM
 */
function renderFull(messageList, messages) {
  messageList.innerHTML = '';
  _messageSnapshot.clear();

  for (const message of messages) {
    const bubble = createMessageBubble(message, _toolStore, _chatStore);
    if (bubble) {
      messageList.appendChild(bubble);
      updateSnapshot(message);
    }
  }
}

/**
 * 增量更新 —— 流式期间最小化 DOM 操作
 *
 * 策略：
 *   1. 首次增量（DOM 为空或消息数差异过大）→ 全量重绘
 *   2. 新增消息 → 追加到末尾
 *   3. 消息删除 → 移除对应 DOM
 *   4. 属性变化（tool_calls 添加、isStreaming 变化）→ 重建该消息 DOM
 *   5. 流式文本增量 → 只更新 .message-bubble 的内容
 */
function renderIncremental(messageList, messages) {
  const existingWrappers = messageList.querySelectorAll('.message-wrapper');
  const existingCount = existingWrappers.length;
  const visibleMessages = messages.filter(m => m.role !== 'tool');

  // 如果消息数量差异过大，直接全量重绘
  if (Math.abs(existingCount - visibleMessages.length) > 2 || existingCount === 0) {
    renderFull(messageList, messages);
    return;
  }

  const existingMap = new Map();
  for (const wrapper of existingWrappers) {
    existingMap.set(wrapper.dataset.messageId, wrapper);
  }

  // 1. 移除已不存在的 DOM
  const currentIds = new Set(messages.map(m => m.id));
  for (const [id, wrapper] of existingMap) {
    if (!currentIds.has(id)) {
      wrapper.remove();
      existingMap.delete(id);
      _messageSnapshot.delete(id);
    }
  }

  // 2. 逐消息处理
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role === 'tool') continue;

    if (!existingMap.has(message.id)) {
      // 新消息 → 追加到末尾
      const bubble = createMessageBubble(message, _toolStore, _chatStore);
      if (bubble) {
        messageList.appendChild(bubble);
        existingMap.set(message.id, bubble);
        updateSnapshot(message);
      }
    } else {
      // 已有消息 → 检测属性变化
      const changed = detectChange(message);
      if (changed) {
        // ★ 属性变化（tool_calls 添加、isStreaming 变化等）→ 重建该消息 DOM
        const oldWrapper = existingMap.get(message.id);
        const newBubble = createMessageBubble(message, _toolStore, _chatStore);
        if (newBubble && oldWrapper) {
          oldWrapper.replaceWith(newBubble);
          existingMap.set(message.id, newBubble);
          updateSnapshot(message);
        }
      } else if (message.role === 'assistant' && message.isStreaming && message.content) {
        // ★ 纯文本增量 → 只更新 .message-bubble 的内容
        const wrapper = existingMap.get(message.id);
        if (wrapper) {
          updateStreamingText(wrapper, message);
        }
      }
    }
  }
}

/**
 * 更新消息属性快照
 * ★ 同时记录 tool 执行状态，以便 detectChange 检测工具结果就绪
 */
function updateSnapshot(message) {
  const toolResults = {};
  if (message.toolCalls && message.toolCalls.length > 0) {
    for (const tc of message.toolCalls) {
      const exec = _toolStore.getState().executingTools[tc.id];
      toolResults[tc.id] = exec ? exec.status : 'none';
    }
  }
  _messageSnapshot.set(message.id, {
    toolCallsCount: message.toolCalls?.length || 0,
    isStreaming: message.isStreaming || false,
    contentLen: (message.content || '').length,
    toolResults,
  });
}

/**
 * 检测消息属性是否发生变化
 * ★ 同时检测 tool 执行状态变化（执行中→已完成→渲染图表）
 * @returns {boolean} true 表示需要重建 DOM
 */
function detectChange(message) {
  const prev = _messageSnapshot.get(message.id);
  if (!prev) return true; // 无快照 → 首次

  const currentToolCallsCount = message.toolCalls?.length || 0;
  const currentIsStreaming = message.isStreaming || false;
  const currentContentLen = (message.content || '').length;

  // tool_calls 数量变化 → 必须重建（需要渲染/移除卡片）
  if (prev.toolCallsCount !== currentToolCallsCount) return true;

  // isStreaming 从 true → false → 需要重建（移除光标等）
  if (prev.isStreaming !== currentIsStreaming) return true;

  // ★ tool 执行状态变化 → 需要重建（"等待中"→"执行中"→渲染图表）
  if (currentToolCallsCount > 0) {
    const prevResults = prev.toolResults || {};
    for (let i = 0; i < message.toolCalls.length; i++) {
      const tc = message.toolCalls[i];
      const exec = _toolStore.getState().executingTools[tc.id];
      const currentStatus = exec ? exec.status : 'none';
      const prevStatus = prevResults[tc.id] || 'none';
      if (currentStatus !== prevStatus) return true;
    }
  }

  // 内容长度大幅变化（>100 字符，可能是更新了整个消息）
  // 但小增量（流式 delta）不需要重建
  if (Math.abs(prev.contentLen - currentContentLen) > 100) return true;

  return false;
}

/**
 * 最小化更新流式消息的文本内容
 * 只替换 .message-bubble 内的 .markdown-content，不销毁工具卡片等外部 DOM
 */
function updateStreamingText(wrapper, message) {
  const bubble = wrapper.querySelector('.message-bubble');
  if (!bubble) return;

  if (message.content) {
    let contentDiv = bubble.querySelector('.markdown-content');
    if (!contentDiv) {
      // 首次有内容：创建内容区，清空光标
      bubble.innerHTML = '';
      contentDiv = document.createElement('div');
      contentDiv.className = 'markdown-content';
      bubble.appendChild(contentDiv);
    }
    contentDiv.innerHTML = renderMarkdown(message.content);
  } else {
    // 无内容，显示打字光标
    if (!bubble.querySelector('.cursor-blink')) {
      bubble.innerHTML = '<span class="cursor-blink">▌</span>';
    }
  }
}
