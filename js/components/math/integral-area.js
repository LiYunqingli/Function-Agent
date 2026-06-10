/**
 * 积分面积可视化组件（Plotly）
 * @param {Object} props - { expression, lowerBound, upperBound, interactive, showRiemannSum, riemannN }
 * @returns {HTMLElement}
 */
import { safeEvaluateTable, linspace, safeEvaluate } from '../../services/math-evaluator.js';

export function renderIntegralArea(props) {
  const { expression, lowerBound, upperBound, interactive = false, showRiemannSum = false, riemannN = 10 } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `🔲 积分面积 ∫[${lowerBound}, ${upperBound}] ${expression} dx`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);

  // 交互滑块
  let lowerSlider, upperSlider, lowerVal, upperVal;
  if (interactive) {
    const ctrls = document.createElement('div');
    ctrls.className = 'animation-controls';
    ctrls.style.cssText = 'gap:12px;flex-wrap:wrap;';

    const makeSlider = (label, initial, min, max) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;min-width:200px;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:var(--font-size-sm);white-space:nowrap;';
      lbl.textContent = label;
      const s = document.createElement('input');
      s.type = 'range'; s.min = String(min); s.max = String(max); s.step = '0.1'; s.value = String(initial);
      const v = document.createElement('span');
      v.className = 'param-value'; v.textContent = String(initial);
      s.addEventListener('input', () => { v.textContent = parseFloat(s.value).toFixed(2); draw(); });
      row.appendChild(lbl); row.appendChild(s); row.appendChild(v);
      return { slider: s, label: v };
    };

    const xPad = Math.abs(upperBound - lowerBound) * 0.5;
    const r1 = makeSlider(`下限:`, lowerBound, lowerBound - xPad, upperBound);
    const r2 = makeSlider(`上限:`, upperBound, lowerBound, upperBound + xPad);
    lowerSlider = r1.slider; upperSlider = r2.slider; lowerVal = r1.label; upperVal = r2.label;

    ctrls.appendChild(r1.slider.parentElement);
    ctrls.appendChild(r2.slider.parentElement);
    body.appendChild(ctrls);
  }

  container.appendChild(body);

  function draw() {
    const L = interactive ? parseFloat(lowerSlider.value) : lowerBound;
    const U = interactive ? parseFloat(upperSlider.value) : upperBound;
    if (interactive) { lowerVal.textContent = L.toFixed(2); upperVal.textContent = U.toFixed(2); }

    const pad = Math.abs(U - L) * 0.5;
    const xR = [Math.min(L, lowerBound) - pad, Math.max(U, upperBound) + pad];
    const xValues = linspace(xR[0], xR[1], 300);
    const allData = safeEvaluateTable(expression, xValues);
    const integralX = linspace(L, U, 150);
    const intData = safeEvaluateTable(expression, integralX);

    const traces = [
      { x: allData.x, y: allData.y, type: 'scatter', mode: 'lines', name: expression, line: { color: '#1976d2', width: 2 } },
      { x: intData.x, y: intData.y, type: 'scatter', mode: 'lines', fill: 'tozeroy', name: '积分面积', fillcolor: 'rgba(46,125,50,0.2)', line: { color: 'rgba(46,125,50,0.4)', width: 1 } },
    ];

    // 黎曼和矩形
    if (showRiemannSum) {
      const dx = (U - L) / riemannN;
      for (let i = 0; i < riemannN; i++) {
        const xL = L + i * dx, xR = xL + dx, xM = (xL + xR) / 2;
        try {
          const yH = safeEvaluate(expression, { x: xM });
          if (isFinite(yH) && yH >= 0) {
            traces.push({
              x: [xL, xL, xR, xR, xL], y: [0, yH, yH, 0, 0],
              type: 'scatter', mode: 'lines', fill: 'toself',
              name: '', showlegend: false,
              fillcolor: 'rgba(255,152,0,0.3)', line: { color: 'rgba(255,152,0,0.5)', width: 0.5 },
            });
          }
        } catch {}
      }
    }

    const layout = {
      xaxis: { title: 'x', zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777', gridcolor: 'rgba(128,128,128,0.15)' },
      yaxis: { title: 'y', zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777', gridcolor: 'rgba(128,128,128,0.15)' },
      showlegend: true,
      margin: { t: 20, b: 40, l: 50, r: 20 },
      paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    };

    window.Plotly.react(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
  }

  setTimeout(() => draw(), 200);
  return container;
}
