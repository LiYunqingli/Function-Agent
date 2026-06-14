/**
 * 会话状态 Store —— 管理会话列表、活动会话、消息
 */
import { Store } from './store-base.js';
import { STORAGE_KEYS, MAX_SESSIONS } from '../config.js';
import { storageAdapter } from '../services/storage-adapter.js';
import { generateId } from '../utils/id.js';
import { debounce, deepClone } from '../utils/helpers.js';

function normalizeContent(content) {
  if (content === null || content === undefined) return null;
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    const textParts = content
      .map((part) => normalizeContent(part))
      .filter((part) => typeof part === 'string' && part.length > 0);
    if (textParts.length > 0) return textParts.join('');
  }

  if (typeof content === 'object') {
    if (typeof content.text === 'string') return content.text;
    if (typeof content.content === 'string') return content.content;
    if (typeof content.value === 'string') return content.value;
  }

  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

function sanitizeMessage(message) {
  if (!message || typeof message !== 'object') return message;
  const sanitized = { ...message, content: normalizeContent(message.content) };
  if (Array.isArray(sanitized.toolCalls)) {
    sanitized.toolCalls = sanitized.toolCalls.map((toolCall) => {
      if (!toolCall || typeof toolCall !== 'object') return toolCall;
      return {
        ...toolCall,
        function: toolCall.function && typeof toolCall.function === 'object'
          ? { ...toolCall.function, arguments: normalizeContent(toolCall.function.arguments) }
          : toolCall.function,
      };
    });
  }
  if (sanitized.toolResult && typeof sanitized.toolResult === 'object') {
    sanitized.toolResult = deepClone(sanitized.toolResult);
  }
  return sanitized;
}

function sanitizeSession(session) {
  if (!session || typeof session !== 'object') return session;
  return {
    ...session,
    messages: Array.isArray(session.messages) ? session.messages.map(sanitizeMessage) : [],
  };
}

class ChatStore extends Store {
  constructor() {
    super();
    // 初始状态
    this._state = {
      sessions: [],
      activeSessionId: null,
      isStreaming: false,
      abortController: null,
      favorites: [],
    };
    // 从 localStorage 加载
    this.loadFromStorage();
    // 每次状态变更后自动持久化（防抖 500ms）
    this._saveDebounced = debounce(() => this.saveToStorage(), 500);
    this.subscribeAll(() => {
      this._saveDebounced();
    });
  }

  /**
   * 从 localStorage 加载会话数据和收藏
   */
  loadFromStorage() {
    const sessions = storageAdapter.get(STORAGE_KEYS.SESSIONS) || [];
    const activeId = storageAdapter.get(STORAGE_KEYS.ACTIVE_SESSION_ID) || null;
    const favorites = storageAdapter.get(STORAGE_KEYS.FAVORITES) || [];
    // 限制最大会话数
    if (sessions.length > MAX_SESSIONS) {
      sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      sessions.length = MAX_SESSIONS;
    }
    this._state.sessions = sessions.map(sanitizeSession);
    this._state.activeSessionId = activeId;
    this._state.favorites = favorites;
  }

  /**
   * 保存到 localStorage（含容量保护）
   */
  saveToStorage() {
    const sessions = this._state.sessions.map(sanitizeSession);
    storageAdapter.set(STORAGE_KEYS.SESSIONS, sessions);
    storageAdapter.set(STORAGE_KEYS.ACTIVE_SESSION_ID, this._state.activeSessionId);
    storageAdapter.set(STORAGE_KEYS.FAVORITES, this._state.favorites);
  }

  // ══════════════════════════════════════════
  //  收藏功能
  // ══════════════════════════════════════════

  /**
   * 添加收藏
   * @param {string} sessionId - 所属会话 ID
   * @param {string} messageId - 消息 ID
   * @param {'message'|'toolCall'} type - 收藏类型
   * @param {string} title - 标题文本
   * @param {string} preview - 预览文本
   */
  addFavorite(sessionId, messageId, type, title, preview) {
    const existing = this._state.favorites.find((f) => f.messageId === messageId);
    if (existing) return; // 已收藏，不重复添加

    const favorite = {
      id: generateId(),
      sessionId,
      messageId,
      type,
      title,
      preview: preview || '',
      createdAt: new Date().toISOString(),
    };
    this.setState({ favorites: [...this._state.favorites, favorite] });
  }

  /**
   * 删除收藏
   * @param {string} favoriteId - 收藏 ID
   */
  removeFavorite(favoriteId) {
    const favorites = this._state.favorites.filter((f) => f.id !== favoriteId);
    this.setState({ favorites });
  }

  /**
   * 根据消息 ID 删除收藏
   * @param {string} messageId - 消息 ID
   */
  removeFavoriteByMessageId(messageId) {
    const favorites = this._state.favorites.filter((f) => f.messageId !== messageId);
    this.setState({ favorites });
  }

  /**
   * 获取所有收藏
   * @returns {Array}
   */
  getFavorites() {
    return this._state.favorites;
  }

  /**
   * 检查某个消息是否已收藏
   * @param {string} messageId - 消息 ID
   * @returns {boolean}
   */
  isFavorite(messageId) {
    return this._state.favorites.some((f) => f.messageId === messageId);
  }

  /**
   * 根据消息 ID 获取收藏对象
   * @param {string} messageId
   * @returns {Object|null}
   */
  getFavoriteByMessageId(messageId) {
    return this._state.favorites.find((f) => f.messageId === messageId) || null;
  }

  /**
   * 更新收藏标题（用于 AI 异步命名）
   * @param {string} favoriteId - 收藏 ID
   * @param {string} newTitle - 新标题
   */
  updateFavoriteTitle(favoriteId, newTitle) {
    const favorites = this._state.favorites.map((f) =>
      f.id === favoriteId ? { ...f, title: newTitle } : f
    );
    this.setState({ favorites });
  }

  /**
   * 创建新会话并自动切换
   * @param {string} [title] - 会话标题，默认"新对话"
   * @returns {Object} 新建的会话对象
   */
  createSession(title = '新对话') {
    const session = {
      id: generateId(),
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    const sessions = [session, ...this._state.sessions];
    // 超出上限时移除最旧的
    if (sessions.length > MAX_SESSIONS) {
      sessions.length = MAX_SESSIONS;
    }
    this.setState({ sessions, activeSessionId: session.id });
    return session;
  }

  /**
   * 删除会话
   * @param {string} id - 会话 ID
   */
  deleteSession(id) {
    const sessions = this._state.sessions.filter((s) => s.id !== id);
    let activeSessionId = this._state.activeSessionId;
    if (activeSessionId === id) {
      activeSessionId = sessions.length > 0 ? sessions[0].id : null;
    }
    // 清理该会话下的所有收藏
    const favorites = this._state.favorites.filter((f) => f.sessionId !== id);
    this.setState({ sessions, activeSessionId, favorites });
  }

  /**
   * 切换活动会话
   * @param {string} id - 会话 ID
   */
  switchSession(id) {
    this.setState({ activeSessionId: id });
  }

  /**
   * 重命名会话
   * @param {string} id - 会话 ID
   * @param {string} newTitle - 新标题
   */
  renameSession(id, newTitle) {
    const sessions = this._state.sessions.map((s) =>
      s.id === id ? { ...s, title: newTitle, updatedAt: new Date().toISOString() } : s
    );
    this.setState({ sessions });
  }

  /**
   * 添加消息到指定会话
   * @param {string} sessionId - 会话 ID
   * @param {Object} message - 消息对象 { id, role, content, ... }
   */
  addMessage(sessionId, message) {
    const safeMessage = sanitizeMessage(message);
    const sessions = this._state.sessions.map((s) => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        messages: [...s.messages, safeMessage],
        updatedAt: new Date().toISOString(),
      };
    });
    this.setState({ sessions });
  }

  /**
   * 更新指定会话中的消息
   * @param {string} sessionId - 会话 ID
   * @param {string} messageId - 消息 ID
   * @param {Object} partial - 要合并的部分字段
   */
  updateMessage(sessionId, messageId, partial) {
    const safePartial = { ...partial };
    if ('content' in safePartial) {
      safePartial.content = normalizeContent(safePartial.content);
    }
    const sessions = this._state.sessions.map((s) => {
      if (s.id !== sessionId) return s;
      const messages = s.messages.map((m) =>
        m.id === messageId ? sanitizeMessage({ ...m, ...safePartial }) : m
      );
      return { ...s, messages, updatedAt: new Date().toISOString() };
    });
    this.setState({ sessions });
  }

  /**
   * 删除消息
   * @param {string} sessionId
   * @param {string} messageId
   */
  deleteMessage(sessionId, messageId) {
    const sessions = this._state.sessions.map((s) => {
      if (s.id !== sessionId) return s;
      const messages = s.messages.filter((m) => m.id !== messageId);
      return { ...s, messages, updatedAt: new Date().toISOString() };
    });
    this.setState({ sessions });
  }

  /**
   * 获取当前活动会话
   * @returns {Object|null}
   */
  getActiveSession() {
    const { sessions, activeSessionId } = this._state;
    if (!activeSessionId) return null;
    return sessions.find((s) => s.id === activeSessionId) || null;
  }

  /**
   * 获取当前活动会话的消息列表
   * @returns {Array}
   */
  getActiveMessages() {
    const session = this.getActiveSession();
    return session ? session.messages : [];
  }
}

// 导出单例
export const chatStore = new ChatStore();