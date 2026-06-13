/**
 * 线性变换可视化组件（Canvas 2D）
 * 展示 2x2 矩阵对单位正方形/网格的变换效果
 * @param {Object} props - { matrix, showBasis, showGrid }
 * @returns {HTMLElement}
 */
export function renderMatrixTransform(props) {
  const { matrix = [[1, 0], [0, 1]], showBasis = true, showGrid = true } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `🔢 线性变换 A = [${matrix[0].join(', ')}; ${matrix[1].join(', ')}]`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  const info = document.createElement('div');
  info.style.cssText = 'width:100%;font-size:13px;color:var(--color-text-secondary);padding:0 0 8px;flex-shrink:0;';
  info.textContent = `det(A) = ${det.toFixed(2)}`;
  body.appendChild(info);

  // 画布区域：水平排列两个 canvas
  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'matrix-transform-canvases';
  canvasWrapper.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;justify-content:center;flex:1;min-height:0;';
  body.appendChild(canvasWrapper);

  // 原始
  const container1 = document.createElement('div');
  container1.className = 'canvas-container';
  container1.style.cssText = 'flex:1;min-width:200px;max-width:480px;display:flex;flex-direction:column;align-items:center;';
  const label1 = document.createElement('div');
  label1.style.cssText = 'font-size:13px;margin-bottom:4px;color:var(--color-text-secondary);flex-shrink:0;';
  label1.textContent = '变换前';
  container1.appendChild(label1);
  const canvas1 = document.createElement('canvas');
  canvas1.style.cssText = 'border:1px solid var(--color-border-tertiary);border-radius:8px;background:var(--color-background-secondary);width:100%;flex:1;min-height:0;';
  container1.appendChild(canvas1);

  // 变换后
  const container2 = document.createElement('div');
  container2.className = 'canvas-container';
  container2.style.cssText = 'flex:1;min-width:200px;max-width:480px;display:flex;flex-direction:column;align-items:center;';
  const label2 = document.createElement('div');
  label2.style.cssText = 'font-size:13px;margin-bottom:4px;color:var(--color-text-secondary);flex-shrink:0;';
  label2.textContent = '变换后';
  container2.appendChild(label2);
  const canvas2 = document.createElement('canvas');
  canvas2.style.cssText = 'border:1px solid var(--color-border-tertiary);border-radius:8px;background:var(--color-background-secondary);width:100%;flex:1;min-height:0;';
  container2.appendChild(canvas2);

  canvasWrapper.appendChild(container1);
  canvasWrapper.appendChild(container2);
  container.appendChild(body);

  // 箭头绘制辅助
  function drawArrow(ctx, fromX, fromY, toX, toY, color) {
    const angle = Math.atan2(-(toY - fromY), toX - fromX);
    const headLen = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - 0.4), toY + headLen * Math.sin(angle - 0.4));
    ctx.lineTo(toX - headLen * Math.cos(angle + 0.4), toY + headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  // 根据容器尺寸设置 canvas 分辨率
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    } else {
      // 降级：如果容器尚未获得尺寸（如还没插入 DOM），给一个默认值
      canvas.width = 560;
      canvas.height = 560;
    }
  }

  // 核心绘图
  function drawGrid(canvas, transform, color) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    if (w === 0 || h === 0) return;

    const cx = w / 2, cy = h / 2;
    // 自适应 scale：让单位正方形占画面的合适比例
    const scale = Math.min(w, h) / 7;

    ctx.clearRect(0, 0, w, h);

    const tf = transform || ((x, y) => [x, y]);

    // 网格线
    if (showGrid) {
      ctx.strokeStyle = 'rgba(128,128,128,0.15)';
      ctx.lineWidth = 0.5;
      for (let i = -3; i <= 3; i++) {
        // 水平线
        const hStart = tf(-3 * scale, i * scale);
        const hEnd = tf(3 * scale, i * scale);
        ctx.beginPath();
        ctx.moveTo(cx + hStart[0], cy - hStart[1]);
        ctx.lineTo(cx + hEnd[0], cy - hEnd[1]);
        ctx.stroke();
        // 竖直线
        const vStart = tf(i * scale, -3 * scale);
        const vEnd = tf(i * scale, 3 * scale);
        ctx.beginPath();
        ctx.moveTo(cx + vStart[0], cy - vStart[1]);
        ctx.lineTo(cx + vEnd[0], cy - vEnd[1]);
        ctx.stroke();
      }
    }

    // 坐标轴（始终画原始位置的轴，作为参考）
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.stroke();

    // 单位正方形
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
    ctx.fillStyle = color || 'rgba(25,118,210,0.15)';
    ctx.strokeStyle = (color || 'rgba(25,118,210,0.6)').replace(/[\d.]+\)$/, '0.6)');
    ctx.lineWidth = 2;
    ctx.beginPath();
    const t0 = tf(corners[0][0] * scale, corners[0][1] * scale);
    ctx.moveTo(cx + t0[0], cy - t0[1]);
    for (let i = 1; i < corners.length; i++) {
      const t = tf(corners[i][0] * scale, corners[i][1] * scale);
      ctx.lineTo(cx + t[0], cy - t[1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 基向量
    if (showBasis) {
      const e1 = tf(scale, 0);
      const e2 = tf(0, scale);

      // e1 (红)
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + e1[0], cy - e1[1]);
      ctx.stroke();
      drawArrow(ctx, cx, cy, cx + e1[0], cy - e1[1], '#e53935');

      // e2 (绿)
      ctx.strokeStyle = '#43a047';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + e2[0], cy - e2[1]);
      ctx.stroke();
      drawArrow(ctx, cx, cy, cx + e2[0], cy - e2[1], '#43a047');

      // Labels
      ctx.font = `${Math.max(12, scale * 0.12)}px sans-serif`;
      ctx.fillStyle = '#e53935';
      ctx.fillText('e₁', cx + e1[0] + 4, cy - e1[1] - 4);
      ctx.fillStyle = '#43a047';
      ctx.fillText('e₂', cx + e2[0] + 4, cy - e2[1] - 4);
    }
  }

  // 绘制入口
  function drawAll() {
    setupCanvas(canvas1);
    setupCanvas(canvas2);

    const transform = (x, y) => [
      matrix[0][0] * x + matrix[0][1] * y,
      matrix[1][0] * x + matrix[1][1] * y,
    ];

    drawGrid(canvas1, null, 'rgba(25,118,210,0.15)');
    drawGrid(canvas2, transform, 'rgba(156,39,176,0.15)');
  }

  requestAnimationFrame(() => {
    drawAll();

    // 监听 resize（全屏切换等），自动重绘
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { drawAll(); });
      ro.observe(container1);
      ro.observe(container2);
    }
  });

  return container;
}
