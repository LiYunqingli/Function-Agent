/**
 * 工具执行分发器 —— 解析参数、调用 executor、处理异常
 */

/**
 * 执行单个工具调用
 * @param {Object} toolCall - { id, type: 'function', function: { name, arguments } }
 * @returns {Promise<{toolCallId: string, status: string, componentType?: string, props?: Object, error?: string}>}
 */
export async function executeToolCall(toolCall) {
  const { name, arguments: argsStr } = toolCall.function;

  // 动态导入 registry（避免循环依赖，由 register-all 提前注册）
  const { registry } = await import('./registry.js');

  if (!registry.has(name)) {
    return {
      toolCallId: toolCall.id,
      status: 'error',
      componentType: name,
      props: {},
      error: `未知工具: ${name}`,
    };
  }

  // 解析参数
  let args;
  try {
    args = JSON.parse(argsStr);
  } catch {
    return {
      toolCallId: toolCall.id,
      status: 'error',
      componentType: name,
      props: {},
      error: `参数解析失败: ${argsStr}`,
    };
  }

  // 执行工具
  try {
    const executor = registry.getExecutor(name);
    const result = await executor(args);
    return {
      toolCallId: toolCall.id,
      status: 'success',
      ...result,
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      status: 'error',
      componentType: name,
      props: {},
      error: error.message,
    };
  }
}