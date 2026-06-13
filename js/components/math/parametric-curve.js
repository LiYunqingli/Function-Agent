/**
 * 参数方程曲线绘制组件（Plotly + 动画）
 * @param {Object} props - { xExpression, yExpression, tRange, points, showMotion }
 * @returns {HTMLElement}
 */
import { linspace, safeEvaluate } from '../../services/math-evaluator.js';

export function renderParametricCurve(props) {
  const { xExpression, yExpression, tRange = [0, 2 * Math.PI], points = 500, showMotion = false } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `📐 参数方程 x=${xExpression}, y=${yExpression}`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);

  // 动画控制
  if (showMotion) {
    const ctrls = document.createElement('div');
    ctrls.className = 'animation-controls';
    ctrls.style.cssText = 'gap:8px;';

    const playBtn = document.createElement('button');
    playBtn.className = 'btn btn-primary';
    playBtn.textContent = '播放动画';
    playBtn.style.cssText = 'padding:4px 12px;font-size:13px;cursor:pointer;';
    ctrls.appendChild(playBtn);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = String(points - 1);
    slider.value = '0';
    slider.style.cssText = 'flex:1;min-width:120px;';
    ctrls.appendChild(slider);

    body.appendChild(ctrls);

    playBtn.addEventListener('click', () => {
      let frame = 0;
      slider.value = '0';
      const interval = setInterval(() => {
        if (frame >= points) { clearInterval(interval); return; }
        slider.value = String(frame);
        slider.dispatchEvent(new Event('input'));
        frame++;
      }, 20);
    });
  }

  container.appendChild(body);

  // 计算全部数据点
  const tValues = linspace(tRange[0], tRange[1], points);
  const allX = [], allY = [];
  for (const t of tValues) {
    try {
      const x = safeEvaluate(xExpression, { t });
      const y = safeEvaluate(yExpression, { t });
      allX.push(x);
      allY.push(y);
    } catch {
      allX.push(null);
      allY.push(null);
    }
  }

  function draw(upToIndex) {
    const idx = upToIndex != null ? upToIndex : allX.length - 1;
    const xSlice = allX.slice(0, idx + 1);
    const ySlice = allY.slice(0, idx + 1);

    const traces = [{
      x: xSlice, y: ySlice,
      type: 'scatter', mode: 'lines',
      name: '参数曲线',
      line: { color: '#7c4dff', width: 2 },
    }];

    // 当前点
    if (upToIndex != null && upToIndex < allX.length) {
      traces.push({
        x: [allX[upToIndex]], y: [allY[upToIndex]],
        type: 'scatter', mode: 'markers',
        name: '当前位置',
        marker: { color: '#ff1744', size: 10 },
      });
    }

    const layout = {
      xaxis: {
        zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777',
        gridcolor: 'rgba(128,128,128,0.15)',
        scaleanchor: 'y', scaleratio: 1,
      },
      yaxis: {
        zeroline: true, zerolinewidth: 2.5, zerolinecolor: '#777',
        gridcolor: 'rgba(128,128,128,0.15)',
      },
      showlegend: upToIndex != null,
      margin: { t: 20, b: 40, l: 55, r: 20 },
      paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    };

    window.Plotly.react(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
  }

  if (showMotion) {
    slider.addEventListener('input', () => {
      draw(parseInt(slider.value));
    });
  }

  setTimeout(() => draw(), 200);
  return container;
}
