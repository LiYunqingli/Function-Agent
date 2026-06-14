/**
 * 学习统计 Store —— 追踪学习数据
 */
import { Store } from './store-base.js';

const STORAGE_KEY = 'gaoshu_learning_stats';

/** 工具名到数学分支的映射 */
const TOOL_TOPIC_MAP = {
  // 微积分
  plot_function: '微积分',
  animate_limit: '微积分',
  show_differential: '微积分',
  plot_integral_area: '微积分',
  animate_taylor_series: '微积分',
  animate_series_convergence: '微积分',
  plot_polar_curve: '微积分',
  plot_parametric_curve: '微积分',
  animate_solid_of_revolution: '微积分',
  plot_multivariable_integral: '微积分',
  plot_sequence: '微积分',
  plot_gradient_field: '微积分',
  plot_surface_3d: '微积分',
  plot_fourier_series: '微积分',
  // 线性代数
  plot_matrix_transform: '线性代数',
  plot_eigenvectors: '线性代数',
  // 概率统计
  plot_distribution: '概率统计',
  animate_clt: '概率统计',
  // 通用学习工具
  show_step_card: '解题技巧',
  show_knowledge_tip: '知识点',
  show_formula_handbook: '公式手册',
  show_error_analyzer: '错题分析',
  show_comparison_table: '对比分析',
  interactive_quiz: '互动测验',
  control_parameter_slider: '交互探索',
  render_latex: '公式渲染',
  show_flashcards: '记忆卡片',
};

class LearningStatsStore extends Store {
  constructor() {
    super();
    this._state = {
      stats: {
        totalQuestions: 0,
        topicCounts: {},
        toolUsage: {},
        quizStats: {
          totalAttempted: 0,
          totalCorrect: 0,
        },
        studyTimeMinutes: 0,
        dailyTime: {},
        sessionCount: 0,
        lastActiveDate: null,
      }
    };
    this._loadFromStorage();
    this._startTime = Date.now();
    // 每分钟更新学习时间
    this._trackTimeInterval = setInterval(() => this._trackTime(), 60000);
  }

  /** 从 localStorage 加载统计数据 */
  _loadFromStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === 'object') {
        this._state.stats = {
          totalQuestions: saved.totalQuestions || 0,
          topicCounts: saved.topicCounts || {},
          toolUsage: saved.toolUsage || {},
          quizStats: saved.quizStats || { totalAttempted: 0, totalCorrect: 0 },
          studyTimeMinutes: saved.studyTimeMinutes || 0,
          dailyTime: saved.dailyTime || {},
          sessionCount: saved.sessionCount || 0,
          lastActiveDate: saved.lastActiveDate || null,
        };
      }
    } catch {
      // 解析失败时使用默认值
    }
  }

  /** 持久化到 localStorage */
  _saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state.stats));
    } catch {
      // 容量不足时忽略
    }
  }

  /** 每分钟自动追踪学习时间 */
  _trackTime() {
    const stats = this._state.stats;
    stats.studyTimeMinutes += 1;
    const today = new Date().toISOString().slice(0, 10);
    stats.dailyTime[today] = (stats.dailyTime[today] || 0) + 1;
    // 每分钟保存一次
    this._saveToStorage();
    this.setState({ stats: { ...stats } });
  }

  /** 记录工具调用 */
  recordToolUsage(toolName) {
    const stats = { ...this._state.stats };
    stats.totalQuestions += 1;
    stats.toolUsage[toolName] = (stats.toolUsage[toolName] || 0) + 1;

    // 映射到数学分支
    const topic = TOOL_TOPIC_MAP[toolName] || '其他';
    stats.topicCounts[topic] = (stats.topicCounts[topic] || 0) + 1;

    const today = new Date().toISOString().slice(0, 10);
    stats.lastActiveDate = today;

    this._state.stats = stats;
    this._saveToStorage();
    this.setState({ stats });
  }

  /** 记录测验结果 */
  recordQuizAttempt(correct) {
    const stats = { ...this._state.stats };
    stats.quizStats.totalAttempted += 1;
    if (correct) stats.quizStats.totalCorrect += 1;

    this._state.stats = stats;
    this._saveToStorage();
    this.setState({ stats });
  }

  /** 记录新会话 */
  recordSession() {
    const stats = { ...this._state.stats };
    stats.sessionCount += 1;
    this._state.stats = stats;
    this._saveToStorage();
    this.setState({ stats });
  }

  /** 获取当前统计数据 */
  getStats() {
    return { ...this._state.stats };
  }

  /** 获取分支分布数据（排序） */
  getTopicDistribution() {
    const topicCounts = this._state.stats.topicCounts || {};
    return Object.entries(topicCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** 获取工具使用频率（排序） */
  getToolUsageDistribution() {
    const toolUsage = this._state.stats.toolUsage || {};
    return Object.entries(toolUsage)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count);
  }

  /** 测验正确率（百分比） */
  getQuizAccuracy() {
    const q = this._state.stats.quizStats;
    if (q.totalAttempted === 0) return 0;
    return Math.round((q.totalCorrect / q.totalAttempted) * 100);
  }

  /** 今日学习时间（分钟） */
  getStudyTimeToday() {
    const today = new Date().toISOString().slice(0, 10);
    return this._state.stats.dailyTime[today] || 0;
  }

  /** 总学习时间（分钟） */
  getStudyTimeTotal() {
    return this._state.stats.studyTimeMinutes || 0;
  }

  /** 格式化时间为 X小时Y分钟 */
  formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}小时${m}分钟`;
    return `${m}分钟`;
  }

  /** 重置所有统计数据 */
  resetStats() {
    this._state.stats = {
      totalQuestions: 0,
      topicCounts: {},
      toolUsage: {},
      quizStats: { totalAttempted: 0, totalCorrect: 0 },
      studyTimeMinutes: 0,
      dailyTime: {},
      sessionCount: 0,
      lastActiveDate: null,
    };
    this._saveToStorage();
    this.setState({ stats: { ...this._state.stats } });
  }

  /** 清理定时器 */
  destroy() {
    if (this._trackTimeInterval) {
      clearInterval(this._trackTimeInterval);
      this._trackTimeInterval = null;
    }
  }
}

export const learningStatsStore = new LearningStatsStore();
