/**
 * LaTeX 渲染工具
 * 统一处理所有 LaTeX 定界符，转为 KaTeX 渲染后的 HTML
 */

/**
 * 将包含 LaTeX 的字符串转为可安全渲染的 HTML
 * 支持 \(...)  $...$  $$...$$ 三种定界符
 * @param {string} raw - 原始字符串
 * @returns {string} 渲染后的 HTML
 */
export function renderLatexHTML(raw = '') {
  if (!raw) return '';
  let html = raw;

  // $$...$$ → displayMode（必须最先处理，避免被 $...$ 误匹配）
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try {
      return window.katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return _;
    }
  });

  // \(...\) → inline
  html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => {
    try {
      return window.katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return _;
    }
  });

  // $...$ → inline（避免匹配 $$...$$ 的残留 $）
  html = html.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, formula) => {
    try {
      return window.katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return _;
    }
  });

  return html;
}
