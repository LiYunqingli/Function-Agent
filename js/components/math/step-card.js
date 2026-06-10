/**
 * 解题步骤卡片组件
 * @param {Object} props - { title, steps: [{ index, description, formula, status, annotation }] }
 * @returns {HTMLElement}
 */
export function renderStepCard(props) {
  const { title, steps = [] } = props;
  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = title || '📋 解题步骤';
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  const list = document.createElement('div');
  list.className = 'step-list';
  list.style.cssText = 'list-style:none;padding:0;';

  steps.forEach(step => {
    const item = document.createElement('div');
    item.className = `step-item ${step.status || 'normal'}`;

    const num = document.createElement('div');
    num.className = 'step-number';
    num.textContent = String(step.index || '·');

    const content = document.createElement('div');
    content.className = 'step-content';

    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:var(--font-size-base);line-height:1.6;';
    desc.textContent = step.description || '';

    content.appendChild(desc);

    if (step.formula) {
      const formulaEl = document.createElement('div');
      formulaEl.style.cssText = 'margin:8px 0;';
      try {
        window.katex.render(step.formula, formulaEl, { displayMode: true, throwOnError: false, trust: true });
      } catch {
        formulaEl.textContent = step.formula;
      }
      content.appendChild(formulaEl);
    }

    if (step.annotation) {
      const annotation = document.createElement('div');
      annotation.className = 'step-annotation';
      annotation.textContent = step.annotation;
      content.appendChild(annotation);
    }

    item.appendChild(num);
    item.appendChild(content);
    list.appendChild(item);
  });

  body.appendChild(list);
  container.appendChild(body);
  return container;
}
