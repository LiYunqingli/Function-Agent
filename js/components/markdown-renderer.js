/**
 * Markdown + LaTeX 渲染器
 */
import { escapeHtml } from '../utils/helpers.js';

const katex = window.katex;
const marked = window.marked;

// 配置 marked
marked.setOptions({
  highlight: function (code, lang) {
    if (window.hljs && lang && window.hljs.getLanguage(lang)) {
      try {
        return window.hljs.highlight(code, { language: lang }).value;
      } catch {
        // 降级
      }
    }
    return code;
  },
  breaks: true,
  gfm: true,
});

/**
 * 渲染 Markdown + LaTeX 内容
 * 处理顺序：提取 LaTeX → Markdown 渲染 → 还原 LaTeX
 * @param {string} content - Markdown 文本（含 $...$ 和 $$...$$ LaTeX）
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(content) {
  if (!content) return '';

  // 1. 提取并保护块级 LaTeX $$...$$
  const blockMath = [];
  let processed = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    const placeholder = `%%BLOCK_MATH_${blockMath.length}%%`;
    blockMath.push(formula.trim());
    return placeholder;
  });

  // 2. 提取并保护行内 LaTeX $...$
  const inlineMath = [];
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
    const placeholder = `%%INLINE_MATH_${inlineMath.length}%%`;
    inlineMath.push(formula.trim());
    return placeholder;
  });

  // 3. 使用 marked 渲染 Markdown
  let html = marked.parse(processed);

  // 4. 还原块级 LaTeX
  blockMath.forEach((formula, i) => {
    html = html.replace(`%%BLOCK_MATH_${i}%%`, renderKatex(formula, true));
  });

  // 5. 还原行内 LaTeX
  inlineMath.forEach((formula, i) => {
    html = html.replace(`%%INLINE_MATH_${i}%%`, renderKatex(formula, false));
  });

  return html;
}

/**
 * 使用 KaTeX 渲染单个公式
 * @param {string} formula - LaTeX 公式
 * @param {boolean} displayMode - 是否展示模式
 * @returns {string} HTML 字符串
 */
function renderKatex(formula, displayMode) {
  try {
    return katex.renderToString(formula, {
      displayMode,
      throwOnError: false,
      trust: true,
    });
  } catch {
    return `<span class="katex-error" style="color:var(--color-error);font-family:var(--font-mono);font-size:0.9em;">${escapeHtml(formula)}</span>`;
  }
}