/**
 * plot_distribution 工具执行器 —— 概率分布函数
 */
export async function executePlotDistribution(args) {
  const { distribution = 'normal', params = {} } = args;

  const validDistributions = ['normal', 'uniform', 'exponential', 'gamma', 'beta', 'chi_squared', 't', 'poisson'];
  if (!validDistributions.includes(distribution)) {
    throw new Error(`不支持的分布类型: ${distribution}，支持: ${validDistributions.join(', ')}`);
  }

  return {
    componentType: 'distribution',
    props: { distribution, params },
  };
}
