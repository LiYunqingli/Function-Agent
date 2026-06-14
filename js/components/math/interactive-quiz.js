/**
 * 交互式小测验组件（DOM）—— 支持多题型混合
 *
 * 题型：single（单选）、multiple（多选）、true-false（判断）、fill-blank（填空）、subjective（主观）
 * 主观题支持展开 AI 解析面板
 * 底部 AI 阅卷：分析答题情况与薄弱点
 *
 * @param {Object} props - { title, questions: [{ type, question, ... }] }
 * @returns {HTMLElement}
 */
import { renderLatexHTML } from '../../utils/latex.js';
import { renderMarkdown } from '../markdown-renderer.js';
import { settingsStore } from '../../stores/settings-store.js';

/* ═══════════════════════════════════════════════
   常量 & 工具
   ═══════════════════════════════════════════════ */

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const TYPE_BADGE = {
  single: '单选',
  multiple: '多选',
  'true-false': '判断',
  'fill-blank': '填空',
  subjective: '主观',
};

const TYPE_TAG_COLOR = {
  single: '#1976d2',
  multiple: '#7c3aed',
  'true-false': '#e65100',
  'fill-blank': '#00838f',
  subjective: '#c62828',
};

/** 归一化 type，兼容旧数据（无 type 字段默认为 single） */
function normalizeType(q) {
  if (q.type && TYPE_BADGE[q.type]) return q.type;
  return 'single';
}

/** 创建通用题目卡片容器 */
function createCard(q, qIdx) {
  const type = normalizeType(q);
  const card = document.createElement('div');
  card.className = 'quiz-card';
  card.dataset.type = type;
  card.dataset.index = qIdx;
  return card;
}

/** 创建题号行（序号 + 题型标签 + 题目） */
function createQuestionRow(qIdx, q) {
  const type = normalizeType(q);
  const row = document.createElement('div');
  row.className = 'quiz-question-row';

  // 题号
  const numSpan = document.createElement('span');
  numSpan.className = 'quiz-num';
  numSpan.textContent = `${qIdx + 1}.`;

  // 题型标签
  const tag = document.createElement('span');
  tag.className = 'quiz-type-tag';
  tag.textContent = TYPE_BADGE[type] || '单选';
  tag.style.background = TYPE_TAG_COLOR[type] || '#1976d2';

  // 题目
  const qSpan = document.createElement('span');
  qSpan.className = 'quiz-question-text';
  qSpan.innerHTML = renderLatexHTML(q.question || '');

  row.appendChild(numSpan);
  row.appendChild(tag);
  row.appendChild(qSpan);
  return row;
}

/** 创建解析区域 */
function createExplanation(q, isCorrect) {
  if (!q.explanation) return null;
  const explain = document.createElement('div');
  explain.className = `quiz-explanation ${isCorrect ? 'quiz-explanation--correct' : 'quiz-explanation--wrong'}`;
  explain.innerHTML = renderLatexHTML((isCorrect ? '✅ 正确！' : '📝 解析：') + q.explanation);
  return explain;
}

/** 通用 hover 效果（单选 / 多选 / 判断按钮） */
function addOptionHover(btn) {
  btn.addEventListener('mouseenter', () => {
    if (!btn.disabled) {
      btn.style.borderColor = 'var(--color-primary, #1976d2)';
      btn.style.background = 'rgba(25,118,210,0.06)';
    }
  });
  btn.addEventListener('mouseleave', () => {
    if (!btn.disabled) {
      btn.style.borderColor = 'var(--color-border-tertiary)';
      btn.style.background = 'var(--color-background-primary)';
    }
  });
}

/** 标记正确/错误按钮 */
function markButton(btn, isCorrect) {
  if (isCorrect) {
    btn.style.borderColor = 'var(--color-success, #43a047)';
    btn.style.background = 'rgba(67,160,71,0.1)';
    btn.style.color = 'var(--color-success, #2e7d32)';
  } else {
    btn.style.borderColor = 'var(--color-danger, #e53935)';
    btn.style.background = 'rgba(229,57,53,0.1)';
    btn.style.color = 'var(--color-danger, #c62828)';
  }
  btn.disabled = true;
  btn.style.cursor = 'default';
}

/* ═══════════════════════════════════════════════
   各题型渲染器
   ═══════════════════════════════════════════════ */

/**
 * 渲染单选题
 * @returns {{ card: HTMLElement, getAnswer: () => any, getAnswerText: () => string }}
 */
function renderSingleChoice(q, qIdx, onAnswer) {
  const card = createCard(q, qIdx);
  card.appendChild(createQuestionRow(qIdx, q));

  const optionsWrap = document.createElement('div');
  optionsWrap.className = 'quiz-options';

  let answered = false;

  (q.options || []).forEach((opt, optIdx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    const optHtml = renderLatexHTML(opt);
    btn.innerHTML = `<span class="quiz-option-label">${OPTION_LABELS[optIdx]}.</span><span class="quiz-option-text">${optHtml}</span>`;
    addOptionHover(btn);

    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;

      // 禁用所有按钮
      optionsWrap.querySelectorAll('button').forEach(b => { b.disabled = true; b.style.cursor = 'default'; });

      const isCorrect = optIdx === q.correctAnswer;
      markButton(btn, isCorrect);

      if (!isCorrect) {
        // 高亮正确答案
        const correctBtn = optionsWrap.children[q.correctAnswer];
        if (correctBtn) markButton(correctBtn, true);
      }

      // 解析
      const explain = createExplanation(q, isCorrect);
      if (explain) card.appendChild(explain);

      onAnswer({
        type: 'single',
        correct: isCorrect,
        selected: optIdx,
        correctIdx: q.correctAnswer,
        question: q.question,
      });
    });

    optionsWrap.appendChild(btn);
  });

  card.appendChild(optionsWrap);

  return {
    card,
    getAnswer: () => answered ? (answered._selected ?? null) : null,
    getAnswerText: () => answered ? `${OPTION_LABELS[answered._selected ?? 0]}` : '未作答',
    isAnswered: () => answered,
  };
}

/**
 * 渲染多选题
 */
function renderMultipleChoice(q, qIdx, onAnswer) {
  const card = createCard(q, qIdx);
  card.appendChild(createQuestionRow(qIdx, q));

  const optionsWrap = document.createElement('div');
  optionsWrap.className = 'quiz-options';

  // 提交按钮
  const submitWrap = document.createElement('div');
  submitWrap.className = 'quiz-multi-submit-wrap';
  const submitBtn = document.createElement('button');
  submitBtn.className = 'quiz-submit-btn';
  submitBtn.textContent = '提交答案';
  submitWrap.appendChild(submitBtn);

  let answered = false;
  const selected = new Set();

  (q.options || []).forEach((opt, optIdx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn quiz-option-btn--checkbox';
    const optHtml = renderLatexHTML(opt);
    btn.innerHTML = `<span class="quiz-checkbox-indicator"></span><span class="quiz-option-label">${OPTION_LABELS[optIdx]}.</span><span class="quiz-option-text">${optHtml}</span>`;
    addOptionHover(btn);

    btn.addEventListener('click', () => {
      if (answered) return;
      if (selected.has(optIdx)) {
        selected.delete(optIdx);
        btn.style.borderColor = 'var(--color-border-tertiary)';
        btn.style.background = 'var(--color-background-primary)';
      } else {
        selected.add(optIdx);
        btn.style.borderColor = 'var(--color-primary, #1976d2)';
        btn.style.background = 'rgba(25,118,210,0.08)';
      }
    });

    optionsWrap.appendChild(btn);
  });

  card.appendChild(optionsWrap);
  card.appendChild(submitWrap);

  submitBtn.addEventListener('click', () => {
    if (answered) return;
    if (selected.size === 0) {
      submitBtn.textContent = '请至少选择一项';
      submitBtn.style.color = 'var(--color-danger, #e53935)';
      setTimeout(() => {
        submitBtn.textContent = '提交答案';
        submitBtn.style.color = '';
      }, 1500);
      return;
    }

    answered = true;
    submitBtn.style.display = 'none';

    const correctSet = new Set(q.correctAnswers || []);
    const isCorrect = selected.size === correctSet.size && [...selected].every(s => correctSet.has(s));

    // 标记每个选项
    optionsWrap.querySelectorAll('button').forEach((btn, idx) => {
      btn.disabled = true;
      btn.style.cursor = 'default';
      if (correctSet.has(idx)) {
        markButton(btn, true);
      } else if (selected.has(idx)) {
        markButton(btn, false);
      }
    });

    // 提示多选结果
    const resultHint = document.createElement('div');
    resultHint.className = `quiz-multi-result ${isCorrect ? 'quiz-multi-result--correct' : 'quiz-multi-result--wrong'}`;
    resultHint.textContent = isCorrect
      ? '✅ 完全正确！'
      : `❌ 部分错误（正确答案：${[...correctSet].map(i => OPTION_LABELS[i]).join('')})`;
    card.appendChild(resultHint);

    const explain = createExplanation(q, isCorrect);
    if (explain) card.appendChild(explain);

    onAnswer({
      type: 'multiple',
      correct: isCorrect,
      selected: [...selected],
      correctIdxs: q.correctAnswers,
      question: q.question,
    });
  });

  return {
    card,
    getAnswer: () => answered ? [...selected] : null,
    getAnswerText: () => answered ? [...selected].map(i => OPTION_LABELS[i]).join('') : '未作答',
    isAnswered: () => answered,
  };
}

/**
 * 渲染判断题
 */
function renderTrueFalse(q, qIdx, onAnswer) {
  const card = createCard(q, qIdx);
  card.appendChild(createQuestionRow(qIdx, q));

  const btnWrap = document.createElement('div');
  btnWrap.className = 'quiz-tf-wrap';

  let answered = false;

  const trueBtn = document.createElement('button');
  trueBtn.className = 'quiz-tf-btn quiz-tf-btn--true';
  trueBtn.textContent = '✓ 正确';
  trueBtn.innerHTML = '<span class="quiz-tf-icon">✓</span><span>正确</span>';

  const falseBtn = document.createElement('button');
  falseBtn.className = 'quiz-tf-btn quiz-tf-btn--false';
  falseBtn.textContent = '✗ 错误';
  falseBtn.innerHTML = '<span class="quiz-tf-icon">✗</span><span>错误';

  function handleAnswer(userValue) {
    if (answered) return;
    answered = true;

    const isCorrect = userValue === q.correctBool;
    const chosenBtn = userValue ? trueBtn : falseBtn;
    const otherBtn = userValue ? falseBtn : trueBtn;

    markButton(chosenBtn, isCorrect);
    otherBtn.disabled = true;
    otherBtn.style.cursor = 'default';
    otherBtn.style.opacity = '0.4';

    if (!isCorrect) {
      const correctBtn = q.correctBool ? trueBtn : falseBtn;
      if (correctBtn !== chosenBtn) {
        correctBtn.style.borderColor = 'var(--color-success, #43a047)';
        correctBtn.style.background = 'rgba(67,160,71,0.1)';
        correctBtn.style.color = 'var(--color-success, #2e7d32)';
      }
    }

    const explain = createExplanation(q, isCorrect);
    if (explain) card.appendChild(explain);

    onAnswer({
      type: 'true-false',
      correct: isCorrect,
      selected: userValue,
      correctBool: q.correctBool,
      question: q.question,
    });
  }

  trueBtn.addEventListener('click', () => handleAnswer(true));
  falseBtn.addEventListener('click', () => handleAnswer(false));

  btnWrap.appendChild(trueBtn);
  btnWrap.appendChild(falseBtn);
  card.appendChild(btnWrap);

  return {
    card,
    getAnswer: () => answered ? (trueBtn.dataset.answered === '1' ? true : false) : null,
    getAnswerText: () => answered ? (q._userAnswer ? '正确' : '错误') : '未作答',
    isAnswered: () => answered,
  };
}

/**
 * 渲染填空题
 */
function renderFillBlank(q, qIdx, onAnswer) {
  const card = createCard(q, qIdx);
  card.appendChild(createQuestionRow(qIdx, q));

  let answered = false;

  const inputWrap = document.createElement('div');
  inputWrap.className = 'quiz-fill-wrap';

  const input = document.createElement('input');
  input.className = 'quiz-fill-input';
  input.type = 'text';
  input.placeholder = '请输入答案...';
  input.autocomplete = 'off';

  const checkBtn = document.createElement('button');
  checkBtn.className = 'quiz-submit-btn';
  checkBtn.textContent = '确认';

  inputWrap.appendChild(input);
  inputWrap.appendChild(checkBtn);
  card.appendChild(inputWrap);

  function check() {
    if (answered) return;
    const userVal = input.value.trim();
    if (!userVal) {
      input.style.borderColor = 'var(--color-danger, #e53935)';
      setTimeout(() => { input.style.borderColor = ''; }, 1000);
      return;
    }

    answered = true;
    input.disabled = true;
    input.style.cursor = 'default';
    checkBtn.style.display = 'none';

    // 不区分大小写匹配
    const acceptable = (q.acceptableAnswers || []).map(a => a.toLowerCase());
    const isCorrect = acceptable.includes(userVal.toLowerCase());

    if (isCorrect) {
      input.style.borderColor = 'var(--color-success, #43a047)';
      input.style.background = 'rgba(67,160,71,0.08)';
    } else {
      input.style.borderColor = 'var(--color-danger, #e53935)';
      input.style.background = 'rgba(229,57,53,0.08)';
      // 显示可接受答案
      const hint = document.createElement('div');
      hint.className = 'quiz-fill-hint';
      hint.textContent = `可接受答案：${q.acceptableAnswers.join(' / ')}`;
      card.appendChild(hint);
    }

    const explain = createExplanation(q, isCorrect);
    if (explain) card.appendChild(explain);

    onAnswer({
      type: 'fill-blank',
      correct: isCorrect,
      selected: userVal,
      acceptableAnswers: q.acceptableAnswers,
      question: q.question,
    });
  }

  checkBtn.addEventListener('click', check);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') check();
  });

  return {
    card,
    getAnswer: () => answered ? input.value.trim() : null,
    getAnswerText: () => answered ? input.value.trim() : '未作答',
    isAnswered: () => answered,
  };
}

/**
 * 渲染主观题（含 AI 解析面板）
 */
function renderSubjective(q, qIdx, onAnswer) {
  const card = createCard(q, qIdx);
  card.appendChild(createQuestionRow(qIdx, q));

  let submitted = false;

  const textarea = document.createElement('textarea');
  textarea.className = 'quiz-subjective-textarea';
  textarea.placeholder = '请在此作答...';
  textarea.rows = 3;

  const actionWrap = document.createElement('div');
  actionWrap.className = 'quiz-subjective-actions';

  const submitBtn = document.createElement('button');
  submitBtn.className = 'quiz-submit-btn';
  submitBtn.textContent = '提交答案';

  const aiAnalyzeBtn = document.createElement('button');
  aiAnalyzeBtn.className = 'quiz-ai-btn';
  aiAnalyzeBtn.textContent = '🤖 AI 解析';

  actionWrap.appendChild(submitBtn);
  actionWrap.appendChild(aiAnalyzeBtn);

  card.appendChild(textarea);
  card.appendChild(actionWrap);

  // AI 解析面板（默认隐藏）
  const aiPanel = document.createElement('div');
  aiPanel.className = 'quiz-ai-panel';
  aiPanel.style.display = 'none';
  const aiContent = document.createElement('div');
  aiContent.className = 'quiz-ai-content';
  const aiLoading = document.createElement('div');
  aiLoading.className = 'quiz-ai-loading';
  aiLoading.innerHTML = '<div class="quiz-ai-spinner"></div><span>AI 正在分析中...</span>';
  aiPanel.appendChild(aiLoading);
  aiPanel.appendChild(aiContent);
  card.appendChild(aiPanel);

  let aiPanelOpen = false;

  // 提交答案
  submitBtn.addEventListener('click', () => {
    if (submitted) return;
    const text = textarea.value.trim();
    if (!text) {
      textarea.style.borderColor = 'var(--color-danger, #e53935)';
      setTimeout(() => { textarea.style.borderColor = ''; }, 1000);
      return;
    }
    submitted = true;
    submitBtn.textContent = '已提交';
    submitBtn.disabled = true;
    submitBtn.style.cursor = 'default';
    submitBtn.style.opacity = '0.6';
    textarea.disabled = true;
    textarea.style.cursor = 'default';

    onAnswer({
      type: 'subjective',
      selected: text,
      question: q.question,
      referenceAnswer: q.referenceAnswer,
      rubric: q.rubric,
    });
  });

  // AI 解析按钮
  aiAnalyzeBtn.addEventListener('click', () => {
    aiPanelOpen = !aiPanelOpen;
    aiPanel.style.display = aiPanelOpen ? 'block' : 'none';
    if (aiPanelOpen) {
      aiAnalyzeBtn.textContent = '🤖 收起解析';
    } else {
      aiAnalyzeBtn.textContent = '🤖 AI 解析';
      return;
    }

    // 如果已有内容则不再请求
    if (aiContent.dataset.loaded === 'true') return;

    // 发起 AI 解析
    const userAnswer = textarea.value.trim() || '（未作答）';
    requestAIAnalysis(q, userAnswer, aiLoading, aiContent);
  });

  return {
    card,
    getAnswer: () => submitted ? textarea.value.trim() : null,
    getAnswerText: () => submitted ? textarea.value.trim().slice(0, 60) + (textarea.value.trim().length > 60 ? '...' : '') : '未作答',
    isAnswered: () => submitted,
  };
}

/* ═══════════════════════════════════════════════
   AI 解析 & 阅卷
   ═══════════════════════════════════════════════ */

/**
 * 调用 LLM 对单道主观题进行解析
 */
async function requestAIAnalysis(q, userAnswer, loadingEl, contentEl) {
  loadingEl.style.display = 'flex';
  contentEl.textContent = '';

  try {
    const settings = settingsStore.getState();
    if (!settings.apiUrl || !settings.apiKey) {
      loadingEl.style.display = 'none';
      contentEl.textContent = '⚠️ 请先在设置中配置 API 连接信息';
      return;
    }

    const prompt = `你是一位高等数学助教，请对以下主观题进行解析评价。

【题目】${q.question}
【学生作答】${userAnswer}
${q.referenceAnswer ? `【参考答案】${q.referenceAnswer}` : ''}
${q.rubric ? `【评分标准】${q.rubric}` : ''}

请从以下方面分析：
1. 答案正确性评估
2. 解题思路分析
3. 改进建议（如果有不足）
4. 关键知识点提醒

请用简洁明了的中文回答，使用 Markdown 格式。`;

    const body = {
      model: settings.model,
      messages: [
        { role: 'system', content: '你是一位专业的高等数学助教，擅长分析学生的解答并给出指导。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1024,
      stream: true,
    };

    const response = await fetch(`${settings.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API 请求失败 (${response.status})`);
    }

    loadingEl.style.display = 'none';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const chunk = JSON.parse(trimmed.slice(6));
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              contentEl.innerHTML = renderMarkdown(fullText);
            }
          } catch { /* ignore */ }
        }
      }
    }

    // 处理 buffer 残余
    if (buffer.trim() && buffer.trim() !== 'data: [DONE]' && buffer.trim().startsWith('data: ')) {
      try {
        const chunk = JSON.parse(buffer.trim().slice(6));
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          contentEl.innerHTML = renderMarkdown(fullText);
        }
      } catch { /* ignore */ }
    }

    contentEl.dataset.loaded = 'true';
  } catch (err) {
    loadingEl.style.display = 'none';
    contentEl.textContent = `❌ AI 解析失败：${err.message}`;
  }
}

/**
 * 底部 AI 阅卷：分析所有作答并给出薄弱点
 */
async function requestAIGrading(questions, answerRecords, panelContent, loadingEl) {
  loadingEl.style.display = 'flex';
  panelContent.textContent = '';

  try {
    const settings = settingsStore.getState();
    if (!settings.apiUrl || !settings.apiKey) {
      loadingEl.style.display = 'none';
      panelContent.textContent = '⚠️ 请先在设置中配置 API 连接信息';
      return;
    }

    // 构建答题摘要
    const summary = questions.map((q, i) => {
      const r = answerRecords[i];
      const type = normalizeType(q);
      let status = '未作答';
      if (r) {
        status = r.correct ? '✅ 正确' : '❌ 错误';
      }
      return `第${i + 1}题 [${TYPE_BADGE[type]}] ${status}\n  题目：${q.question}\n  ${r ? (r.type === 'subjective' ? `作答：${r.selected}` : `作答：${r.getAnswerText ? r.getAnswerText() : '未知'}`) : '未作答'}`;
    }).join('\n\n');

    const correctCount = Object.values(answerRecords).filter(r => r && r.correct).length;
    const totalAuto = questions.filter(q => normalizeType(q) !== 'subjective').length;
    const autoCorrect = questions.filter((q, i) => normalizeType(q) !== 'subjective' && answerRecords[i]?.correct).length;

    const prompt = `你是一位高等数学助教，请对学生的测验结果进行全面分析。

【测验概况】
总题数：${questions.length}
客观题答对：${autoCorrect} / ${totalAuto}
主观题：${questions.filter(q => normalizeType(q) === 'subjective').length} 道
总正确率：${questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0}%

【各题答题详情】
${summary}

请从以下方面进行分析：
1. **总体评价**：整体表现如何
2. **逐题点评**：对每道题的作答进行简要点评
3. **薄弱知识点**：归纳错误题目涉及的薄弱知识点
4. **学习建议**：针对薄弱点给出具体的学习建议
5. **推荐练习**：建议重点练习哪些类型的题目

请用清晰的中文 Markdown 格式回答。`;

    const body = {
      model: settings.model,
      messages: [
        { role: 'system', content: '你是一位专业的高等数学助教，擅长分析学生答题情况、发现薄弱知识点并给出针对性建议。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2048,
      stream: true,
    };

    const response = await fetch(`${settings.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`API 请求失败 (${response.status})`);

    loadingEl.style.display = 'none';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const chunk = JSON.parse(trimmed.slice(6));
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              panelContent.innerHTML = renderMarkdown(fullText);
            }
          } catch { /* ignore */ }
        }
      }
    }

    // 处理 buffer 残余
    if (buffer.trim() && buffer.trim() !== 'data: [DONE]' && buffer.trim().startsWith('data: ')) {
      try {
        const chunk = JSON.parse(buffer.trim().slice(6));
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          panelContent.innerHTML = renderMarkdown(fullText);
        }
      } catch { /* ignore */ }
    }

  } catch (err) {
    loadingEl.style.display = 'none';
    panelContent.textContent = `❌ AI 阅卷失败：${err.message}`;
  }
}

/* ═══════════════════════════════════════════════
   主入口
   ═══════════════════════════════════════════════ */

export function renderInteractiveQuiz(props) {
  const { title, questions = [] } = props;

  const container = document.createElement('div');
  container.className = 'math-component math-component--quiz fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = title || '🧩 交互测验';
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body quiz-body';

  // ── 统计信息 ──
  const statsBar = document.createElement('div');
  statsBar.className = 'quiz-stats-bar';

  // 按题型统计
  const typeCounts = {};
  questions.forEach(q => {
    const t = normalizeType(q);
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const statsLeft = document.createElement('div');
  statsLeft.className = 'quiz-stats-left';
  const totalSpan = document.createElement('span');
  totalSpan.className = 'quiz-stats-total';
  totalSpan.textContent = `共 ${questions.length} 题`;
  statsLeft.appendChild(totalSpan);

  // 题型分布标签
  Object.entries(typeCounts).forEach(([type, count]) => {
    const pill = document.createElement('span');
    pill.className = 'quiz-stats-pill';
    pill.style.background = TYPE_TAG_COLOR[type] || '#1976d2';
    pill.textContent = `${TYPE_BADGE[type]} ${count}`;
    statsLeft.appendChild(pill);
  });

  const statsRight = document.createElement('div');
  statsRight.className = 'quiz-stats-right';
  const scoreText = document.createElement('span');
  scoreText.className = 'quiz-stats-score';
  scoreText.textContent = '得分: — / —';
  statsRight.appendChild(scoreText);

  statsBar.appendChild(statsLeft);
  statsBar.appendChild(statsRight);
  body.appendChild(statsBar);

  // ── 题目渲染 ──
  let correctCount = 0;
  let answeredCount = 0;
  const answerRecords = {}; // qIdx → { type, correct, selected, ... }
  const renderers = [];     // 各题渲染器

  questions.forEach((q, qIdx) => {
    const type = normalizeType(q);
    let renderer;

    switch (type) {
      case 'multiple':
        renderer = renderMultipleChoice(q, qIdx, (record) => {
          answerRecords[qIdx] = { ...record, getAnswerText: renderer.getAnswerText };
          answeredCount++;
          if (record.correct) correctCount++;
          updateScore();
        });
        break;
      case 'true-false':
        renderer = renderTrueFalse(q, qIdx, (record) => {
          answerRecords[qIdx] = { ...record, getAnswerText: renderer.getAnswerText };
          answeredCount++;
          if (record.correct) correctCount++;
          updateScore();
        });
        break;
      case 'fill-blank':
        renderer = renderFillBlank(q, qIdx, (record) => {
          answerRecords[qIdx] = { ...record, getAnswerText: renderer.getAnswerText };
          answeredCount++;
          if (record.correct) correctCount++;
          updateScore();
        });
        break;
      case 'subjective':
        renderer = renderSubjective(q, qIdx, (record) => {
          answerRecords[qIdx] = { ...record, getAnswerText: renderer.getAnswerText };
          answeredCount++;
          // 主观题不计入自动判分
          updateScore();
        });
        break;
      default: // single
        renderer = renderSingleChoice(q, qIdx, (record) => {
          answerRecords[qIdx] = { ...record, getAnswerText: renderer.getAnswerText };
          answeredCount++;
          if (record.correct) correctCount++;
          updateScore();
        });
        break;
    }

    renderers[qIdx] = renderer;
    body.appendChild(renderer.card);
  });

  function updateScore() {
    const autoTotal = questions.filter(q => normalizeType(q) !== 'subjective').length;
    scoreText.textContent = autoTotal > 0
      ? `得分: ${correctCount} / ${answeredCount}`
      : `已答: ${answeredCount} / ${questions.length}`;
  }

  // ── AI 阅卷区域 ──
  const gradingSection = document.createElement('div');
  gradingSection.className = 'quiz-grading-section';

  const gradingBtn = document.createElement('button');
  gradingBtn.className = 'quiz-grading-btn';
  gradingBtn.textContent = '🤖 AI 阅卷分析';

  const gradingPanel = document.createElement('div');
  gradingPanel.className = 'quiz-grading-panel';
  gradingPanel.style.display = 'none';

  const gradingLoading = document.createElement('div');
  gradingLoading.className = 'quiz-ai-loading';
  gradingLoading.innerHTML = '<div class="quiz-ai-spinner"></div><span>AI 正在阅卷分析中...</span>';

  const gradingContent = document.createElement('div');
  gradingContent.className = 'quiz-grading-content';

  gradingPanel.appendChild(gradingLoading);
  gradingPanel.appendChild(gradingContent);
  gradingSection.appendChild(gradingBtn);
  gradingSection.appendChild(gradingPanel);
  body.appendChild(gradingSection);

  let gradingOpen = false;
  gradingBtn.addEventListener('click', () => {
    gradingOpen = !gradingOpen;
    gradingPanel.style.display = gradingOpen ? 'block' : 'none';
    if (gradingOpen) {
      gradingBtn.textContent = '🙈 收起 AI 阅卷';
      if (gradingContent.dataset.loaded !== 'true') {
        requestAIGrading(questions, answerRecords, gradingContent, gradingLoading);
      }
    } else {
      gradingBtn.textContent = '🤖 AI 阅卷分析';
    }
  });

  container.appendChild(body);
  return container;
}
