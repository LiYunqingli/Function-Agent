/**
 * animate_series_convergence 工具执行器 —— 级数收敛动画
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executeAnimateSeriesConvergence(args) {
  const { seriesExpression, partialSumExpression, maxTerms = 20, nRange = [1, 50] } = args;

  if (!partialSumExpression) {
    throw new Error('partialSumExpression 参数不能为空');
  }

  try {
    safeEvaluate(partialSumExpression, { n: 1 });
  } catch (e) {
    throw new Error(`部分和表达式求值失败 (${partialSumExpression}): ${e.message}`);
  }

  return {
    componentType: 'series-convergence',
    props: { seriesExpression, partialSumExpression, maxTerms, nRange },
  };
}
