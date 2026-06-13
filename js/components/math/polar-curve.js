/**
 * 极坐标曲线绘制组件（Plotly）
 * @param {Object} props - { expression, thetaRange, points }
 * @returns {HTMLElement}
 */
import { linspace, safeEvaluate } from '../../services/math-evaluator.js';

export function renderPolarCurve(props) {
  const { expression, thetaRange = [0, 2 * Math.PI], points = 500 } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `🔄 极坐标曲线 r = ${expression}`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);
  container.appendChild(body);

  requestAnimationFrame(() => {
    const thetaValues = linspace(thetaRange[0], thetaRange[1], points);
    const rValues = [];
    const xValues = [];
    const yValues = [];

    for (const theta of thetaValues) {
      try {
        const r = safeEvaluate(expression, { theta });
        rValues.push(r);
        xValues.push(r * Math.cos(theta));
        yValues.push(r * Math.sin(theta));
      } catch {
        xValues.push(null);
        yValues.push(null);
      }
    }

    // 计算坐标范围
    const validX = xValues.filter(v => v !== null && isFinite(v));
    const validY = yValues.filter(v => v !== null && isFinite(v));
    const pad = Math.max(1, Math.max(...validX.map(Math.abs), ...validY.map(Math.abs)) * 0.15);

    const traces = [{
      x: xValues,
      y: yValues,
      type: 'scatter',
      mode: 'lines',
      name: `r = ${expression}`,
      line: { color: '#e91e63', width: 2.5 },
    }];

    // 标记原点
    traces.push({
      x: [0], y: [0],
      type: 'scatter',
      mode: 'markers',
      name: '原点',
      marker: { color: '#666', size: 5 },
    });

    const layout = {
      xaxis: {
        title: 'x',
        zeroline: true,
        zerolinewidth: 2.5,
        zerolinecolor: '#777',
        gridcolor: 'rgba(128,128,128,0.15)',
        scaleanchor: 'y',
        scaleratio: 1,
      },
      yaxis: {
        title: 'y',
        zeroline: true,
        zerolinewidth: 2.5,
        zerolinecolor: '#777',
        gridcolor: 'rgba(128,128,128,0.15)',
        range: [-pad - Math.max(...validY.map(Math.abs)), pad + Math.max(...validY.map(Math.abs))],
      },
      showlegend: true,
      margin: { t: 20, b: 40, l: 55, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
    };
    layout.xaxis.range = layout.yaxis.range;

    if (typeof window.Plotly === 'undefined') {
      plotDiv.textContent = 'Plotly 未加载，请检查网络连接';
      return;
    }

    try {
      window.Plotly.newPlot(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
    } catch (e) {
      console.error('Plotly 渲染失败:', e);
      plotDiv.textContent = '图像渲染失败，请刷新重试';
    }
  });

  return container;
}
