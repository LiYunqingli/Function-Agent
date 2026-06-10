/**
 * show_differential 工具执行器 —— 微分近似示意图
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executeShowDifferential(args) {
  const { expression, x0, dx = 0.5 } = args;

  // 参数验证
  if (!expression) {
    throw new Error('必须提供 expression 参数');
  }
  if (typeof x0 !== 'number') {
    throw new Error('x0 必须是数字');
  }

  // 验证表达式在 x0 处可求值
  try {
    safeEvaluate(expression, { x: x0 });
  } catch (e) {
    throw new Error(`表达式在 x0 处求值失败: ${e.message}`);
  }

  return {
    componentType: 'differential-view',
    props: { expression, x0, dx },
  };
}