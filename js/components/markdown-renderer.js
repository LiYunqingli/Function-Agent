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
 * @param {string} content - Markdown 文本（支持 \(...\) / \[...\] / $...$ / $$...$$ LaTeX）
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(content) {
  if (!content) return '';

  // ★ 统一数学公式占位符存储（不区分块级/行内，统一编号避免冲突）
  const mathPlaceholders = [];
  const PLACEHOLDER_PREFIX = '%%MATH_';

  // 1. 提取并保护所有数学公式（按顺序：\[...\] → $$...$$ → \(...\) → $...$）
  let processed = content
    // 1a. 块级 LaTeX: \[...\]  （模型常用格式）
    .replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
      const idx = mathPlaceholders.length;
      mathPlaceholders.push({ formula: formula.trim(), displayMode: true });
      return `${PLACEHOLDER_PREFIX}${idx}%%`;
    })
    // 1b. 块级 LaTeX: $$...$$
    .replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
      const idx = mathPlaceholders.length;
      mathPlaceholders.push({ formula: formula.trim(), displayMode: true });
      return `${PLACEHOLDER_PREFIX}${idx}%%`;
    })
    // 2a. 行内 LaTeX: \(...\)  （模型常用格式）
    .replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
      const idx = mathPlaceholders.length;
      mathPlaceholders.push({ formula: formula.trim(), displayMode: false });
      return `${PLACEHOLDER_PREFIX}${idx}%%`;
    })
    // 2b. 行内 LaTeX: $...$
    .replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
      const idx = mathPlaceholders.length;
      mathPlaceholders.push({ formula: formula.trim(), displayMode: false });
      return `${PLACEHOLDER_PREFIX}${idx}%%`;
    });

  // 3. 使用 marked 渲染 Markdown
  let html = marked.parse(processed);

  // 4. 还原所有数学公式（倒序遍历保证替换准确）
  for (let i = mathPlaceholders.length - 1; i >= 0; i--) {
    const { formula, displayMode } = mathPlaceholders[i];
    html = html.replace(`${PLACEHOLDER_PREFIX}${i}%%`, renderKatex(formula, displayMode));
  }

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