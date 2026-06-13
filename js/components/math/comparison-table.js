/**
 * 方法对比表组件（DOM）
 * LLM 生成结构化对比表格
 * @param {Object} props - { title, headers, rows }
 * @returns {HTMLElement}
 */
import { renderLatexHTML } from '../../utils/latex.js';
export function renderComparisonTable(props) {
  const { title, headers = [], rows = [] } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = title || '⚖️ 方法对比';
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';
  body.style.cssText = 'overflow-x:auto;';

  const table = document.createElement('table');
  table.style.cssText = 'width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;';

  // 表头
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach((h, idx) => {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.cssText = `padding:8px 12px;text-align:${idx === 0 ? 'left' : 'center'};border-bottom:2px solid var(--color-border-primary);font-weight:500;color:var(--color-text-primary);background:var(--color-background-secondary);white-space:nowrap;`;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // 表体
  const tbody = document.createElement('tbody');
  rows.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');
    tr.style.cssText = rowIdx % 2 === 0 ? 'background:transparent;' : 'background:var(--color-background-secondary);';

    row.forEach((cell, cellIdx) => {
      const td = document.createElement('td');
      td.style.cssText = `padding:8px 12px;text-align:${cellIdx === 0 ? 'left' : 'center'};border-bottom:1px solid var(--color-border-tertiary);`;

      // 渲染 LaTeX
      const content = renderLatexHTML(String(cell || ''));
      td.innerHTML = content;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  body.appendChild(table);
  container.appendChild(body);

  return container;
}
