/**
 * 注册所有工具到 registry
 */
import { registry } from './registry.js';
import { toolSchemas } from './schemas.js';
import { executeRenderLatex } from './definitions/render-latex.js';
import { executePlotFunction } from './definitions/plot-function.js';
import { executeAnimateLimit } from './definitions/animate-limit.js';
import { executeAnimateTaylor } from './definitions/animate-taylor.js';
import { executeShowDifferential } from './definitions/show-differential.js';
import { executePlotIntegral } from './definitions/plot-integral.js';
import { executePlotGradient } from './definitions/plot-gradient.js';
import { executePlotSurface3d } from './definitions/plot-surface-3d.js';
import { executeAnimateRevolution } from './definitions/animate-revolution.js';
import { executeShowStepCard } from './definitions/show-step-card.js';
import { executeShowKnowledgeTip } from './definitions/show-knowledge-tip.js';
import { executeControlSlider } from './definitions/control-slider.js';
import { executePlotPolarCurve } from './definitions/plot-polar-curve.js';
import { executePlotParametricCurve } from './definitions/plot-parametric-curve.js';
import { executeAnimateSeriesConvergence } from './definitions/animate-series-convergence.js';
import { executePlotFourierSeries } from './definitions/plot-fourier-series.js';
import { executePlotMatrixTransform } from './definitions/plot-matrix-transform.js';
import { executePlotEigenvectors } from './definitions/plot-eigenvectors.js';
import { executePlotDistribution } from './definitions/plot-distribution.js';
import { executeAnimateCLT } from './definitions/animate-clt.js';
import { executePlotMultivariableIntegral } from './definitions/plot-multivariable-integral.js';
import { executeShowComparisonTable } from './definitions/show-comparison-table.js';
import { executeInteractiveQuiz } from './definitions/interactive-quiz.js';
import { executePlotSequence } from './definitions/plot-sequence.js';
import { executeShowFormulaHandbook } from './definitions/show-formula-handbook.js';
import { executeShowFlashcards } from './definitions/show-flashcards.js';
import { executeShowErrorAnalyzer } from './definitions/show-error-analyzer.js';
import { executeShowInteractiveProof } from './definitions/show-interactive-proof.js';
import { executeShowConceptMap } from './definitions/show-concept-map.js';

/** 工具名 → 执行器映射 */
const executors = {
  render_latex: executeRenderLatex,
  plot_function: executePlotFunction,
  animate_limit: executeAnimateLimit,
  animate_taylor_series: executeAnimateTaylor,
  show_differential: executeShowDifferential,
  plot_integral_area: executePlotIntegral,
  plot_gradient_field: executePlotGradient,
  plot_surface_3d: executePlotSurface3d,
  animate_solid_of_revolution: executeAnimateRevolution,
  show_step_card: executeShowStepCard,
  show_knowledge_tip: executeShowKnowledgeTip,
  control_parameter_slider: executeControlSlider,
  plot_polar_curve: executePlotPolarCurve,
  plot_parametric_curve: executePlotParametricCurve,
  animate_series_convergence: executeAnimateSeriesConvergence,
  plot_fourier_series: executePlotFourierSeries,
  plot_matrix_transform: executePlotMatrixTransform,
  plot_eigenvectors: executePlotEigenvectors,
  plot_distribution: executePlotDistribution,
  animate_clt: executeAnimateCLT,
  plot_multivariable_integral: executePlotMultivariableIntegral,
  show_comparison_table: executeShowComparisonTable,
  interactive_quiz: executeInteractiveQuiz,
  plot_sequence: executePlotSequence,
  show_formula_handbook: executeShowFormulaHandbook,
  show_flashcards: executeShowFlashcards,
  show_error_analyzer: executeShowErrorAnalyzer,
  show_interactive_proof: executeShowInteractiveProof,
  show_concept_map: executeShowConceptMap,
};

/**
 * 将所有工具注册到 registry
 */
export function registerAllTools() {
  for (const schema of toolSchemas) {
    const name = schema.function.name;
    if (executors[name]) {
      registry.register(schema, executors[name]);
    }
  }
}
