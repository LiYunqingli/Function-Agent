/**
 * plot_eigenvectors 工具执行器 —— 特征值与特征向量
 */
export async function executePlotEigenvectors(args) {
  const { matrix } = args;

  if (!matrix || !Array.isArray(matrix)) {
    throw new Error('matrix 参数必须是一个 2x2 数组');
  }

  if (matrix.length !== 2 || !Array.isArray(matrix[0]) || !Array.isArray(matrix[1])) {
    throw new Error('matrix 必须是 2x2 数组');
  }

  // 计算特征值和特征向量
  const a = matrix[0][0], b = matrix[0][1], c = matrix[1][0], d = matrix[1][1];
  const trace = a + d;
  const det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;

  const eigenvalues = [];
  if (discriminant >= 0) {
    eigenvalues.push((trace + Math.sqrt(discriminant)) / 2);
    eigenvalues.push((trace - Math.sqrt(discriminant)) / 2);
  } else {
    eigenvalues.push({ re: trace / 2, im: Math.sqrt(-discriminant) / 2 });
    eigenvalues.push({ re: trace / 2, im: -Math.sqrt(-discriminant) / 2 });
  }

  return {
    componentType: 'eigenvectors',
    props: { matrix, eigenvalues, trace, det },
  };
}
