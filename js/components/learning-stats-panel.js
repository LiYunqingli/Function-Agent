/**
 * 学习统计面板 UI 组件（Agent 调用统计）
 */
/** @type {Object} learningStatsStore 引用 */
let _store = null;

/**
 * 初始化学习统计面板
 * @param {Object} learningStatsStore
 */
export function initLearningStatsPanel(learningStatsStore) {
  _store = learningStatsStore;

  // 监听侧边栏"📊"按钮
  const statsBtn = document.getElementById('stats-btn');
  const panel = document.getElementById('stats-panel');
  const closeBtn = document.getElementById('stats-close');
  const contentEl = document.getElementById('stats-content');

  if (!statsBtn || !panel || !closeBtn || !contentEl) {
    console.warn('[LearningStatsPanel] 缺少必要的 DOM 元素');
    return;
  }

  // 打开面板
  statsBtn.addEventListener('click', () => {
    renderStatsPanel(contentEl);
    panel.style.display = 'flex';
  });

  // 关闭面板
  closeBtn.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  // 点击遮罩关闭
  panel.addEventListener('click', (e) => {
    if (e.target === panel) {
      panel.style.display = 'none';
    }
  });

  // 监听统计数据变化 → 如果面板打开则刷新
  _store.subscribe('stats', () => {
    if (panel.style.display === 'flex') {
      renderStatsPanel(contentEl);
    }
  });
}

/**
 * 渲染统计面板内容
 * @param {HTMLElement} container
 */
function renderStatsPanel(container) {
  const stats = _store.getStats();
  const totalIn = stats.totalInputTokens || 0;
  const totalOut = stats.totalOutputTokens || 0;
  const apiCalls = stats.sessionTokenCount || 0;
  const toolDist = _store.getToolUsageDistribution();

  let html = '';

  // ── Token 统计卡片 ──
  html += '<div class="stats-grid">';
  html += buildStatCard('总输入 Token', formatTokens(totalIn), 'var(--color-accent)', totalIn.toLocaleString());
  html += buildStatCard('总输出 Token', formatTokens(totalOut), 'var(--color-success)', totalOut.toLocaleString());
  html += buildStatCard('API 调用次数', String(apiCalls), 'var(--color-warning)');
  html += buildStatCard('工具调用次数', String(stats.totalQuestions || 0), 'var(--color-text-primary)');
  html += '</div>';

  // ── Token 比例环 ──
  if (totalIn > 0 || totalOut > 0) {
    const inPct = totalIn + totalOut > 0 ? Math.round(totalIn / (totalIn + totalOut) * 100) : 0;
    html += '<div class="stats-section">';
    html += '<div class="stats-section-title">📊 Token 比例</div>';
    html += '<div class="stats-token-ratio">';
    html += `  <div class="stats-ratio-bar">`;
    html += `    <div class="stats-ratio-fill in" style="width:${inPct}%"></div>`;
    html += `    <div class="stats-ratio-fill out" style="width:${100 - inPct}%"></div>`;
    html += `  </div>`;
    html += `  <div class="stats-ratio-legend">`;
    html += `    <span class="stats-legend-dot in"></span>输入 ${inPct}%`;
    html += `    <span class="stats-legend-dot out"></span>输出 ${100 - inPct}%`;
    html += `  </div>`;
    html += '</div>';
    html += '</div>';
  }

  // ── 工具调用分布 ──
  if (toolDist.length > 0) {
    html += '<div class="stats-section">';
    html += '<div class="stats-section-title">🛠️ 工具调用分布</div>';
    html += '<div class="stats-bar-chart">';
    const topTools = toolDist.slice(0, 12);
    const maxCount = topTools[0] ? topTools[0].count : 1;
    for (const item of topTools) {
      const pct = Math.round((item.count / maxCount) * 100);
      html += buildBarRow(formatToolName(item.tool), item.count, pct);
    }
    html += '</div>';
    html += '</div>';
  }

  // ── 知识分支分布 ──
  const topicDist = _store.getTopicDistribution();
  if (topicDist.length > 0) {
    html += '<div class="stats-section">';
    html += '<div class="stats-section-title">📚 知识分支分布</div>';
    html += '<div class="stats-bar-chart">';
    const maxTopic = topicDist[0].count;
    for (const item of topicDist) {
      const pct = Math.round((item.count / maxTopic) * 100);
      html += buildBarRow(item.topic, item.count, pct);
    }
    html += '</div>';
    html += '</div>';
  }

  // ── 无数据提示 ──
  if (apiCalls === 0 && toolDist.length === 0) {
    html = '<div class="stats-empty">暂无数据，开始对话后将自动统计 Agent 调用信息</div>';
  }

  // ── 重置按钮 ──
  html += '<div class="stats-reset-section">';
  html += '<button class="stats-reset-btn" id="stats-reset-btn">🔄 重置统计数据</button>';
  html += '</div>';

  container.innerHTML = html;

  // 绑定重置按钮
  const resetBtn = container.querySelector('#stats-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => showResetConfirm(container));
  }
}

/**
 * 构建统计卡片
 */
function buildStatCard(label, value, color, subtext) {
  const sub = subtext && subtext !== value
    ? `<div class="stats-sub">${subtext} token</div>`
    : '';
  return `<div class="stats-card">
    <div class="stats-value" style="color:${color}">${value}</div>
    ${sub}
    <div class="stats-label">${label}</div>
  </div>`;
}

/**
 * 构建柱状图行
 */
function buildBarRow(label, count, percent) {
  return `<div class="stats-bar-row">
    <div class="stats-bar-label" title="${label}">${label}</div>
    <div class="stats-bar-track">
      <div class="stats-bar-fill" style="width:${percent}%">
        <span class="stats-bar-count">${count}</span>
      </div>
    </div>
  </div>`;
}

/**
 * 格式化 token 数（K / M）
 */
function formatTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

/**
 * 工具名格式化
 */
function formatToolName(name) {
  const names = {
    plot_function: '函数图像',
    animate_limit: '极限动画',
    show_differential: '微分可视化',
    plot_integral_area: '积分面积',
    animate_taylor_series: '泰勒级数',
    plot_gradient_field: '梯度场',
    plot_surface_3d: '3D曲面',
    animate_solid_of_revolution: '旋转体',
    show_step_card: '分步解题',
    show_knowledge_tip: '知识点',
    control_parameter_slider: '参数滑块',
    plot_polar_curve: '极坐标曲线',
    plot_parametric_curve: '参数曲线',
    animate_series_convergence: '级数收敛',
    plot_fourier_series: '傅里叶级数',
    plot_matrix_transform: '矩阵变换',
    plot_eigenvectors: '特征向量',
    plot_distribution: '分布图',
    animate_clt: '中心极限定理',
    plot_multivariable_integral: '多重积分',
    show_comparison_table: '对比表',
    interactive_quiz: '互动测验',
    render_latex: '公式渲染',
    plot_sequence: '数列',
    show_formula_handbook: '公式手册',
    show_error_analyzer: '易错点分析',
    show_flashcards: '记忆卡片',
    show_interactive_proof: '交互式证明',
    show_concept_map: '知识概念图',
  };
  return names[name] || name;
}

/**
 * 显示重置确认框
 */
function showResetConfirm(container) {
  const overlay = document.createElement('div');
  overlay.className = 'stats-confirm-overlay';
  overlay.innerHTML = `
    <div class="stats-confirm-box">
      <p>确定要重置所有统计数据吗？此操作不可撤销。</p>
      <div class="stats-confirm-actions">
        <button class="btn stats-confirm-cancel">取消</button>
        <button class="btn stats-confirm-danger">确认重置</button>
      </div>
    </div>
  `;

  const dialogEl = container.closest('.dialog-overlay');
  dialogEl.style.position = 'relative';
  dialogEl.appendChild(overlay);

  overlay.querySelector('.stats-confirm-cancel').addEventListener('click', () => {
    overlay.remove();
  });

  overlay.querySelector('.stats-confirm-danger').addEventListener('click', () => {
    _store.resetStats();
    overlay.remove();
    renderStatsPanel(container);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
