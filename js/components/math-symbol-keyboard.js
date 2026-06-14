/**
 * 数学符号键盘 —— 浮动 LaTeX 符号面板
 * 非数学可视化组件，属于 UI 增强组件
 */

/**
 * 在 textarea 光标位置插入文本
 * @param {HTMLTextAreaElement} textarea
 * @param {string} text
 */
function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  textarea.value = value.substring(0, start) + text + value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  textarea.focus();
}

/** 符号分类定义 */
const TABS = [
  {
    id: 'common',
    label: '常用',
    symbols: [
      '\\sum', '\\int', '\\partial', '\\infty', '\\pi',
      '\\alpha', '\\beta', '\\gamma', '\\theta', '\\Delta',
      '\\approx', '\\neq', '\\leq', '\\geq', '\\in',
      '\\subset', '\\cup', '\\cap', '\\Rightarrow', '\\Leftrightarrow',
      '\\forall', '\\exists'
    ]
  },
  {
    id: 'greek',
    label: '希腊字母',
    symbols: [
      '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta',
      '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu',
      '\\nu', '\\xi', 'o', '\\pi', '\\rho', '\\sigma', '\\tau',
      '\\upsilon', '\\phi', '\\chi', '\\psi', '\\omega',
      '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Xi',
      '\\Pi', '\\Sigma', '\\Phi', '\\Psi', '\\Omega'
    ]
  },
  {
    id: 'operators',
    label: '运算符',
    symbols: [
      '+', '-', '\\times', '\\div', '\\pm', '\\mp',
      '\\sqrt{}', '\\sqrt[3]{}', '\\sqrt[4]{}',
      '\\sum', '\\prod', '\\int', '\\oint', '\\oiint', '\\oiiint',
      '\\nabla', '\\partial', '\\infty'
    ]
  },
  {
    id: 'relations',
    label: '关系/逻辑',
    symbols: [
      '\\approx', '\\neq', '\\equiv',
      '\\leq', '\\geq', '<', '>',
      '\\subset', '\\supset', '\\subseteq', '\\supseteq',
      '\\in', '\\notin',
      '\\cup', '\\cap',
      '\\land', '\\lor', '\\neg',
      '\\Rightarrow', '\\Leftrightarrow',
      '\\forall', '\\exists'
    ]
  },
  {
    id: 'functions',
    label: '函数/排版',
    symbols: [
      '\\frac{}{}', '\\sqrt{}', '\\int_{}^{}',
      '\\sum_{}^{}', '\\prod_{}^{}',
      '\\lim_{}', '\\log_{}',
      '\\text{}', '\\mathbf{}', '\\mathbb{}', '\\mathcal{}'
    ]
  }
];

/**
 * Renders the display label for a LaTeX symbol.
 * For symbols with {}, we trim the braces for display.
 */
function symbolLabel(code) {
  if (code.includes('_{}') || code.includes('{}')) {
    return code.replace(/\{\}/g, '\u25A1');
  }
  return code.replace(/^\\/, '');
}

/**
 * 初始化数学符号键盘
 * @param {Object} inputBarApi - 来自 initInputBar() 的 API 对象
 */
export function initMathSymbolKeyboard(inputBarApi) {
  // 如果已初始化则跳过
  if (document.getElementById('math-kb-panel')) return;

  const inputBarEl = document.querySelector('.input-bar');
  if (!inputBarEl) return;

  // ── 创建浮动气泡按钮 ──
  const bubble = document.createElement('button');
  bubble.id = 'math-kb-bubble';
  bubble.className = 'math-kb-bubble';
  bubble.title = '数学符号键盘';
  bubble.innerHTML = '\u03A3'; // ∑
  inputBarEl.appendChild(bubble);

  // ── 创建键盘面板 ──
  const panel = document.createElement('div');
  panel.id = 'math-kb-panel';
  panel.className = 'math-kb-panel';
  panel.style.display = 'none';

  // 面板头部
  const header = document.createElement('div');
  header.className = 'math-kb-header';
  const title = document.createElement('span');
  title.className = 'math-kb-title';
  title.textContent = '数学符号';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'math-kb-close';
  closeBtn.innerHTML = '\u2715';
  closeBtn.title = '关闭';
  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // 标签栏
  const tabBar = document.createElement('div');
  tabBar.className = 'math-kb-tabs';
  panel.appendChild(tabBar);

  // 符号容器
  const symbolsContainer = document.createElement('div');
  symbolsContainer.className = 'math-kb-symbols';
  panel.appendChild(symbolsContainer);

  inputBarEl.appendChild(panel);

  // ── 状态 ──
  let activeTabId = TABS[0].id;
  let isPanelVisible = false;

  /**
   * 渲染当前 tab 的符号
   */
  function renderSymbols() {
    const tab = TABS.find(t => t.id === activeTabId);
    if (!tab) return;

    // 渲染 tabs
    tabBar.innerHTML = '';
    TABS.forEach(t => {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'math-kb-tab' + (t.id === activeTabId ? ' active' : '');
      tabBtn.textContent = t.label;
      tabBtn.addEventListener('click', () => {
        activeTabId = t.id;
        renderSymbols();
      });
      tabBar.appendChild(tabBtn);
    });

    // 渲染符号
    symbolsContainer.innerHTML = '';
    const textarea = document.getElementById('message-input');
    tab.symbols.forEach(code => {
      const btn = document.createElement('button');
      btn.className = 'math-kb-symbol-btn';
      btn.textContent = symbolLabel(code);
      btn.title = code;
      btn.addEventListener('click', () => {
        if (textarea) {
          insertAtCursor(textarea, code);
        }
      });
      symbolsContainer.appendChild(btn);
    });
  }

  /**
   * 显示/隐藏面板
   */
  function togglePanel() {
    isPanelVisible = !isPanelVisible;
    if (isPanelVisible) {
      panel.style.display = 'block';
      panel.classList.remove('math-kb-slide-down');
      panel.classList.add('math-kb-slide-up');
      bubble.classList.add('math-kb-bubble-active');
      applyResponsiveClass();
      if (activeTabId) renderSymbols();
    } else {
      panel.classList.remove('math-kb-slide-up');
      panel.classList.add('math-kb-slide-down');
      bubble.classList.remove('math-kb-bubble-active');
      panel.addEventListener('animationend', function handler() {
        panel.style.display = 'none';
        panel.removeEventListener('animationend', handler);
      }, { once: true });
    }
  }

  /**
   * 应用响应式 class
   */
  function applyResponsiveClass() {
    if (window.innerWidth <= 768) {
      panel.classList.add('mobile');
    } else {
      panel.classList.remove('mobile');
    }
  }

  // ── 事件绑定 ──
  bubble.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  // 点击面板外部关闭
  document.addEventListener('click', (e) => {
    if (!isPanelVisible) return;
    if (!panel.contains(e.target) && e.target !== bubble) {
      togglePanel();
    }
  });

  // 窗口缩放时调整
  window.addEventListener('resize', () => {
    if (isPanelVisible) applyResponsiveClass();
  });

  // 初始渲染符号
  renderSymbols();

  console.log('⌨️ 数学符号键盘已初始化');
}
