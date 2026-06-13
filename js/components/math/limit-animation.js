/**
 * 极限逼近动画组件（Canvas2D）
 * @param {Object} props - { expression, approachPoint, limitValue, direction, steps, stepInterval }
 */
import { safeEvaluate, linspace } from '../../services/math-evaluator.js';

export function renderLimitAnimation(props) {
  const { expression, approachPoint, limitValue, direction = 'both', steps = 20, stepInterval = 250 } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  const dirLabel = direction === 'left' ? '左极限' : direction === 'right' ? '右极限' : '双侧极限';
  header.textContent = `🎯 极限逼近 — lim(x→${approachPoint}) ${expression}`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  // Canvas
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';
  const canvas = document.createElement('canvas');
  canvas.width = 500; canvas.height = 350;
  canvasContainer.appendChild(canvas);
  body.appendChild(canvasContainer);

  // 控制条
  const controls = document.createElement('div');
  controls.className = 'animation-controls';
  const playBtn = document.createElement('button'); playBtn.textContent = '▶ 播放';
  const resetBtn = document.createElement('button'); resetBtn.textContent = '⟲ 重置';
  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '0'; slider.max = String(steps); slider.value = '0';
  const stepLabel = document.createElement('span');
  stepLabel.style.cssText = 'font-size:var(--font-size-sm);min-width:80px;color:var(--color-text-secondary);';
  stepLabel.textContent = `步骤: 0/${steps}`;
  [playBtn, resetBtn, slider, stepLabel].forEach(e => controls.appendChild(e));
  body.appendChild(controls);
  container.appendChild(body);

  const ctx = canvas.getContext('2d');
  let animId = null, currentStep = 0, isPlaying = false, isMounted = true;

  function draw(step) {
    const w = canvas.width, h = canvas.height, pad = 45;
    ctx.clearRect(0, 0, w, h);

    // 计算视口
    const xRange = [approachPoint - 2.5, approachPoint + 2.5];
    const toX = (x) => pad + (x - xRange[0]) / (xRange[1] - xRange[0]) * (w - 2 * pad);
    const toY = (y, yMin, yMax) => h - pad - (y - yMin) / (yMax - yMin) * (h - 2 * pad);

    // 采样函数值
    const drawX = linspace(xRange[0], xRange[1], 300);
    const drawY = drawX.map(x => { try { return safeEvaluate(expression, { x }); } catch { return null; } });
    let yMin = Infinity, yMax = -Infinity;
    drawY.forEach(y => { if (y !== null && isFinite(y) && Math.abs(y) < 100) { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); } });
    yMin -= 0.5; yMax += 0.5;

    // 坐标轴
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();
    ctx.fillStyle = '#666'; ctx.font = '11px sans-serif';
    ctx.fillText(String(approachPoint), toX(approachPoint) - 10, h - pad + 16);

    // 函数曲线
    ctx.strokeStyle = '#1976d2'; ctx.lineWidth = 2; ctx.beginPath();
    let first = true;
    for (let i = 0; i < drawX.length; i++) {
      if (drawY[i] === null || !isFinite(drawY[i]) || Math.abs(drawY[i]) > 100) { first = true; continue; }
      const px = toX(drawX[i]), py = toY(drawY[i], yMin, yMax);
      if (first) { ctx.moveTo(px, py); first = false; } else { ctx.lineTo(px, py); }
    }
    ctx.stroke();

    // x₀ 虚线
    const px0 = toX(approachPoint);
    ctx.strokeStyle = '#bbb'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(px0, pad); ctx.lineTo(px0, h - pad); ctx.stroke();
    ctx.setLineDash([]);

    // 逼近点
    if (step > 0) {
      const epsilon = 2.5 * Math.pow(0.65, step);
      const dirs = direction === 'both' ? [-1, 1] : (direction === 'left' ? [-1] : [1]);
      dirs.forEach(dir => {
        const xA = approachPoint + dir * epsilon;
        try {
          const yA = safeEvaluate(expression, { x: xA });
          if (isFinite(yA) && Math.abs(yA) < 100) {
            const px = toX(xA), py = toY(yA, yMin, yMax);
            ctx.fillStyle = dir < 0 ? '#e53935' : '#ff9800';
            ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#333'; ctx.font = '10px sans-serif';
            ctx.fillText(`(${xA.toFixed(4)}, ${yA.toFixed(4)})`, px + 8, py - 8);
          }
        } catch {}
      });
    }

    // 极限值标记
    if (limitValue !== undefined) {
      const pyL = toY(limitValue, yMin, yMax);
      ctx.strokeStyle = '#2e7d32'; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(pad, pyL); ctx.lineTo(w - pad, pyL); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#2e7d32'; ctx.font = '11px sans-serif';
      ctx.fillText(`L=${limitValue}`, pad + 4, pyL - 6);
    }
  }

  draw(0);

  function animate() {
    if (!isPlaying || !isMounted) return;
    if (currentStep >= steps) { isPlaying = false; playBtn.textContent = '▶ 播放'; return; }
    currentStep++;
    slider.value = currentStep;
    stepLabel.textContent = `步骤: ${currentStep}/${steps}`;
    draw(currentStep);
    animId = requestAnimationFrame(() => setTimeout(animate, stepInterval));
  }

  playBtn.addEventListener('click', () => {
    if (isPlaying) { isPlaying = false; playBtn.textContent = '▶ 播放'; if (animId) cancelAnimationFrame(animId); }
    else { isPlaying = true; playBtn.textContent = '⏸ 暂停'; animate(); }
  });

  resetBtn.addEventListener('click', () => {
    isPlaying = false; playBtn.textContent = '▶ 播放';
    if (animId) cancelAnimationFrame(animId);
    currentStep = 0; slider.value = 0;
    stepLabel.textContent = `步骤: 0/${steps}`;
    draw(0);
  });

  slider.addEventListener('input', () => {
    currentStep = parseInt(slider.value);
    stepLabel.textContent = `步骤: ${currentStep}/${steps}`;
    draw(currentStep);
  });

  // cleanup
  const obs = new MutationObserver(() => {
    if (!document.contains(container)) { isMounted = false; if (animId) cancelAnimationFrame(animId); obs.disconnect(); }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  return container;
}
