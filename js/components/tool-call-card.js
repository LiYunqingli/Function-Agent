/**
 * 工具调用卡片组件 —— 展示工具调用的名称、参数和渲染结果
 * ★ 全屏支持：卡片可放大至全屏查看，ESC / 关闭按钮退出，附带平滑缩放动画
 */
import { TOOL_COMPONENT_MAP, TOOL_ICONS } from '../config.js';
import { formatToolName } from '../utils/formatters.js';

/** 全屏单例 —— 同一时间只能有一张卡片全屏 */
let _activeFullscreen = null;

/**
 * 创建工具调用卡片 DOM
 * @param {Object} toolCall - { id, type: 'function', function: { name, arguments } }
 * @param {Object|null} toolResult - { status, componentType, props, error? }
 * @param {Object} toolStore - ToolStore 单例
 * @returns {HTMLElement}
 */
export function createToolCallCard(toolCall, toolResult, toolStore) {
  const card = document.createElement('div');
  card.className = 'tool-call-card fade-in';
  card.dataset.toolCallId = toolCall.id;

  const toolName = toolCall.function.name;
  const componentName = TOOL_COMPONENT_MAP[toolName] || 'unknown';
  const icon = TOOL_ICONS[toolName] || '🔧';

  // ===== Header =====
  const header = document.createElement('div');
  header.className = 'tool-call-header';

  const iconSpan = document.createElement('span');
  iconSpan.className = 'tool-icon';
  iconSpan.textContent = icon;

  const nameSpan = document.createElement('span');
  nameSpan.textContent = formatToolName(toolName);

  // 状态标记
  const statusBadge = document.createElement('span');
  statusBadge.className = 'tool-call-status';

  // ★ 全屏按钮（仅成功结果时显示）
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.className = 'tool-call-fullscreen-btn';
  fullscreenBtn.innerHTML = '⛶';
  fullscreenBtn.title = '全屏查看';
  fullscreenBtn.style.display = 'none'; // 默认隐藏，成功时显示

  header.appendChild(iconSpan);
  header.appendChild(nameSpan);
  header.appendChild(statusBadge);
  header.appendChild(fullscreenBtn);
  card.appendChild(header);

  // ===== Body =====
  const body = document.createElement('div');
  body.className = 'tool-call-body';

  // ===== 参数折叠区 =====
  const paramsSection = document.createElement('details');
  paramsSection.style.cssText = 'margin-bottom:12px;';
  const paramsSummary = document.createElement('summary');
  paramsSummary.style.cssText = 'cursor:pointer;color:var(--color-text-secondary);font-size:var(--font-size-sm);';
  paramsSummary.textContent = '查看参数';

  const paramsContent = document.createElement('pre');
  paramsContent.style.cssText = 'font-size:var(--font-size-xs);background:var(--color-bg-hover);padding:8px;border-radius:4px;overflow-x:auto;margin-top:4px;';
  try {
    const args = JSON.parse(toolCall.function.arguments);
    paramsContent.textContent = JSON.stringify(args, null, 2);
  } catch {
    paramsContent.textContent = toolCall.function.arguments;
  }

  paramsSection.appendChild(paramsSummary);
  paramsSection.appendChild(paramsContent);
  body.appendChild(paramsSection);

  card.appendChild(body);

  // ===== 渲染结果 =====
  if (!toolResult) {
    // 执行中状态
    const execState = toolStore?.getState().executingTools[toolCall.id];
    if (execState) {
      body.appendChild(createExecStatusElement(execState, statusBadge));
    } else {
      statusBadge.classList.add('pending');
      statusBadge.textContent = '等待中';
      body.appendChild(createLoadingSkeleton());
    }
  } else if (toolResult.status === 'success') {
    statusBadge.classList.add('success');
    statusBadge.textContent = '已完成';
    // ★ 显示全屏按钮并绑定事件
    fullscreenBtn.style.display = '';
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 不触发 header 折叠
      toggleFullscreen(card);
    });
    renderMathResult(body, componentName, toolResult.props);
  } else {
    statusBadge.classList.add('error');
    statusBadge.textContent = '失败';
    const errorEl = document.createElement('div');
    errorEl.style.cssText = `padding:12px;color:var(--color-error);background:var(--color-error-bg);border-radius:var(--radius-sm);font-size:var(--font-size-sm);`;
    errorEl.textContent = `❌ ${toolResult.error || '组件执行失败'}`;
    body.appendChild(errorEl);
  }

  // 可折叠 body
  let expanded = true;
  header.addEventListener('click', (e) => {
    // 不阻止 details 的点击
    if (e.target.closest('details')) return;
    expanded = !expanded;
    body.style.display = expanded ? 'block' : 'none';
    header.style.opacity = expanded ? '1' : '0.7';
  });

  // ═══════════════════════════════════════════════════════
  // ★ 焦点系统：防止图表滚动劫持
  //   默认：滚动穿透到页面。点击卡片 → 聚焦（边框高亮 + 图表交互激活）
  //   鼠标移出 → 失焦（恢复穿透）
  // ═══════════════════════════════════════════════════════
  let isFocused = false;

  // 点击卡片 body → 激活聚焦
  body.addEventListener('click', (e) => {
    // 不拦截 details/summary/button 上的点击
    if (e.target.closest('details') || e.target.closest('button')) return;
    isFocused = true;
    card.classList.add('focused');
  });

  // 鼠标移出卡片 → 失焦
  card.addEventListener('mouseleave', () => {
    if (isFocused) {
      isFocused = false;
      card.classList.remove('focused');
    }
  });

  // ★ 核心：capture 阶段拦截 wheel，未聚焦时代理到页面滚动
  card.addEventListener('wheel', (e) => {
    // 全屏模式不放行（全屏时始终可交互）
    if (card.classList.contains('fullscreen')) return;
    if (isFocused) return; // 聚焦态：放行给 Plotly 缩放

    // 非聚焦态：拦截并代理到聊天消息列表滚动
    e.preventDefault();
    e.stopPropagation();

    // 定位滚动容器（优先 #message-list）
    const scroller = document.getElementById('message-list') || document.scrollingElement;
    if (!scroller) return;

    // deltaY 兼容：deltaMode 0=pixels, 1=lines, 2=pages
    let px = e.deltaY;
    if (e.deltaMode === 1) px *= 18;   // 1 line ≈ 18px
    if (e.deltaMode === 2) px *= scroller.clientHeight * 0.85;

    scroller.scrollBy({ top: px, behavior: 'auto' });
  }, { capture: true, passive: false });

  return card;
}

/**
 * 创建执行状态显示
 */
function createExecStatusElement(execState, statusBadge) {
  const el = document.createElement('div');
  el.style.cssText = 'padding:12px 0;';

  if (execState.status === 'pending') {
    statusBadge.classList.add('pending');
    statusBadge.textContent = '排队中';
  } else if (execState.status === 'executing') {
    statusBadge.classList.add('executing');
    statusBadge.textContent = '执行中...';
    el.appendChild(createLoadingSkeleton());
  } else if (execState.status === 'success') {
    statusBadge.classList.add('success');
    statusBadge.textContent = '已完成';
  } else if (execState.status === 'error') {
    statusBadge.classList.add('error');
    statusBadge.textContent = '失败';
    el.innerHTML = `<div style="color:var(--color-error);padding:8px;">❌ ${execState.error || '未知错误'}</div>`;
  }

  // 执行耗时
  if (execState.startedAt) {
    const elapsed = ((Date.now() - execState.startedAt) / 1000).toFixed(1);
    const timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-top:4px;';
    timeEl.textContent = `耗时: ${elapsed}s`;
    el.appendChild(timeEl);
  }

  return el;
}

/**
 * 创建加载骨架屏
 */
function createLoadingSkeleton() {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="skeleton skeleton-text" style="width:90%;height:14px;margin-bottom:8px;"></div>
    <div class="skeleton skeleton-text" style="width:70%;height:14px;margin-bottom:8px;"></div>
    <div class="skeleton skeleton-text" style="width:50%;height:14px;"></div>
  `;
  return el;
}

/**
 * 渲染数学组件结果
 * @param {HTMLElement} container - 容器
 * @param {string} componentName - 组件名
 * @param {Object} props - 组件属性
 */
function renderMathResult(container, componentName, props) {
  // 动态导入数学组件渲染器
  import('./math/index.js').then(({ renderMathComponent }) => {
    const rendered = renderMathComponent(componentName, props);
    if (rendered) {
      container.appendChild(rendered);
    } else {
      const fallback = document.createElement('div');
      fallback.style.cssText = 'padding:12px;color:var(--color-text-secondary);';
      fallback.textContent = `组件 "${componentName}" 暂不可用`;
      container.appendChild(fallback);
    }
  }).catch(() => {
    const fallback = document.createElement('div');
    fallback.style.cssText = 'padding:12px;color:var(--color-text-secondary);font-style:italic;';
    fallback.textContent = '组件加载中...';
    container.appendChild(fallback);
  });
}

// ═══════════════════════════════════════════════════════════════
// ★ 全屏功能
// ═══════════════════════════════════════════════════════════════

/**
 * 切换卡片全屏状态
 * @param {HTMLElement} card - tool-call-card 元素
 */
function toggleFullscreen(card) {
  if (card.classList.contains('fullscreen')) {
    exitFullscreen(card);
  } else {
    enterFullscreen(card);
  }
}

/**
 * 进入全屏 —— FLIP 动画
 * @param {HTMLElement} card
 */
function enterFullscreen(card) {
  // 如果已有其他卡片全屏，先退出
  if (_activeFullscreen && _activeFullscreen !== card) {
    exitFullscreen(_activeFullscreen);
  }
  _activeFullscreen = card;

  // ── FLIP: First ──
  const firstRect = card.getBoundingClientRect();

  // 保存原始 DOM 位置，插入占位元素防止布局塌陷
  const originalParent = card.parentElement;
  const placeholder = document.createElement('div');
  placeholder.className = 'fullscreen-placeholder';
  placeholder.style.cssText = `height:${firstRect.height}px;transition:height 0.38s cubic-bezier(0.22,0.61,0.36,1);`;
  originalParent.insertBefore(placeholder, card);

  // 保存原始样式以便恢复
  card._fsRestore = {
    parent: originalParent,
    placeholder,
    position: card.style.position,
    top: card.style.top,
    left: card.style.left,
    width: card.style.width,
    height: card.style.height,
    margin: card.style.margin,
    zIndex: card.style.zIndex,
  };

  // ── FLIP: Invert ──
  // 将卡片移到 body 下并固定在原位
  document.body.appendChild(card);
  card.style.position = 'fixed';
  card.style.top = firstRect.top + 'px';
  card.style.left = firstRect.left + 'px';
  card.style.width = firstRect.width + 'px';
  card.style.height = firstRect.height + 'px';
  card.style.margin = '0';
  card.style.zIndex = '9999';
  card.style.transition = 'none'; // 先禁用过渡

  // ── 创建 backdrop ──
  const backdrop = document.createElement('div');
  backdrop.className = 'fullscreen-backdrop';
  backdrop.addEventListener('click', () => exitFullscreen(card));
  document.body.appendChild(backdrop);

  // ── 创建关闭按钮 ──
  const closeBtn = document.createElement('button');
  closeBtn.className = 'fullscreen-close-btn';
  closeBtn.innerHTML = '✕';
  closeBtn.title = '退出全屏 (ESC)';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exitFullscreen(card);
  });
  document.body.appendChild(closeBtn);

  card._fsBackdrop = backdrop;
  card._fsCloseBtn = closeBtn;

  // ── ESC 处理 ──
  card._fsEscHandler = (e) => {
    if (e.key === 'Escape') {
      exitFullscreen(card);
    }
  };
  document.addEventListener('keydown', card._fsEscHandler);

  // 禁止 body 滚动
  document.body.style.overflow = 'hidden';

  // ── FLIP: Play ──
  // 强制重排后启用过渡并播放到目标位置
  card.offsetHeight; // force reflow
  card.style.transition = 'all 0.38s cubic-bezier(0.22, 0.61, 0.36, 1)';
  card.classList.add('fullscreen');

  requestAnimationFrame(() => {
    card.style.top = '2.5vh';
    card.style.left = '2.5vw';
    card.style.width = '95vw';
    card.style.height = '95vh';
    backdrop.classList.add('active');
  });

  // ── Plotly 自适应 ──
  // 等过渡完成后 resize
  setTimeout(() => resizePlotlyInElement(card), 420);
}

/**
 * 退出全屏
 * @param {HTMLElement} card
 */
function exitFullscreen(card) {
  if (!card.classList.contains('fullscreen')) return;
  _activeFullscreen = null;

  const backdrop = card._fsBackdrop;
  const closeBtn = card._fsCloseBtn;
  const restore = card._fsRestore;
  const placeholder = restore?.placeholder;

  // 移除 backdrop 和关闭按钮
  if (backdrop) backdrop.classList.remove('active');
  if (closeBtn) closeBtn.remove();

  // 恢复 body 滚动
  document.body.style.overflow = '';

  // 移除 ESC 监听
  if (card._fsEscHandler) {
    document.removeEventListener('keydown', card._fsEscHandler);
  }

  // ── 判断原始位置是否仍然有效 ──
  const canRestore = restore?.parent &&
    restore.parent.isConnected &&
    placeholder &&
    placeholder.isConnected;

  if (canRestore) {
    // ★ 正常路径：动画缩小回原位
    const targetRect = placeholder.getBoundingClientRect();
    card.style.top = targetRect.top + 'px';
    card.style.left = targetRect.left + 'px';
    card.style.width = (targetRect.width || 0) + 'px';
    card.style.height = (targetRect.height || 0) + 'px';
    card.classList.remove('fullscreen');

    setTimeout(() => {
      restoreCardStyle(card, restore);
      restore.parent.insertBefore(card, placeholder);
      placeholder.remove();
      cleanupFullscreen(card, backdrop);
      resizePlotlyInElement(card);
    }, 400);
  } else {
    // ★ 退化路径：原位已丢失（消息被重建等）→ 缩小消失
    card.style.transform = 'scale(0.95)';
    card.style.opacity = '0';
    card.classList.remove('fullscreen');

    setTimeout(() => {
      card.remove();
      if (placeholder && placeholder.isConnected) placeholder.remove();
      cleanupFullscreen(card, backdrop);
    }, 400);
  }
}

/**
 * 恢复卡片内联样式
 */
function restoreCardStyle(card, restore) {
  card.style.position = restore?.position || '';
  card.style.top = restore?.top || '';
  card.style.left = restore?.left || '';
  card.style.width = restore?.width || '';
  card.style.height = restore?.height || '';
  card.style.margin = restore?.margin || '';
  card.style.zIndex = restore?.zIndex || '';
  card.style.transition = '';
  card.style.transform = '';
  card.style.opacity = '';
}

/**
 * 清理全屏引用
 */
function cleanupFullscreen(card, backdrop) {
  if (backdrop && backdrop.isConnected) backdrop.remove();
  delete card._fsRestore;
  delete card._fsBackdrop;
  delete card._fsCloseBtn;
  delete card._fsEscHandler;
}

/**
 * 在元素中查找 Plotly 图表并触发 resize
 * @param {HTMLElement} el
 */
function resizePlotlyInElement(el) {
  if (typeof window.Plotly === 'undefined') return;
  const containers = el.querySelectorAll('.plotly-container, .js-plotly-plot');
  containers.forEach((c) => {
    try { window.Plotly.Plots.resize(c); } catch (e) { /* ignore */ }
  });
}
