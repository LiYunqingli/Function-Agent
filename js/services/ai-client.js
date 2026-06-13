/**
 * AI 流式调用客户端 —— 兼容 OpenAI API 格式
 *
 * ★ 架构原则：
 *   createStream 只负责「一次」SSE 请求的读取与解析，返回 { toolCalls }。
 *   不管理生命周期、不触发 onStreamEnd —— 生命周期由调用方（runAI）统一控制。
 *   Agent Loop（while 循环）由 chat-area.js 的 runAI 驱动。
 */
import { StreamParser } from './stream-parser.js';

/**
 * 将文件转为 base64 data URL
 * @param {File} file
 * @returns {Promise<string>} "data:image/png;base64,..."
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 调用多模态模型分析图片内容
 *
 * @param {File[]} images - 图片文件列表
 * @param {Object} visionSettings - { visionApiUrl, visionApiKey, visionModel, visionSystemPrompt }
 * @param {AbortSignal} signal
 * @returns {Promise<string>} 图片描述文本
 */
export async function analyzeImages(images, visionSettings, signal) {
  const { visionApiUrl, visionApiKey, visionModel, visionSystemPrompt } = visionSettings;

  if (!visionApiUrl || !visionApiKey) {
    throw new Error('请先在设置中配置图片识别模型连接信息。');
  }

  if (!images || images.length === 0) {
    return '';
  }

  // 构建含图片的 content 数组
  const contentParts = [];
  if (visionSystemPrompt) {
    contentParts.push({ type: 'text', text: visionSystemPrompt });
  }

  for (const file of images) {
    const base64 = await fileToBase64(file);
    // GPT-4V 兼容格式
    contentParts.push({
      type: 'image_url',
      image_url: { url: base64 },
    });
  }

  const body = {
    model: visionModel,
    messages: [
      {
        role: 'user',
        content: contentParts,
      },
    ],
    max_tokens: 2048,
  };

  console.log('[analyzeImages] 发送图片识别请求: model=%s, images=%d',
    visionModel, images.length);

  const response = await fetch(`${visionApiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${visionApiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`图片识别 API 请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const description = data.choices?.[0]?.message?.content || '';

  console.log('[analyzeImages] 图片识别完成: 描述长度=%d', description.length);

  return description;
}

/**
 * 执行单次 AI 流式 SSE 请求
 *
 * @param {Array}  messages  - 消息历史（含 tool 结果）
 * @param {Array}  tools     - 工具定义（OpenAI Function Calling 格式）
 * @param {Object} settings  - { apiUrl, apiKey, model, temperature, maxTokens, systemPrompt }
 * @param {Object} callbacks - {
 *   onContentDelta(text),          // 收到文本增量
 *   onError(error),                // 非 AbortError 异常
 * }
 * @param {AbortSignal} signal
 *
 * @returns {Promise<{toolCalls: Array|null}>}
 *   resolve 时携带 toolCalls（有工具调用则为数组，否则 null），
 *   供 Agent Loop 判断是否继续循环。
 *
 * ★ 本函数绝不调用 onStreamEnd —— 生命周期（UI 解锁）由 runAI 的 finally 统一管理。
 */
export async function createStream(messages, tools, settings, callbacks, signal) {
  const parser = new StreamParser();

  /**
   * 将 content 规范化为 API 可接受的字符串或 null。
   */
  function normalizeContent(content) {
    if (content === null || content === undefined) return null;
    if (typeof content === 'string') return content;

    if (Array.isArray(content)) {
      const textParts = content
        .map((part) => normalizeContent(part))
        .filter((part) => typeof part === 'string' && part.length > 0);
      if (textParts.length > 0) return textParts.join('');
      try { return JSON.stringify(content); } catch { return String(content); }
    }

    if (typeof content === 'object') {
      if (typeof content.text === 'string') return content.text;
      if (typeof content.content === 'string') return content.content;
      if (typeof content.value === 'string') return content.value;
    }

    try {
      const str = JSON.stringify(content);
      return str === 'null' ? '' : str;
    } catch {
      return String(content) || '';
    }
  }

  // 构建请求消息，确保每条消息的 content 都是合法格式
  const requestMessages = [];
  if (settings.systemPrompt) {
    let sysContent = normalizeContent(settings.systemPrompt);
    if (!sysContent) sysContent = 'You are a helpful assistant.';
    requestMessages.push({ role: 'system', content: sysContent });
  }
  for (const msg of messages) {
    // ★ buildMessages 已处理好 content 格式（tool_calls 时 content=null）
    //   此处只需确保 content 是字符串或 null
    const normalized = { ...msg };
    if (normalized.content !== null && normalized.content !== undefined && typeof normalized.content !== 'string') {
      normalized.content = normalizeContent(normalized.content);
    }
    requestMessages.push(normalized);
  }

  const body = {
    model: settings.model,
    messages: requestMessages,
    stream: true,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  // ★ 关键日志：输出发送给 API 的完整请求体（仅 messages 部分）
  console.log('[createStream] 请求体: model=%s, messages=%d 条, tools=%d, tool_choice=%s',
    body.model, requestMessages.length, tools?.length || 0, body.tool_choice || 'none');
  for (let i = 0; i < requestMessages.length; i++) {
    const m = requestMessages[i];
    if (m.tool_calls) {
      console.log('  msg[%d]: role=assistant, content=%s, tool_calls=%d, ids=%s, types=[%s]',
        i, JSON.stringify(m.content), m.tool_calls.length,
        m.tool_calls.map(tc => tc.id).join(','),
        m.tool_calls.map(tc => tc.type).join(','));
    } else if (m.role === 'tool') {
      console.log('  msg[%d]: role=tool, tool_call_id=%s, content=%s',
        i, m.tool_call_id, (m.content || '').substring(0, 50));
    } else {
      console.log('  msg[%d]: role=%s, content=%s',
        i, m.role, typeof m.content === 'string' ? m.content.substring(0, 60) : JSON.stringify(m.content));
    }
  }

  try {
    const response = await fetch(`${settings.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const debugBody = JSON.stringify(body, null, 2);
      throw new Error(`API 请求失败 (${response.status}): ${errorText}\n\n请求体结构:\n${debugBody}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // 兼容 \r\n（部分代理会将 \n 转为 \r\n）
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop(); // 保留未完成的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const chunk = JSON.parse(trimmed.slice(6));
            // 只传 onContentDelta，不传 onStreamEnd（生命周期由 runAI finally 统一管理）
            parser.processChunk(chunk, {
              onContentDelta: callbacks.onContentDelta,
            });
          } catch {
            // 忽略解析错误的行
          }
        }
      }
    }

    // 处理 buffer 中剩余的数据
    if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
      if (buffer.trim().startsWith('data: ')) {
        try {
          const chunk = JSON.parse(buffer.trim().slice(6));
          parser.processChunk(chunk, {
            onContentDelta: callbacks.onContentDelta,
          });
        } catch {
          // 忽略解析错误
        }
      }
    }

    // 返回工具调用（有则返回数组，无则返回 null）
    // Agent Loop 由调用方处理，createStream 本身不递归。
    const toolCalls = parser.hasToolCalls() ? parser.flushToolCalls() : null;
    console.log('[createStream] SSE 完成, finishReason=%s, toolCalls=%s',
      parser.finishReason, toolCalls ? `(${toolCalls.length}个)` : 'null');

    // ★ 检测空响应：API 返回 choices:[] + completion_tokens:0
    //   这是 GLM 等 API 在消息格式不规范时的「静默拒绝」
    //   表现为：finishReason 始终为 null（既不是 stop 也不是 tool_calls）
    if (parser.finishReason === null && !toolCalls) {
      console.warn('[createStream] ★ 空响应检测：finishReason=null, 无 toolCalls');
      console.warn('[createStream]   可能原因：1) 消息格式不符合 API 规范 2) tool_call_id 不匹配 3) API 静默拒绝');
      // 返回特殊标记，让 runAI 知道这是空响应
      return { toolCalls: null, emptyResponse: true };
    }

    return { toolCalls, emptyResponse: false };

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[createStream] 请求被中止 (AbortError)');
      return { toolCalls: null };
    }
    console.error('[createStream] 请求异常:', error.message);
    // onError 回调也做防御性包装，避免回调异常导致状态失控
    try {
      callbacks.onError(error);
    } catch (cbErr) {
      console.error('[createStream] onError 回调异常:', cbErr);
    }
    return { toolCalls: null };
  }
  // ★ 无 finally 块 —— 生命周期（UI 解锁）由 runAI 的 finally 统一管理。
  //   createStream 职责单一：读取 SSE → 返回结果。绝不触碰 isStreaming / _sendLock。
}

/**
 * 调用 LLM 为会话生成标题（非流式）
 *
 * @param {string} userMessage - 用户的第一条消息
 * @param {string} assistantMessage - AI 的回复内容
 * @param {Object} settings - { apiUrl, apiKey, model, titleMaxLength }
 * @param {AbortSignal} signal
 * @returns {Promise<string>} 生成的标题
 */
export async function generateTitle(userMessage, assistantMessage, settings, signal) {
  const { apiUrl, apiKey, model, titleMaxLength = 15 } = settings;

  const prompt = `请为以下对话生成一个简短标题（不超过${titleMaxLength}个字），直接返回标题文本，不要加引号、解释或标点符号。

用户问题：${userMessage.slice(0, 200)}
AI 回答摘要：${assistantMessage.slice(0, 300)}`;

  const body = {
    model,
    messages: [
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 50,
    stream: false,
  };

  console.log('[generateTitle] 发送标题生成请求: maxLength=%d', titleMaxLength);

  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[generateTitle] API 请求失败:', errorText);
    return '';
  }

  const data = await response.json();
  let title = data.choices?.[0]?.message?.content || '';
  // 清理：去掉首尾空白、引号、多余标点
  title = title.trim()
    .replace(/^["'「『《]/, '')
    .replace(/["'」』》]$/, '')
    .replace(/[。，！？、；：]$/, '');
  // 如果仍然超过限制，截断
  if (title.length > titleMaxLength) {
    title = title.slice(0, titleMaxLength);
  }

  console.log('[generateTitle] 生成标题: "%s"', title);
  return title;
}
