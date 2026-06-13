/**
 * 数列可视化组件（Plotly）
 * 支持数轴标注和蛛网图（递推数列）
 * @param {Object} props - { expression, nRange, mode, showConvergence }
 * @returns {HTMLElement}
 */
import { linspace, safeEvaluate } from '../../services/math-evaluator.js';

export function renderSequence(props) {
  const { expression, nRange = [1, 20], mode = 'numberline', showConvergence = true } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `🔢 数列 aₙ = ${expression}`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  body.appendChild(plotDiv);

  // 计算数列值
  const nValues = [];
  const aValues = [];
  for (let n = nRange[0]; n <= nRange[1]; n++) {
    nValues.push(n);
    try {
      const a = safeEvaluate(expression, { n });
      aValues.push(a);
    } catch {
      aValues.push(null);
    }
  }

  // 推测收敛值
  let convergenceInfo = '';
  if (showConvergence && aValues.length >= 5) {
    const validA = aValues.filter(v => v !== null && isFinite(v));
    if (validA.length >= 5) {
      const last = validA.slice(-Math.min(10, validA.length));
      const avg = last.reduce((a, b) => a + b, 0) / last.length;
      const variance = last.reduce((a, b) => a + (b - avg) ** 2, 0) / last.length;
      if (variance < 0.01) {
        convergenceInfo = `推测收敛于 ${avg.toFixed(4)}`;
      }
    }
  }

  if (convergenceInfo) {
    const info = document.createElement('div');
    info.style.cssText = 'font-size:13px;color:var(--color-text-secondary);margin-bottom:8px;';
    info.textContent = convergenceInfo;
    body.insertBefore(info, plotDiv);
  }

  function draw() {
    const traces = [];

    if (mode === 'numberline' || mode === 'scatter') {
      // 数列散点图
      traces.push({
        x: nValues, y: aValues,
        type: 'scatter', mode: 'lines+markers',
        name: `aₙ = ${expression}`,
        line: { color: '#7c4dff', width: 1.5 },
        marker: { size: 6, color: '#7c4dff' },
      });

      // 收敛线
      if (showConvergence && convergenceInfo) {
        const match = convergenceInfo.match(/(-?\d+\.?\d*)/);
        if (match) {
          const lim = parseFloat(match[1]);
          traces.push({
            x: [nRange[0], nRange[1]],
            y: [lim, lim],
            type: 'scatter', mode: 'lines',
            name: `极限 ${lim.toFixed(4)}`,
            line: { color: '#e53935', width: 1.5, dash: 'dash' },
          });
        }
      }
    } else if (mode === 'cobweb') {
      // 蛛网图: a_{n+1} = f(a_n)
      // 需要 f(x) 形式的表达式
      try {
        const fX = linspace(
          Math.min(...aValues.filter(v => v !== null)) - 0.5,
          Math.max(...aValues.filter(v => v !== null)) + 0.5,
          200
        );
        const fY = fX.map(x => {
          try { return safeEvaluate(expression, { n: x }); }
          catch { return null; }
        });

        // y = x 参考线
        traces.push({
          x: fX, y: fX,
          type: 'scatter', mode: 'lines',
          name: 'y = x',
          line: { color: '#9e9e9e', width: 1, dash: 'dash' },
        });

        // f(x) 曲线
        traces.push({
          x: fX, y: fY,
          type: 'scatter', mode: 'lines',
          name: `f(x)`,
          line: { color: '#1565c0', width: 2 },
        });

        // 蛛网路径
        const cobX = [];
        const cobY = [];
        if (aValues[0] !== null) {
          let curr = aValues[0];
          cobX.push(curr); cobY.push(0);
          for (let i = 0; i < Math.min(aValues.length, 30); i++) {
            // 垂直到 f(x)
            const next = aValues[i + 1] !== null ? aValues[i + 1] : aValues[i];
            cobX.push(curr); cobY.push(next);
            // 水平到 y=x
            cobX.push(next); cobY.push(next);
            curr = next;
          }
          traces.push({
            x: cobX, y: cobY,
            type: 'scatter', mode: 'lines',
            name: '蛛网路径',
            line: { color: '#e53935', width: 1.5 },
          });
        }
      } catch (e) {
        console.warn('蛛网图生成失败:', e);
        // 降级为散点图
        traces.push({
          x: nValues, y: aValues,
          type: 'scatter', mode: 'lines+markers',
          name: `aₙ`,
          line: { color: '#7c4dff', width: 1.5 },
          marker: { size: 6, color: '#7c4dff' },
        });
      }
    }

    const layout = {
      xaxis: {
        title: mode === 'cobweb' ? 'aₙ' : 'n',
        zeroline: true, zerolinewidth: 2, zerolinecolor: '#777',
        gridcolor: 'rgba(128,128,128,0.15)',
      },
      yaxis: {
        title: mode === 'cobweb' ? 'aₙ₊₁' : 'aₙ',
        zeroline: true, zerolinewidth: 2, zerolinecolor: '#777',
        gridcolor: 'rgba(128,128,128,0.15)',
      },
      showlegend: true,
      margin: { t: 20, b: 40, l: 55, r: 20 },
      paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    };

    if (typeof window.Plotly === 'undefined') {
      plotDiv.textContent = 'Plotly 未加载';
      return;
    }

    try {
      window.Plotly.newPlot(plotDiv, traces, layout, { responsive: true, displayModeBar: false });
    } catch (e) {
      console.error('Plotly 渲染失败:', e);
    }
  }

  requestAnimationFrame(() => setTimeout(draw, 200));
  return container;
}
