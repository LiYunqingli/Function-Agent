/**
 * plot_sequence 工具执行器 —— 数列可视化
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executePlotSequence(args) {
  const { expression, nRange = [1, 20], mode = 'numberline', showConvergence = true } = args;

  if (!expression) {
    throw new Error('expression 参数不能为空');
  }

  try {
    safeEvaluate(expression, { n: 1 });
  } catch (e) {
    throw new Error(`数列表达式求值失败 (${expression}): ${e.message}`);
  }

  return {
    componentType: 'sequence',
    props: { expression, nRange, mode, showConvergence },
  };
}
