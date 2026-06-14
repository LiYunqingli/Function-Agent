/**
 * 工具调用卡片组件 —— 展示工具调用的名称、参数和渲染结果
 * 支持全屏查看（ESC/关闭按钮退出，带平滑缩放动画）
 */
import { TOOL_COMPONENT_MAP, TOOL_ICONS } from '../config.js';
import { formatToolName } from '../utils/formatters.js';
import { settingsStore } from '../stores/settings-store.js';
import { generateFavoriteTitle } from '../services/ai-client.js';

/** 全屏单例 —— 同一时间只能有一张卡片全屏 */
let _activeFullscreen = null;

/**
 * 从工具调用参数中提取可读内容文本（用于 AI 命名）
 * @param {Object} toolCall - 工具调用对象 { function: { name, arguments } }
 * @returns {string} 描述文本
 */
function extractToolContent(toolCall) {
  const toolName = formatToolName(toolCall.function.name);
  const hint = '提示：请注重函数所表达的图案。';
  try {
    const args = JSON.parse(toolCall.function.arguments);
    const exprFields = [
      'function', 'expression', 'theorem', 'question', 'functionExpression',
      'problem', 'statement', 'formula', 'equation',
    ];
    for (const field of exprFields) {
      if (args[field] != null) {
        return `${hint}\n工具：${toolName}\n表达式：${args[field]}`;
      }
    }
    // 多内容字段：取其摘要
    if (args.errors) return `${hint}\n工具：${toolName}\n易错点数量：${args.errors.length}`;
    if (args.proofSteps) return `${hint}\n工具：${toolName}\n证明步骤数：${args.proofSteps.length}`;
    if (args.cards) return `${hint}\n工具：${toolName}\n卡片数量：${args.cards.length}`;
    if (args.sections) return `${hint}\n工具：${toolName}\n分类数量：${args.sections.length}`;
    if (args.concepts) return `${hint}\n工具：${toolName}\n概念数量：${args.concepts.length}`;
    // 兜底：取第一个有意义的参数值
    for (const key of Object.keys(args)) {
      if (typeof args[key] === 'string' && args[key].length > 0 && args[key].length < 200) {
        return `${hint}\n工具：${toolName}\n参数：${args[key]}`;
      }
    }
    return `${hint}\n工具：${toolName}\n参数：${JSON.stringify(args).slice(0, 200)}`;
  } catch {
    return `${hint}\n工具：${toolName}\n参数：${toolCall.function.arguments}`;
  }
}

/**
 * 创建工具调用卡片 DOM
 * @param {Object} toolCall - { id, type: 'function', function: { name, arguments } }
 * @param {Object|null} toolResult - { status, componentType, props, error? }
 * @param {Object} toolStore - ToolStore 单例
 * @param {Object} chatStore - ChatStore 单例
 * @returns {HTMLElement}
 */
export function createToolCallCard(toolCall, toolResult, toolStore, chatStore) {
  const card = document.createElement('div');
  card.className = 'tool-call-card fade-in';
  card.dataset.toolCallId = toolCall.id;

  const toolName = toolCall.function.name;
  const componentName = TOOL_COMPONENT_MAP[toolName] || 'unknown';
  const icon = TOOL_ICONS[toolName] || '🔧';

  // 判断工具卡片是否有自定义标题（从 toolResult.props 提取）
  const hasCustomTitle = !!(toolResult && toolResult.props && toolResult.props.title);
  card.dataset.hasCustomTitle = hasCustomTitle ? '1' : '0';

  // Header
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

  // 收藏按钮
  const favBtn = document.createElement('button');
  favBtn.className = 'fav-btn';
  favBtn.title = '收藏此工具调用结果';
  favBtn.textContent = '☆';
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!chatStore) return;

    if (chatStore.isFavorite(toolCall.id)) {
      chatStore.removeFavoriteByMessageId(toolCall.id);
      favBtn.classList.remove('active');
      favBtn.textContent = '☆';
    } else {
      const session = chatStore.getActiveSession();
      if (!session) return;

      // 从工具结果中提取标题信息
      let title = `工具: ${formatToolName(toolName)}`;
      let preview = `工具调用结果 - ${formatToolName(toolName)}`;

      // 尝试从 toolResult props 中提取有意义的标题
      if (toolResult && toolResult.props) {
        const p = toolResult.props;
        if (p.title) { title = String(p.title); }
        if (p.question) preview = String(p.question);
        else if (p.function) preview = `f(x) = ${p.function}`;
        else if (p.sections) preview = `${(p.sections || []).length} 个公式分类`;
        else if (p.cards) preview = `${(p.cards || []).length} 张卡片`;
        else if (p.errors) preview = `${(p.errors || []).length} 个易错点`;
        else if (p.proofSteps) preview = `${(p.proofSteps || []).length} 步证明`;
        else if (p.concepts) preview = `${(p.concepts || []).length} 个概念节点`;
        else if (p.theorem) preview = String(p.theorem);
        else if (p.functionExpression) preview = `f(x) = ${p.functionExpression}`;
      }

      const settings = settingsStore.getState();
      const namingMode = settings.favoriteNamingMode || 'first-sentence';

      // 无自定义标题 且 AI 命名开启：将表达式交给 AI 命名
      if (!hasCustomTitle && namingMode === 'ai') {
        chatStore.addFavorite(session.id, toolCall.id, 'toolCall', 'AI 生成中...', preview);
        favBtn.classList.add('active');
        favBtn.textContent = '★';

        const content = extractToolContent(toolCall);
        generateFavoriteTitle(content, settings).then((aiTitle) => {
          if (aiTitle) {
            const fav = chatStore.getFavoriteByMessageId(toolCall.id);
            if (fav) chatStore.updateFavoriteTitle(fav.id, aiTitle);
          }
        }).catch(() => {
          // AI 失败回退到工具名
          const fav = chatStore.getFavoriteByMessageId(toolCall.id);
          if (fav) chatStore.updateFavoriteTitle(fav.id, title);
        });
      } else {
        chatStore.addFavorite(session.id, toolCall.id, 'toolCall', title, preview);
        favBtn.classList.add('active');
        favBtn.textContent = '★';
      }
    }
  });

  // 初始化收藏状态
  if (chatStore && chatStore.isFavorite(toolCall.id)) {
    favBtn.classList.add('active');
    favBtn.textContent = '★';
  }

  // 全屏按钮（仅成功结果时显示）
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.className = 'tool-call-fullscreen-btn';
  fullscreenBtn.innerHTML = '⛶';
  fullscreenBtn.title = '全屏查看';
  fullscreenBtn.style.display = 'none'; // 默认隐藏，成功时显示

  header.appendChild(iconSpan);
  header.appendChild(nameSpan);
  header.appendChild(statusBadge);
  header.appendChild(favBtn);
  header.appendChild(fullscreenBtn);
  card.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'tool-call-body';

  // 参数折叠区
  const paramsSection = document.createElement('details');
  paramsSection.style.cssText = 'margin-bottom:12px;';
  const paramsSummary = document.createElement('summary');
  paramsSummary.style.cssText = 'cursor:pointer;color:var(--color-text-secondary);font-size:var(--font-size-sm);';
  paramsSummary.textContent = '查看参数';

  const paramsContent = document.createElement('pre');
  paramsContent.style.cssText = 'font-size:var(--font-size-xs);background:var(--color-bg-hover);color:var(--color-text-primary);padding:8px;border-radius:4px;overflow-x:auto;margin-top:4px;';
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

  // 渲染结果
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
    // 显示全屏按钮并绑定事件
    fullscreenBtn.style.display = '';
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 不触发 header 折叠
      toggleFullscreen(card);
    });
    // 双击卡片进入全屏
    card.addEventListener('dblclick', (e) => {
      // 不拦截 details/参数区的双击
      if (e.target.closest('details')) return;
      toggleFullscreen(card);
    });
    renderMathResult(body, componentName, toolResult.props, toolCall.id);
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

  // 焦点系统：防止图表滚动劫持，默认滚动穿透到页面
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
function renderMathResult(container, componentName, props, toolCallId) {
  // 动态导入数学组件渲染器
  import('./math/index.js').then(({ renderMathComponent }) => {
    // 将 toolCallId 注入 props，供需要持久化的组件使用
    const enrichedProps = toolCallId ? { ...props, _toolCallId: toolCallId } : props;
    const rendered = renderMathComponent(componentName, enrichedProps);
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

// 全屏功能

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

  // FLIP: First
  const firstRect = card.getBoundingClientRect();

  // 保存原始 DOM 位置，插入占位元素防止布局塌陷
  const originalParent = card.parentElement;
  const placeholder = document.createElement('div');
  placeholder.className = 'fullscreen-placeholder';
  placeholder.style.cssText = `height:${firstRect.height}px;width:${firstRect.width}px;transition:height 0.38s cubic-bezier(0.22,0.61,0.36,1);`;
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

  // FLIP: Invert
  document.body.appendChild(card);
  card.style.position = 'fixed';
  card.style.top = firstRect.top + 'px';
  card.style.left = firstRect.left + 'px';
  card.style.width = firstRect.width + 'px';
  card.style.height = firstRect.height + 'px';
  card.style.margin = '0';
  card.style.zIndex = '9999';
  card.style.transition = 'none'; // 先禁用过渡

  // 创建 backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'fullscreen-backdrop';
  backdrop.addEventListener('click', () => exitFullscreen(card));
  document.body.appendChild(backdrop);

  // 创建关闭按钮
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

  // ESC 处理
  card._fsEscHandler = (e) => {
    if (e.key === 'Escape') {
      exitFullscreen(card);
    }
  };
  document.addEventListener('keydown', card._fsEscHandler);

  // 禁止 body 滚动
  document.body.style.overflow = 'hidden';

  // FLIP: Play
  card.offsetHeight; // force reflow
  card.style.transition =
    'top 0.38s cubic-bezier(0.22,0.61,0.36,1),' +
    'left 0.38s cubic-bezier(0.22,0.61,0.36,1),' +
    'width 0.38s cubic-bezier(0.22,0.61,0.36,1),' +
    'height 0.38s cubic-bezier(0.22,0.61,0.36,1)';
  card.classList.add('fullscreen');

  requestAnimationFrame(() => {
    card.style.top = '0';
    card.style.left = '0';
    card.style.width = '100vw';
    card.style.height = '100vh';
    backdrop.classList.add('active');
  });

  // Plotly 自适应，等过渡完成后 resize
  setTimeout(() => resizePlotlyInElement(card), 420);
}

/**
 * 退出全屏 —— 原路缩小回原位
 * @param {HTMLElement} card
 */
function exitFullscreen(card) {
  if (!card.classList.contains('fullscreen')) return;

  const { _fsBackdrop: backdrop, _fsCloseBtn: closeBtn, _fsRestore: restore } = card;
  const placeholder = restore?.placeholder;

  // 判断原始位置是否仍然有效
  const canRestore = restore?.parent?.isConnected &&
    placeholder?.isConnected;

  // 捕获目标矩形（在任何 DOM 变更之前）
  let targetRect;
  if (canRestore) {
    targetRect = placeholder.getBoundingClientRect();
  } else {
    // 退化：缩小到视口中心消失
    targetRect = {
      top: window.innerHeight * 0.4,
      left: window.innerWidth * 0.35,
      width: window.innerWidth * 0.3,
      height: 0,
    };
  }

  // 立即清理 UI 层
  if (backdrop?.isConnected) backdrop.remove();
  if (closeBtn?.isConnected) closeBtn.remove();
  document.body.style.overflow = '';

  if (card._fsEscHandler) {
    document.removeEventListener('keydown', card._fsEscHandler);
  }

  // 仅动画化 top/left/width/height，避免 border-radius/box-shadow 等属性被意外动画化
  card.style.transition =
    'top 0.35s cubic-bezier(0.22,0.61,0.36,1),' +
    'left 0.35s cubic-bezier(0.22,0.61,0.36,1),' +
    'width 0.35s cubic-bezier(0.22,0.61,0.36,1),' +
    'height 0.35s cubic-bezier(0.22,0.61,0.36,1)';
  card.style.top = targetRect.top + 'px';
  card.style.left = targetRect.left + 'px';
  card.style.width = Math.max(targetRect.width, 0) + 'px';
  card.style.height = Math.max(targetRect.height, 0) + 'px';

  // 动画结束后原子化恢复 DOM
  let finished = false;
  const snapBack = () => {
    if (finished) return;
    finished = true;
    card.removeEventListener('transitionend', onTransitionEnd);

    if (canRestore && restore.parent.isConnected) {
      // 1) 禁用所有过渡和动画
      card.style.transition = 'none';
      card.style.animationPlayState = 'paused';

      // 2) 卡片仍为 position:fixed，插入回原始父容器（视觉无变化）
      restore.parent.insertBefore(card, placeholder);
      if (placeholder.isConnected) placeholder.remove();

      // 3) 移除 fullscreen 类 + 恢复原始内联样式（一次性批量变更）
      card.classList.remove('fullscreen');
      restoreCardStyleKeepTransition(card, restore);

      // 4) 强制 reflow：确保以上所有变更在同一帧生效
      void card.offsetHeight;

      // 5) 安全恢复 CSS transition（用于 hover/focus 效果）
      card.style.transition = '';
      card.style.animationPlayState = '';
    } else {
      // 退化路径
      card.classList.remove('fullscreen');
      card.style.transition = 'opacity 0.15s ease';
      card.style.opacity = '0';
      setTimeout(() => { if (card.isConnected) card.remove(); }, 160);
    }

    cleanupFullscreen(card, null);
    resizePlotlyInElement(card);
    _activeFullscreen = null;
  };

  const onTransitionEnd = (e) => {
    if (e.target !== card) return;
    if (!['top', 'left', 'width', 'height'].includes(e.propertyName)) return;
    snapBack();
  };
  card.addEventListener('transitionend', onTransitionEnd);

  // 兜底：420ms 后强制清理
  setTimeout(snapBack, 420);
}

/**
 * 恢复卡片内联样式（不清除 transition，由调用方控制）
 */
function restoreCardStyleKeepTransition(card, restore) {
  if (!restore) return;
  card.style.position = restore.position || '';
  card.style.top = restore.top || '';
  card.style.left = restore.left || '';
  card.style.width = restore.width || '';
  card.style.height = restore.height || '';
  card.style.margin = restore.margin || '';
  card.style.zIndex = restore.zIndex || '';
  // 不清除 transition，由 snapBack 在 reflow 后手动清除
  card.style.transform = '';
  card.style.opacity = '';
}

/**
 * 恢复卡片内联样式（含 transition 清除）
 */
function restoreCardStyle(card, restore) {
  restoreCardStyleKeepTransition(card, restore);
  card.style.transition = '';
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
