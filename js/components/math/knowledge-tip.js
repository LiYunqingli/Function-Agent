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
    // ★ 渲染所有 LaTeX 格式：\(...\) 、 \[...\] 、 $...$ 、 $$...$$
    let html = content
      // 块级：\[...\]
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => {
        try { return window.katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false, trust: true }); }
        catch { return `\\[${formula}\\]`; }
      })
      // 块级：$$...$$
      .replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
        try { return window.katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false, trust: true }); }
        catch { return `$$${formula}$$`; }
      })
      // 行内：\(...\)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => {
        try { return window.katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false, trust: true }); }
        catch { return `\\(${formula}\\)`; }
      })
      // 行内：$...$
      .replace(/\$([^$\n]+?)\$/g, (_, formula) => {
        try { return window.katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false, trust: true }); }
        catch { return `$${formula}$`; }
      });
    contentEl.innerHTML = html;
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
