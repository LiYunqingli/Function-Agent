/**
 * 特征值与特征向量可视化组件（Canvas 2D + 信息面板）
 * @param {Object} props - { matrix, eigenvalues, trace, det }
 * @returns {HTMLElement}
 */
export function renderEigenvectors(props) {
  const { matrix = [[1, 0], [0, 1]], eigenvalues = [1, 1], trace, det } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = `📐 特征值与特征向量`;
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  // 信息面板
  const info = document.createElement('div');
  info.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;font-size:13px;flex-shrink:0;';

  const createInfoCard = (label, value) => {
    const card = document.createElement('div');
    card.style.cssText = 'padding:8px 12px;background:var(--color-background-secondary);border-radius:8px;border:1px solid var(--color-border-tertiary);';
    card.innerHTML = `<span style="color:var(--color-text-secondary);">${label}</span><br><strong>${value}</strong>`;
    return card;
  };

  info.appendChild(createInfoCard('trace(A)', trace !== undefined ? trace.toFixed(4) : (matrix[0][0] + matrix[1][1]).toFixed(4)));
  info.appendChild(createInfoCard('det(A)', det !== undefined ? det.toFixed(4) : (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]).toFixed(4)));

  const ev0 = eigenvalues[0];
  const ev1 = eigenvalues[1];
  if (typeof ev0 === 'number') {
    info.appendChild(createInfoCard('λ₁', ev0.toFixed(4)));
    info.appendChild(createInfoCard('λ₂', ev1.toFixed(4)));
  } else {
    info.appendChild(createInfoCard('λ₁', `${ev0.re.toFixed(2)} + ${ev0.im.toFixed(2)}i`));
    info.appendChild(createInfoCard('λ₂', `${ev1.re.toFixed(2)} ${ev1.im >= 0 ? '-' : '+'} ${Math.abs(ev1.im).toFixed(2)}i`));
  }

  body.appendChild(info);

  // 用 canvas-container 包裹（支持 fullscreen 撑满）
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';
  canvasContainer.style.cssText = 'flex:1;min-height:0;';

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:100%;border:1px solid var(--color-border-tertiary);border-radius:8px;';
  canvasContainer.appendChild(canvas);
  body.appendChild(canvasContainer);
  container.appendChild(body);

  requestAnimationFrame(() => {
    const ctx = canvas.getContext('2d');

    // 绘制逻辑（支持 resize 后重绘）
    function drawEigenvectors() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width * (window.devicePixelRatio || 1);
        canvas.height = rect.height * (window.devicePixelRatio || 1);
      } else {
        canvas.width = 800;
        canvas.height = 800;
      }

      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2;
      const scale = Math.min(w, h) / 8;

      ctx.clearRect(0, 0, w, h);

      // 坐标轴
      ctx.strokeStyle = '#777';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
      ctx.stroke();

      // 网格
      ctx.strokeStyle = 'rgba(128,128,128,0.15)';
      ctx.lineWidth = 0.5;
      for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        ctx.beginPath();
        ctx.moveTo(cx + i * scale, 0); ctx.lineTo(cx + i * scale, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, cy + i * scale); ctx.lineTo(w, cy + i * scale);
        ctx.stroke();
      }

      // 向量场
      const a = matrix[0][0], b = matrix[0][1], c = matrix[1][0], d = matrix[1][1];
      ctx.lineWidth = 1;
      for (let gx = -3; gx <= 3; gx++) {
        for (let gy = -3; gy <= 3; gy++) {
          const vx = a * gx + b * gy;
          const vy = c * gx + d * gy;
          const len = Math.sqrt(vx * vx + vy * vy);
          if (len < 0.01) continue;

          const arrowLen = Math.min(scale * 0.7, len * scale * 0.3);
          const nx = vx / len, ny = vy / len;

          ctx.strokeStyle = 'rgba(25,118,210,0.4)';
          ctx.beginPath();
          ctx.moveTo(cx + gx * scale, cy - gy * scale);
          ctx.lineTo(cx + gx * scale + nx * arrowLen, cy - gy * scale - ny * arrowLen);
          ctx.stroke();
        }
      }

      // 特征向量
      if (typeof eigenvalues[0] === 'number') {
        const colors = ['#e53935', '#43a047'];
        eigenvalues.forEach((lambda, idx) => {
          const m00 = a - lambda, m01 = b, m10 = c, m11 = d - lambda;
          let v1, v2;
          if (Math.abs(m00) > 1e-10 || Math.abs(m01) > 1e-10) {
            v1 = -m01; v2 = m00;
          } else {
            v1 = -m11; v2 = m10;
          }
          const vlen = Math.sqrt(v1 * v1 + v2 * v2);
          if (vlen < 1e-10) return;
          v1 /= vlen; v2 /= vlen;

          // 画特征向量方向线
          ctx.strokeStyle = colors[idx];
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(cx - v1 * 3 * scale, cy + v2 * 3 * scale);
          ctx.lineTo(cx + v1 * 3 * scale, cy - v2 * 3 * scale);
          ctx.stroke();
          ctx.setLineDash([]);

          // 画箭头
          ctx.strokeStyle = colors[idx];
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + v1 * scale, cy - v2 * scale);
          ctx.stroke();

          // Arrowhead
          const ax = cx + v1 * scale, ay = cy - v2 * scale;
          const angle = Math.atan2(-(ay - cy), ax - cx);
          ctx.fillStyle = colors[idx];
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - 8 * Math.cos(angle - 0.4), ay + 8 * Math.sin(angle - 0.4));
          ctx.lineTo(ax - 8 * Math.cos(angle + 0.4), ay + 8 * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fill();

          // Label
          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = colors[idx];
          ctx.fillText(`v${idx + 1} (λ=${lambda.toFixed(2)})`, ax + 6, ay - 6);
        });
      }
    }

    drawEigenvectors();

    // 全屏切换时重绘以适应新尺寸
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { drawEigenvectors(); });
      ro.observe(canvasContainer);
    }
  });

  return container;
}
