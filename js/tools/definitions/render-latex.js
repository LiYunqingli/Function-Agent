/**
 * render_latex 工具执行器 —— 渲染 LaTeX 公式
 */
export async function executeRenderLatex(args) {
  const { latex, displayMode = true, steps } = args;

  // 参数验证
  if (!latex && (!steps || steps.length === 0)) {
    throw new Error('必须提供 latex 或 steps 参数');
  }

  // 返回组件类型和 props（不做 DOM 操作）
  return {
    componentType: 'latex-renderer',
    props: { latex, displayMode, steps },
  };
}