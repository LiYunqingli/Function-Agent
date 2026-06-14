/**
 * 抽认卡组件（DOM）—— 支持 CSS 3D 翻转和间隔重复追踪
 *
 *  props: { title, cards: [{ front, back, category? }], _toolCallId }
 *  间隔重复数据通过 localStorage 持久化，key 为 `flashcard_{_toolCallId}`
 */
import { renderLatexHTML } from '../../utils/latex.js';

const STORAGE_PREFIX = 'flashcard_';

/* localStorage 读写 */

function loadFlashcardData(toolCallId) {
  if (!toolCallId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + toolCallId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveFlashcardData(toolCallId, data) {
  if (!toolCallId) return;
  try {
    localStorage.setItem(STORAGE_PREFIX + toolCallId, JSON.stringify(data));
  } catch { /* quota exceeded → ignore */ }
}

/**
 * 创建抽认卡组件
 * @param {Object} props
 * @returns {HTMLElement}
 */
export function renderFlashcards(props) {
  const { title, cards = [], _toolCallId } = props;

  const container = document.createElement('div');
  container.className = 'math-component math-component--flashcards fade-in';

  // 加载已保存的状态
  const savedData = loadFlashcardData(_toolCallId);
  const knownSet = new Set(savedData?.known || []);
  const unknownSet = new Set(savedData?.unknown || []);
  let currentIndex = savedData?.currentIndex || 0;

  // 确保 currentIndex 有效
  if (currentIndex >= cards.length) currentIndex = 0;

  /* ---- 头部 ---- */
  const header = document.createElement('div');
  header.className = 'math-component-header';
  header.textContent = title || '🃏 抽认卡';
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'math-component-body flashcards-body';

  /* ---- 进度条 ---- */
  const progressWrap = document.createElement('div');
  progressWrap.className = 'flashcards-progress';

  const progressBar = document.createElement('div');
  progressBar.className = 'flashcards-progress-bar';
  progressWrap.appendChild(progressBar);

  const counter = document.createElement('div');
  counter.className = 'flashcards-counter';

  function updateProgress() {
    const reviewed = knownSet.size + unknownSet.size;
    const pct = cards.length > 0 ? (reviewed / cards.length) * 100 : 0;
    progressBar.style.width = pct + '%';
    counter.textContent = '已复习 ' + reviewed + ' / ' + cards.length;
  }

  body.appendChild(progressWrap);
  body.appendChild(counter);
  updateProgress();

  /* ---- 卡片区域 ---- */
  const cardWrapper = document.createElement('div');
  cardWrapper.className = 'flashcard-card-wrapper';

  const cardEl = document.createElement('div');
  cardEl.className = 'flashcard-card';

  const frontEl = document.createElement('div');
  frontEl.className = 'flashcard-front';

  const backEl = document.createElement('div');
  backEl.className = 'flashcard-back';

  cardEl.appendChild(frontEl);
  cardEl.appendChild(backEl);
  cardWrapper.appendChild(cardEl);
  body.appendChild(cardWrapper);

  // 点击翻转
  cardEl.addEventListener('click', () => {
    cardEl.classList.toggle('flipped');
  });

  /* ---- 分类标签 ---- */
  const categoryEl = document.createElement('div');
  categoryEl.className = 'flashcard-category';
  body.appendChild(categoryEl);

  /* ---- 渲染当前卡片 ---- */
  function renderCard() {
    const card = cards[currentIndex];
    if (!card) return;

    // 重置翻转状态（显示正面）
    cardEl.classList.remove('flipped');

    frontEl.innerHTML = renderLatexHTML(card.front || '');
    backEl.innerHTML = renderLatexHTML(card.back || '');

    // 分类标签
    if (card.category) {
      categoryEl.textContent = card.category;
      categoryEl.style.display = '';
    } else {
      categoryEl.textContent = '';
      categoryEl.style.display = 'none';
    }

    // 更新导航按钮状态
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === cards.length - 1;

    // 更新翻转按钮文本
    flipBtn.textContent = cardEl.classList.contains('flipped') ? '👁️ 正面' : '🔄 翻转';
  }

  /* ---- 导航按钮区域 ---- */
  const nav = document.createElement('div');
  nav.className = 'flashcard-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'flashcard-btn flashcard-btn--prev';
  prevBtn.textContent = '◀ 上一张';
  prevBtn.disabled = currentIndex === 0;

  const flipBtn = document.createElement('button');
  flipBtn.className = 'flashcard-btn flashcard-btn--flip';
  flipBtn.textContent = '🔄 翻转';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'flashcard-btn flashcard-btn--next';
  nextBtn.textContent = '下一张 ▶';
  nextBtn.disabled = currentIndex === cards.length - 1;

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      currentIndex--;
      renderCard();
      persistState();
    }
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < cards.length - 1) {
      currentIndex++;
      renderCard();
      persistState();
    }
  });

  flipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cardEl.classList.toggle('flipped');
    flipBtn.textContent = cardEl.classList.contains('flipped') ? '👁️ 正面' : '🔄 翻转';
  });

  nav.appendChild(prevBtn);
  nav.appendChild(flipBtn);
  nav.appendChild(nextBtn);
  body.appendChild(nav);

  /* ---- "知道" 和 "不知道" 按钮 ---- */
  const actionWrap = document.createElement('div');
  actionWrap.className = 'flashcard-actions';

  const knowBtn = document.createElement('button');
  knowBtn.className = 'flashcard-btn flashcard-btn--know';
  knowBtn.innerHTML = '✓ 知道了';

  const dontKnowBtn = document.createElement('button');
  dontKnowBtn.className = 'flashcard-btn flashcard-btn--dont-know';
  dontKnowBtn.innerHTML = '✗ 还不会';

  function markCard(known) {
    if (known) {
      knownSet.add(currentIndex);
      unknownSet.delete(currentIndex);
    } else {
      unknownSet.add(currentIndex);
      knownSet.delete(currentIndex);
    }
    updateProgress();
    persistState();
    checkCompletion();
  }

  knowBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    markCard(true);
  });

  dontKnowBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    markCard(false);
  });

  actionWrap.appendChild(dontKnowBtn);
  actionWrap.appendChild(knowBtn);
  body.appendChild(actionWrap);

  /* ---- 完成检查 ---- */
  const summaryEl = document.createElement('div');
  summaryEl.className = 'flashcard-summary';
  summaryEl.style.display = 'none';
  body.appendChild(summaryEl);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'flashcard-btn flashcard-reset';
  resetBtn.textContent = '🔄 重新开始';
  resetBtn.style.display = 'none';
  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    knownSet.clear();
    unknownSet.clear();
    currentIndex = 0;
    updateProgress();
    persistState();
    summaryEl.style.display = 'none';
    resetBtn.style.display = 'none';
    nav.style.display = '';
    actionWrap.style.display = '';
    cardWrapper.style.display = '';
    categoryEl.style.display = '';
    renderCard();
  });
  body.appendChild(resetBtn);

  function checkCompletion() {
    const reviewed = knownSet.size + unknownSet.size;
    if (reviewed >= cards.length) {
      // 显示总结
      nav.style.display = 'none';
      actionWrap.style.display = 'none';
      cardWrapper.style.display = 'none';
      categoryEl.style.display = 'none';

      summaryEl.innerHTML = '<div class="flashcard-summary-title">🎉 复习完成！</div>' +
        '<div class="flashcard-summary-stats">' +
        '<span class="flashcard-summary-known">✓ 已掌握 ' + knownSet.size + ' 张</span>' +
        '<span class="flashcard-summary-unknown">✗ 待加强 ' + unknownSet.size + ' 张</span>' +
        '</div>' +
        (unknownSet.size > 0 ? '<div class="flashcard-summary-hint">提示：点击「重新开始」可再次复习</div>' : '');
      summaryEl.style.display = 'block';
      resetBtn.style.display = '';
    }
  }

  /* ---- 持久化状态 ---- */
  function persistState() {
    const data = {
      known: [...knownSet],
      unknown: [...unknownSet],
      currentIndex,
    };
    saveFlashcardData(_toolCallId, data);
  }

  // 初始渲染
  renderCard();
  checkCompletion();

  container.appendChild(body);
  return container;
}
