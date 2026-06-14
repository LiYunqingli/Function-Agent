/**
 * 聊天主区域 —— 消息发送、AI 流式调用、工具调用循环
 *
 * Agent Loop 架构（v2）：
 *   runAI 使用 while 循环驱动 AI→工具→AI→... 链路。
 *   生命周期由 runAI 的 finally 块独占管理：
 *     - isStreaming 只在 runAI finally 中复位
 *     - 代际守卫（_runAIGeneration）防止旧 runAI 覆盖新状态
 *     - activeStreams 计数器提供双重保险
 *   createStream 不再持有 onStreamEnd，只返回结果。
 */
import { generateId } from '../utils/id.js';
import { MAX_TOOL_DEPTH } from '../config.js';
import { createStream, analyzeImages, fileToBase64, generateTitle } from '../services/ai-client.js';
import { registry } from '../tools/registry.js';
import { executeToolCall } from '../tools/executor.js';
import { learningStatsStore } from '../stores/learning-stats-store.js';

/** @type {Object} chatStore 引用（由 initChatArea 注入） */
let _chatStore = null;
/** @type {Object} settingsStore 引用 */
let _settingsStore = null;
/** @type {Object} toolStore 引用 */
let _toolStore = null;
/** @type {Object} inputBarApi 引用 { getImages, clearImages } */
let _inputBarApi = null;

/**
 * 发送锁 —— 保证 handleSend → runAI 整条异步链路串行。
 * 只在 handleSend 的 finally 中复位。
 */
let _sendLock = false;

/**
 * 活跃流计数器 —— 双重保险：
 * 每次 runAI 开始 +1，finally -1。
 * 当 _activeStreams === 0 时才真正解锁 UI。
 */
let _activeStreams = 0;

/**
 * 代际计数器 —— 防止旧 runAI 的 finally 覆盖新 runAI 的状态。
 * 每次 runAI 启动时递增，finally 中对比 myGeneration === _runAIGeneration
 * 才允许复位 isStreaming。
 */
let _runAIGeneration = 0;

/**
 * 初始化聊天区域
 * @param {Object} chatStore
 * @param {Object} settingsStore
 * @param {Object} toolStore
 */
export function initChatArea(chatStore, settingsStore, toolStore, inputBarApi) {
  _chatStore = chatStore;
  _settingsStore = settingsStore;
  _toolStore = toolStore;
  _inputBarApi = inputBarApi;

  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const stopBtn = document.getElementById('stop-btn');
  const streamingIndicator = document.getElementById('streaming-indicator');

  // 发送按钮点击
  sendBtn.addEventListener('click', handleSend);

  // 停止按钮 —— 只负责 abort，UI 状态由 runAI finally 统一管理
  stopBtn.addEventListener('click', () => {
    const { abortController } = _chatStore.getState();
    if (abortController) {
      abortController.abort();
      console.log('[stopBtn] 已发出 abort 信号');
    }
    // runAI finally 会在 abort 传播后自动复位，消除竞态
  });

  // Enter 发送（Shift+Enter 换行）
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // 监听流式状态 → 更新按钮和指示器
  _chatStore.subscribe('isStreaming', (isStreaming) => {
    console.log('[isStreaming] 状态变更:', isStreaming, '| _activeStreams:', _activeStreams);
    sendBtn.style.display = isStreaming ? 'none' : '';
    stopBtn.style.display = isStreaming ? '' : 'none';
    streamingIndicator.style.display = isStreaming ? 'flex' : 'none';
    input.disabled = isStreaming;
  });
}

/**
 * 发送消息
 */
async function handleSend() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();

  if (_sendLock) {
    console.warn('[handleSend] _sendLock=true，上一轮链路尚未完成，拒绝新发送');
    return;
  }

  const images = _inputBarApi ? _inputBarApi.getImages() : [];
  const hasImages = images.length > 0;

  // 既无文字也无图片 → 拒绝
  if (!text && !hasImages) return;

  _sendLock = true;
  console.log('[handleSend] _sendLock=true，开始新一轮发送 (text=%s, images=%d)', text.substring(0, 30), images.length);

  // 确保有活动会话
  let session = _chatStore.getActiveSession();
  if (!session) {
    session = _chatStore.createSession();
    learningStatsStore.recordSession();
  }
  const sessionId = _chatStore.getState().activeSessionId;

  // 图片 base64 编码（用于 UI 缩略图 + 发给多模态模型）
  let imageBase64List = [];
  if (hasImages) {
    try {
      imageBase64List = await Promise.all(images.map((file) => fileToBase64(file)));
      console.log('[handleSend] 图片已编码: %d 张', imageBase64List.length);
    } catch (err) {
      console.error('[handleSend] 图片编码失败:', err);
    }
  }

  // 1. 有图片时先添加独立的图片卡片消息
  let imageMsgId = null;
  if (hasImages && imageBase64List.length > 0) {
    const imageMsg = {
      id: generateId(),
      role: 'user',
      content: '',                               // 图片卡片无文字
      images: imageBase64List,
      _isImageCard: true,                       // 标记为图片独立卡片
      createdAt: new Date().toISOString(),
    };
    _chatStore.addMessage(sessionId, imageMsg);
    imageMsgId = imageMsg.id;
  }

  // 2. 添加文字消息
  let userMsg;
  if (text) {
    userMsg = {
      id: generateId(),
      role: 'user',
      content: text,
      images: undefined,                          // 文字消息不包含图片
      createdAt: new Date().toISOString(),
    };
    _chatStore.addMessage(sessionId, userMsg);
  } else {
    // 无文字但有图片：创建空 user 消息占位，buildMessages 会注入 combinedUserContent
    userMsg = {
      id: generateId(),
      role: 'user',
      content: '',
      createdAt: new Date().toISOString(),
    };
    _chatStore.addMessage(sessionId, userMsg);
  }

  // 清空输入栏
  input.value = '';
  input.style.height = 'auto';
  _inputBarApi?.clearImages();
  scrollToBottom();

  // 组合后的用户内容（有图片则后续追加图片描述）
  let userContent = text;
  let assistantMsgId;

  if (hasImages && imageBase64List.length > 0) {
    // 创建多模态 model thinking 占位消息
    const thinkingMsg = {
      id: generateId(),
      role: 'assistant',
      content: '',
      toolCalls: [],
      isStreaming: false,
      _isVisionThinking: true,
      createdAt: new Date().toISOString(),
    };
    _chatStore.addMessage(sessionId, thinkingMsg);
    assistantMsgId = thinkingMsg.id;
    scrollToBottom();

    const settings = _settingsStore.getState();
    const visionConfigured = settings.visionApiUrl && settings.visionApiKey;

    if (visionConfigured) {
      try {
        const visionAbort = new AbortController();

        // 调用多模态模型识别图片
        const description = await analyzeImages(images, {
          visionApiUrl: settings.visionApiUrl,
          visionApiKey: settings.visionApiKey,
          visionModel: settings.visionModel,
          visionSystemPrompt: settings.visionSystemPrompt,
        }, visionAbort.signal);

        if (description && description.trim()) {
          userContent = `[图片内容描述]\n${description}\n\n[用户问题]\n${text || '请根据图片内容解答以上题目'}`;
          console.log('[handleSend] 图片识别成功，合并后内容长度=%d', userContent.length);

          // 将图片描述存储到图片卡片消息中
          if (imageMsgId) {
            _chatStore.updateMessage(sessionId, imageMsgId, {
              imageDescription: description,
            });
          }
        } else {
          console.warn('[handleSend] 图片识别返回空内容');
          userContent = text;
        }

        // 识别完成 → thinking 消息转为正常 assistant 占位
        _chatStore.updateMessage(sessionId, assistantMsgId, {
          content: '',
          _isVisionThinking: false,
          isStreaming: true,
        });
      } catch (err) {
        console.error('[handleSend] 图片识别失败:', err);
        // 失败时更新 thinking 消息为错误提示
        _chatStore.updateMessage(sessionId, assistantMsgId, {
          content: `⚠️ 图片识别失败: ${err.message}`,
          _isVisionThinking: false,
          isStreaming: false,
          _isLocalError: true,
        });
        _sendLock = false;
        console.log('[handleSend] _sendLock=false（图片识别失败）');
        return;
      }
    } else {
      // vision 未配置但有图片 → 更新 thinking 为错误提示
      _chatStore.updateMessage(sessionId, assistantMsgId, {
        content: '⚠️ 未配置图片识别模型，请在设置中配置多模态大模型连接信息。',
        _isVisionThinking: false,
        isStreaming: false,
        _isLocalError: true,
      });
      _sendLock = false;
      console.log('[handleSend] _sendLock=false（vision 未配置）');
      return;
    }
  } else {
    // 无图片：创建普通助手占位消息
    const assistantMsg = {
      id: generateId(),
      role: 'assistant',
      content: '',
      toolCalls: [],
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };
    _chatStore.addMessage(sessionId, assistantMsg);
    assistantMsgId = assistantMsg.id;
  }

  // 3. 启动 Agent Loop
  try {
    await runAI(sessionId, assistantMsgId, userContent, userMsg.id);
  } catch (err) {
    console.error('[handleSend] runAI 抛出未预期异常:', err);
  } finally {
    _sendLock = false;
    console.log('[handleSend] _sendLock=false，发送链路全部完成, isStreaming=%s',
      _chatStore.getState().isStreaming);
  }
}

/**
 * Agent Loop —— 单函数驱动完整的「AI → 工具 → AI → ...」链路
 *
 * 核心设计：
 *   - while 循环代替递归 createStream
 *   - 代际守卫（_runAIGeneration）防止旧 runAI 覆盖新状态
 *   - activeStreams 计数器提供双重保险
 *   - isStreaming 复位权 **独占** 于 finally 块
 *   - createStream 不再持有 onStreamEnd
 *
 * @param {string} sessionId
 * @param {string} firstAssistantMsgId - 第一条助手占位消息的 id
 * @param {string} combinedUserContent - 组合后的用户内容（含图片描述），用于 API 请求；为 null 时使用原始内容
 * @param {string} combinedUserMsgId - 对应的用户消息 ID，用于精确替换
 */
async function runAI(sessionId, firstAssistantMsgId, combinedUserContent = null, combinedUserMsgId = null) {
  // 代际递增
  _runAIGeneration++;
  const myGeneration = _runAIGeneration;

  // 活跃流计数 +1
  _activeStreams++;
  console.log('[runAI] 启动 generation=%d, _activeStreams=%d', myGeneration, _activeStreams);

  // isStreaming 在整个 Loop 开始时设为 true，所有退出路径由 finally 统一复位
  const abortController = new AbortController();
  _chatStore.setState({ isStreaming: true, abortController });

  // 当前这一轮要写入的助手消息 id（每次工具调用后会更新）
  let currentAssistantMsgId = firstAssistantMsgId;
  let depth = 0;

  try {
    const settings = _settingsStore.getState();

    if (!settings.apiUrl || !settings.apiKey) {
      _chatStore.updateMessage(sessionId, firstAssistantMsgId, {
        content: '⚠️ 请先在设置中配置 API URL 和 API Key。',
        isStreaming: false,
      });
      return; // finally 会统一复位 isStreaming
    }
    while (true) {
      if (depth > MAX_TOOL_DEPTH) {
        _chatStore.updateMessage(sessionId, currentAssistantMsgId, {
          content: '⚠️ 工具调用深度已达上限，请简化问题或重新提问。',
          isStreaming: false,
        });
        break;
      }

      // 检查是否已被中止
      if (abortController.signal.aborted) {
        console.log('[runAI] 已中止，退出 Agent Loop');
        break;
      }

      // 构建发送给 AI 的消息列表
      const messages = buildMessages(sessionId, currentAssistantMsgId, combinedUserContent, combinedUserMsgId);
      if (!messages) break; // session 不存在

      let currentContent = '';

      // createStream 不再有 onStreamEnd，生命周期由 finally 独占
      const streamResult = await createStream(
        messages,
        registry.getAllSchemas(),
        settings,
        {
          onContentDelta: (text) => {
            currentContent += text;
            _chatStore.updateMessage(sessionId, currentAssistantMsgId, {
              content: currentContent,
            });
            scrollToBottom();
          },
          onError: (error) => {
            console.error('[runAI] SSE 错误 depth=%d:', depth, error.message);
            _chatStore.updateMessage(sessionId, currentAssistantMsgId, {
              content: `❌ 错误: ${error.message}`,
              isStreaming: false,
              _isLocalError: true,
            });
          },
        },
        abortController.signal
      );
      const { toolCalls, emptyResponse } = streamResult;

      // 剥离 GLM-4.5 思维链标签，防止 &lt;/think&gt; 残留污染后续 API 请求
      if (currentContent && currentContent.includes('think>')) {
        const cleaned = stripThinkContent(currentContent);
        if (cleaned !== currentContent) {
          console.log('[runAI] ★ 检测到 think 标签，已剥离。原始长度=%d → 清理后=%d',
            currentContent.length, cleaned.length);
          currentContent = cleaned;
        }
      }

      // 空响应检测：API 返回 choices:[] + completion_tokens:0
      if (emptyResponse) {
        console.warn('[runAI] ★ API 返回空响应 (choices:[])，可能是消息格式问题');
        if (depth === 0) {
          _chatStore.updateMessage(sessionId, currentAssistantMsgId, {
            content: '⚠️ AI 未返回任何内容。请检查 API 配置或重试。',
            isStreaming: false,
            _isLocalError: true,
          });
        } else {
          // 工具调用后的空响应 → 基于实际工具结果生成回复
          const fallbackContent = _buildFallbackResponse(sessionId);
          _chatStore.updateMessage(sessionId, currentAssistantMsgId, {
            content: fallbackContent,
            isStreaming: false,
          });
        }
        _autoTitle(sessionId);
        break;
      }

      if (!toolCalls || toolCalls.length === 0) {
        console.log('[runAI] depth=%d 无工具调用，Agent Loop 正常结束', depth);
        const currentSession = _chatStore.getState().sessions.find((s) => s.id === sessionId);
        const currentMsg = currentSession?.messages.find((m) => m.id === currentAssistantMsgId);

        // 确保存储的消息也是清理后的版本
        if (currentMsg && currentContent) {
          const finalContent = stripThinkContent(currentContent);
          if (!finalContent) {
            _chatStore.updateMessage(sessionId, currentAssistantMsgId, {
              content: '好的',
              isStreaming: false,
            });
          } else if (finalContent !== currentMsg.content) {
            _chatStore.updateMessage(sessionId, currentAssistantMsgId, {
              content: finalContent,
              isStreaming: false,
            });
          } else {
            _chatStore.updateMessage(sessionId, currentAssistantMsgId, { isStreaming: false });
          }
        } else if (currentMsg && !(currentMsg.content || '').trim()) {
          _chatStore.updateMessage(sessionId, currentAssistantMsgId, {
            content: '好的',
            isStreaming: false,
          });
        } else {
          _chatStore.updateMessage(sessionId, currentAssistantMsgId, { isStreaming: false });
        }

        // 自动生成会话标题
        _autoTitle(sessionId);
        break; // Agent Loop 正常结束
      }

      // 执行工具调用
      console.log('[runAI] depth=%d 收到 %d 个工具调用:', depth, toolCalls.length,
        toolCalls.map((tc) => tc.function.name));

      // 不覆盖 AI 文本：AI 可能在 tool_calls 的同时返回文本（如"我来帮你画一个图"）
      console.log('[runAI] 保留助手文本 content=%s (len=%d)', currentContent.substring(0, 50), currentContent.length);
      _chatStore.updateMessage(sessionId, currentAssistantMsgId, {
        content: currentContent,
        toolCalls: [...toolCalls],
        isStreaming: false,
      });

      // 逐个执行工具，每个工具执行后检查 abort 信号
      for (const tc of toolCalls) {
        if (abortController.signal.aborted) {
          console.log('[runAI] 工具执行期间收到中止信号，退出');
          break;
        }

        _toolStore.startExecution(tc.id, tc.function.name);
        const result = await executeToolCall(tc);

        if (result.status === 'success') {
          _toolStore.completeExecution(tc.id, result);
          // 记录工具使用到学习统计
          learningStatsStore.recordToolUsage(tc.function.name);
        } else {
          _toolStore.failExecution(tc.id, result.error);
        }

        // 追加工具结果消息
        const toolMsg = {
          id: generateId(),
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: tc.id,
          toolResult: result,
          createdAt: new Date().toISOString(),
        };
        _chatStore.addMessage(sessionId, toolMsg);
        console.log('[runAI] 工具 %s 执行完成, status=%s', tc.function.name, result.status);
      }

      // 如果工具执行期间被中止，直接退出循环
      if (abortController.signal.aborted) {
        console.log('[runAI] 工具执行后被中止，退出循环');
        break;
      }

      // 为下一轮 AI 回复创建新的助手占位消息
      const newAssistantMsg = {
        id: generateId(),
        role: 'assistant',
        content: '',
        toolCalls: [],
        isStreaming: true,
        createdAt: new Date().toISOString(),
      };
      _chatStore.addMessage(sessionId, newAssistantMsg);
      currentAssistantMsgId = newAssistantMsg.id;
      depth++;
      console.log('[runAI] 准备下一轮 createStream, depth=%d, newMsgId=%s', depth, currentAssistantMsgId);

      // 继续下一轮 while
    }
  } catch (error) {
    console.error('[runAI] Agent Loop 异常:', error);
    _chatStore.updateMessage(sessionId, currentAssistantMsgId, {
      content: `❌ 工具调用失败: ${error.message}`,
      isStreaming: false,
      _isLocalError: true,
    });
  } finally {
    // 代际守卫保护的状态复位：只有当前 runAI 是最新一代时才允许复位 isStreaming
    _activeStreams--;
    console.log('[runAI] finally generation=%d, _activeStreams=%d', myGeneration, _activeStreams);

    _safeResetState(myGeneration);
  }
}

/**
 * 代际安全的状态复位
 * 只有 myGeneration === _runAIGeneration 时才复位 isStreaming，
 * 防止旧的 runAI 实例覆盖新 runAI 的状态。
 * @param {number} myGeneration - 本次 runAI 的代际 ID
 */
function _safeResetState(myGeneration) {
  const isCurrent = myGeneration === _runAIGeneration;
  console.log('[runAI] _safeResetState myGen=%d, currentGen=%d, isCurrent=%s, _activeStreams=%d',
    myGeneration, _runAIGeneration, isCurrent, _activeStreams);
  if (isCurrent) {
    // 我是最新一代 → 安全复位
    _chatStore.setState({ isStreaming: false, abortController: null });
    console.log('[runAI] ★ 代际守卫通过，isStreaming → false (generation=%d)', myGeneration);
  } else {
    // 我已被新一代 runAI 取代 → 不触碰状态
    console.log('[runAI] ★ 代际守卫拦截，跳过复位 (myGen=%d, currentGen=%d)',
      myGeneration, _runAIGeneration);
  }
}

/**
 * 当 API 在工具调用后返回空响应时，基于实际工具执行结果生成有意义的回复。
 *
 * 策略：遍历最近添加的 tool 消息，提取每个工具的执行结果，
 * 生成一份自然语言摘要作为 assistant 的回复。
 * 这样既保持了 tool→assistant→user 的合法消息序列，
 * 又避免了 "好的" 等让 GLM 误以为对话结束的内容。
 *
 * @param {string} sessionId
 * @returns {string} 生成的回复文本
 */
function _buildFallbackResponse(sessionId) {
  const session = _chatStore.getState().sessions.find((s) => s.id === sessionId);
  if (!session) return '操作完成，请继续提问。';

  const messages = session.messages;
  const toolMsgs = [];
  // 从后往前找最近的 tool 消息（直到遇到非 tool 消息为止）
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'tool' && m.toolResult) {
      toolMsgs.unshift(m);
    } else {
      break;
    }
  }

  if (toolMsgs.length === 0) {
    return '操作完成，请继续提问。';
  }

  const descriptions = toolMsgs.map((tm) => _buildToolNaturalContent(tm.toolCallId, tm.toolResult));
  if (descriptions.length === 1) {
    return descriptions[0] + ' 您可以继续提问或提出新的需求。';
  }
  return '已完成以下操作：\n' + descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n') + '\n您可以继续提问或提出新的需求。';
}

/**
 * 构建发送给 AI 的消息数组（过滤占位消息、规范化 content）
 * @param {string} sessionId
 * @param {string} currentAssistantMsgId - 当前轮次的占位消息 id（排除在外）
 * @param {string} combinedUserContent - 组合后的用户内容，为 null 时使用原始 content
 * @param {string} combinedUserMsgId - 需要替换内容的用户消息 ID
 * @returns {Array|null}
 */
function buildMessages(sessionId, currentAssistantMsgId, combinedUserContent = null, combinedUserMsgId = null) {
  const session = _chatStore.getState().sessions.find((s) => s.id === sessionId);
  if (!session) return null;

  function normalizeContent(content) {
    if (typeof content === 'string') return content;
    if (content === null || content === undefined) return null;
    if (content.text && typeof content.text === 'string') return content.text;
    if (typeof content === 'object' && !Array.isArray(content) && content.type === 'text') return content.text;
    if (Array.isArray(content)) {
      const textParts = content
        .filter((block) => (block.type === 'text' || block.text) && typeof (block.text || block.content) === 'string')
        .map((block) => block.text || block.content);
      if (textParts.length > 0) return textParts.join('');
      try { return JSON.stringify(content); } catch { return ''; }
    }
    try { return JSON.stringify(content); } catch { return String(content); }
  }

  const result = session.messages
    .filter((m) => m.id !== currentAssistantMsgId)
    .filter((m) => {
      // 过滤空 content + 无 tool_calls 的 assistant 占位消息
      if (
        m.role === 'assistant' &&
        (!m.content || m.content.trim() === '') &&
        (!m.toolCalls || m.toolCalls.length === 0)
      ) {
        return false;
      }
      // 过滤客户端生成的错误消息
      if (m._isLocalError) {
        return false;
      }
      // 过滤多模态 thinking 占位消息
      if (m._isVisionThinking) {
        return false;
      }
      // 过滤图片独立卡片消息（图片已转为文字描述）
      if (m._isImageCard) {
        return false;
      }
      return true;
    })
    .filter((m) => m.role !== 'tool' || m.toolResult)
    .map((m) => {
      if (m.role === 'user') {
        // 图片用户消息：使用 combinedUserContent（含图片描述 + 用户问题）
        // combinedUserMsgId 指向文字用户消息（图片已拆分为独立卡片并被过滤）
        const shouldCombine = combinedUserContent && m.id === combinedUserMsgId;
        const useContent = shouldCombine
          ? combinedUserContent
          : normalizeContent(m.content);
        return { role: 'user', content: stripThinkContent(useContent) };
      }
      if (m.role === 'assistant') {
        // 保留 assistant 原始 content，不强制设为 null
        // GLM-4.5 收到 content:null 的 assistant 消息后会返回空响应
        // 有 tool_calls 时优先保留原始内容，为空则生成占位文本
        const rawContent = normalizeContent(m.content);
        if (m.toolCalls && m.toolCalls.length > 0) {
          // 有 tool_calls 时优先保留原始内容
          if (rawContent && rawContent.trim()) {
            var apiContent = rawContent;
          } else {
            var tcNames = m.toolCalls.map(tc => tc.function?.name || 'unknown').join(',');
            console.log('[buildMessages] assistant 有 tool_calls 但无文本内容，生成占位文本 (tools=%s)', tcNames);
            var apiContent = '好的，我来为您执行相关操作。';
          }
        } else {
          var apiContent = rawContent || null;
        }
        const msg = { role: 'assistant', content: stripThinkContent(apiContent) };
        if (m.toolCalls && m.toolCalls.length > 0) {
          // 保留 type:'function' —— GLM API 文档明确包含此字段
          msg.tool_calls = m.toolCalls.map(tc => {
            const cleaned = {
              id: tc.id,
              type: 'function',
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            };
            // 仅当 id 非空时保留（空 id 会导致 API 拒绝）
            if (!cleaned.id) {
              console.warn('[buildMessages] tool_call id 为空，生成 fallback id');
              cleaned.id = 'call_' + Math.random().toString(36).slice(2, 10);
            }
            return cleaned;
          });
        }
        return msg;
      }
      if (m.role === 'tool') {
        const r = m.toolResult;
        // Tool content 使用自然语言描述（非 JSON），GLM-4.5 需要自然语言才能理解工具结果
        let toolContent = _buildToolNaturalContent(m.toolCallId, r);
        // 确保 tool_call_id 非空
        const toolCallId = m.toolCallId || 'call_' + Math.random().toString(36).slice(2, 10);
        if (!m.toolCallId) {
          console.warn('[buildMessages] tool 消息的 toolCallId 为空，生成 fallback');
        }
        return { role: 'tool', tool_call_id: toolCallId, content: toolContent };
      }
      return null;
    })
    .filter(Boolean);

  // 消息压缩：确保 API 消息序列符合角色交替规范
  const compacted = compactMessages(result);

  // 日志：输出发送给 API 的消息序列
  console.log('[buildMessages] 构建消息序列 (%d 条, 压缩后 %d 条):', result.length, compacted.length);
  for (let i = 0; i < compacted.length; i++) {
    const m = compacted[i];
    if (m.role === 'assistant' && m.tool_calls) {
      console.log(`  [%d] assistant (tool_calls: %d, content: %s, types: [%s])`,
        i, m.tool_calls.length, JSON.stringify(m.content),
        m.tool_calls.map(tc => tc.type).join(','));
    } else if (m.role === 'tool') {
      console.log(`  [%d] tool (tool_call_id: %s, content: %s)`,
        i, m.tool_call_id, m.content?.substring(0, 80));
    } else {
      console.log(`  [%d] %s (content: %s)`,
        i, m.role, (typeof m.content === 'string' ? m.content.substring(0, 50) : m.content));
    }
  }

  return compacted;
}

/**
 * 剥离 GLM-4.5 思维链标签 &lt;think&gt;...&lt;/think&gt;
 *
 * GLM-4.5 是推理模型，输出格式为 &lt;think&gt;内部推理&lt;/think&gt;最终回复。
 * API 代理在流式传输时可能漏掉 &lt;/think&gt; 闭合标签，当孤立标签随历史发回时，
 * GLM-4.5 会返回空响应。本函数确保所有消息在进入 API 前已清除思维链标签。
 *
 * @param {string} content - 原始消息内容
 * @returns {string} 清理后的内容
 */
function stripThinkContent(content) {
  if (typeof content !== 'string') return content;
  let cleaned = content
    .replace(/<think>[\s\S]*?<\/think>/g, '')   // 完整的 &lt;think&gt;...&lt;/think&gt; 块
    .replace(/<\/?think>/g, '')                  // 孤立的 &lt;think&gt; 或 &lt;/think&gt;
    .replace(/\n{3,}/g, '\n\n')                  // 清理移除后产生的多余空行
    .trim();
  return cleaned;
}

/**
 * 将工具执行结果转换为自然语言描述
 *
 * GLM-4.5 需要自然语言格式的 tool content 才能正确理解工具执行结果，
 * JSON 格式会导致 GLM 无法理解上下文并返回空响应。
 *
 * @param {string} toolCallId - 工具调用 ID
 * @param {Object} result - 工具执行结果 { status, componentType, props?, error? }
 * @returns {string} 自然语言描述
 */
function _buildToolNaturalContent(toolCallId, result) {
  if (!result) return '工具执行完成，但未返回结果。';

  if (result.status === 'error') {
    return `工具执行失败：${result.error || '未知错误'}。`;
  }

  // 根据组件类型生成有意义的自然语言描述
  const type = result.componentType || 'tool';
  const props = result.props || {};

  switch (type) {
    case 'function-plot':
    case 'plot': {
      const fns = props.functions || [];
      const fnLabels = fns.map(f => f.label || f.expression || '?').join('、');
      const xRange = props.xRange || props.x_range || [];
      return `已成功绘制函数图像：${fnLabels}，x范围[${xRange[0] ?? '?'}, ${xRange[1] ?? '?'}]。`;
    }
    case 'parameter-slider':
      return `已成功创建参数滑块交互图像，表达式：${props.expression || '?'}。用户可拖动滑块实时调整参数查看图像变化。`;
    case 'latex':
      return `已成功渲染数学公式：${props.latex?.substring(0, 50) || '?'}。`;
    case 'limit-animation':
      return `已成功展示极限逼近动画：函数 ${props.expression || '?'} 趋近点 x₀=${props.approachPoint ?? '?'}。`;
    case 'taylor-series':
      return `已成功展示泰勒级数逼近动画：函数 ${props.expression || '?'} 在中心点展开至第 ${props.maxOrder ?? 8} 阶。`;
    case 'differential':
      return `已成功展示微分近似几何意义：函数 ${props.expression || '?'} 在 x₀=${props.x0 ?? '?'} 处的切线增量与实际增量对比。`;
    case 'integral-area':
      return `已成功可视化定积分面积：被积函数 ${props.expression || '?'}，积分区间 [${props.lowerBound ?? '?'}, ${props.upperBound ?? '?'}] 。`;
    case 'gradient-field':
      return `已成功绘制梯度场向量图：二元函数 ${props.expression || '?'}。`;
    case 'surface-3d':
      return `已成功绘制三维曲面图：二元函数 ${props.expression || '?'}。`;
    case 'solid-revolution':
      return `已成功展示旋转体生成动画：函数曲线绕 ${props.axis ?? 'x'} 轴旋转。`;
    case 'step-card':
      return `已展示分步解题过程卡片，共 ${(props.steps || []).length} 个步骤。`;
    case 'knowledge-tip':
      return `已展示知识点提示框：【${props.type || '?'}】${props.title || ''}。`;
    default:
      return `已成功执行工具【${type}】，操作完成。`;
  }
}

/**
 * 消息压缩：确保 API 消息序列符合角色交替规范
 *
 * 规则：
 *   1. 合并连续的 user 消息（用换行拼接）
 *   2. tool 后必须跟 assistant（不再允许 tool→user 直连）
 *   3. assistant(tool_calls) 后必须跟 tool，否则跳过孤立的 assistant(tool_calls)
 *   4. 去除首条非 system/user 的消息
 *
 * @param {Array} messages - 原始 API 消息数组
 * @returns {Array} 压缩后的消息数组
 */
function compactMessages(messages) {
  if (!messages || messages.length === 0) return messages;

  const result = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const lastMsg = result.length > 0 ? result[result.length - 1] : null;

    if (msg.role === 'user') {
      if (lastMsg && lastMsg.role === 'user') {
        // 合并连续 user 消息
        const merged = (lastMsg.content || '') + '\n' + (msg.content || '');
        lastMsg.content = merged.trim();
        console.log('[compactMessages] 合并连续 user 消息: [%d]+[%d]', i - 1, i);
      } else {
        result.push({ ...msg });
      }
    } else if (msg.role === 'assistant') {
      result.push({ ...msg });
    } else if (msg.role === 'tool') {
      // tool 消息必须紧跟在 assistant(tool_calls) 之后
      if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.tool_calls) {
        console.warn('[compactMessages] tool 消息 [%d] 前面没有 assistant(tool_calls)，跳过', i);
        continue;
      }
      result.push({ ...msg });
    }
  }

  // 确保首条消息是 user 或 system
  while (result.length > 0 && result[0].role !== 'user' && result[0].role !== 'system') {
    console.warn('[compactMessages] 首条消息 role=%s 不合规，移除', result[0].role);
    result.shift();
  }

  return result;
}

/**
 * 为会话自动生成标题（首次对话后）
 */
function _autoTitle(sessionId) {
  const session = _chatStore.getState().sessions.find((s) => s.id === sessionId);
  if (!session || (session.title !== '新对话' && session.title !== 'New Chat')) return;

  const settings = _settingsStore.getState();
  const namingMode = settings.titleNamingMode || 'first-sentence';

  if (namingMode === 'ai' && settings.apiUrl && settings.apiKey) {
    // AI 命名模式：异步调用 LLM 生成标题（不阻塞 UI）
    _generateAITitle(sessionId);
  } else {
    // 首句截取模式（原有逻辑）
    const firstUserMsg = session.messages.find((m) => m.role === 'user');
    if (firstUserMsg) {
      const maxLen = settings.titleMaxLength || 15;
      const title = firstUserMsg.content.slice(0, maxLen) + (firstUserMsg.content.length > maxLen ? '...' : '');
      _chatStore.renameSession(sessionId, title);
    }
  }
}

/**
 * 调用 LLM 为会话生成标题（AI 命名模式）
 * 在首轮对话结束后异步执行，不阻塞 UI
 */
async function _generateAITitle(sessionId) {
  try {
    const session = _chatStore.getState().sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const settings = _settingsStore.getState();
    // 找到第一条用户消息和第一条 AI 回复
    const userMsgs = session.messages.filter((m) => m.role === 'user');
    const assistantMsgs = session.messages.filter((m) => m.role === 'assistant' && m.content && !m._isLocalError && !m._isVisionThinking);

    if (userMsgs.length === 0) return;

    const userContent = userMsgs[0].content || '';
    const assistantContent = assistantMsgs.length > 0 ? (assistantMsgs[0].content || '') : '';

    // 调用 LLM 生成标题
    const abortController = new AbortController();
    const title = await generateTitle(
      userContent,
      assistantContent,
      {
        apiUrl: settings.apiUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        titleMaxLength: settings.titleMaxLength || 15,
      },
      abortController.signal
    );

    // 确保会话仍然存在且标题未手动修改
    const currentSession = _chatStore.getState().sessions.find((s) => s.id === sessionId);
    if (currentSession && title && (currentSession.title === '新对话' || currentSession.title === 'New Chat')) {
      _chatStore.renameSession(sessionId, title);
    } else if (currentSession && !title) {
      // AI 命名失败，回退到首句截取
      console.warn('[generateAITitle] AI 标题生成失败，回退到首句截取');
      const firstUserMsg = currentSession.messages.find((m) => m.role === 'user');
      if (firstUserMsg) {
        const maxLen = settings.titleMaxLength || 15;
        const fallbackTitle = firstUserMsg.content.slice(0, maxLen) + (firstUserMsg.content.length > maxLen ? '...' : '');
        _chatStore.renameSession(sessionId, fallbackTitle);
      }
    }
  } catch (err) {
    console.error('[generateAITitle] 标题生成异常:', err);
    // 异常时回退到首句截取
    const currentSession = _chatStore.getState().sessions.find((s) => s.id === sessionId);
    if (currentSession && (currentSession.title === '新对话' || currentSession.title === 'New Chat')) {
      const firstUserMsg = currentSession.messages.find((m) => m.role === 'user');
      if (firstUserMsg) {
        const settings = _settingsStore.getState();
        const maxLen = settings.titleMaxLength || 15;
        const fallbackTitle = firstUserMsg.content.slice(0, maxLen) + (firstUserMsg.content.length > maxLen ? '...' : '');
        _chatStore.renameSession(sessionId, fallbackTitle);
      }
    }
  }
}

/**
 * 自动滚动消息列表到底部
 */
function scrollToBottom() {
  const messageList = document.getElementById('message-list');
  if (messageList) {
    requestAnimationFrame(() => {
      messageList.scrollTop = messageList.scrollHeight;
    });
  }
}
