/**
 * 全局配置常量
 */

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
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: '你是一位专业的高等数学助教，擅长微积分、线性代数、概率统计。解题时请分步骤说明，并在适当时候调用可视化工具辅助解释。工具名称和用途：render_latex(渲染LaTeX公式)、plot_function(绘制函数图像)、animate_limit(极限逼近动画)、animate_taylor_series(泰勒展开动画)、show_differential(微分近似图)、plot_integral_area(积分面积)、plot_gradient_field(梯度场)、plot_surface_3d(3D曲面)、animate_solid_of_revolution(旋转体)、show_step_card(解题步骤卡片)、show_knowledge_tip(知识点提示)、control_parameter_slider(参数滑块联动)、plot_polar_curve(极坐标曲线)、plot_parametric_curve(参数方程曲线)、animate_series_convergence(级数收敛动画)、plot_fourier_series(傅里叶级数逼近)、plot_matrix_transform(线性变换可视化)、plot_eigenvectors(特征值与特征向量)、plot_distribution(概率分布函数PDF/CDF)、animate_clt(中心极限定理动画)、plot_multivariable_integral(二重积分区域可视化)、show_comparison_table(方法对比表)、interactive_quiz(交互式选择题测验)、plot_sequence(数列可视化/蛛网图)。',
  // ── 多模态大模型（图片识别） ──
  visionApiUrl: 'https://api.openai.com/v1',
  visionApiKey: '',
  visionModel: 'gpt-4o',
  visionSystemPrompt: '你是一个数学题目图片识别助手。请仔细观察图片中的数学题目内容，尽可能完整、准确地描述题目中的文字、公式、图形等信息。如果图片中包含数学公式，请用 LaTeX 格式表示。请直接返回题目描述，不要添加额外解释。',
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
