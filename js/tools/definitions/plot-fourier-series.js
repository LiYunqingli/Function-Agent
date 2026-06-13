/**
 * plot_fourier_series 工具执行器 —— 傅里叶级数逼近
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executePlotFourierSeries(args) {
  const { targetFunction, maxTerms = 10, xRange = [-3.14, 3.14] } = args;

  if (!targetFunction) {
    throw new Error('targetFunction 参数不能为空');
  }

  return {
    componentType: 'fourier-series',
    props: { targetFunction, maxTerms, xRange },
  };
}
