/**
 * show_knowledge_tip 工具执行器 —— 知识点提示
 */
export async function executeShowKnowledgeTip(args) {
  const { type, title, content, conditions } = args;

  // 参数验证
  if (!type || !['definition', 'theorem', 'formula', 'note'].includes(type)) {
    throw new Error('type 必须是 definition/theorem/formula/note 之一');
  }
  if (!title) {
    throw new Error('必须提供 title 参数');
  }
  if (!content) {
    throw new Error('必须提供 content 参数');
  }

  return {
    componentType: 'knowledge-tip',
    props: { type, title, content, conditions },
  };
}