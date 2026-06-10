/**
 * DOM 操作工具
 */

/**
 * querySelector 快捷方式
 * @param {string} selector - CSS 选择器
 * @param {ParentNode} parent - 父容器，默认 document
 * @returns {Element|null}
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * querySelectorAll 快捷方式
 * @param {string} selector - CSS 选择器
 * @param {ParentNode} parent - 父容器，默认 document
 * @returns {NodeListOf<Element>}
 */
export function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

/**
 * 创建 DOM 元素
 * @param {string} tag - 标签名
 * @param {Object} attrs - 属性对象（可含 className, style, dataset, textContent, innerHTML, 事件监听 onXxx）
 * @param {Array<string|Element>} children - 子元素列表
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    // 事件监听（on 开头的属性）
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value);
      continue;
    }
    // 特殊属性
    switch (key) {
      case 'className':
        el.className = value;
        break;
      case 'style':
        if (typeof value === 'string') {
          el.style.cssText = value;
        } else if (typeof value === 'object') {
          Object.assign(el.style, value);
        }
        break;
      case 'dataset':
        if (typeof value === 'object') {
          for (const [dk, dv] of Object.entries(value)) {
            el.dataset[dk] = dv;
          }
        }
        break;
      case 'textContent':
        el.textContent = value;
        break;
      case 'innerHTML':
        el.innerHTML = value;
        break;
      default:
        el.setAttribute(key, value);
    }
  }

  // 添加子元素
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}