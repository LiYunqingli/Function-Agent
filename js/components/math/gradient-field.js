/**
 * 梯度场可视化组件（Plotly 2D vectors）
 * @param {Object} props - { expression, xRange, yRange, density, showContour }
 */
import { safeEvaluate, linspace } from '../../services/math-evaluator.js';

export function renderGradientField(props) {
  const { expression, xRange = [-5, 5], yRange = [-5, 5], density = 15, showContour = true } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `🧭 梯度场 — ${expression}`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';
  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);
  container.appendChild(body);

  requestAnimationFrame(() => {
    const xs = linspace(xRange[0], xRange[1], density);
    const ys = linspace(yRange[0], yRange[1], density);
    const h = 1e-5; // 微分量

    // 计算梯度
    const arrowsX = [], arrowsY = [], arrowsU = [], arrowsV = [];
    for (const y of ys) {
      for (const x of xs) {
        try {
          const gradX = (safeEvaluate(expression, { x: x + h, y }) - safeEvaluate(expression, { x: x - h, y })) / (2 * h);
          const gradY = (safeEvaluate(expression, { x, y: y + h }) - safeEvaluate(expression, { x, y: y - h })) / (2 * h);
          if (isFinite(gradX) && isFinite(gradY)) {
            const mag = Math.sqrt(gradX * gradX + gradY * gradY);
            if (mag > 0) {
              arrowsX.push(x); arrowsY.push(y);
              arrowsU.push(gradX / mag * 0.8);
              arrowsV.push(gradY / mag * 0.8);
            }
          }
        } catch {}
      }
    }

    const traces = [];

    // 等高线
    if (showContour) {
      const gridX = linspace(xRange[0], xRange[1], 80);
      const gridY = linspace(yRange[0], yRange[1], 80);
      const zValues = [];
      for (const y of gridY) {
        const row = [];
        for (const x of gridX) {
          try { row.push(safeEvaluate(expression, { x, y })); } catch { row.push(null); }
        }
        zValues.push(row);
      }
      traces.push({
        x: gridX, y: gridY, z: zValues,
        type: 'contour', name: '等高线', showscale: false,
        contours: { coloring: 'lines' },
        line: { width: 0.5 },
      });
    }

    // 梯度箭头 (用 scatter + text symbol arrow 近似)
    traces.push({
      x: arrowsX, y: arrowsY,
      type: 'scatter', mode: 'markers',
      name: '梯度方向',
      marker: {
        symbol: 'arrow',
        size: 8,
        angle: arrowsU.map((u, i) => Math.atan2(arrowsV[i], u) * 180 / Math.PI - 90),
        color: '#1976d2',
      },
    });

    const layout = {
      xaxis: { title: 'x', range: xRange, zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777', gridcolor: 'rgba(128,128,128,0.15)', scaleanchor: 'y' },
      yaxis: { title: 'y', range: yRange, zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777', gridcolor: 'rgba(128,128,128,0.15)' },
      showlegend: true,
      margin: { t: 20, b: 40, l: 50, r: 20 },
      paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    };

    window.Plotly.newPlot(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
  });

  return container;
}
