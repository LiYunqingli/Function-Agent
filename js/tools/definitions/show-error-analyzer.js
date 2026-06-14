/**
 * show_error_analyzer 工具执行器 —— 易错点分析
 */
export async function executeShowErrorAnalyzer(args) {
  const { title, errors } = args;

  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    throw new Error('必须提供 errors 参数（易错点列表）');
  }

  return {
    componentType: 'error-analyzer',
    props: { title, errors },
  };
}
