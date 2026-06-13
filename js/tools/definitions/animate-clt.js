/**
 * animate_clt 工具执行器 —— 中心极限定理动画
 */
export async function executeAnimateCLT(args) {
  const { sourceDistribution = 'uniform', sampleSizes = [1, 2, 5, 10, 30, 50], samplesPerStep = 500, numSteps = 20, stepInterval = 200 } = args;

  const validSources = ['uniform', 'exponential', 'bernoulli', 'custom'];
  if (!validSources.includes(sourceDistribution)) {
    throw new Error(`不支持的源分布: ${sourceDistribution}`);
  }

  return {
    componentType: 'clt-animation',
    props: { sourceDistribution, sampleSizes, samplesPerStep, numSteps, stepInterval },
  };
}
