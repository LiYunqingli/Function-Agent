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