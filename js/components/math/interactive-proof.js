/**
 * 交互式证明组件（DOM）—— 定理证明步骤展示，支持折叠/展开
 *
 * @param {Object} props - { title, theorem?, proofSteps: [{ stepNumber?, statement, derivation?, formula?, hint? }] }
 * @returns {HTMLElement}
 */
import { renderLatexHTML } from '../../utils/latex.js';

export function renderInteractiveProof(props) {
  const { title, theorem, proofSteps = [] } = props;

  const container = document.createElement('div');
  container.className = 'math-component math-component--proof fade-in';

  // ========== Header ==========
  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = title || '📜 交互式证明';
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body proof-body';

  // ========== 展开/折叠全部按钮 ==========
  const toggleAllBtn = document.createElement('button');
  toggleAllBtn.className = 'proof-toggle-all';
  toggleAllBtn.textContent = '展开全部';
  body.appendChild(toggleAllBtn);

  // ========== 定理陈述 ==========
  if (theorem) {
    const theoremBox = document.createElement('div');
    theoremBox.className = 'proof-theorem';
    theoremBox.innerHTML = renderLatexHTML(theorem);
    body.appendChild(theoremBox);
  }

  // ========== 证明步骤列表 ==========
  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'proof-steps';

  let allExpanded = false;

  // 全局展开/折叠切换
  toggleAllBtn.addEventListener('click', () => {
    allExpanded = !allExpanded;
    toggleAllBtn.textContent = allExpanded ? '折叠全部' : '展开全部';

    stepsContainer.querySelectorAll('.proof-step').forEach((stepEl) => {
      const body = stepEl.querySelector('.proof-step-body');
      const chevron = stepEl.querySelector('.chevron');
      if (allExpanded) {
        body.classList.add('expanded');
        if (chevron) chevron.classList.add('expanded');
      } else {
        body.classList.remove('expanded');
        if (chevron) chevron.classList.remove('expanded');
      }
    });
  });

  proofSteps.forEach((step, index) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'proof-step';

    const stepNumber = step.stepNumber ?? index + 1;

    // Step header（点击切换展开）
    const stepHeader = document.createElement('div');
    stepHeader.className = 'proof-step-header';

    const stepNumBadge = document.createElement('span');
    stepNumBadge.className = 'proof-step-number';
    stepNumBadge.textContent = stepNumber;

    const stepStatement = document.createElement('span');
    stepStatement.className = 'proof-step-statement';
    stepStatement.innerHTML = renderLatexHTML(step.statement);

    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.textContent = '▶';
    chevron.setAttribute('aria-hidden', 'true');

    stepHeader.appendChild(stepNumBadge);
    stepHeader.appendChild(stepStatement);
    stepHeader.appendChild(chevron);

    // Step body（默认折叠）
    const stepBody = document.createElement('div');
    stepBody.className = 'proof-step-body';

    // Derivation
    if (step.derivation) {
      const derivation = document.createElement('div');
      derivation.className = 'proof-step-derivation';
      derivation.innerHTML = renderLatexHTML(step.derivation);
      stepBody.appendChild(derivation);
    }

    // Formula（显示模式）
    if (step.formula) {
      const formula = document.createElement('div');
      formula.className = 'proof-step-formula';
      try {
        formula.innerHTML = window.katex.renderToString(step.formula, {
          displayMode: true,
          throwOnError: false,
          trust: true,
        });
      } catch {
        formula.textContent = step.formula;
      }
      stepBody.appendChild(formula);
    }

    // Hint
    if (step.hint) {
      const hint = document.createElement('div');
      hint.className = 'proof-step-hint';
      hint.textContent = step.hint;
      stepBody.appendChild(hint);
    }

    stepEl.appendChild(stepHeader);
    stepEl.appendChild(stepBody);

    // 点击切换当前步骤
    stepHeader.addEventListener('click', () => {
      const isExpanded = stepBody.classList.contains('expanded');
      if (isExpanded) {
        stepBody.classList.remove('expanded');
        chevron.classList.remove('expanded');
      } else {
        stepBody.classList.add('expanded');
        chevron.classList.add('expanded');
      }
      // 同步全局按钮文字
      const allBodies = stepsContainer.querySelectorAll('.proof-step-body');
      const anyExpanded = Array.from(allBodies).some(b => b.classList.contains('expanded'));
      const allExpandedNow = Array.from(allBodies).every(b => b.classList.contains('expanded'));
      if (allExpandedNow) {
        allExpanded = true;
        toggleAllBtn.textContent = '折叠全部';
      } else if (!anyExpanded) {
        allExpanded = false;
        toggleAllBtn.textContent = '展开全部';
      }
    });

    stepsContainer.appendChild(stepEl);
  });

  body.appendChild(stepsContainer);
  container.appendChild(body);

  return container;
}
