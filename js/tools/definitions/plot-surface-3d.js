/**
 * plot_surface_3d 工具执行器 —— 三维曲面图
 */
import { safeEvaluate } from '../../services/math-evaluator.js';

export async function executePlotSurface3d(args) {
  const {
    expression,
    xRange = [-5, 5],
    yRange = [-5, 5],
    resolution = 40,
    colorScale = 'Viridis',
  } = args;

  // 参数验证
  if (!expression) {
    throw new Error('必须提供 expression 参数');
  }

  // 验证表达式（二元函数）
  try {
    safeEvaluate(expression, { x: 0, y: 0 });
  } catch (e) {
    throw new Error(`3D 曲面表达式求值失败: ${e.message}`);
  }

  return {
    componentType: 'surface-3d',
    props: { expression, xRange, yRange, resolution, colorScale },
  };
}