/**
 * 函数图像绘制组件（Plotly 2D）
 * @param {Object} props - { functions, xRange, yRange, integralRegion, showTangent, showGrid }
 * @returns {HTMLElement}
 */
import { safeEvaluateTable, linspace, numericalDerivative } from '../../services/math-evaluator.js';

export function renderFunctionPlot(props) {
  const { functions = [], xRange = [-10, 10], yRange, integralRegion, showTangent, showGrid = true } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = '📈 函数图像';
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);
  container.appendChild(body);

  // 异步渲染（确保 DOM 就绪）
  requestAnimationFrame(() => {
    const xValues = linspace(xRange[0], xRange[1], 200);
    const traces = [];

    // 函数曲线
    functions.forEach(fn => {
      try {
        const data = safeEvaluateTable(fn.expression, xValues);
        traces.push({
          x: data.x, y: data.y,
          type: 'scatter', mode: 'lines',
          name: fn.label || fn.expression,
          line: { color: fn.color || undefined, width: 2 },
        });
      } catch {}
    });

    // 积分区域填充
    if (integralRegion) {
      try {
        const exp = integralRegion.expression || functions[0]?.expression;
        const iX = linspace(integralRegion.lower, integralRegion.upper, 200);
        const iData = safeEvaluateTable(exp, iX);
        traces.push({
          x: iData.x, y: iData.y,
          type: 'scatter', mode: 'lines',
          fill: 'tozeroy',
          name: `∫ [${integralRegion.lower}, ${integralRegion.upper}]`,
          fillcolor: 'rgba(25,118,210,0.15)',
          line: { color: 'rgba(25,118,210,0.3)', width: 1 },
        });
      } catch {}
    }

    // 切线
    if (showTangent) {
      try {
        const exp = showTangent.expression || functions[0]?.expression;
        const x0 = showTangent.x0;
        const y0 = safeEvaluateTable(exp, [x0]).y[0];
        const slope = numericalDerivative(exp, x0);
        const tX = [x0 - 3, x0 + 3];
        const tY = tX.map(x => y0 + slope * (x - x0));
        traces.push({
          x: tX, y: tY,
          type: 'scatter', mode: 'lines',
          name: `切线 x=${x0}`,
          line: { color: '#e53935', width: 1.5, dash: 'dash' },
        });
      } catch {}
    }

    // 十字坐标系：零线加粗作为坐标轴穿过原点
    const tickFont = { size: 12, color: '#777' };
    const titleFont = { size: 14, color: '#999' };

    const layout = {
      xaxis: {
        title: { text: 'x', font: titleFont, standoff: 8 },
        showgrid: showGrid,
        gridcolor: 'rgba(128,128,128,0.15)',
        gridwidth: 0.5,
        zeroline: true,
        zerolinewidth: 2.5,
        zerolinecolor: '#777',
        showline: true,
        linewidth: 1,
        linecolor: 'rgba(128,128,128,0.5)',
        tickfont: tickFont,
        dtick: undefined,
        rangemode: 'normal',
      },
      yaxis: {
        title: { text: 'y', font: titleFont, standoff: 8 },
        showgrid: showGrid,
        gridcolor: 'rgba(128,128,128,0.15)',
        gridwidth: 0.5,
        zeroline: true,
        zerolinewidth: 2.5,
        zerolinecolor: '#777',
        showline: true,
        linewidth: 1,
        linecolor: 'rgba(128,128,128,0.5)',
        tickfont: tickFont,
        dtick: undefined,
        rangemode: 'normal',
      },
      showlegend: traces.length > 1,
      margin: { t: 20, b: 40, l: 55, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
    };
    if (yRange) layout.yaxis.range = yRange;

    if (typeof window.Plotly === 'undefined') {
      plotDiv.textContent = '⚠️ Plotly 未加载，请检查网络连接';
      return;
    }

    try {
      window.Plotly.newPlot(plotDiv, traces, layout, {
        responsive: true,
        displayModeBar: false,
      });
    } catch (e) {
      console.error('Plotly 渲染失败:', e);
      plotDiv.textContent = '⚠️ 图像渲染失败，请刷新重试';
    }
  });

  return container;
}
