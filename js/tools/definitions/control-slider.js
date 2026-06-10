/**
 * control_parameter_slider 工具执行器 —— 参数滑块联动
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executeControlSlider(args) {
  const { expression, parameters, xRange = [-10, 10] } = args;

  // 参数验证
  if (!expression) {
    throw new Error('必须提供 expression 参数');
  }
  if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
    throw new Error('parameters 参数必须是非空数组');
  }

  // 构建测试作用域
  const testScope = { x: 1 };
  for (const param of parameters) {
    testScope[param.name] = param.default ?? (param.min + param.max) / 2;
  }

  // 验证表达式
  try {
    safeEvaluate(expression, testScope);
  } catch (e) {
    throw new Error(`含参数的表达式求值失败: ${e.message}`);
  }

  return {
    componentType: 'parameter-slider',
    props: { expression, parameters, xRange },
  };
}