/**
 * animate_limit 工具执行器 —— 极限逼近动画
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executeAnimateLimit(args) {
  const { expression, approachPoint, limitValue, direction = 'both', steps = 20, stepInterval = 250 } = args;

  // 参数验证
  if (!expression) {
    throw new Error('必须提供 expression 参数');
  }
  if (typeof approachPoint !== 'number') {
    throw new Error('approachPoint 必须是数字');
  }

  // 验证表达式在逼近点附近可求值
  try {
    safeEvaluate(expression, { x: approachPoint + 0.1 });
  } catch (e) {
    throw new Error(`表达式在逼近点附近求值失败: ${e.message}`);
  }

  return {
    componentType: 'limit-animation',
    props: { expression, approachPoint, limitValue, direction, steps, stepInterval },
  };
}