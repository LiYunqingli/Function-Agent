/**
 * plot_matrix_transform 工具执行器 —— 线性变换可视化
 */
export async function executePlotMatrixTransform(args) {
  const { matrix, showBasis = true, showGrid = true } = args;

  if (!matrix || !Array.isArray(matrix)) {
    throw new Error('matrix 参数必须是一个 2x2 数组');
  }

  if (matrix.length !== 2 || !Array.isArray(matrix[0]) || !Array.isArray(matrix[1])) {
    throw new Error('matrix 必须是 2x2 数组');
  }

  return {
    componentType: 'matrix-transform',
    props: { matrix, showBasis, showGrid },
  };
}
