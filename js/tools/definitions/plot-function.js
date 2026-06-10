/**
 * plot_function 工具执行器 —— 绘制函数图像
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executePlotFunction(args) {
  const { functions, xRange = [-10, 10], yRange, integralRegion, showTangent, showGrid = true } = args;

  // 参数验证
  if (!functions || !Array.isArray(functions) || functions.length === 0) {
    throw new Error('functions 参数必须是非空数组');
  }

  // 验证每个函数表达式是否可求值
  for (const fn of functions) {
    if (!fn.expression) {
      throw new Error('每个函数必须包含 expression 字段');
    }
    try {
      safeEvaluate(fn.expression, { x: 1 });
    } catch (e) {
      throw new Error(`函数表达式求值失败 (${fn.expression}): ${e.message}`);
    }
  }

  // 验证积分区域表达式
  if (integralRegion?.expression) {
    try {
      safeEvaluate(integralRegion.expression, { x: 1 });
    } catch (e) {
      throw new Error(`积分区域表达式求值失败: ${e.message}`);
    }
  }

  // 验证切线表达式
  if (showTangent?.expression) {
    try {
      safeEvaluate(showTangent.expression, { x: showTangent.x0 || 0 });
    } catch (e) {
      throw new Error(`切线表达式求值失败: ${e.message}`);
    }
  }

  return {
    componentType: 'function-plot',
    props: { functions, xRange, yRange, integralRegion, showTangent, showGrid },
  };
}