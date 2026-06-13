/**
 * 概率分布函数可视化组件（Plotly）
 * 支持 normal, uniform, exponential, gamma, beta, chi_squared, t, poisson
 * @param {Object} props - { distribution, params }
 * @returns {HTMLElement}
 */
import { linspace } from '../../services/math-evaluator.js';

export function renderDistribution(props) {
  const { distribution = 'normal', params = {} } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const distNames = {
    normal: '正态分布', uniform: '均匀分布', exponential: '指数分布',
    gamma: 'Gamma 分布', beta: 'Beta 分布', chi_squared: '卡方分布',
    t: 't 分布', poisson: '泊松分布',
  };

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `📊 ${distNames[distribution] || distribution}`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);
  container.appendChild(body);

  // 分布参数信息
  const infoEl = document.createElement('div');
  infoEl.style.cssText = 'font-size:13px;color:var(--color-text-secondary);margin-bottom:8px;';
  body.insertBefore(infoEl, plotDiv);

  // 数学函数
  const gammaFunc = (z) => {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFunc(1 - z));
    z -= 1;
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  };

  // PDF 函数
  function pdf(x, dist, p) {
    switch (dist) {
      case 'normal': {
        const mu = p.mean || 0, sigma = p.std || 1;
        return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
      }
      case 'uniform': {
        const a = p.min || 0, b = p.max || 1;
        return (x >= a && x <= b) ? 1 / (b - a) : 0;
      }
      case 'exponential': {
        const lambda = p.lambda || 1;
        return x >= 0 ? lambda * Math.exp(-lambda * x) : 0;
      }
      case 'gamma': {
        const alpha = p.shape || 2, beta = p.rate || 1;
        return x > 0 ? (Math.pow(beta, alpha) / gammaFunc(alpha)) * Math.pow(x, alpha - 1) * Math.exp(-beta * x) : 0;
      }
      case 'beta': {
        const alpha = p.alpha || 2, beta2 = p.beta || 5;
        if (x <= 0 || x >= 1) return 0;
        const B = gammaFunc(alpha) * gammaFunc(beta2) / gammaFunc(alpha + beta2);
        return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta2 - 1) / B;
      }
      case 'chi_squared': {
        const k = p.df || 2;
        return x > 0 ? (Math.pow(x, k / 2 - 1) * Math.exp(-x / 2)) / (Math.pow(2, k / 2) * gammaFunc(k / 2)) : 0;
      }
      case 't': {
        const nu = p.df || 5;
        const B = gammaFunc((nu + 1) / 2) / (Math.sqrt(nu * Math.PI) * gammaFunc(nu / 2));
        return B * Math.pow(1 + x * x / nu, -(nu + 1) / 2);
      }
      default: return 0;
    }
  }

  // CDF 近似
  function cdf(x, dist, p) {
    // 数值积分
    const { min, max, step } = getXRange(dist, p);
    const start = Math.max(min, x - 100 * step);
    const n = Math.round((x - start) / step);
    let sum = 0;
    for (let i = 0; i <= n; i++) {
      sum += pdf(start + i * step, dist, p) * step;
    }
    return sum;
  }

  function getXRange(dist, p) {
    switch (dist) {
      case 'normal': { const s = p.std || 1, m = p.mean || 0; return { min: m - 4 * s, max: m + 4 * s, step: 0.01 }; }
      case 'uniform': return { min: (p.min || 0) - 0.5, max: (p.max || 1) + 0.5, step: 0.01 };
      case 'exponential': return { min: -0.5, max: (p.lambda ? 5 / p.lambda : 5), step: 0.01 };
      case 'gamma': { const a = p.shape || 2, b = p.rate || 1; return { min: 0, max: (a / b * 4 + 5), step: 0.02 }; }
      case 'beta': return { min: -0.05, max: 1.05, step: 0.005 };
      case 'chi_squared': { const k = p.df || 2; return { min: 0, max: k + 4 * Math.sqrt(2 * k), step: 0.05 }; }
      case 't': return { min: -6, max: 6, step: 0.02 };
      default: return { min: -5, max: 5, step: 0.02 };
    }
  }

  requestAnimationFrame(() => {
    const { min, max, step } = getXRange(distribution, params);
    const xValues = linspace(min, max, Math.min(800, Math.round((max - min) / step)));

    const pdfY = xValues.map(x => pdf(x, distribution, params));
    const cdfY = xValues.map(x => cdf(x, distribution, params));

    const traces = [
      { x: xValues, y: pdfY, type: 'scatter', mode: 'lines', name: 'PDF', line: { color: '#1565c0', width: 2.5 }, yaxis: 'y' },
      { x: xValues, y: cdfY, type: 'scatter', mode: 'lines', name: 'CDF', line: { color: '#ff9800', width: 2, dash: 'dash' }, yaxis: 'y2' },
    ];

    const layout = {
      xaxis: { title: 'x', gridcolor: 'rgba(128,128,128,0.15)' },
      yaxis: { title: 'PDF', side: 'left', gridcolor: 'rgba(128,128,128,0.15)' },
      yaxis2: { title: 'CDF', overlaying: 'y', side: 'right', gridcolor: 'rgba(128,128,128,0.1)' },
      showlegend: true,
      legend: { x: 0.01, y: 0.99 },
      margin: { t: 20, b: 40, l: 55, r: 55 },
      paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    };

    // 参数信息
    const paramDesc = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ');
    infoEl.textContent = paramDesc ? `参数: ${paramDesc}` : '使用默认参数';

    if (typeof window.Plotly === 'undefined') {
      plotDiv.textContent = 'Plotly 未加载';
      return;
    }

    try {
      window.Plotly.newPlot(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
    } catch (e) {
      console.error('Plotly 渲染失败:', e);
    }
  });

  return container;
}
