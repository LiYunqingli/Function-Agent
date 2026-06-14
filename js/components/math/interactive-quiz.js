/**
 * 交互式小测验组件（DOM）—— 支持多题型混合
 *
 * 题型：single（单选）、multiple（多选）、true-false（判断）、fill-blank（填空）、subjective（主观）
 * 主观题支持展开 AI 解析面板
 * 底部 AI 阅卷：分析答题情况与薄弱点
 *
 * ★ 持久化：答题数据、AI 解析、AI 阅卷结果均通过 localStorage 持久化
 * ★ AI 阅卷按钮：首次分析后拆分为「收起/展开」+「重新分析」
 *
 * @param {Object} props - { title, questions: [{ type, question, ... }], _toolCallId }
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

const STORAGE_PREFIX = 'quiz_';

/** 归一化 type，兼容旧数据（无 type 字段默认为 single） */
function normalizeType(q) {
  if (q.type && TYPE_BADGE[q.type]) return q.type;
  return 'single';
}

/* ── localStorage 读写 ── */

function loadQuizData(toolCallId) {
  if (!toolCallId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + toolCallId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveQuizData(toolCallId, data) {
  if (!toolCallId) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + toolCallId, JSON.stringify(data));
  } catch { /* quota exceeded → ignore */ }
}

/* ═══════════════════════════════════════════════
   通用 DOM 工厂
   ═══════════════════════════════════════════════ */

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

  const numSpan = document.createElement('span');
  numSpan.className = 'quiz-num';
  numSpan.textContent = `${qIdx + 1}.`;

  const tag = document.createElement('span');
  tag.className = 'quiz-type-tag';
  tag.textContent = TYPE_BADGE[type] || '单选';
  tag.style.background = TYPE_TAG_COLOR[type] || '#1976d2';

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
 * @param {Object} q - 题目数据
 * @param {number} qIdx - 题号
 * @param {Function} onAnswer - 答题回调
 * @param {Object|null} saved - 已保存的答题数据 { selected, correct }
 * @returns {{ card, getAnswerText, isAnswered }}
 */
function renderSingleChoice(q, qIdx, onAnswer, saved) {
  const card = createCard(q, qIdx);
  card.appendChild(createQuestionRow(qIdx, q));

  const optionsWrap = document.createElement('div');
  optionsWrap.className = 'quiz-options';

  let answered = false;
  let selectedIdx = null;
  let isCorrect = false;

  (q.options || []).forEach((opt, optIdx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option-btn';
    const optHtml = renderLatexHTML(opt);
    btn.innerHTML = `<span class="quiz-option-label">${OPTION_LABELS[optIdx]}.</span><span class="quiz-option-text">${optHtml}</span>`;
    addOptionHover(btn);

    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      selectedIdx = optIdx;
      isCorrect = optIdx === q.correctAnswer;

      optionsWrap.querySelectorAll('button').forEach(b => { b.disabled = true; b.style.cursor = 'default'; });
      markButton(btn, isCorrect);
      if (!isCorrect) {
        const correctBtn = optionsWrap.children[q.correctAnswer];
        if (correctBtn) markButton(correctBtn, true);
      }
      const explain = createExplanation(q, isCorrect);
      if (explain) card.appendChild(explain);

      onAnswer({ type: 'single', correct: isCorrect, selected: optIdx, question: q.question });
    });

    optionsWrap.appendChild(btn);
  });

  card.appendChild(optionsWrap);

  // ── 恢复已保存的答题状态 ──
  if (saved && saved.selected != null) {
    answered = true;
    selectedIdx = saved.selected;
    isCorrect = saved.correct;
    optionsWrap.querySelectorAll('button').forEach((b, idx) => {
      b.disabled = true;
      b.style.cursor = 'default';
      if (idx === q.correctAnswer) markButton(b, true);
      else if (idx === saved.selected && !saved.correct) markButton(b, false);
    });
    const explain = createExplanation(q, saved.correct);
    if (explain) card.appendChild(explain);
  }

  return {
    card,
    getAnswerText: () => answered ? `${OPTION_LABELS[selectedIdx ?? 0]}` : '未作答',
    isAnswered: () => answered,
  };
}

/**
 * 渲染多选题
 */
function renderMultipleChoice(q, qIdx, onAnswer, saved) {
  const card = createCard(q, qIdx);
  card.appendChild(createQuestionRow(qIdx, q));

  const optionsWrap = document.createElement('div');
  optionsWrap.className = 'quiz-options';

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

  function doSubmit() {
    if (answered) return;
    if (selected.size === 0) {
      submitBtn.textContent = '请至少选择一项';
      submitBtn.style.color = 'var(--color-danger, #e53935)';
      setTimeout(() => { submitBtn.textContent = '提交答案'; submitBtn.style.color = ''; }, 1500);
      return;
    }

    answered = true;
    submitBtn.style.display = 'none';

    const correctSet = new Set(q.correctAnswers || []);
    const isCorrect = selected.size === correctSet.size && [...selected].every(s => correctSet.has(s));

    optionsWrap.querySelectorAll('button').forEach((btn, idx) => {
      btn.disabled = true;
      btn.style.cursor = 'default';
      if (correctSet.has(idx)) markButton(btn, true);
      else if (selected.has(idx)) markButton(btn, false);
    });

    const resultHint = document.createElement('div');
    resultHint.className = `quiz-multi-result ${isCorrect ? 'quiz-multi-result--correct' : 'quiz-multi-result--wrong'}`;
    resultHint.textContent = isCorrect
      ? '✅ 完全正确！'
      : `❌ 部分错误（正确答案：${[...correctSet].map(i => OPTION_LABELS[i]).join('')})`;
    card.appendChild(resultHint);

    const explain = createExplanation(q, isCorrect);
    if (explain) card.appendChild(explain);

    onAnswer({ type: 'multiple', correct: isCorrect, selected: [...selected], question: q.question });
  }

  submitBtn.addEventListener('click', doSubmit);

  // ── 恢复已保存的答题状态 ──
  if (saved && Array.isArray(saved.selected)) {
    answered = true;
    saved.selected.forEach(i => selected.add(i));
    submitBtn.style.display = 'none';

    const correctSet = new Set(q.correctAnswers || []);
    optionsWrap.querySelectorAll('button').forEach((btn, idx) => {
      btn.disabled = true;
      btn.style.cursor = 'default';
      if (correctSet.has(idx)) markButton(btn, true);
      else if (selected.has(idx)) markButton(btn, false);
    });

    const resultHint = document.createElement('div');
    resultHint.className = `quiz-multi-result ${saved.correct ? 'quiz-multi-result--correct' : 'quiz-multi-result--wrong'}`;
    resultHint.textContent = saved.correct
      ? '✅ 完全正确！'
      : `❌ 部分错误（正确答案：${[...correctSet].map(i => OPTION_LABELS[i]).join('')})`;
    card.appendChild(resultHint);

    const explain = createExplanation(q, saved.correct);
    if (explain) card.appendChild(explain);
  }

  return {
    card,
    getAnswerText: () => answered ? [...selected].map(i => OPTION_LABELS[i]).join('') : '未作答',
    isAnswered: () => answered,
  };
}

/**
 * 渲染判断题
 */
function renderTrueFalse(q, qIdx, onAnswer, saved) {
  const card = createCard(q, qIdx);
  card.appendChild(createQuestionRow(qIdx, q));

  const btnWrap = document.createElement('div');
  btnWrap.className = 'quiz-tf-wrap';

  let answered = false;
  let userValue = null;

  const trueBtn = document.createElement('button');
  trueBtn.className = 'quiz-tf-btn quiz-tf-btn--true';
  trueBtn.innerHTML = '<span class="quiz-tf-icon">✓</span><span>正确</span>';

  const falseBtn = document.createElement('button');
  falseBtn.className = 'quiz-tf-btn quiz-tf-btn--false';
  falseBtn.innerHTML = '<span class="quiz-tf-icon">✗</span><span>错误</span>';

  function handleAnswer(value) {
    if (answered) return;
    answered = true;
    userValue = value;

    const isCorrect = value === q.correctBool;
    const chosenBtn = value ? trueBtn : falseBtn;
    const otherBtn = value ? falseBtn : trueBtn;

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

    onAnswer({ type: 'true-false', correct: isCorrect, selected: value, question: q.question });
  }

  trueBtn.addEventListener('click', () => handleAnswer(true));
  falseBtn.addEventListener('click', () => handleAnswer(false));

  btnWrap.appendChild(trueBtn);
  btnWrap.appendChild(falseBtn);
  card.appendChild(btnWrap);

  // ── 恢复已保存的答题状态 ──
  if (saved && saved.selected != null) {
    answered = true;
    userValue = saved.selected;
    const chosenBtn = saved.selected ? trueBtn : falseBtn;
    const otherBtn = saved.selected ? falseBtn : trueBtn;
    markButton(chosenBtn, saved.correct);
    otherBtn.disabled = true;
    otherBtn.style.cursor = 'default';
    otherBtn.style.opacity = '0.4';
    if (!saved.correct) {
      const correctBtn = q.correctBool ? trueBtn : falseBtn;
      if (correctBtn !== chosenBtn) {
        correctBtn.style.borderColor = 'var(--color-success, #43a047)';
        correctBtn.style.background = 'rgba(67,160,71,0.1)';
        correctBtn.style.color = 'var(--color-success, #2e7d32)';
      }
    }
    const explain = createExplanation(q, saved.correct);
    if (explain) card.appendChild(explain);
  }

  return {
    card,
    getAnswerText: () => answered ? (userValue ? '正确' : '错误') : '未作答',
    isAnswered: () => answered,
  };
}

/**
 * 渲染填空题
 */
function renderFillBlank(q, qIdx, onAnswer, saved) {
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

  function check(userVal) {
    if (answered) return;
    const val = userVal ?? input.value.trim();
    if (!val) {
      input.style.borderColor = 'var(--color-danger, #e53935)';
      setTimeout(() => { input.style.borderColor = ''; }, 1000);
      return;
    }

    answered = true;
    input.disabled = true;
    input.style.cursor = 'default';
    checkBtn.style.display = 'none';

    const acceptable = (q.acceptableAnswers || []).map(a => a.toLowerCase());
    const isCorrect = acceptable.includes(val.toLowerCase());

    if (isCorrect) {
      input.style.borderColor = 'var(--color-success, #43a047)';
      input.style.background = 'rgba(67,160,71,0.08)';
    } else {
      input.style.borderColor = 'var(--color-danger, #e53935)';
      input.style.background = 'rgba(229,57,53,0.08)';
      const hint = document.createElement('div');
      hint.className = 'quiz-fill-hint';
      hint.textContent = `可接受答案：${q.acceptableAnswers.join(' / ')}`;
      card.appendChild(hint);
    }

    const explain = createExplanation(q, isCorrect);
    if (explain) card.appendChild(explain);

    onAnswer({ type: 'fill-blank', correct: isCorrect, selected: val, question: q.question });
  }

  checkBtn.addEventListener('click', () => check());
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });

  // ── 恢复已保存的答题状态 ──
  if (saved && saved.selected != null) {
    input.value = saved.selected;
    check(saved.selected);
  }

  return {
    card,
    getAnswerText: () => answered ? input.value.trim() : '未作答',
    isAnswered: () => answered,
  };
}

/**
 * 渲染主观题（含 AI 解析面板，支持持久化）
 */
function renderSubjective(q, qIdx, onAnswer, saved, savedAI, onSaveAI) {
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
  let aiLoaded = false;
  let aiLoadingActive = false;

  // ── 恢复已保存的主观题答案 ──
  if (saved && saved.selected != null) {
    submitted = true;
    textarea.value = saved.selected;
    submitBtn.textContent = '已提交';
    submitBtn.disabled = true;
    submitBtn.style.cursor = 'default';
    submitBtn.style.opacity = '0.6';
    textarea.disabled = true;
    textarea.style.cursor = 'default';
  }

  // ── 恢复已保存的 AI 解析 ──
  if (savedAI) {
    aiLoaded = true;
    aiContent.innerHTML = renderMarkdown(savedAI);
    aiContent.dataset.loaded = 'true';
  }

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

    onAnswer({ type: 'subjective', selected: text, question: q.question });
  });

  // AI 解析按钮（支持已分析后的收起/展开 + 重新分析）
  aiAnalyzeBtn.addEventListener('click', () => {
    aiPanelOpen = !aiPanelOpen;
    aiPanel.style.display = aiPanelOpen ? 'block' : 'none';
    if (aiPanelOpen) {
      aiAnalyzeBtn.textContent = aiLoaded ? '🙈 收起解析' : '🤖 AI 解析中...';
    } else {
      aiAnalyzeBtn.textContent = aiLoaded ? '🤖 展开解析' : '🤖 AI 解析';
      return;
    }

    if (aiLoaded) return;
    if (aiLoadingActive) return;
    aiLoadingActive = true;

    const userAnswer = textarea.value.trim() || '（未作答）';
    requestAIAnalysis(q, userAnswer, aiLoading, aiContent, (fullText) => {
      aiLoaded = true;
      aiLoadingActive = false;
      onSaveAI(qIdx, fullText);
    });
  });

  return {
    card,
    getAnswerText: () => submitted ? textarea.value.trim().slice(0, 60) + (textarea.value.trim().length > 60 ? '...' : '') : '未作答',
    isAnswered: () => submitted,
  };
}

/* ═══════════════════════════════════════════════
   AI 解析 & 阅卷（流式调用 LLM）
   ═══════════════════════════════════════════════ */

/**
 * 通用 SSE 流式读取
 * @param {Array} messages - 对话消息
 * @param {number} maxTokens
 * @param {Function} [onToken] - 每次收到 token 时的回调（用于流式渲染）
 * @returns {Promise<string>} 完整文本
 */
async function streamLLM(messages, maxTokens = 1024, onToken) {
  const settings = settingsStore.getState();
  if (!settings.apiUrl || !settings.apiKey) throw new Error('请先在设置中配置 API 连接信息');

  const response = await fetch(`${settings.apiUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({ model: settings.model, messages, temperature: 0.4, max_tokens: maxTokens, stream: true }),
  });

  if (!response.ok) throw new Error(`API 请求失败 (${response.status})`);

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
          const delta = JSON.parse(trimmed.slice(6)).choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            if (onToken) onToken(delta, fullText);
          }
        } catch { /* ignore */ }
      }
    }
  }
  // 处理 buffer 残余
  if (buffer.trim() && buffer.trim() !== 'data: [DONE]' && buffer.trim().startsWith('data: ')) {
    try {
      const delta = JSON.parse(buffer.trim().slice(6)).choices?.[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        if (onToken) onToken(delta, fullText);
      }
    } catch { /* ignore */ }
  }
  return fullText;
}

/**
 * 调用 LLM 对单道主观题进行解析（流式渲染）
 */
async function requestAIAnalysis(q, userAnswer, loadingEl, contentEl, onComplete) {
  loadingEl.style.display = 'flex';
  contentEl.textContent = '';

  try {
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

    const fullText = await streamLLM([
      { role: 'system', content: '你是一位专业的高等数学助教，擅长分析学生的解答并给出指导。' },
      { role: 'user', content: prompt },
    ], 1024, (delta, full) => {
      // 流式渲染
      contentEl.innerHTML = renderMarkdown(full);
    });

    contentEl.dataset.loaded = 'true';
    if (onComplete) onComplete(fullText);
  } catch (err) {
    loadingEl.style.display = 'none';
    contentEl.textContent = `❌ AI 解析失败：${err.message}`;
  } finally {
    loadingEl.style.display = 'none';
  }
}

/**
 * 底部 AI 阅卷：流式分析所有作答并给出薄弱点
 */
async function requestAIGrading(questions, answerRecords, panelContent, loadingEl, onComplete) {
  loadingEl.style.display = 'flex';
  panelContent.textContent = '';

  try {
    // 构建答题摘要
    const summary = questions.map((q, i) => {
      const r = answerRecords[i];
      const type = normalizeType(q);
      let status = '未作答';
      if (r) status = r.correct ? '✅ 正确' : '❌ 错误';
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

    const fullText = await streamLLM([
      { role: 'system', content: '你是一位专业的高等数学助教，擅长分析学生答题情况、发现薄弱知识点并给出针对性建议。' },
      { role: 'user', content: prompt },
    ], 2048, (delta, full) => {
      panelContent.innerHTML = renderMarkdown(full);
    });

    panelContent.dataset.loaded = 'true';
    if (onComplete) onComplete(fullText);
  } catch (err) {
    panelContent.textContent = `❌ AI 阅卷失败：${err.message}`;
  } finally {
    loadingEl.style.display = 'none';
  }
}

/* ═══════════════════════════════════════════════
   主入口
   ═══════════════════════════════════════════════ */

export function renderInteractiveQuiz(props) {
  const { title, questions = [], _toolCallId } = props;

  const container = document.createElement('div');
  container.className = 'math-component math-component--quiz fade-in';

  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = title || '🧩 交互测验';
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body quiz-body';

  // ── 加载已保存的 quiz 数据 ──
  const savedData = loadQuizData(_toolCallId);
  const savedAnswers = savedData?.answers || {};
  const savedAIAnalysis = savedData?.aiAnalysis || {};
  const savedGradingText = savedData?.aiGrading || null;

  // ── 统计信息 ──
  const statsBar = document.createElement('div');
  statsBar.className = 'quiz-stats-bar';

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
  statsRight.appendChild(scoreText);

  statsBar.appendChild(statsLeft);
  statsBar.appendChild(statsRight);
  body.appendChild(statsBar);

  // ── 题目渲染 ──
  let correctCount = 0;
  let answeredCount = 0;
  const answerRecords = {}; // qIdx → { type, correct, selected, ... }
  const renderers = [];

  /** 保存答题数据到 localStorage */
  function persistAnswers() {
    const data = loadQuizData(_toolCallId) || {};
    data.answers = {};
    for (const [idx, rec] of Object.entries(answerRecords)) {
      data.answers[idx] = { type: rec.type, correct: rec.correct, selected: rec.selected };
    }
    saveQuizData(_toolCallId, data);
  }

  /** 保存主观题 AI 解析 */
  function persistAIAnalysis(qIdx, text) {
    const data = loadQuizData(_toolCallId) || {};
    if (!data.aiAnalysis) data.aiAnalysis = {};
    data.aiAnalysis[qIdx] = text;
    saveQuizData(_toolCallId, data);
  }

  /** 保存 AI 阅卷结果 */
  function persistGrading(text) {
    const data = loadQuizData(_toolCallId) || {};
    data.aiGrading = text;
    saveQuizData(_toolCallId, data);
  }

  /** 更新得分显示 */
  function updateScore() {
    const autoTotal = questions.filter(q => normalizeType(q) !== 'subjective').length;
    scoreText.textContent = autoTotal > 0
      ? `得分: ${correctCount} / ${answeredCount}`
      : `已答: ${answeredCount} / ${questions.length}`;
  }

  questions.forEach((q, qIdx) => {
    const type = normalizeType(q);
    const saved = savedAnswers[qIdx] || null;
    const savedAI = savedAIAnalysis[qIdx] || null;
    let renderer;

    switch (type) {
      case 'multiple':
        renderer = renderMultipleChoice(q, qIdx, (record) => {
          answerRecords[qIdx] = record;
          answeredCount++;
          if (record.correct) correctCount++;
          updateScore();
          persistAnswers();
        }, saved);
        break;
      case 'true-false':
        renderer = renderTrueFalse(q, qIdx, (record) => {
          answerRecords[qIdx] = record;
          answeredCount++;
          if (record.correct) correctCount++;
          updateScore();
          persistAnswers();
        }, saved);
        break;
      case 'fill-blank':
        renderer = renderFillBlank(q, qIdx, (record) => {
          answerRecords[qIdx] = record;
          answeredCount++;
          if (record.correct) correctCount++;
          updateScore();
          persistAnswers();
        }, saved);
        break;
      case 'subjective':
        renderer = renderSubjective(q, qIdx, (record) => {
          answerRecords[qIdx] = record;
          answeredCount++;
          updateScore();
          persistAnswers();
        }, saved, savedAI, persistAIAnalysis);
        break;
      default: // single
        renderer = renderSingleChoice(q, qIdx, (record) => {
          answerRecords[qIdx] = record;
          answeredCount++;
          if (record.correct) correctCount++;
          updateScore();
          persistAnswers();
        }, saved);
        break;
    }

    renderers[qIdx] = renderer;
    body.appendChild(renderer.card);

    // ── 恢复已保存的答题统计 ──
    if (saved) {
      answerRecords[qIdx] = saved;
      answerRecords[qIdx].getAnswerText = renderer.getAnswerText;
      answeredCount++;
      if (saved.correct) correctCount++;
    }
  });

  updateScore();

  // ── AI 阅卷区域 ──
  const gradingSection = document.createElement('div');
  gradingSection.className = 'quiz-grading-section';

  // 按钮容器
  const gradingBtnWrap = document.createElement('div');
  gradingBtnWrap.className = 'quiz-grading-btn-wrap';

  const gradingBtn = document.createElement('button');
  gradingBtn.className = 'quiz-grading-btn';
  gradingBtn.textContent = '🤖 AI 阅卷分析';

  const reGradeBtn = document.createElement('button');
  reGradeBtn.className = 'quiz-regrade-btn';
  reGradeBtn.textContent = '🔄 重新分析';
  reGradeBtn.style.display = 'none';

  gradingBtnWrap.appendChild(gradingBtn);
  gradingBtnWrap.appendChild(reGradeBtn);

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
  gradingSection.appendChild(gradingBtnWrap);
  gradingSection.appendChild(gradingPanel);
  body.appendChild(gradingSection);

  let gradingOpen = false;
  let gradingLoaded = !!savedGradingText;
  let gradingLoadingActive = false;

  // ── 恢复已保存的阅卷结果 ──
  if (savedGradingText) {
    gradingContent.innerHTML = renderMarkdown(savedGradingText);
    gradingContent.dataset.loaded = 'true';
    // 切换按钮状态：显示「展开阅卷」+「重新分析」
    gradingBtn.textContent = '👁️ 展开阅卷';
    reGradeBtn.style.display = '';
  }

  /** 执行阅卷分析 */
  function doGrading() {
    if (gradingLoadingActive) return;
    gradingLoadingActive = true;
    gradingLoaded = false;
    requestAIGrading(questions, answerRecords, gradingContent, gradingLoading, (fullText) => {
      gradingLoaded = true;
      gradingLoadingActive = false;
      persistGrading(fullText);
      // 分析完成后：显示展开/收起 + 重新分析
      gradingBtn.textContent = gradingOpen ? '🙈 收起阅卷' : '👁️ 展开阅卷';
      reGradeBtn.style.display = '';
    });
  }

  // AI 阅卷按钮（收起/展开 / 首次分析）
  gradingBtn.addEventListener('click', () => {
    if (gradingLoaded) {
      // 已分析过 → 收起/展开
      gradingOpen = !gradingOpen;
      gradingPanel.style.display = gradingOpen ? 'block' : 'none';
      gradingBtn.textContent = gradingOpen ? '🙈 收起阅卷' : '👁️ 展开阅卷';
    } else {
      // 首次分析
      gradingOpen = true;
      gradingPanel.style.display = 'block';
      gradingBtn.textContent = '🙈 收起阅卷';
      doGrading();
    }
  });

  // 重新分析按钮
  reGradeBtn.addEventListener('click', () => {
    if (!confirm('确定要重新进行 AI 阅卷分析吗？')) return;
    gradingOpen = true;
    gradingPanel.style.display = 'block';
    gradingBtn.textContent = '🙈 收起阅卷';
    doGrading();
  });

  container.appendChild(body);
  return container;
}
