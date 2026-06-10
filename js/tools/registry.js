/**
 * 工具注册表 —— 管理工具 schema 与 executor 的映射
 */
class ToolRegistry {
  constructor() {
    /** @type {Map<string, {schema: Object, executor: Function}>} */
    this._tools = new Map();
  }

  /**
   * 注册工具
   * @param {Object} schema - OpenAI Function Schema
   * @param {Function} executor - 执行函数
   */
  register(schema, executor) {
    this._tools.set(schema.function.name, { schema, executor });
  }

  /**
   * 获取工具的 schema
   * @param {string} name - 工具名
   * @returns {Object|undefined}
   */
  getSchema(name) {
    return this._tools.get(name)?.schema;
  }

  /**
   * 获取工具的执行函数
   * @param {string} name - 工具名
   * @returns {Function|undefined}
   */
  getExecutor(name) {
    return this._tools.get(name)?.executor;
  }

  /**
   * 获取所有工具的 schema（用于发送给 AI）
   * @returns {Object[]}
   */
  getAllSchemas() {
    return [...this._tools.values()].map((t) => t.schema);
  }

  /**
   * 检查工具是否已注册
   * @param {string} name - 工具名
   * @returns {boolean}
   */
  has(name) {
    return this._tools.has(name);
  }
}

// 导出单例
export const registry = new ToolRegistry();