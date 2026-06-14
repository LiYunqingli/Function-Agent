/**
 * 全局配置常量
 */

import {
  buildSystemPrompt,
  DEFAULT_PROMPT_PARTS,
  DEFAULT_VISION_SYSTEM_PROMPT,
} from './prompt.js';

export const STORAGE_KEYS = {
  SESSIONS: 'gaoshu_sessions',
  ACTIVE_SESSION_ID: 'gaoshu_active_session_id',
  SETTINGS: 'gaoshu_settings',
  THEME: 'gaoshu_theme',
};

export const MAX_TOOL_DEPTH = 25;
export const MAX_SESSIONS = 100;
export const MAX_MESSAGES_PER_SESSION = 500;
export const LOCALSTORAGE_QUOTA = 5 * 1024 * 1024; // 5MB

export const DEFAULT_SETTINGS = {
  // ── 大语言模型 ──
  apiUrl: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 4096,
  /** 各分段提示词内容（结构化存储，供设置页分开编辑） */
  promptParts: { ...DEFAULT_PROMPT_PARTS },
  /** 完整 System Prompt（由 promptParts 拼合生成，实际发送给 LLM） */
  systemPrompt: buildSystemPrompt(DEFAULT_PROMPT_PARTS),
  // ── 多模态大模型（图片识别） ──
  visionApiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  visionApiKey: '',
  visionModel: 'qwen3.5-omni-plus-2026-03-15',
  visionSystemPrompt: DEFAULT_VISION_SYSTEM_PROMPT,
  // ── 会话命名 ──
  titleNamingMode: 'first-sentence', // 'first-sentence' | 'ai'
  titleMaxLength: 15,
  // ── 通用 ──
  theme: 'system',
};

/**
 * 工具名 → 前端组件映射
 */
export const TOOL_COMPONENT_MAP = {
  render_latex: 'latex-renderer',
  plot_function: 'function-plot',
  animate_limit: 'limit-animation',
  animate_taylor_series: 'taylor-animation',
  show_differential: 'differential-view',
  plot_integral_area: 'integral-area',
  plot_gradient_field: 'gradient-field',
  plot_surface_3d: 'surface-3d',
  animate_solid_of_revolution: 'solid-revolution',
  show_step_card: 'step-card',
  show_knowledge_tip: 'knowledge-tip',
  control_parameter_slider: 'parameter-slider',
  plot_polar_curve: 'polar-curve',
  plot_parametric_curve: 'parametric-curve',
  animate_series_convergence: 'series-convergence',
  plot_fourier_series: 'fourier-series',
  plot_matrix_transform: 'matrix-transform',
  plot_eigenvectors: 'eigenvectors',
  plot_distribution: 'distribution',
  animate_clt: 'clt-animation',
  plot_multivariable_integral: 'multivariable-integral',
  show_comparison_table: 'comparison-table',
  interactive_quiz: 'interactive-quiz',
  plot_sequence: 'sequence',
};

/**
 * 工具图标映射（emoji）
 */
export const TOOL_ICONS = {
  render_latex: '📝',
  plot_function: '📈',
  animate_limit: '🎯',
  animate_taylor_series: '🔄',
  show_differential: '📏',
  plot_integral_area: '🔲',
  plot_gradient_field: '🧭',
  plot_surface_3d: '🌐',
  animate_solid_of_revolution: '🎡',
  show_step_card: '📋',
  show_knowledge_tip: '💡',
  control_parameter_slider: '🎛️',
  plot_polar_curve: '🔄',
  plot_parametric_curve: '📐',
  animate_series_convergence: '📊',
  plot_fourier_series: '🌊',
  plot_matrix_transform: '🔢',
  plot_eigenvectors: '📐',
  plot_distribution: '📊',
  animate_clt: '🎲',
  plot_multivariable_integral: '📦',
  show_comparison_table: '⚖️',
  interactive_quiz: '🧩',
  plot_sequence: '🔢',
};
