/**
 * show_comparison_table 工具执行器 —— 方法对比表
 */
export async function executeShowComparisonTable(args) {
  const { title, headers, rows } = args;

  if (!headers || !Array.isArray(headers)) {
    throw new Error('headers 参数必须是非空数组');
  }

  if (!rows || !Array.isArray(rows)) {
    throw new Error('rows 参数必须是非空数组');
  }

  for (let i = 0; i < rows.length; i++) {
    if (!Array.isArray(rows[i])) {
      throw new Error(`第 ${i + 1} 行必须是数组`);
    }
  }

  return {
    componentType: 'comparison-table',
    props: { title, headers, rows },
  };
}
