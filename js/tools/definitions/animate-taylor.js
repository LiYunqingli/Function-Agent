/**
 * animate_taylor_series 工具执行器 —— 泰勒展开动画
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executeAnimateTaylor(args) {
  const { expression, center = 0, maxOrder = 8, xRange = [-6, 6] } = args;

  // 参数验证
  if (!expression) {
    throw new Error('必须提供 expression 参数');
  }

  // 验证表达式在展开中心可求值
  try {
    safeEvaluate(expression, { x: center });
  } catch (e) {
    throw new Error(`表达式在展开中心求值失败: ${e.message}`);
  }

  return {
    componentType: 'taylor-animation',
    props: { expression, center, maxOrder, xRange },
  };
}