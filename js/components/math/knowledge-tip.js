/**
 * 知识点提示框组件
 * @param {Object} props - { type, title, content, conditions }
 * @returns {HTMLElement}
 */
export function renderKnowledgeTip(props) {
  const { type = 'note', title, content, conditions } = props;
  const container = document.createElement('div');
  container.className = `knowledge-tip ${type} fade-in`;

  const titleEl = document.createElement('div');
  titleEl.className = 'knowledge-tip-title';
  const typeIcons = { definition: '📖', theorem: '📐', formula: '📝', note: '📌' };
  titleEl.textContent = `${typeIcons[type] || '💡'} ${title || '知识点'}`;
  container.appendChild(titleEl);

  if (content) {
    const contentEl = document.createElement('div');
    contentEl.className = 'knowledge-tip-content';
    // 尝试渲染内联 LaTeX
    contentEl.innerHTML = content.replace(/\$([^$\n]+?)\$/g, (_, formula) => {
      try {
        return window.katex.renderToString(formula, { throwOnError: false, trust: true });
      } catch { return `$${formula}$`; }
    });
    container.appendChild(contentEl);
  }

  if (conditions) {
    const condEl = document.createElement('div');
    condEl.className = 'knowledge-tip-conditions';
    condEl.textContent = `条件: ${conditions}`;
    container.appendChild(condEl);
  }

  return container;
}
