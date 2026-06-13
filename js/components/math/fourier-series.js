/**
 * 傅里叶级数逼近组件（Plotly + 滑块）
 * 支持方波、锯齿波、三角波等常见波形的傅里叶级数逐步逼近
 * @param {Object} props - { targetFunction, maxTerms, xRange }
 * @returns {HTMLElement}
 */
import { linspace } from '../../services/math-evaluator.js';

export function renderFourierSeries(props) {
  const { targetFunction = 'square', maxTerms = 10, xRange = [-2 * Math.PI, 2 * Math.PI] } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const waveNames = { square: '方波', sawtooth: '锯齿波', triangle: '三角波', custom: '自定义' };
  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `🌊 傅里叶级数展开 (${waveNames[targetFunction] || targetFunction})`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);

  // 项数滑块
  const ctrls = document.createElement('div');
  ctrls.className = 'animation-controls';
  ctrls.style.cssText = 'gap:12px;';

  const sliderRow = document.createElement('div');
  sliderRow.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;';
  const lbl = document.createElement('span');
  lbl.style.cssText = 'font-size:13px;white-space:nowrap;';
  lbl.textContent = '展开项数:';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '1';
  slider.max = String(maxTerms);
  slider.value = '1';
  slider.style.cssText = 'flex:1;min-width:120px;';
  const valLabel = document.createElement('span');
  valLabel.className = 'param-value';
  valLabel.textContent = '1';
  sliderRow.appendChild(lbl);
  sliderRow.appendChild(slider);
  sliderRow.appendChild(valLabel);
  ctrls.appendChild(sliderRow);
  body.appendChild(ctrls);
  container.appendChild(body);

  // 目标波形
  function targetWave(x) {
    switch (targetFunction) {
      case 'square':
        return Math.sign(Math.sin(x));
      case 'sawtooth':
        return 2 * (x / (2 * Math.PI) - Math.floor(x / (2 * Math.PI) + 0.5));
      case 'triangle':
        return 2 * Math.abs(2 * (x / (2 * Math.PI) - Math.floor(x / (2 * Math.PI) + 0.5))) - 1;
      default:
        return Math.sign(Math.sin(x));
    }
  }

  // 傅里叶级数逼近
  function fourierApprox(x, N) {
    let sum = 0;
    switch (targetFunction) {
      case 'square':
        for (let n = 0; n < N; n++) {
          const k = 2 * n + 1;
          sum += (4 / (Math.PI * k)) * Math.sin(k * x);
        }
        break;
      case 'sawtooth':
        for (let n = 1; n <= N; n++) {
          sum += (2 / Math.PI) * ((-1) ** (n + 1)) * Math.sin(n * x) / n;
        }
        break;
      case 'triangle':
        for (let n = 0; n < N; n++) {
          const k = 2 * n + 1;
          sum += (8 / (Math.PI * Math.PI * k * k)) * ((-1) ** n) * Math.cos(k * x);
        }
        break;
      default:
        for (let n = 0; n < N; n++) {
          const k = 2 * n + 1;
          sum += (4 / (Math.PI * k)) * Math.sin(k * x);
        }
    }
    return sum;
  }

  function draw() {
    const N = parseInt(slider.value);
    valLabel.textContent = String(N);

    const xValues = linspace(xRange[0], xRange[1], 500);
    const targetY = xValues.map(targetWave);
    const approxY = xValues.map(x => fourierApprox(x, N));

    const traces = [
      {
        x: xValues, y: targetY,
        type: 'scatter', mode: 'lines',
        name: '目标波形',
        line: { color: '#9e9e9e', width: 1.5, dash: 'dash' },
      },
      {
        x: xValues, y: approxY,
        type: 'scatter', mode: 'lines',
        name: `傅里叶逼近 (${N} 项)`,
        line: { color: '#e91e63', width: 2.5 },
      },
    ];

    const layout = {
      xaxis: {
        zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777',
        gridcolor: 'rgba(128,128,128,0.15)',
      },
      yaxis: {
        zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777',
        gridcolor: 'rgba(128,128,128,0.15)',
        range: [-1.8, 1.8],
      },
      showlegend: true,
      margin: { t: 20, b: 40, l: 55, r: 20 },
      paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    };

    window.Plotly.react(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
  }

  slider.addEventListener('input', draw);
  setTimeout(() => draw(), 200);
  return container;
}
