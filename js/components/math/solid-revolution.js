/**
 * 旋转体动画组件（Plotly 3D）
 * @param {Object} props - { expression, axis, xFrom, xTo }
 */
import { linspace, safeEvaluateTable } from '../../services/math-evaluator.js';

export function renderSolidRevolution(props) {
  const { expression, axis = 'x', xFrom, xTo } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `🎡 旋转体 — ${expression} 绕${axis}轴`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const plotDiv = document.createElement('div');
  plotDiv.className = 'plotly-container';
  plotDiv.style.minHeight = '450px';
  body.appendChild(plotDiv);

  // 控制: 旋转角度
  const controls = document.createElement('div');
  controls.className = 'animation-controls';
  const playBtn = document.createElement('button'); playBtn.textContent = '▶ 旋转动画';
  const angleSlider = document.createElement('input');
  angleSlider.type = 'range'; angleSlider.min = '30'; angleSlider.max = '360'; angleSlider.value = '360';
  const angleLabel = document.createElement('span');
  angleLabel.style.cssText = 'font-size:var(--font-size-sm);min-width:60px;color:var(--color-text-secondary);';
  angleLabel.textContent = '360°';
  [playBtn, angleSlider, angleLabel].forEach(e => controls.appendChild(e));
  body.appendChild(controls);
  container.appendChild(body);

  function buildTraces(thetaMax) {
    const nT = linspace(xFrom, xTo, 50);
    const data = safeEvaluateTable(expression, nT);
    const thetaSteps = Math.max(6, Math.floor(thetaMax / 30));
    const thetas = [];
    for (let i = 0; i <= thetaSteps; i++) {
      thetas.push((thetaMax / thetaSteps) * i * Math.PI / 180);
    }

    const X = [], Y = [], Z = [];
    for (const th of thetas) {
      const rowX = [], rowY = [], rowZ = [];
      for (let i = 0; i < nT.length; i++) {
        const t = nT[i], r = data.y[i] ?? 0;
        if (!isFinite(r)) { rowX.push(null); rowY.push(null); rowZ.push(null); continue; }
        if (axis === 'x') { rowX.push(t); rowY.push(r * Math.cos(th)); rowZ.push(r * Math.sin(th)); }
        else { rowX.push(r * Math.cos(th)); rowY.push(t); rowZ.push(r * Math.sin(th)); }
      }
      X.push(rowX); Y.push(rowY); Z.push(rowZ);
    }

    return [{
      type: 'surface',
      x: axis === 'x' ? nT : X[0],
      y: [...Array(thetaSteps + 1).keys()].map(i => i),
      z: Z,
      colorscale: 'Blues',
      showscale: false,
      opacity: 0.85,
    }];
  }

  function draw(thetaMax) {
    const traces = buildTraces(thetaMax);
    const layout = {
      scene: {
        xaxis: { title: axis === 'x' ? 'x' : 'y' },
        yaxis: { title: axis === 'x' ? 'y' : 'x' },
        zaxis: { title: 'z' },
        camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } },
        dragmode: 'orbit',
        aspectmode: 'data',
      },
      margin: { t: 20, b: 20, l: 20, r: 20 },
      paper_bgcolor: 'transparent',
    };
    window.Plotly.react(plotDiv, traces, layout, { responsive: true });
  }

  angleSlider.addEventListener('input', () => {
    const val = parseInt(angleSlider.value);
    angleLabel.textContent = `${val}°`;
    draw(val);
  });

  let animTimer = null;
  playBtn.addEventListener('click', () => {
    if (animTimer) { clearInterval(animTimer); animTimer = null; playBtn.textContent = '▶ 旋转动画'; return; }
    playBtn.textContent = '⏸ 暂停';
    let deg = 30;
    angleSlider.value = '30'; draw(30); angleLabel.textContent = '30°';
    animTimer = setInterval(() => {
      deg += 10;
      if (deg > 360) { clearInterval(animTimer); animTimer = null; playBtn.textContent = '▶ 旋转动画'; deg = 360; }
      angleSlider.value = String(deg); angleLabel.textContent = `${deg}°`; draw(deg);
    }, 200);
  });

  setTimeout(() => draw(360), 300);
  return container;
}
