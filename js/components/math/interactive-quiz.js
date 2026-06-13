/**
 * 交互式小测验组件（DOM）
 * LLM 出题，前端渲染选择题卡片，用户作答后即时反馈
 * @param {Object} props - { title, questions: [{ question, options, correctAnswer, explanation }] }
 * @returns {HTMLElement}
 */
export function renderInteractiveQuiz(props) {
  const { title, questions = [] } = props;

  const container = document.createElement('div');
  container.className = 'math-component fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = title || '🧩 交互测验';
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body';

  // 进度信息
  const progress = document.createElement('div');
  progress.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
  const progressText = document.createElement('span');
  progressText.style.cssText = 'font-size:13px;color:var(--color-text-secondary);';
  progressText.textContent = `共 ${questions.length} 题`;
  const scoreText = document.createElement('span');
  scoreText.style.cssText = 'font-size:13px;font-weight:500;color:var(--color-text-primary);';
  scoreText.textContent = '得分: 0 / 0';
  progress.appendChild(progressText);
  progress.appendChild(scoreText);
  body.appendChild(progress);

  let correct = 0;
  let answered = 0;

  questions.forEach((q, qIdx) => {
    const card = document.createElement('div');
    card.style.cssText = 'margin-bottom:16px;padding:16px;border:1px solid var(--color-border-tertiary);border-radius:12px;background:var(--color-background-secondary);';

    // 题号
    const qNum = document.createElement('div');
    qNum.style.cssText = 'font-size:14px;font-weight:500;margin-bottom:8px;color:var(--color-text-primary);';
    qNum.textContent = `${qIdx + 1}.`;
    card.appendChild(qNum);

    // 题目（支持 LaTeX）
    const qText = document.createElement('div');
    qText.style.cssText = 'font-size:14px;line-height:1.6;margin-bottom:12px;';
    let html = q.question || '';
    html = html
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => {
        try { return window.katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false, trust: true }); }
        catch { return html; }
      })
      .replace(/\$([^$\n]+?)\$/g, (_, formula) => {
        try { return window.katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false, trust: true }); }
        catch { return html; }
      });
    qText.innerHTML = html;
    card.appendChild(qText);

    // 选项
    const optionsWrap = document.createElement('div');
    optionsWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
    (q.options || []).forEach((opt, optIdx) => {
      const optBtn = document.createElement('button');
      optBtn.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border:1px solid var(--color-border-tertiary);border-radius:8px;background:var(--color-background-primary);color:var(--color-text-primary);cursor:pointer;font-size:14px;text-align:left;line-height:1.5;width:100%;transition:border-color 0.2s,background 0.2s,color 0.2s,box-shadow 0.2s;';
      optBtn.innerHTML = `<span style="font-weight:500;min-width:20px;color:var(--color-text-primary);">${optionLabels[optIdx]}.</span><span style="color:var(--color-text-primary);">${opt}</span>`;

      // 悬浮颜色反馈
      optBtn.addEventListener('mouseenter', () => {
        if (!optBtn.disabled) {
          optBtn.style.borderColor = 'var(--color-primary, #1976d2)';
          optBtn.style.background = 'rgba(25,118,210,0.06)';
          optBtn.style.boxShadow = '0 0 0 2px rgba(25,118,210,0.12)';
        }
      });
      optBtn.addEventListener('mouseleave', () => {
        if (!optBtn.disabled) {
          optBtn.style.borderColor = 'var(--color-border-tertiary)';
          optBtn.style.background = 'var(--color-background-primary)';
          optBtn.style.boxShadow = 'none';
        }
      });

      optBtn.addEventListener('click', () => {
        // 禁用所有选项
        const allBtns = optionsWrap.querySelectorAll('button');
        allBtns.forEach(b => { b.disabled = true; b.style.cursor = 'default'; });

        const isCorrect = optIdx === q.correctAnswer;

        if (isCorrect) {
          optBtn.style.borderColor = 'var(--color-success, #43a047)';
          optBtn.style.background = 'rgba(67,160,71,0.1)';
          optBtn.style.color = 'var(--color-success, #2e7d32)';
          correct++;
        } else {
          optBtn.style.borderColor = 'var(--color-danger, #e53935)';
          optBtn.style.background = 'rgba(229,57,53,0.1)';
          optBtn.style.color = 'var(--color-danger, #c62828)';
          // 高亮正确答案
          const correctBtn = allBtns[q.correctAnswer];
          if (correctBtn) {
            correctBtn.style.borderColor = 'var(--color-success, #43a047)';
            correctBtn.style.background = 'rgba(67,160,71,0.1)';
            correctBtn.style.color = 'var(--color-success, #2e7d32)';
          }
        }

        answered++;
        scoreText.textContent = `得分: ${correct} / ${answered}`;

        // 解析
        if (q.explanation) {
          const explain = document.createElement('div');
          explain.style.cssText = `margin-top:8px;padding:8px 12px;border-radius:8px;font-size:13px;line-height:1.6;background:${isCorrect ? 'rgba(67,160,71,0.08)' : 'rgba(229,57,53,0.08)'};color:var(--color-text-secondary);`;
          explain.textContent = isCorrect ? '正确! ' + q.explanation : '解析: ' + q.explanation;
          card.appendChild(explain);
        }
      });

      optionsWrap.appendChild(optBtn);
    });

    card.appendChild(optionsWrap);
    body.appendChild(card);
  });

  container.appendChild(body);
  return container;
}
