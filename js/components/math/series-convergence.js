/**
 * 级数收敛动画组件（Plotly + Canvas）
 * @param {Object} props - { seriesExpression, partialSumExpression, maxTerms, nRange, stepInterval }
 * @returns {HTMLElement}
 */
import { safeEvaluate, linspace } from '../../services/math-evaluator.js';

export function renderSeriesConvergence(props) {
  const { seriesExpression, partialSumExpression, maxTerms = 20, nRange = [1, 50], stepInterval = 300 } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `📊 级数收敛过程`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);

  // 动画控制
  const ctrls = document.createElement('div');
  ctrls.className = 'animation-controls';
  ctrls.style.cssText = 'gap:8px;';

  const playBtn = document.createElement('button');
  playBtn.className = 'btn btn-primary';
  playBtn.textContent = '逐步展示';
  playBtn.style.cssText = 'padding:4px 12px;font-size:13px;cursor:pointer;';

  const termLabel = document.createElement('span');
  termLabel.style.cssText = 'font-size:13px;color:var(--color-text-secondary);';
  termLabel.textContent = `当前: 1/${maxTerms} 项`;

  ctrls.appendChild(playBtn);
  ctrls.appendChild(termLabel);
  body.appendChild(ctrls);
  container.appendChild(body);

  // 计算全部部分和
  const nValues = [];
  const snValues = [];
  const anValues = [];

  for (let n = nRange[0]; n <= nRange[1]; n++) {
    nValues.push(n);
    try {
      const sn = safeEvaluate(partialSumExpression, { n });
      snValues.push(sn);
    } catch {
      snValues.push(null);
    }
    // 计算通项 an = S(n) - S(n-1)
    if (n === 1 && seriesExpression) {
      try {
        anValues.push(safeEvaluate(seriesExpression, { n }));
      } catch { anValues.push(null); }
    } else if (n > 1 && snValues[snValues.length - 1] !== null && snValues[snValues.length - 2] !== null) {
      anValues.push(snValues[snValues.length - 1] - snValues[snValues.length - 2]);
    } else {
      anValues.push(null);
    }
  }

  let currentMax = maxTerms;

  function draw(maxIdx) {
    const xSlice = nValues.slice(0, maxIdx + 1);
    const ySlice = snValues.slice(0, maxIdx + 1);
    const aSlice = anValues.slice(0, maxIdx + 1);

    const traces = [];

    // 部分和 Sn
    traces.push({
      x: xSlice, y: ySlice,
      type: 'scatter', mode: 'lines+markers',
      name: '部分和 S(n)',
      line: { color: '#1565c0', width: 2 },
      marker: { size: 4 },
    });

    // 通项 an (柱状)
    if (aSlice.some(v => v !== null)) {
      traces.push({
        x: xSlice, y: aSlice,
        type: 'bar',
        name: '通项 a(n)',
        marker: { color: 'rgba(255,152,0,0.5)', color: '#ff9800' },
      });
    }

    // 收敛线
    const validSn = ySlice.filter(v => v !== null && isFinite(v));
    if (validSn.length >= 3) {
      const lastVals = validSn.slice(-Math.min(10, validSn.length));
      const avg = lastVals.reduce((a, b) => a + b, 0) / lastVals.length;
      traces.push({
        x: [nValues[0], nValues[maxIdx]],
        y: [avg, avg],
        type: 'scatter', mode: 'lines',
        name: `推测极限 ≈ ${avg.toFixed(4)}`,
        line: { color: '#e53935', width: 1.5, dash: 'dash' },
      });
    }

    const layout = {
      xaxis: {
        title: 'n',
        zeroline: true, zerolinewidth: 2, zerolinecolor: '#777',
        gridcolor: 'rgba(128,128,128,0.15)',
        dtick: Math.max(1, Math.floor(maxIdx / 10)),
      },
      yaxis: {
        title: 'S(n)',
        zeroline: true, zerolinewidth: 2, zerolinecolor: '#777',
        gridcolor: 'rgba(128,128,128,0.15)',
      },
      showlegend: true,
      legend: { x: 0.01, y: 0.99 },
      margin: { t: 20, b: 40, l: 55, r: 20 },
      paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    };

    window.Plotly.react(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
  }

  playBtn.addEventListener('click', () => {
    let step = 1;
    const interval = setInterval(() => {
      if (step > nRange[1] - nRange[0] + 1) {
        clearInterval(interval);
        return;
      }
      currentMax = step;
      termLabel.textContent = `当前: ${step}/${nRange[1] - nRange[0] + 1} 项`;
      draw(step);
      step++;
    }, stepInterval);
  });

  setTimeout(() => draw(maxTerms), 200);
  return container;
}
