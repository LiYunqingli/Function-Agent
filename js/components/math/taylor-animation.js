/**
 * 泰勒展开动画组件（Plotly）
 * @param {Object} props - { expression, center, maxOrder, xRange, stepInterval }
 */
import { safeEvaluate, safeEvaluateTable, numericalDerivative, linspace } from '../../services/math-evaluator.js';

export function renderTaylorAnimation(props) {
  const { expression, center = 0, maxOrder = 8, xRange = [-6, 6], stepInterval = 800 } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `🔄 泰勒展开 — ${expression} (中心=${center}，n≤${maxOrder})`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);

  // 控制条
  const controls = document.createElement('div');
  controls.className = 'animation-controls';
  const playBtn = document.createElement('button'); playBtn.textContent = '▶ 动画';
  const orderSlider = document.createElement('input');
  orderSlider.type = 'range'; orderSlider.min = '0'; orderSlider.max = String(maxOrder); orderSlider.value = '3';
  const orderLabel = document.createElement('span');
  orderLabel.style.cssText = 'font-size:var(--font-size-sm);min-width:100px;font-family:var(--font-mono);color:var(--color-text-secondary);';
  orderLabel.textContent = 'n = 3';
  const polyDisplay = document.createElement('div');
  polyDisplay.style.cssText = 'font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-top:4px;text-align:center;overflow-x:auto;';
  [playBtn, orderSlider, orderLabel].forEach(e => controls.appendChild(e));
  body.appendChild(controls);
  body.appendChild(polyDisplay);
  container.appendChild(body);

  // 计算导数 (数值方法)
  function calcDerivatives() {
    try {
      const f0 = safeEvaluate(expression, { x: center + 1e-8 });
      const derivs = [f0];
      const math = window.math;
      let expr = expression;
      for (let n = 1; n <= maxOrder; n++) {
        try {
          expr = math.derivative(expr, 'x').toString();
          derivs.push(safeEvaluate(expr, { x: center + 1e-8 }));
        } catch {
          // 回退到数值微分
          const step = 1e-4;
          function nd(x, order) {
            if (order === 0) return safeEvaluate(expression, { x });
            return (nd(x + step, order - 1) - nd(x - step, order - 1)) / (2 * step);
          }
          derivs.push(nd(center, n));
          break;
        }
      }
      return derivs;
    } catch {
      const derivs = [safeEvaluate(expression, { x: center + 1e-8 })];
      for (let n = 1; n <= maxOrder; n++) {
        const step = 1e-4;
        function nd(x, o) { if (o === 0) return safeEvaluate(expression, { x }); return (nd(x+step,o-1)-nd(x-step,o-1))/(2*step); }
        derivs.push(nd(center, n));
      }
      return derivs;
    }
  }

  const derivs = calcDerivatives();
  const factorials = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800];

  function taylorPoly(order) {
    let expr = '0';
    for (let n = 0; n <= order && n < derivs.length; n++) {
      const coeff = derivs[n] / (factorials[n] || 1);
      if (Math.abs(coeff) < 1e-10) continue;
      const sign = coeff >= 0 ? '+' : '-';
      const absC = Math.abs(coeff);
      const term = n === 0 ? `${coeff.toFixed(6)}` : `${sign} ${absC.toFixed(6)}(x${center >= 0 ? '-'+center : '+' + Math.abs(center)})^${n}`;
      if (n === 0) expr = `${coeff.toFixed(6)}`;
      else expr += ` ${sign} ${absC.toFixed(6)}*(x-${center})^${n}`;
    }
    return expr;
  }

  function evalTaylor(order, xVal) {
    let sum = 0;
    for (let n = 0; n <= order && n < derivs.length; n++) {
      sum += (derivs[n] / (factorials[n] || 1)) * Math.pow(xVal - center, n);
    }
    return sum;
  }

  function draw(order) {
    const xVals = linspace(xRange[0], xRange[1], 300);
    const originalData = safeEvaluateTable(expression, xVals);
    const taylorY = xVals.map(x => evalTaylor(order, x));

    const traces = [
      { x: originalData.x, y: originalData.y, type: 'scatter', mode: 'lines', name: expression, line: { color: '#333', width: 2 } },
      { x: xVals, y: taylorY, type: 'scatter', mode: 'lines', name: `泰勒 n=${order}`, line: { color: '#e53935', width: 2, dash: 'dash' } },
    ];

    const layout = {
      xaxis: { title: 'x', range: xRange, zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777', gridcolor: 'rgba(128,128,128,0.15)' },
      yaxis: { title: 'y', zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777', gridcolor: 'rgba(128,128,128,0.15)' },
      showlegend: true,
      margin: { t: 20, b: 40, l: 50, r: 20 },
      paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    };

    window.Plotly.react(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
    orderLabel.textContent = `n = ${order}`;
    polyDisplay.textContent = `T${order}(x) = ${taylorPoly(order)}`;
  }

  let animTimer = null;
  orderSlider.addEventListener('input', () => {
    draw(parseInt(orderSlider.value));
  });

  playBtn.addEventListener('click', () => {
    if (animTimer) { clearInterval(animTimer); animTimer = null; playBtn.textContent = '▶ 动画'; return; }
    playBtn.textContent = '⏸ 暂停';
    let n = 0;
    orderSlider.value = '0';
    draw(0);
    animTimer = setInterval(() => {
      n++;
      if (n > maxOrder) { clearInterval(animTimer); animTimer = null; playBtn.textContent = '▶ 动画'; return; }
      orderSlider.value = String(n);
      draw(n);
    }, stepInterval);
  });

  setTimeout(() => draw(3), 200);
  return container;
}
