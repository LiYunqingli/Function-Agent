/**
 * plot_polar_curve 工具执行器 —— 极坐标曲线绘制
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executePlotPolarCurve(args) {
  const { expression, thetaRange = [0, 2 * Math.PI], points = 500 } = args;

  if (!expression) {
    throw new Error('expression 参数不能为空');
  }

  // 验证表达式可求值
  try {
    safeEvaluate(expression, { theta: 1 });
  } catch (e) {
    throw new Error(`极坐标表达式求值失败 (${expression}): ${e.message}`);
  }

  return {
    componentType: 'polar-curve',
    props: { expression, thetaRange, points },
  };
}
