/**
 * show_concept_map 工具执行器 —— 知识概念图
 */
export async function executeShowConceptMap(args) {
  const { title, concepts } = args;

  if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
    throw new Error('必须提供 concepts 参数（概念列表）');
  }

  return {
    componentType: 'concept-map',
    props: { title, concepts },
  };
}
