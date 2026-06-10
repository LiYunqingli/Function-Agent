/**
 * 微分近似示意图组件（Canvas2D）
 * @param {Object} props - { expression, x0, dx }
 */
import { safeEvaluate, numericalDerivative, linspace } from '../../services/math-evaluator.js';

export function renderDifferentialView(props) {
  const { expression, x0, dx = 0.5 } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `📏 微分近似 — f'(${x0})·dx ≈ Δy`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';
  const canvas = document.createElement('canvas');
  canvas.width = 500; canvas.height = 350;
  canvasContainer.appendChild(canvas);
  body.appendChild(canvasContainer);

  // 数值信息
  const info = document.createElement('div');
  info.style.cssText = 'font-size:var(--font-size-sm);color:var(--color-text-secondary);text-align:center;margin-top:8px;';

  container.appendChild(body);

  const ctx = canvas.getContext('2d');

  function draw() {
    const w = canvas.width, h = canvas.height, pad = 45;

    const xRange = [x0 - 3 * Math.abs(dx) - 1, x0 + 3 * Math.abs(dx) + 1];
    const toX = (x) => pad + (x - xRange[0]) / (xRange[1] - xRange[0]) * (w - 2 * pad);

    // 采样
    const drawX = linspace(xRange[0], xRange[1], 300);
    const drawY = drawX.map(x => { try { return safeEvaluate(expression, { x }); } catch { return null; } });
    let yMin = Infinity, yMax = -Infinity;
    drawY.forEach(y => { if (y !== null && isFinite(y)) { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); } });
    yMin -= 0.5; yMax += 0.5;
    const toY = (y) => h - pad - (y - yMin) / (yMax - yMin) * (h - 2 * pad);

    // 坐标轴
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();

    // 函数曲线
    ctx.strokeStyle = '#1976d2'; ctx.lineWidth = 2; ctx.beginPath();
    let first = true;
    for (let i = 0; i < drawX.length; i++) {
      if (drawY[i] === null || !isFinite(drawY[i])) { first = true; continue; }
      const px = toX(drawX[i]), py = toY(drawY[i]);
      if (first) { ctx.moveTo(px, py); first = false; } else { ctx.lineTo(px, py); }
    }
    ctx.stroke();

    // 切线 (切线增量 dy)
    const y0 = safeEvaluate(expression, { x: x0 });
    const slope = numericalDerivative(expression, x0);
    const x1 = x0 + dx, y1 = y0 + slope * dx;
    const px0 = toX(x0), py0 = toY(y0), px1 = toX(x1), py1 = toY(y1);

    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(toX(xRange[0]), toY(y0 + slope * (xRange[0] - x0)));
    ctx.lineTo(toX(xRange[1]), toY(y0 + slope * (xRange[1] - x0)));
    ctx.stroke(); ctx.setLineDash([]);

    // 实际 Δy (红色)
    const y1Real = safeEvaluate(expression, { x: x1 });
    const py1Real = toY(y1Real);
    ctx.strokeStyle = '#e53935'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px1, py0); ctx.lineTo(px1, py1Real); ctx.stroke();
    ctx.fillStyle = '#e53935'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Δy=${(y1Real-y0).toFixed(4)}`, px1 + 6, (py0 + py1Real) / 2);

    // 切线增量 dy (绿色)
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px1, py0 - 15); ctx.lineTo(px1, py1 + 15); ctx.stroke();
    ctx.fillStyle = '#2e7d32'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`dy=${(y1-y0).toFixed(4)}`, px1 - 60, (py0 + py1 + 15) / 2);

    // dx 水平线
    ctx.strokeStyle = '#ff9800'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px0, py0 - 20); ctx.lineTo(px1, py0 - 20); ctx.stroke();
    ctx.fillStyle = '#ff9800'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`dx=${dx}`, (px0 + px1) / 2 - 15, py0 - 26);

    // 标记 x0
    ctx.fillStyle = '#1976d2'; ctx.beginPath(); ctx.arc(px0, py0, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.font = '11px sans-serif';
    ctx.fillText(`(${x0}, ${y0.toFixed(3)})`, px0 + 8, py0 - 8);

    info.innerHTML = `<strong>dy</strong>=${(y1-y0).toFixed(6)} <span style="color:#e53935"><strong>Δy</strong>=${(y1Real-y0).toFixed(6)}</span> | 误差: ${Math.abs(y1-y1Real).toFixed(6)}`;
  }

  setTimeout(() => { info.textContent.includes('dy') || body.appendChild(info); draw(); }, 100);
  return container;
}
