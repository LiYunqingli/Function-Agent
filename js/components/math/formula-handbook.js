/**
 * 公式手册组件
 * 显示结构化的公式参考卡片，支持搜索和折叠
 * @param {Object} props - { title, sections: [{ category, formulas: [{ name, latex, description }] }] }
 * @returns {HTMLElement}
 */
import { renderLatexHTML } from '../../utils/latex.js';

export function renderFormulaHandbook(props) {
  const { title = '公式手册', sections = [] } = props;

  const container = document.createElement('div');
  container.className = 'math-component formula-handbook fade-in';

  // 头部
  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.innerHTML = `<span>📖</span><span>${escapeHtml(title)}</span>`;
  container.appendChild(header);

  // 搜索框
  const searchContainer = document.createElement('div');
  searchContainer.style.padding = 'var(--spacing-sm) var(--spacing-md)';
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'formula-search';
  searchInput.placeholder = '搜索公式...';
  searchContainer.appendChild(searchInput);
  container.appendChild(searchContainer);

  // 内容区域
  const body = document.createElement('div');
  body.className = 'math-component-body';

  // 存储所有公式项引用，用于搜索过滤
  const allFormulaItems = [];

  sections.forEach((section, sectionIndex) => {
    const { category, formulas = [] } = section;

    const sectionEl = document.createElement('div');
    sectionEl.className = 'formula-section';

    // 区域头部（可点击折叠）
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'formula-section-header';
    sectionHeader.innerHTML = `
      <span class="formula-section-title">${escapeHtml(category || `分类 ${sectionIndex + 1}`)}</span>
      <span class="formula-section-chevron">▼</span>
    `;

    // 区域内容
    const sectionBody = document.createElement('div');
    sectionBody.className = 'formula-section-body';

    // 点击头部切换折叠
    sectionHeader.addEventListener('click', () => {
      const isCollapsed = sectionBody.classList.toggle('collapsed');
      sectionHeader.classList.toggle('collapsed', isCollapsed);
      sectionHeader.querySelector('.formula-section-chevron').textContent = isCollapsed ? '▶' : '▼';
    });

    // 渲染公式项
    formulas.forEach((formula) => {
      const { name, latex, description } = formula;

      const itemEl = document.createElement('div');
      itemEl.className = 'formula-item';

      // 公式名称
      if (name) {
        const nameEl = document.createElement('div');
        nameEl.className = 'formula-item-name';
        nameEl.textContent = name;
        itemEl.appendChild(nameEl);
      }

      // LaTeX 公式渲染（displayMode）
      if (latex) {
        const latexEl = document.createElement('div');
        latexEl.className = 'formula-item-latex';
        try {
          latexEl.innerHTML = window.katex.renderToString(latex.trim(), {
            displayMode: true,
            throwOnError: false,
            trust: true,
          });
        } catch {
          latexEl.textContent = latex;
        }
        itemEl.appendChild(latexEl);
      }

      // 描述（支持 LaTeX 渲染）
      if (description) {
        const descEl = document.createElement('div');
        descEl.className = 'formula-item-desc';
        descEl.innerHTML = renderLatexHTML(description);
        itemEl.appendChild(descEl);
      }

      sectionBody.appendChild(itemEl);
      allFormulaItems.push({
        element: itemEl,
        name: name || '',
        description: description || '',
        sectionEl,
        sectionBody,
      });
    });

    sectionEl.appendChild(sectionHeader);
    sectionEl.appendChild(sectionBody);
    body.appendChild(sectionEl);
  });

  container.appendChild(body);

  // 搜索功能
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();

    allFormulaItems.forEach((item) => {
      const nameMatch = item.name.toLowerCase().includes(query);
      const descMatch = item.description.toLowerCase().includes(query);

      if (!query || nameMatch || descMatch) {
        item.element.style.display = '';
        // 展开所属区域
        item.sectionBody.classList.remove('collapsed');
        item.sectionEl.querySelector('.formula-section-header').classList.remove('collapsed');
        item.sectionEl.querySelector('.formula-section-chevron').textContent = '▼';
      } else {
        item.element.style.display = 'none';
      }
    });
  });

  return container;
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
