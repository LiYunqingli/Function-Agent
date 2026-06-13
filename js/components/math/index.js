/**
 * 数学可视化组件统一入口
 * 每个组件导出一个 renderXxx(props) → HTMLElement 函数
 */

/** 组件渲染器注册表 */
const componentRenderers = {};

// 按需动态导入（避免首屏全部加载）
const componentImporters = {
  'latex-renderer': () => import('./latex-renderer.js').then(m => m.renderLatexRenderer),
  'function-plot': () => import('./function-plot.js').then(m => m.renderFunctionPlot),
  'limit-animation': () => import('./limit-animation.js').then(m => m.renderLimitAnimation),
  'taylor-animation': () => import('./taylor-animation.js').then(m => m.renderTaylorAnimation),
  'differential-view': () => import('./differential-view.js').then(m => m.renderDifferentialView),
  'integral-area': () => import('./integral-area.js').then(m => m.renderIntegralArea),
  'gradient-field': () => import('./gradient-field.js').then(m => m.renderGradientField),
  'surface-3d': () => import('./surface-3d.js').then(m => m.renderSurface3d),
  'solid-revolution': () => import('./solid-revolution.js').then(m => m.renderSolidRevolution),
  'step-card': () => import('./step-card.js').then(m => m.renderStepCard),
  'knowledge-tip': () => import('./knowledge-tip.js').then(m => m.renderKnowledgeTip),
  'parameter-slider': () => import('./parameter-slider.js').then(m => m.renderParameterSlider),
  'polar-curve': () => import('./polar-curve.js').then(m => m.renderPolarCurve),
  'parametric-curve': () => import('./parametric-curve.js').then(m => m.renderParametricCurve),
  'series-convergence': () => import('./series-convergence.js').then(m => m.renderSeriesConvergence),
  'fourier-series': () => import('./fourier-series.js').then(m => m.renderFourierSeries),
  'matrix-transform': () => import('./matrix-transform.js').then(m => m.renderMatrixTransform),
  'eigenvectors': () => import('./eigenvectors.js').then(m => m.renderEigenvectors),
  'distribution': () => import('./distribution.js').then(m => m.renderDistribution),
  'clt-animation': () => import('./clt-animation.js').then(m => m.renderCLTAnimation),
  'multivariable-integral': () => import('./multivariable-integral.js').then(m => m.renderMultivariableIntegral),
  'comparison-table': () => import('./comparison-table.js').then(m => m.renderComparisonTable),
  'interactive-quiz': () => import('./interactive-quiz.js').then(m => m.renderInteractiveQuiz),
  'sequence': () => import('./sequence.js').then(m => m.renderSequence),
};

/**
 * 渲染数学组件
 * @param {string} componentType - 组件类型名（如 'function-plot', 'step-card' 等）
 * @param {Object} props - 组件属性
 * @returns {HTMLElement|null}
 */
export function renderMathComponent(componentType, props) {
  // 如果已加载，直接同步渲染
  if (componentRenderers[componentType]) {
    return componentRenderers[componentType](props);
  }

  // 异步加载后渲染
  const importer = componentImporters[componentType];
  if (!importer) {
    console.warn(`未知的组件类型: ${componentType}`);
    return null;
  }

  // 返回占位元素，异步替换
  const placeholder = document.createElement('div');
  placeholder.className = 'math-component-loading';
  placeholder.style.cssText = 'min-height:300px;display:flex;align-items:center;justify-content:center;';

  // 骨架屏
  placeholder.innerHTML = `
    <div style="text-align:center;width:100%;padding:24px;">
      <div class="skeleton skeleton-text" style="width:60%;margin:0 auto 12px;"></div>
      <div class="skeleton" style="width:80%;height:200px;margin:0 auto;"></div>
    </div>
  `;

  importer().then((renderer) => {
    componentRenderers[componentType] = renderer;
    const realElement = renderer(props);
    if (realElement && placeholder.parentNode) {
      placeholder.parentNode.replaceChild(realElement, placeholder);
    }
  }).catch((err) => {
    console.error(`组件加载失败 (${componentType}):`, err);
    placeholder.innerHTML = `<div style="padding:24px;color:var(--color-error);text-align:center;">组件加载失败: ${componentType}</div>`;
  });

  return placeholder;
}
