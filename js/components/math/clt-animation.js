/**
 * 中心极限定理动画组件（Plotly + 按钮）
 * 从任意分布抽样，逐步展示样本均值的分布趋向正态
 * @param {Object} props - { sourceDistribution, sampleSizes, samplesPerStep, numSteps }
 * @returns {HTMLElement}
 */
import { linspace } from '../../services/math-evaluator.js';

export function renderCLTAnimation(props) {
  const {
    sourceDistribution = 'uniform',
    sampleSizes = [1, 2, 5, 10, 30, 50],
    samplesPerStep = 500,
    numSteps = 20,
  } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const distNames = { uniform: '均匀分布', exponential: '指数分布', bernoulli: '伯努利分布' };

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `🎲 中心极限定理 (${distNames[sourceDistribution] || sourceDistribution})`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);

  // 控制面板
  const ctrls = document.createElement('div');
  ctrls.className = 'animation-controls';
  ctrls.style.cssText = 'gap:8px;flex-wrap:wrap;';

  const playBtn = document.createElement('button');
  playBtn.className = 'btn btn-primary';
  playBtn.textContent = '开始抽样';
  playBtn.style.cssText = 'padding:4px 12px;font-size:13px;cursor:pointer;';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn';
  resetBtn.textContent = '重置';
  resetBtn.style.cssText = 'padding:4px 12px;font-size:13px;cursor:pointer;';

  // 样本量切换
  const sizeSelect = document.createElement('select');
  sizeSelect.style.cssText = 'padding:4px 8px;font-size:13px;border:1px solid var(--color-border-tertiary);border-radius:6px;background:var(--color-background-secondary);';
  sampleSizes.forEach(n => {
    const opt = document.createElement('option');
    opt.value = String(n);
    opt.textContent = `n = ${n}`;
    sizeSelect.appendChild(opt);
  });

  const info = document.createElement('span');
  info.style.cssText = 'font-size:13px;color:var(--color-text-secondary);';
  info.textContent = '样本数: 0';

  ctrls.appendChild(playBtn);
  ctrls.appendChild(resetBtn);
  ctrls.appendChild(sizeSelect);
  ctrls.appendChild(info);
  body.appendChild(ctrls);
  container.appendChild(body);

  // 源分布随机数生成
  function randomSource() {
    switch (sourceDistribution) {
      case 'uniform': return Math.random();
      case 'exponential': return -Math.log(1 - Math.random());
      case 'bernoulli': return Math.random() < 0.3 ? 1 : 0;
      default: return Math.random();
    }
  }

  // 存储样本均值
  let sampleMeans = [];
  let animTimer = null;

  function draw() {
    if (sampleMeans.length === 0) return;

    const traces = [{
      x: sampleMeans,
      type: 'histogram',
      nbinsx: 40,
      name: `样本均值 (n=${sizeSelect.value})`,
      marker: { color: 'rgba(25,118,210,0.5)', line: { color: '#1565c0', width: 1 } },
      opacity: 0.75,
    }];

    const mean = sampleMeans.reduce((a, b) => a + b, 0) / sampleMeans.length;
    const std = Math.sqrt(sampleMeans.reduce((a, b) => a + (b - mean) ** 2, 0) / sampleMeans.length);

    // 正态拟合曲线
    const xRange = [mean - 4 * std, mean + 4 * std];
    const xFit = linspace(xRange[0], xRange[1], 200);
    const yFit = xFit.map(x => (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2) * (sampleMeans.length * (xRange[1] - xRange[0]) / 40));

    traces.push({
      x: xFit, y: yFit,
      type: 'scatter', mode: 'lines',
      name: '正态拟合',
      line: { color: '#e53935', width: 2, dash: 'dash' },
    });

    const layout = {
      xaxis: { title: '样本均值', gridcolor: 'rgba(128,128,128,0.15)' },
      yaxis: { title: '频数', gridcolor: 'rgba(128,128,128,0.15)' },
      bargap: 0.05,
      showlegend: true,
      legend: { x: 0.01, y: 0.99 },
      margin: { t: 20, b: 40, l: 55, r: 20 },
      paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    };

    window.Plotly.react(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
  }

  playBtn.addEventListener('click', () => {
    if (animTimer) return;
    const n = parseInt(sizeSelect.value);

    animTimer = setInterval(() => {
      for (let i = 0; i < samplesPerStep; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          sum += randomSource();
        }
        sampleMeans.push(sum / n);
      }
      info.textContent = `样本数: ${sampleMeans.length}`;
      draw();
    }, 200);

    // 自动停止
    setTimeout(() => {
      if (animTimer) { clearInterval(animTimer); animTimer = null; }
    }, numSteps * 200);
  });

  resetBtn.addEventListener('click', () => {
    if (animTimer) { clearInterval(animTimer); animTimer = null; }
    sampleMeans = [];
    info.textContent = '样本数: 0';
    window.Plotly.react(plotDiv, [], {}, { responsive: true, displayModeBar: false });
  });

  sizeSelect.addEventListener('change', () => {
    if (animTimer) { clearInterval(animTimer); animTimer = null; }
    sampleMeans = [];
    info.textContent = '样本数: 0';
    window.Plotly.react(plotDiv, [], {}, { responsive: true, displayModeBar: false });
  });

  return container;
}
