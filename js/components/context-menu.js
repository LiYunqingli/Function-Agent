/**
 * 自定义右键菜单组件
 * 替换浏览器默认右键菜单，支持文本选中收藏、消息收藏
 */
import { chatStore } from '../stores/chat-store.js';
import { settingsStore } from '../stores/settings-store.js';
import { generateFavoriteTitle } from '../services/ai-client.js';
import { formatToolName } from '../utils/formatters.js';

/** 从工具调用参数中提取可读内容文本（用于 AI 命名） */
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
    if (args.errors) return `${hint}\n工具：${toolName}\n易错点数量：${args.errors.length}`;
    if (args.proofSteps) return `${hint}\n工具：${toolName}\n证明步骤数：${args.proofSteps.length}`;
    if (args.cards) return `${hint}\n工具：${toolName}\n卡片数量：${args.cards.length}`;
    if (args.sections) return `${hint}\n工具：${toolName}\n分类数量：${args.sections.length}`;
    if (args.concepts) return `${hint}\n工具：${toolName}\n概念数量：${args.concepts.length}`;
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

/** 菜单 DOM 引用 */
let _menuEl = null;
let _overlay = null;

/** 当前右键上下文 */
let _context = null;

/**
 * 初始化右键菜单
 */
export function initContextMenu() {
  createMenuDOM();
  bindEvents();
}

/**
 * 创建菜单 DOM
 */
function createMenuDOM() {
  // 遮罩层
  _overlay = document.createElement('div');
  _overlay.id = 'context-menu-overlay';
  _overlay.style.display = 'none';

  // 菜单本体
  _menuEl = document.createElement('div');
  _menuEl.id = 'context-menu';
  _menuEl.style.display = 'none';
  _menuEl.innerHTML = `
    <div class="context-menu-item" data-action="favorite-selection">
      <span class="context-menu-icon">☆</span>
      <span class="context-menu-label">收藏选中内容</span>
    </div>
    <div class="context-menu-item" data-action="favorite-message">
      <span class="context-menu-icon">📌</span>
      <span class="context-menu-label">收藏此消息</span>
    </div>
    <div class="context-menu-divider" data-section="fav"></div>
    <div class="context-menu-item" data-action="session-stats">
      <span class="context-menu-icon">📊</span>
      <span class="context-menu-label">会话统计</span>
    </div>
    <div class="context-menu-divider" data-section="stats"></div>
    <div class="context-menu-item" data-action="copy">
      <span class="context-menu-icon">📋</span>
      <span class="context-menu-label">复制</span>
    </div>
  `;

  document.body.appendChild(_overlay);
  document.body.appendChild(_menuEl);
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 全局右键：拦截默认菜单，显示自定义菜单
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    // 查找最近的消息容器（.message-wrapper 上有 dataset.messageId）或工具卡片或侧边栏会话
    const msgWrapper = e.target.closest('.message-wrapper');
    const toolCard = e.target.closest('.tool-call-card');
    const sessionItem = e.target.closest('.session-item');
    const targetEl = msgWrapper || toolCard || sessionItem;

    _context = {
      x: e.clientX,
      y: e.clientY,
      selectedText,
      targetEl,
      messageEl: msgWrapper,
      toolCardEl: toolCard,
      sessionEl: sessionItem,
    };

    // 根据上下文决定显示哪些菜单项
    const favSelectionItem = _menuEl.querySelector('[data-action="favorite-selection"]');
    const favMessageItem = _menuEl.querySelector('[data-action="favorite-message"]');
    const sessionStatsItem = _menuEl.querySelector('[data-action="session-stats"]');
    const copyItem = _menuEl.querySelector('[data-action="copy"]');
    const favDivider = _menuEl.querySelector('[data-section="fav"]');
    const statsDivider = _menuEl.querySelector('[data-section="stats"]');

    // 右键在侧边栏会话上 → 仅显示会话统计
    const isSession = !!sessionItem;
    // 右键在消息/工具卡片上 → 显示收藏/复制
    const isMessage = !!msgWrapper || !!toolCard;

    // 有选中文本 → 显示"收藏选中内容" + "复制"
    favSelectionItem.style.display = !isSession && selectedText.length > 0 ? 'flex' : 'none';
    copyItem.style.display = !isSession && selectedText.length > 0 ? 'flex' : 'none';

    // 右键在消息/工具卡片上 → 显示"收藏此消息"
    favMessageItem.style.display = isMessage ? 'flex' : 'none';

    // 右键在侧边栏会话上 → 显示"会话统计"
    sessionStatsItem.style.display = isSession ? 'flex' : 'none';

    // 分隔线显示逻辑
    if (favDivider) favDivider.style.display = (isMessage && selectedText.length > 0) ? 'block' : 'none';
    if (statsDivider) statsDivider.style.display = (isSession && selectedText.length > 0) ? 'block' : 'none';

    // 判断是否有可见菜单项
    const hasVisibleItems = isSession || isMessage || selectedText.length > 0;
    if (!hasVisibleItems) {
      // 显示浏览器默认菜单的替代：至少显示复制（如果有选中文本）
      // 但实际上这里 selectedText 为空且 targetEl 为空，说明在空白区域右键
      // 这种情况下不显示菜单，直接返回
      _context = null;
      return;
    }

    showMenu(e.clientX, e.clientY);
  });

  // 点击遮罩关闭菜单
  _overlay.addEventListener('click', () => hideMenu());

  // 菜单项点击
  _menuEl.addEventListener('click', (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item || !_context) return;

    const action = item.dataset.action;
    handleAction(action);
    hideMenu();
  });

  // 点击页面其他区域关闭菜单
  document.addEventListener('click', () => hideMenu());
  document.addEventListener('scroll', () => hideMenu(), true);

  // ESC 关闭菜单
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideMenu();
  });
}

/**
 * 显示菜单
 */
function showMenu(x, y) {
  if (!_menuEl || !_overlay) return;

  // 先显示以获取尺寸
  _menuEl.style.display = 'flex';
  _overlay.style.display = 'block';

  const rect = _menuEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 防止超出视口
  let left = x;
  let top = y;
  if (x + rect.width > vw) left = vw - rect.width - 8;
  if (y + rect.height > vh) top = vh - rect.height - 8;
  if (left < 0) left = 8;
  if (top < 0) top = 8;

  _menuEl.style.left = `${left}px`;
  _menuEl.style.top = `${top}px`;
}

/**
 * 隐藏菜单
 */
function hideMenu() {
  if (_menuEl) _menuEl.style.display = 'none';
  if (_overlay) _overlay.style.display = 'none';
  _context = null;
}

/**
 * 处理菜单动作
 */
function handleAction(action) {
  if (!_context) return;

  switch (action) {
    case 'favorite-selection':
      handleFavoriteSelection();
      break;
    case 'favorite-message':
      handleFavoriteMessage();
      break;
    case 'session-stats':
      handleSessionStats();
      break;
    case 'copy':
      handleCopy();
      break;
  }
}

/**
 * 收藏选中文本
 */
function handleFavoriteSelection() {
  const { selectedText } = _context;
  if (!selectedText || !chatStore) return;

  const session = chatStore.getActiveSession();
  if (!session) return;

  // 尝试找到所属消息 ID
  let messageId = null;
  if (_context.messageEl) {
    messageId = _context.messageEl.dataset.messageId || null;
  }
  const favId = messageId || `selection_${Date.now()}`;

  const settings = settingsStore.getState();
  const namingMode = settings.favoriteNamingMode || 'first-sentence';
  const maxLen = settings.favoriteTitleMaxLength || 30;
  const fallbackTitle = selectedText.length > maxLen
    ? selectedText.slice(0, maxLen) + '...'
    : selectedText;
  const preview = selectedText.length > 100
    ? selectedText.slice(0, 100) + '...'
    : selectedText;

  if (namingMode === 'ai') {
    // AI 命名：先立即创建收藏，再异步获取 AI 标题
    chatStore.addFavorite(session.id, favId, 'textSelection', 'AI 生成中...', preview);
    showToast('已收藏选中内容');

    generateFavoriteTitle(selectedText, settings).then((aiTitle) => {
      if (aiTitle) {
        const fav = chatStore.getFavoriteByMessageId(favId);
        if (fav) chatStore.updateFavoriteTitle(fav.id, aiTitle);
      }
    }).catch(() => {
      const fav = chatStore.getFavoriteByMessageId(favId);
      if (fav) chatStore.updateFavoriteTitle(fav.id, fallbackTitle);
    });
  } else {
    // 首句截取模式
    chatStore.addFavorite(session.id, favId, 'textSelection', fallbackTitle, preview);
    showToast('已收藏选中内容');
  }
}

/**
 * 收藏当前消息/工具卡片
 */
function handleFavoriteMessage() {
  const { messageEl, toolCardEl } = _context;
  if (!chatStore) return;

  const session = chatStore.getActiveSession();
  if (!session) return;

  if (toolCardEl) {
    const toolCallId = toolCardEl.dataset.toolCallId;
    if (!toolCallId) return;

    // 切换收藏状态
    const isFav = chatStore.isFavorite(toolCallId);
    if (isFav) {
      chatStore.removeFavoriteByMessageId(toolCallId);
      showToast('已取消收藏');
    } else {
      // 获取工具卡片标题
      const titleEl = toolCardEl.querySelector('.tool-call-header');
      const domTitle = titleEl ? titleEl.textContent.trim() : '工具调用';
      // 优先用 data 属性判断是否有自定义标题（由 tool-call-card.js 创建时设置）
      const hasCustomTitle = toolCardEl.dataset.hasCustomTitle === '1';

      const settings = settingsStore.getState();
      const namingMode = settings.favoriteNamingMode || 'first-sentence';

      if (!hasCustomTitle && namingMode === 'ai') {
        // AI 命名模式：从 toolCall 参数提取表达式发给 AI
        const toolCall = chatStore.getToolCall(toolCallId);
        if (toolCall) {
          chatStore.addFavorite(session.id, toolCallId, 'toolCall', 'AI 生成中...', '工具调用结果');
          showToast('已收藏此工具');

          const content = extractToolContent(toolCall);
          generateFavoriteTitle(content, settings).then((aiTitle) => {
            if (aiTitle) {
              const fav = chatStore.getFavoriteByMessageId(toolCallId);
              if (fav) chatStore.updateFavoriteTitle(fav.id, aiTitle);
            }
          }).catch(() => {
            const fav = chatStore.getFavoriteByMessageId(toolCallId);
            if (fav) chatStore.updateFavoriteTitle(fav.id, domTitle);
          });
        } else {
          // 找不到 toolCall 对象时回退到 DOM 标题
          chatStore.addFavorite(session.id, toolCallId, 'toolCall', domTitle, '工具调用结果');
          showToast('已收藏此工具');
        }
      } else {
        chatStore.addFavorite(session.id, toolCallId, 'toolCall', domTitle, '工具调用结果');
        showToast('已收藏此工具');
      }
    }

    // 更新 UI 状态
    updateFavoriteButtonUI(toolCardEl, !isFav);

  } else if (messageEl) {
    const messageId = messageEl.dataset.messageId;
    if (!messageId) return;

    const isFav = chatStore.isFavorite(messageId);
    if (isFav) {
      chatStore.removeFavoriteByMessageId(messageId);
      showToast('已取消收藏');
    } else {
      const settings = settingsStore.getState();
      const namingMode = settings.favoriteNamingMode || 'first-sentence';
      const maxLen = settings.favoriteTitleMaxLength || 30;
      const previewText = messageEl.textContent.slice(0, 100) || '消息';
      const fallbackTitle = previewText.length > maxLen
        ? previewText.slice(0, maxLen) + '...'
        : previewText;

      if (namingMode === 'ai') {
        // AI 命名：先立即创建收藏，再异步获取 AI 标题
        chatStore.addFavorite(session.id, messageId, 'message', 'AI 生成中...', previewText);
        showToast('已收藏此消息');

        generateFavoriteTitle(messageEl.textContent || '', settings).then((aiTitle) => {
          if (aiTitle) {
            const fav = chatStore.getFavoriteByMessageId(messageId);
            if (fav) chatStore.updateFavoriteTitle(fav.id, aiTitle);
          }
        }).catch(() => {
          const fav = chatStore.getFavoriteByMessageId(messageId);
          if (fav) chatStore.updateFavoriteTitle(fav.id, fallbackTitle);
        });
      } else {
        chatStore.addFavorite(session.id, messageId, 'message', fallbackTitle, previewText);
        showToast('已收藏此消息');
      }
    }

    // 更新 UI 状态
    updateFavoriteButtonUI(messageEl, !isFav);
  }
}

/**
 * 复制选中文本
 */
function handleCopy() {
  const { selectedText } = _context;
  if (!selectedText) return;
  navigator.clipboard.writeText(selectedText).then(() => {
    showToast('已复制到剪贴板');
  }).catch(() => {
    // fallback
    document.execCommand('copy');
  });
}

/**
 * 更新收藏按钮 UI 状态
 * @param {HTMLElement} containerEl - 包含收藏按钮的容器元素（toolCardEl 或 messageEl）
 * @param {boolean} isFav - 是否已收藏
 */
function updateFavoriteButtonUI(containerEl, isFav) {
  if (!containerEl) return;

  // 查找收藏按钮
  const favBtn = containerEl.querySelector('.fav-btn');
  if (!favBtn) return;

  if (isFav) {
    favBtn.classList.add('active');
    favBtn.textContent = '★';
  } else {
    favBtn.classList.remove('active');
    favBtn.textContent = '☆';
  }
}

/**
 * 显示操作提示
 */
function showToast(msg) {
  let toast = document.getElementById('context-menu-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'context-menu-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 1500);
}

// ══════════════════════════════════════════
//  会话统计
// ══════════════════════════════════════════

/**
 * 显示会话统计对话框
 */
function handleSessionStats() {
  const { sessionEl } = _context;
  if (!sessionEl || !chatStore) return;

  const sessionId = sessionEl.dataset.id;
  if (!sessionId) return;

  const stats = chatStore.getSessionStats(sessionId);
  if (!stats) return;

  showSessionStatsDialog(stats);
}

/**
 * 创建并显示会话统计面板
 * @param {Object} stats - chatStore.getSessionStats() 返回的统计数据
 */
function showSessionStatsDialog(stats) {
  // 移除已有面板
  const existing = document.getElementById('session-stats-overlay');
  if (existing) existing.remove();

  const toolNames = {
    plot_function: '函数图像', animate_limit: '极限动画',
    show_differential: '微分可视化', plot_integral_area: '积分面积',
    animate_taylor_series: '泰勒级数', plot_gradient_field: '梯度场',
    plot_surface_3d: '3D曲面', animate_solid_of_revolution: '旋转体',
    show_step_card: '分步解题', show_knowledge_tip: '知识点',
    control_parameter_slider: '参数滑块', plot_polar_curve: '极坐标曲线',
    plot_parametric_curve: '参数曲线', animate_series_convergence: '级数收敛',
    plot_fourier_series: '傅里叶级数', plot_matrix_transform: '矩阵变换',
    plot_eigenvectors: '特征向量', plot_distribution: '分布图',
    animate_clt: '中心极限定理', plot_multivariable_integral: '多重积分',
    show_comparison_table: '对比表', interactive_quiz: '互动测验',
    render_latex: '公式渲染', plot_sequence: '数列',
    show_formula_handbook: '公式手册', show_error_analyzer: '易错点分析',
    show_flashcards: '记忆卡片', show_interactive_proof: '交互式证明',
    show_concept_map: '知识概念图',
  };

  const inTokens = stats.inputTokens || 0;
  const outTokens = stats.outputTokens || 0;
  const totalT = inTokens + outTokens;

  let toolListHtml = '';
  const toolEntries = Object.entries(stats.toolCallDist || {});
  if (toolEntries.length > 0) {
    toolEntries.sort((a, b) => b[1] - a[1]);
    const maxCount = toolEntries[0][1];
    for (const [tool, count] of toolEntries) {
      const name = toolNames[tool] || tool;
      const pct = Math.round((count / maxCount) * 100);
      toolListHtml += `<div class="stats-bar-row">
        <div class="stats-bar-label" title="${name}">${name}</div>
        <div class="stats-bar-track">
          <div class="stats-bar-fill" style="width:${pct}%">
            <span class="stats-bar-count">${count}</span>
          </div>
        </div>
      </div>`;
    }
  }

  const createdAtStr = stats.createdAt
    ? new Date(stats.createdAt).toLocaleString('zh-CN')
    : '未知';
  const updatedAtStr = stats.updatedAt
    ? new Date(stats.updatedAt).toLocaleString('zh-CN')
    : '未知';

  const html = `
    <div class="dialog">
      <div class="dialog-header">
        <h2>会话统计</h2>
        <button class="icon-btn session-stats-close">✕</button>
      </div>
      <div class="dialog-body stats-content">
        <div class="stats-session-title">${escapeHtml(stats.title)}</div>

        <div class="stats-grid">
          <div class="stats-card">
            <div class="stats-value" style="color:var(--color-accent)">${inTokens.toLocaleString()}</div>
            <div class="stats-label">输入 Token</div>
          </div>
          <div class="stats-card">
            <div class="stats-value" style="color:var(--color-success)">${outTokens.toLocaleString()}</div>
            <div class="stats-label">输出 Token</div>
          </div>
          <div class="stats-card">
            <div class="stats-value" style="color:var(--color-warning)">${totalT.toLocaleString()}</div>
            <div class="stats-label">总计 Token</div>
          </div>
          <div class="stats-card">
            <div class="stats-value" style="color:var(--color-text-primary)">${stats.toolCallCount || 0}</div>
            <div class="stats-label">工具调用</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stats-card">
            <div class="stats-value">${stats.apiCallCount || 0}</div>
            <div class="stats-label">API 调用</div>
          </div>
          <div class="stats-card">
            <div class="stats-value">${stats.messageCount || 0}</div>
            <div class="stats-label">消息总数</div>
          </div>
          <div class="stats-card">
            <div class="stats-value">${stats.userCount || 0}</div>
            <div class="stats-label">用户消息</div>
          </div>
          <div class="stats-card">
            <div class="stats-value">${stats.assistantCount || 0}</div>
            <div class="stats-label">助手消息</div>
          </div>
        </div>

        <div class="stats-meta">
          <span>创建: ${createdAtStr}</span>
          <span>最近活动: ${updatedAtStr}</span>
        </div>

        ${toolListHtml ? `
        <div class="stats-section">
          <div class="stats-section-title">工具调用分布</div>
          <div class="stats-bar-chart">${toolListHtml}</div>
        </div>` : ''}
      </div>
    </div>
  `;

  const overlay = document.createElement('div');
  overlay.id = 'session-stats-overlay';
  overlay.className = 'dialog-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = html;

  const close = () => overlay.remove();
  overlay.querySelector('.session-stats-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });

  document.body.appendChild(overlay);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
