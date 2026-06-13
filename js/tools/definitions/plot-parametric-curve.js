/**
 * plot_parametric_curve 工具执行器 —— 参数方程曲线绘制
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executePlotParametricCurve(args) {
  const { xExpression, yExpression, tRange = [0, 2 * Math.PI], points = 500, showMotion = false } = args;

  if (!xExpression || !yExpression) {
    throw new Error('xExpression 和 yExpression 参数不能为空');
  }

  try {
    safeEvaluate(xExpression, { t: 1 });
  } catch (e) {
    throw new Error(`x(t) 表达式求值失败 (${xExpression}): ${e.message}`);
  }

  try {
    safeEvaluate(yExpression, { t: 1 });
  } catch (e) {
    throw new Error(`y(t) 表达式求值失败 (${yExpression}): ${e.message}`);
  }

  return {
    componentType: 'parametric-curve',
    props: { xExpression, yExpression, tRange, points, showMotion },
  };
}
