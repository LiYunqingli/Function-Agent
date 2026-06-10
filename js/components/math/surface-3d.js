/**
 * 3D 曲面图组件（Plotly surface）
 * @param {Object} props - { expression, xRange, yRange, resolution, colorScale }
 */
import { safeEvaluate, linspace } from '../../services/math-evaluator.js';

export function renderSurface3d(props) {
  const { expression, xRange = [-5, 5], yRange = [-5, 5], resolution = 40, colorScale = 'Viridis' } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `🌐 3D 曲面 — ${expression}`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';
  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  plotDiv.style.minHeight = '450px';
  body.appendChild(plotDiv);
  container.appendChild(body);

  requestAnimationFrame(() => {
    const xs = linspace(xRange[0], xRange[1], resolution);
    const ys = linspace(yRange[0], yRange[1], resolution);
    const zValues = [];

    for (const y of ys) {
      const row = [];
      for (const x of xs) {
        try { row.push(safeEvaluate(expression, { x, y })); } catch { row.push(null); }
      }
      zValues.push(row);
    }

    const trace = {
      x: xs, y: ys, z: zValues,
      type: 'surface',
      colorscale: colorScale,
      contours: {
        z: { show: true, usecolormap: true, highlightcolor: 'rgba(255,255,255,0.4)', project: { z: true } },
      },
    };

    const layout = {
      scene: {
        xaxis: { title: 'x' },
        yaxis: { title: 'y' },
        zaxis: { title: 'z' },
        camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } },
        dragmode: 'orbit',
      },
      margin: { t: 20, b: 20, l: 20, r: 20 },
      paper_bgcolor: 'transparent',
    };

    window.Plotly.newPlot(plotDiv, [trace], layout, { responsive: true, displayModeBar: true });
  });

  return container;
}
