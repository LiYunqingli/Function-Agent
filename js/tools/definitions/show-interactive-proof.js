/**
 * show_interactive_proof 工具执行器 —— 交互式证明
 */
export async function executeShowInteractiveProof(args) {
  const { title, theorem, proofSteps } = args;

  if (!proofSteps || !Array.isArray(proofSteps) || proofSteps.length === 0) {
    throw new Error('必须提供 proofSteps 参数（证明步骤列表）');
  }

  return {
    componentType: 'interactive-proof',
    props: { title, theorem, proofSteps },
  };
}
