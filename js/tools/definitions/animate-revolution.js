/**
 * animate_solid_of_revolution 工具执行器 —— 旋转体动画
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executeAnimateRevolution(args) {
  const { expression, axis = 'x', xFrom, xTo } = args;

  // 参数验证
  if (!expression) {
    throw new Error('必须提供 expression 参数');
  }
  if (typeof xFrom !== 'number' || typeof xTo !== 'number') {
    throw new Error('xFrom 和 xTo 必须是数字');
  }

  // 验证表达式
  try {
    safeEvaluate(expression, { x: (xFrom + xTo) / 2 });
  } catch (e) {
    throw new Error(`旋转体表达式求值失败: ${e.message}`);
  }

  return {
    componentType: 'solid-revolution',
    props: { expression, axis, xFrom, xTo },
  };
}