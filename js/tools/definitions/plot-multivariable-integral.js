/**
 * plot_multivariable_integral 工具执行器 —— 多元积分区域可视化
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executePlotMultivariableIntegral(args) {
  const { expression, xRange = [-3, 3], yRange = [-3, 3], regionType = 'rectangular', resolution = 30 } = args;

  if (!expression) {
    throw new Error('expression 参数不能为空');
  }

  try {
    safeEvaluate(expression, { x: 1, y: 1 });
  } catch (e) {
    throw new Error(`表达式求值失败 (${expression}): ${e.message}`);
  }

  return {
    componentType: 'multivariable-integral',
    props: { expression, xRange, yRange, regionType, resolution },
  };
}
