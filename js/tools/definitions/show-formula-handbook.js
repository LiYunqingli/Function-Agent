/**
 * show_formula_handbook 工具执行器 —— 公式手册
 */
export async function executeShowFormulaHandbook(args) {
  const { title, sections } = args;

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    throw new Error('必须提供 sections 参数（公式分类列表）');
  }

  return {
    componentType: 'formula-handbook',
    props: { title, sections },
  };
}
