/**
 * 多元积分区域可视化组件（Plotly 3D）
 * 在三维空间展示二重积分的积分区域和体积
 * @param {Object} props - { expression, xRange, yRange, regionType, resolution }
 * @returns {HTMLElement}
 */
import { linspace, safeEvaluate } from '../../services/math-evaluator.js';

export function renderMultivariableIntegral(props) {
  const { expression, xRange = [-3, 3], yRange = [-3, 3], regionType = 'rectangular', resolution = 30 } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `📦 二重积分 ∬ ${expression} dA`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  plotDiv.style.cssText = 'min-height:400px;';
  body.appendChild(plotDiv);

  // 积分值信息
  const info = document.createElement('div');
  info.style.cssText = 'font-size:13px;color:var(--color-text-secondary);margin-top:8px;';
  body.appendChild(info);
  container.appendChild(body);

  requestAnimationFrame(() => {
    const xValues = linspace(xRange[0], xRange[1], resolution);
    const yValues = linspace(yRange[0], yRange[1], resolution);

    const zSurface = [];
    let integralSum = 0;
    const dx = (xRange[1] - xRange[0]) / (resolution - 1);
    const dy = (yRange[1] - yRange[0]) / (resolution - 1);

    for (const x of xValues) {
      const row = [];
      for (const y of yValues) {
        try {
          const z = safeEvaluate(expression, { x, y });
          row.push(isFinite(z) ? z : 0);
        } catch {
          row.push(0);
        }
      }
      zSurface.push(row);
    }

    // 数值积分 (梯形法则近似)
    for (let i = 0; i < resolution - 1; i++) {
      for (let j = 0; j < resolution - 1; j++) {
        const z00 = zSurface[i][j], z10 = zSurface[i + 1][j];
        const z01 = zSurface[i][j + 1], z11 = zSurface[i + 1][j + 1];
        integralSum += (z00 + z10 + z01 + z11) / 4 * dx * dy;
      }
    }

    info.textContent = `数值积分近似值 ≈ ${integralSum.toFixed(4)} (${resolution}×${resolution} 网格)`;

    // 曲面 z=f(x,y)
    const surfaceTrace = {
      x: [], y: [], z: [],
      type: 'surface',
      name: `z = ${expression}`,
      colorscale: 'Viridis',
      opacity: 0.85,
      showscale: false,
    };

    for (let i = 0; i < xValues.length; i++) {
      for (let j = 0; j < yValues.length; j++) {
        surfaceTrace.x.push(xValues[i]);
        surfaceTrace.y.push(yValues[j]);
        surfaceTrace.z.push(zSurface[i][j]);
      }
    }

    // 底面投影 (z=0 平面)
    const baseTrace = {
      x: [xRange[0], xRange[1], xRange[1], xRange[0], xRange[0]],
      y: [yRange[0], yRange[0], yRange[1], yRange[1], yRange[0]],
      z: [0, 0, 0, 0, 0],
      type: 'scatter3d',
      mode: 'lines',
      name: '积分区域',
      line: { color: '#e53935', width: 3 },
    };

    // 侧面
    const sideTraces = [];
    const corners = [
      [xRange[0], yRange[0]], [xRange[1], yRange[0]],
      [xRange[1], yRange[1]], [xRange[0], yRange[1]],
    ];
    for (const [cx, cy] of corners) {
      try {
        const cz = safeEvaluate(expression, { x: cx, y: cy });
        if (isFinite(cz)) {
          sideTraces.push({
            x: [cx, cx], y: [cy, cy], z: [0, cz],
            type: 'scatter3d', mode: 'lines',
            showlegend: false,
            line: { color: 'rgba(25,118,210,0.4)', width: 1.5, dash: 'dot' },
          });
        }
      } catch {}
    }

    const traces = [surfaceTrace, baseTrace, ...sideTraces];

    const layout = {
      scene: {
        xaxis: { title: 'x' },
        yaxis: { title: 'y' },
        zaxis: { title: 'z' },
        aspectmode: 'cube',
      },
      margin: { t: 20, b: 20, l: 0, r: 0 },
      paper_bgcolor: 'transparent',
    };

    if (typeof window.Plotly === 'undefined') {
      plotDiv.textContent = 'Plotly 未加载';
      return;
    }

    try {
      window.Plotly.newPlot(plotDiv, traces, layout, { responsive: true, displayModeBar: true });
    } catch (e) {
      console.error('Plotly 3D 渲染失败:', e);
      plotDiv.textContent = '图像渲染失败';
    }
  });

  return container;
}
