/**
 * 全局配置常量
 */

export const STORAGE_KEYS = {
  SESSIONS: 'gaoshu_sessions',
  ACTIVE_SESSION_ID: 'gaoshu_active_session_id',
  SETTINGS: 'gaoshu_settings',
  THEME: 'gaoshu_theme',
};

export const MAX_TOOL_DEPTH = 5;
export const MAX_SESSIONS = 100;
export const MAX_MESSAGES_PER_SESSION = 500;
export const LOCALSTORAGE_QUOTA = 5 * 1024 * 1024; // 5MB

export const DEFAULT_SETTINGS = {
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: '你是一位专业的高等数学助教，擅长微积分、线性代数、概率统计。解题时请分步骤说明，并在适当时候调用可视化工具辅助解释。当你需要绘制函数图像、展示极限过程、演示积分区域、展示3D曲面等场景时，请调用对应的可视化工具。工具名称和用途：render_latex(渲染LaTeX公式)、plot_function(绘制函数图像)、animate_limit(极限逼近动画)、animate_taylor_series(泰勒展开动画)、show_differential(微分近似图)、plot_integral_area(积分面积)、plot_gradient_field(梯度场)、plot_surface_3d(3D曲面)、animate_solid_of_revolution(旋转体)、show_step_card(解题步骤卡片)、show_knowledge_tip(知识点提示)、control_parameter_slider(参数滑块联动)。',
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
};