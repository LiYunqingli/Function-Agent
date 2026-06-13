/**
 * 自定义模态弹窗 —— 替代浏览器原生 confirm / prompt
 *
 * API:
 *   Modal.confirm({ title, message, confirmText?, confirmClass?, cancelText? }) → Promise<boolean>
 *   Modal.prompt({ title, defaultValue?, placeholder?, confirmText?, cancelText?, inputType? }) → Promise<string|null>
 */
const BASE_CLASS = 'custom-modal';

let _activeResolve = null;
let _overlay = null;
let _card = null;

/** 确保 DOM 容器存在 */
function _ensureContainer() {
  if (_overlay) return;
  _overlay = document.createElement('div');
  _overlay.className = `${BASE_CLASS}-overlay`;
  _overlay.setAttribute('tabindex', '-1');
  _card = document.createElement('div');
  _card.className = `${BASE_CLASS}-card`;
  _overlay.appendChild(_card);
  document.body.appendChild(_overlay);

  // 点击遮罩关闭（仅 confirm）
  _overlay.addEventListener('click', (e) => {
    if (e.target === _overlay && !_card.dataset.promptMode) {
      _resolve(false);
    }
  });

  // ESC 关闭
  document.addEventListener('keydown', _handleKey);
}

function _handleKey(e) {
  if (!_overlay || !_overlay.classList.contains('open')) return;
  if (e.key === 'Escape') {
    _resolve(_card.dataset.promptMode ? null : false);
  }
}

/** 聚焦到弹窗内第一个可聚焦元素，保持焦点循环 */
function _focusTrap() {
  if (!_card) return;
  const focusable = _card.querySelectorAll(
    'input, button, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length > 0) {
    /** @type {HTMLElement} */ (focusable[0]).focus();
  }
  // 焦点循环
  _card.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

function _resolve(value) {
  if (!_activeResolve) return;
  const resolve = _activeResolve;
  _activeResolve = null;
  _overlay.classList.remove('open');
  _card.innerHTML = '';
  _card.removeAttribute('data-prompt-mode');
  resolve(value);
}

function _render(title, bodyHtml, confirmOpts, cancelText) {
  _ensureContainer();

  const { text: confirmText = '确定', cls: confirmClass = 'btn-primary' } =
    confirmOpts || {};

  _card.innerHTML = `
    <div class="${BASE_CLASS}-header">
      <h3 class="${BASE_CLASS}-title">${title}</h3>
    </div>
    <div class="${BASE_CLASS}-body">${bodyHtml}</div>
    <div class="${BASE_CLASS}-footer">
      <button class="btn btn-secondary" data-action="cancel">${cancelText || '取消'}</button>
      <button class="btn ${confirmClass}" data-action="confirm">${confirmText}</button>
    </div>
  `;

  _card.querySelector('[data-action="cancel"]').addEventListener('click', () =>
    _resolve(false)
  );
  _card.querySelector('[data-action="confirm"]').addEventListener('click', () => {
    const input = _card.querySelector('input');
    if (input) {
      const val = input.value.trim();
      _resolve(val || null);
    } else {
      _resolve(true);
    }
  });

  _overlay.classList.add('open');
  _focusTrap();
}

/**
 * 确认对话框
 * @param {{ title: string, message: string, confirmText?: string, confirmClass?: string, cancelText?: string }} opts
 * @returns {Promise<boolean>}
 */
export function confirm({
  title,
  message,
  confirmText,
  confirmClass = 'btn-primary',
  cancelText,
} = {}) {
  return new Promise((resolve) => {
    if (_activeResolve) {
      resolve(false);
      return;
    }
    _activeResolve = resolve;
    _render(
      title || '确认',
      `<p class="${BASE_CLASS}-message">${message || ''}</p>`,
      { text: confirmText, cls: confirmClass },
      cancelText
    );
  });
}

/**
 * 输入对话框
 * @param {{ title: string, defaultValue?: string, placeholder?: string, confirmText?: string, cancelText?: string, inputType?: string }} opts
 * @returns {Promise<string|null>}
 */
export function prompt({
  title,
  defaultValue = '',
  placeholder,
  confirmText = '保存',
  cancelText,
  inputType = 'text',
} = {}) {
  return new Promise((resolve) => {
    if (_activeResolve) {
      resolve(null);
      return;
    }
    _activeResolve = resolve;
    const escapedDefault = defaultValue.replace(/"/g, '&quot;');
    _render(
      title || '输入',
      `<input
        class="${BASE_CLASS}-input"
        type="${inputType}"
        value="${escapedDefault}"
        placeholder="${placeholder || ''}"
        autocomplete="off"
      />`,
      { text: confirmText, cls: 'btn-primary' },
      cancelText
    );
    _card.dataset.promptMode = '1';

    // Enter 确认
    const input = _card.querySelector('input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        _resolve(val || null);
      }
    });
    // 延迟聚焦，等 CSS 动画完成
    requestAnimationFrame(() => input.focus());
  });
}

/** 模块导出 */
export const Modal = { confirm, prompt };
