/**
 * 工具执行状态 Store —— 管理工具调用的执行状态（不持久化）
 */
import { Store } from './store-base.js';

class ToolStore extends Store {
  constructor() {
    super();
    /** @type {Record<string, {toolName: string, status: string, result?: *, startedAt: string}>} */
    this._state = {
      executingTools: {},
    };
  }

  /**
   * 标记工具开始执行
   * @param {string} toolCallId - 工具调用 ID
   * @param {string} toolName - 工具名称
   */
  startExecution(toolCallId, toolName) {
    const executingTools = { ...this._state.executingTools };
    executingTools[toolCallId] = {
      toolName,
      status: 'executing',
      startedAt: new Date().toISOString(),
    };
    this.setState({ executingTools });
  }

  /**
   * 标记工具执行成功
   * @param {string} toolCallId - 工具调用 ID
   * @param {*} result - 执行结果
   */
  completeExecution(toolCallId, result) {
    const executingTools = { ...this._state.executingTools };
    if (executingTools[toolCallId]) {
      executingTools[toolCallId] = {
        ...executingTools[toolCallId],
        status: 'success',
        result,
      };
    }
    this.setState({ executingTools });
  }

  /**
   * 标记工具执行失败
   * @param {string} toolCallId - 工具调用 ID
   * @param {string} error - 错误信息
   */
  failExecution(toolCallId, error) {
    const executingTools = { ...this._state.executingTools };
    if (executingTools[toolCallId]) {
      executingTools[toolCallId] = {
        ...executingTools[toolCallId],
        status: 'error',
        error,
      };
    }
    this.setState({ executingTools });
  }

  /**
   * 清空所有执行状态
   */
  clear() {
    this.setState({ executingTools: {} });
  }
}

// 导出单例
export const toolStore = new ToolStore();