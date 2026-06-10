/**
 * Store 基类 —— 发布-订阅模式 + 可选 localStorage 持久化
 */
export class Store {
  constructor() {
    /** @type {Object} 内部状态 */
    this._state = {};
    /** @type {Map<string, Set<Function>>} key → 回调集合 */
    this._listeners = new Map();
    /** @type {Set<Function>} 全局监听器 */
    this._globalListeners = new Set();
  }

  /**
   * 获取当前状态（浅拷贝）
   * @returns {Object}
   */
  getState() {
    return { ...this._state };
  }

  /**
   * 合并更新状态并通知监听器
   * @param {Object} partial - 要合并的部分状态
   */
  setState(partial) {
    const prev = { ...this._state };
    this._state = { ...this._state, ...partial };

    // 通知特定 key 的监听器
    for (const key of Object.keys(partial)) {
      if (this._listeners.has(key)) {
        this._listeners.get(key).forEach((cb) => cb(this._state[key], prev[key], key));
      }
    }

    // 通知全局监听器
    this._globalListeners.forEach((cb) => cb(this._state, prev));
  }

  /**
   * 订阅某个 key 的变化
   * @param {string} key - 状态键名
   * @param {Function} callback - (newValue, oldValue, key) => void
   * @returns {Function} 取消订阅函数
   */
  subscribe(key, callback) {
    if (!this._listeners.has(key)) this._listeners.set(key, new Set());
    this._listeners.get(key).add(callback);
    return () => this._listeners.get(key)?.delete(callback);
  }

  /**
   * 订阅所有状态变化
   * @param {Function} callback - (newState, oldState) => void
   * @returns {Function} 取消订阅函数
   */
  subscribeAll(callback) {
    this._globalListeners.add(callback);
    return () => this._globalListeners.delete(callback);
  }
}