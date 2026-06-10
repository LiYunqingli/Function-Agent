/**
 * plot_integral_area 工具执行器 —— 积分面积可视化
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executePlotIntegral(args) {
  const {
    expression,
    lowerBound,
    upperBound,
    interactive = false,
    showRiemannSum = false,
    riemannN = 10,
  } = args;

  // 参数验证
  if (!expression) {
    throw new Error('必须提供 expression 参数');
  }
  if (typeof lowerBound !== 'number' || typeof upperBound !== 'number') {
    throw new Error('lowerBound 和 upperBound 必须是数字');
  }

  // 验证表达式
  try {
    safeEvaluate(expression, { x: (lowerBound + upperBound) / 2 });
  } catch (e) {
    throw new Error(`被积函数表达式求值失败: ${e.message}`);
  }

  return {
    componentType: 'integral-area',
    props: { expression, lowerBound, upperBound, interactive, showRiemannSum, riemannN },
  };
}