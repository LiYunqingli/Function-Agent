/**
 * show_step_card 工具执行器 —— 解题步骤卡片
 */
export async function executeShowStepCard(args) {
  const { title, steps } = args;

  // 参数验证
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    throw new Error('steps 参数必须是非空数组');
  }

  return {
    componentType: 'step-card',
    props: { title, steps },
  };
}