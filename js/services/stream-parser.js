/**
 * SSE 流解析 + tool_calls 分块拼接
 *
 * ★ 生命周期原则：StreamParser 只负责解析，绝不调用 onStreamEnd。
 *   onStreamEnd 的唯一调用方是 ai-client.js 的 createStream（finally 保底）。
 */
export class StreamParser {
  constructor() {
    /** @type {Map<number, {id: string, name: string, argsChunks: string[]}>} */
    this.toolCallsBuffer = new Map();

    /**
     * finish_reason 标志：
     *   'stop'       — 普通文本结束
     *   'tool_calls' — 工具调用结束
     *   null         — 尚未结束
     */
    this.finishReason = null;

    /** @type {Object|null} 最后一次收到的 usage 对象 */
    this.usage = null;
  }

  /**
   * 处理单个 SSE chunk
   * @param {Object} chunk - 解析后的 JSON 对象
   * @param {Object} callbacks - { onContentDelta, onToolCalls }
   *   注意：onStreamEnd 由 createStream 统一管理，此处不调用。
   */
  processChunk(chunk, callbacks) {
    // 优先捕获 token usage（可能在任意 chunk 中出现）
    if (chunk.usage) {
      this.usage = chunk.usage;
    }

    if (!chunk.choices || !chunk.choices.length) {
      // ★ 空 choices 检测：GLM 等 API 在消息格式不规范时返回 choices:[]
      //   此时 usage.prompt_tokens > 0 但 completion_tokens = 0
      if (chunk.usage && chunk.usage.prompt_tokens > 0 && chunk.usage.completion_tokens === 0) {
        console.warn('[StreamParser] 收到空响应 chunk: choices=[], prompt_tokens=%d, completion_tokens=0',
          chunk.usage.prompt_tokens);
      }
      // 捕获 token usage
      if (chunk.usage) {
        this.usage = chunk.usage;
      }
      return;
    }

    const choice = chunk.choices[0];
    const delta = choice.delta;

    // 处理文本内容增量
    if (delta?.content) {
      callbacks.onContentDelta(delta.content);
    }

    // 处理 tool_calls 增量
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index;
        if (!this.toolCallsBuffer.has(idx)) {
          this.toolCallsBuffer.set(idx, {
            id: tc.id || '',
            name: tc.function?.name || '',
            argsChunks: [],
          });
        }
        const buffer = this.toolCallsBuffer.get(idx);
        if (tc.id) buffer.id = tc.id;
        if (tc.function?.name) buffer.name = tc.function.name;
        if (tc.function?.arguments) buffer.argsChunks.push(tc.function.arguments);
      }
    }

    // 记录 finish_reason，不做任何生命周期操作
    if (choice.finish_reason === 'tool_calls') {
      this.finishReason = 'tool_calls';
    } else if (choice.finish_reason === 'stop') {
      // 兼容：stop 时如果 buffer 有内容，视同 tool_calls
      if (this.toolCallsBuffer.size > 0) {
        this.finishReason = 'tool_calls';
      } else {
        this.finishReason = 'stop';
      }
    }
  }

  /**
   * 当前流是否触发了工具调用
   * @returns {boolean}
   */
  hasToolCalls() {
    return this.finishReason === 'tool_calls' && this.toolCallsBuffer.size > 0;
  }

  /**
   * 合并并清空 tool_calls buffer，返回标准格式的工具调用数组
   * @returns {Array<{id: string, type: string, function: {name: string, arguments: string}}>}
   */
  flushToolCalls() {
    const toolCalls = [];
    const sortedKeys = [...this.toolCallsBuffer.keys()].sort((a, b) => a - b);
    for (const idx of sortedKeys) {
      const buffer = this.toolCallsBuffer.get(idx);
      toolCalls.push({
        id: buffer.id,
        type: 'function',
        function: {
          name: buffer.name,
          arguments: buffer.argsChunks.join(''),
        },
      });
    }
    this.toolCallsBuffer.clear();
    return toolCalls;
  }


  /**
   * 读取并清空 token usage（由调用方在流结束后调用一次）
   * @returns {Object|null}
   */
  consumeUsage() {
    const u = this.usage;
    this.usage = null;
    return u;
  }

  /**
   * 重置解析器（每次新 SSE 请求前调用）
   */
  reset() {
    this.toolCallsBuffer.clear();
    this.finishReason = null;
    this.usage = null;
  }
}
