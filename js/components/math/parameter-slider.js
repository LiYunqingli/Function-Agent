/**
 * 参数滑块联动图像组件
 * @param {Object} props - { expression, parameters: [{name,min,max,step,default}], xRange }
 * @returns {HTMLElement}
 */
import { safeEvaluateTable, linspace } from '../../services/math-evaluator.js';

export function renderParameterSlider(props) {
  const { expression, parameters = [], xRange = [-10, 10] } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = '🎛️ 参数滑块 — ' + expression;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  // Plotly 图表容器
  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  plotDiv.style.minHeight = '350px';
  body.appendChild(plotDiv);

  // 参数控制区
  const controls = document.createElement('div');
  controls.className = 'parameter-controls';

  // 当前参数值
  const paramValues = {};
  parameters.forEach(p => { paramValues[p.name] = p.default ?? (p.min + p.max) / 2; });

  /**
   * 更新图表
   */
  function updatePlot() {
    const xValues = linspace(xRange[0], xRange[1], 200);
    const traces = [];

    try {
      const data = safeEvaluateTable(expression, xValues, paramValues);
      traces.push({
        x: data.x, y: data.y,
        type: 'scatter', mode: 'lines',
        name: expression,
        line: { color: '#1976d2', width: 2 },
      });
    } catch {}

    const layout = {
      xaxis: { title: 'x', gridcolor: 'rgba(128,128,128,0.15)', zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777' },
      yaxis: { title: 'y', gridcolor: 'rgba(128,128,128,0.15)', zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777' },
      showlegend: true,
      margin: { t: 20, b: 40, l: 50, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
    };

    window.Plotly.react(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
  }

  // 创建滑块
  parameters.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'param-control';

    const label = document.createElement('label');
    label.textContent = p.name;
    label.title = p.name;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(p.min ?? -10);
    slider.max = String(p.max ?? 10);
    slider.step = String(p.step ?? 0.1);
    slider.value = String(paramValues[p.name]);

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'param-value';
    valueDisplay.textContent = String(paramValues[p.name]);

    slider.addEventListener('input', () => {
      paramValues[p.name] = parseFloat(slider.value);
      valueDisplay.textContent = paramValues[p.name].toFixed(2);
      updatePlot();
    });

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(valueDisplay);
    controls.appendChild(row);
  });

  body.appendChild(controls);
  container.appendChild(body);

  // 初始渲染图表
  setTimeout(() => updatePlot(), 200);

  return container;
}
