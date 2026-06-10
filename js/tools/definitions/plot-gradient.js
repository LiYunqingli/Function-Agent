/**
 * plot_gradient_field 工具执行器 —— 梯度场向量可视化
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executePlotGradient(args) {
  const { expression, xRange = [-5, 5], yRange = [-5, 5], density = 15, showContour = true } = args;

  // 参数验证
  if (!expression) {
    throw new Error('必须提供 expression 参数');
  }

  // 验证表达式（二元函数）
  try {
    safeEvaluate(expression, { x: 0, y: 0 });
  } catch (e) {
    throw new Error(`梯度场表达式求值失败: ${e.message}`);
  }

  return {
    componentType: 'gradient-field',
    props: { expression, xRange, yRange, density, showContour },
  };
}