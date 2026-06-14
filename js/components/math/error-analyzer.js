/**
 * 易错点分析组件
 * 显示常见错误模式，左右对比错误写法和正确写法
 * @param {Object} props - { title, errors: [{ wrongExpression, correctExpression, wrongName?, correctName?, explanation, severity? }] }
 * @returns {HTMLElement}
 */
import { renderLatexHTML } from '../../utils/latex.js';

export function renderErrorAnalyzer(props) {
  const { title = '易错点分析', errors = [] } = props;

  const container = document.createElement('div');
  container.className = 'math-component error-analyzer fade-in';

  // 头部
  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.innerHTML = `<span>&#9888;</span><span>${escapeHtml(title)}</span>`;
  container.appendChild(header);

  // 内容区
  const body = document.createElement('div');
  body.className = 'math-component-body';

  errors.forEach((error) => {
    const {
      wrongExpression,
      correctExpression,
      wrongName,
      correctName,
      explanation,
      severity = 'warning',
    } = error;

    const itemEl = document.createElement('div');
    itemEl.className = 'error-item';

    // 严重程度指示器 + 标题行
    const titleRow = document.createElement('div');
    titleRow.className = 'error-item-title';

    const severityDot = document.createElement('span');
    severityDot.className = `error-severity ${severity}`;

    const titleText = document.createElement('span');
    titleText.className = 'error-item-name';
    titleText.textContent = wrongName || '常见错误';

    titleRow.appendChild(severityDot);
    titleRow.appendChild(titleText);
    itemEl.appendChild(titleRow);

    // 对比卡片（左右并排）
    const comparison = document.createElement('div');
    comparison.className = 'error-comparison';

    // 左侧：错误写法
    const wrongCard = document.createElement('div');
    wrongCard.className = 'error-wrong';

    const wrongLabel = document.createElement('div');
    wrongLabel.className = 'error-label';
    wrongLabel.innerHTML = '&#10008; 错误写法';

    const wrongExpr = document.createElement('div');
    wrongExpr.className = 'error-expression';
    try {
      wrongExpr.innerHTML = window.katex.renderToString(wrongExpression.trim(), {
        displayMode: true,
        throwOnError: false,
        trust: true,
      });
    } catch {
      wrongExpr.textContent = wrongExpression;
    }

    wrongCard.appendChild(wrongLabel);
    wrongCard.appendChild(wrongExpr);

    // 右侧：正确写法
    const correctCard = document.createElement('div');
    correctCard.className = 'error-correct';

    const correctLabel = document.createElement('div');
    correctLabel.className = 'error-label';
    correctLabel.innerHTML = '&#10004; 正确写法';

    const correctExpr = document.createElement('div');
    correctExpr.className = 'error-expression';
    try {
      correctExpr.innerHTML = window.katex.renderToString(correctExpression.trim(), {
        displayMode: true,
        throwOnError: false,
        trust: true,
      });
    } catch {
      correctExpr.textContent = correctExpression;
    }

    correctCard.appendChild(correctLabel);
    correctCard.appendChild(correctExpr);

    comparison.appendChild(wrongCard);
    comparison.appendChild(correctCard);
    itemEl.appendChild(comparison);

    // 解释文本
    if (explanation) {
      const explanationEl = document.createElement('div');
      explanationEl.className = 'error-explanation';
      explanationEl.innerHTML = renderLatexHTML(explanation);
      itemEl.appendChild(explanationEl);
    }

    body.appendChild(itemEl);
  });

  container.appendChild(body);
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
