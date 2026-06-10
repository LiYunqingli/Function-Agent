/**
 * mathjs 安全求值封装
 */

// 获取 mathjs 实例（CDN 全局加载）
const math = window.math;

// 危险模式过滤：阻止可能执行任意代码的表达式
const DANGEROUS_PATTERNS = /(\bimport\b|\brequire\b|\beval\b|\bFunction\b|\bwindow\b|\bdocument\b|\bthis\b|\b__proto__\b|\bconstructor\b|\bprototype\b)/i;

/**
 * 安全求值
 * @param {string} expression - 数学表达式
 * @param {Object} scope - 变量作用域
 * @returns {number|null}
 */
export function safeEvaluate(expression, scope = {}) {
  if (DANGEROUS_PATTERNS.test(expression)) {
    throw new Error(`表达式包含不安全内容: ${expression}`);
  }
  try {
    const result = math.evaluate(expression, scope);
    return typeof result === 'number' ? result : Number(result);
  } catch (e) {
    throw new Error(`表达式求值失败: ${e.message}`);
  }
}

/**
 * 批量求值，生成绘图数据点
 * @param {string} expression - 如 "sin(x)"
 * @param {number[]} xValues - x 值数组
 * @param {Object} scope - 额外变量
 * @returns {{x: number[], y: number[]}}
 */
export function safeEvaluateTable(expression, xValues, scope = {}) {
  const yValues = [];
  for (const x of xValues) {
    try {
      const y = safeEvaluate(expression, { ...scope, x });
      yValues.push(Number.isFinite(y) ? y : null);
    } catch {
      yValues.push(null);
    }
  }
  return { x: xValues, y: yValues };
}

/**
 * 数值微分（中心差分法）
 * @param {string} expression - 数学表达式
 * @param {number} x - 求导点
 * @param {number} h - 步长
 * @param {Object} scope - 额外变量
 * @returns {number}
 */
export function numericalDerivative(expression, x, h = 1e-7, scope = {}) {
  const fPlus = safeEvaluate(expression, { ...scope, x: x + h });
  const fMinus = safeEvaluate(expression, { ...scope, x: x - h });
  return (fPlus - fMinus) / (2 * h);
}

/**
 * 生成等间距数组
 * @param {number} start - 起始值
 * @param {number} end - 终止值
 * @param {number} n - 点数
 * @returns {number[]}
 */
export function linspace(start, end, n = 100) {
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + i * step);
}

/**
 * 生成网格数据（用于 3D 图表）
 * @param {number[]} xRange - [min, max]
 * @param {number[]} yRange - [min, max]
 * @param {number} resolution - 分辨率
 * @returns {{xValues: number[], yValues: number[]}}
 */
export function meshgrid(xRange, yRange, resolution = 40) {
  const xValues = linspace(xRange[0], xRange[1], resolution);
  const yValues = linspace(yRange[0], yRange[1], resolution);
  return { xValues, yValues };
}