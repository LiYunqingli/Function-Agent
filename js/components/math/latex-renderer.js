/**
 * LaTeX 公式渲染组件
 * @param {Object} props - { latex, displayMode, steps }
 * @returns {HTMLElement}
 */
export function renderLatexRenderer(props) {
  const { latex, displayMode = true, steps } = props;
  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = '📝 LaTeX 公式';
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  if (steps && steps.length > 0) {
    for (const step of steps) {
      const stepEl = document.createElement('div');
      stepEl.className = 'latex-step';

      if (step.label) {
        const label = document.createElement('div');
        label.className = 'latex-step-label';
        label.textContent = step.label;
        stepEl.appendChild(label);
      }

      const formulaEl = document.createElement('div');
      const formula = step.formula || step.latex || '';
      if (formula) {
        try {
          window.katex.render(formula, formulaEl, { displayMode: true, throwOnError: false, trust: true });
        } catch {
          formulaEl.textContent = formula;
        }
      }
      stepEl.appendChild(formulaEl);
      body.appendChild(stepEl);
    }
  } else if (latex) {
    const formulaEl = document.createElement('div');
    formulaEl.className = 'latex-container';
    try {
      window.katex.render(latex, formulaEl, { displayMode, throwOnError: false, trust: true });
    } catch {
      formulaEl.textContent = latex;
    }
    body.appendChild(formulaEl);
  }

  container.appendChild(body);
  return container;
}
