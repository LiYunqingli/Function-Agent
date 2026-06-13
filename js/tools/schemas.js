/**
 * 24 个工具的 OpenAI Function Calling Schema 定义
 */
export const toolSchemas = [
  // 1. render_latex —— 渲染 LaTeX 数学公式
  {
    type: 'function',
    function: {
      name: 'render_latex',
      description: '渲染 LaTeX 数学公式，支持分步展示',
      parameters: {
        type: 'object',
        properties: {
          latex: {
            type: 'string',
            description: '要渲染的 LaTeX 公式',
          },
          displayMode: {
            type: 'boolean',
            description: '是否使用展示模式（默认 true）',
            default: true,
          },
          steps: {
            type: 'array',
            description: '分步展示的公式列表',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string', description: '步骤标签' },
                formula: { type: 'string', description: 'LaTeX 公式' },
              },
              required: ['formula'],
            },
          },
        },
      },
    },
  },

  // 2. plot_function —— 绘制函数图像
  {
    type: 'function',
    function: {
      name: 'plot_function',
      description: '绘制一个或多个函数的图像，支持切线、积分区域等叠加显示',
      parameters: {
        type: 'object',
        properties: {
          functions: {
            type: 'array',
            description: '要绘制的函数列表',
            items: {
              type: 'object',
              properties: {
                expression: { type: 'string', description: '数学表达式，如 sin(x)' },
                label: { type: 'string', description: '图例标签' },
                color: { type: 'string', description: '线条颜色' },
              },
              required: ['expression'],
            },
          },
          xRange: {
            type: 'array',
            description: 'x 轴范围 [min, max]',
            items: { type: 'number' },
            default: [-10, 10],
          },
          yRange: {
            type: 'array',
            description: 'y 轴范围 [min, max]（可选，自动适配）',
            items: { type: 'number' },
          },
          integralRegion: {
            type: 'object',
            description: '积分区域填充',
            properties: {
              expression: { type: 'string', description: '积分函数表达式' },
              lower: { type: 'number', description: '积分下限' },
              upper: { type: 'number', description: '积分上限' },
            },
            required: ['lower', 'upper'],
          },
          showTangent: {
            type: 'object',
            description: '显示切线',
            properties: {
              expression: { type: 'string', description: '函数表达式' },
              x0: { type: 'number', description: '切点 x 坐标' },
            },
            required: ['x0'],
          },
          showGrid: {
            type: 'boolean',
            description: '是否显示网格（默认 true）',
            default: true,
          },
        },
        required: ['functions'],
      },
    },
  },

  // 3. animate_limit —— 极限逼近动画
  {
    type: 'function',
    function: {
      name: 'animate_limit',
      description: '展示极限逼近过程的动画，观察函数值随自变量趋近目标点的变化',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '数学表达式，如 sin(x)/x',
          },
          approachPoint: {
            type: 'number',
            description: '逼近的目标点 x₀',
          },
          limitValue: {
            type: 'number',
            description: '极限值（可选，用于验证）',
          },
          direction: {
            type: 'string',
            enum: ['left', 'right', 'both'],
            description: '逼近方向（默认 both）',
            default: 'both',
          },
          steps: {
            type: 'number',
            description: '动画步数（默认 20）',
            default: 20,
          },
          stepInterval: {
            type: 'number',
            description: '动画步进间隔（毫秒，默认 250）',
            default: 250,
          },
        },
        required: ['expression', 'approachPoint'],
      },
    },
  },

  // 4. animate_taylor_series —— 泰勒级数展开动画
  {
    type: 'function',
    function: {
      name: 'animate_taylor_series',
      description: '展示泰勒级数逐步逼近原函数的动画过程',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '原函数表达式，如 sin(x)',
          },
          center: {
            type: 'number',
            description: '展开中心点（默认 0）',
            default: 0,
          },
          maxOrder: {
            type: 'number',
            description: '最高展开阶数（默认 8）',
            default: 8,
          },
          xRange: {
            type: 'array',
            description: 'x 轴范围 [min, max]',
            items: { type: 'number' },
            default: [-6, 6],
          },
          stepInterval: {
            type: 'number',
            description: '动画步进间隔（毫秒，默认 800）',
            default: 800,
          },
        },
        required: ['expression'],
      },
    },
  },

  // 5. show_differential —— 微分近似示意图
  {
    type: 'function',
    function: {
      name: 'show_differential',
      description: '展示微分近似的几何意义：切线增量 dy 与函数实际增量 Δy 的对比',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '函数表达式',
          },
          x0: {
            type: 'number',
            description: '考察点 x₀',
          },
          dx: {
            type: 'number',
            description: '自变量增量 Δx（默认 0.5）',
            default: 0.5,
          },
        },
        required: ['expression', 'x0'],
      },
    },
  },

  // 6. plot_integral_area —— 积分面积可视化
  {
    type: 'function',
    function: {
      name: 'plot_integral_area',
      description: '可视化定积分的面积，支持交互式调整积分区间和黎曼和展示',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '被积函数表达式',
          },
          lowerBound: {
            type: 'number',
            description: '积分下限',
          },
          upperBound: {
            type: 'number',
            description: '积分上限',
          },
          interactive: {
            type: 'boolean',
            description: '是否启用交互式滑块（默认 false）',
            default: false,
          },
          showRiemannSum: {
            type: 'boolean',
            description: '是否显示黎曼和矩形（默认 false）',
            default: false,
          },
          riemannN: {
            type: 'number',
            description: '黎曼和分割数（默认 10）',
            default: 10,
          },
        },
        required: ['expression', 'lowerBound', 'upperBound'],
      },
    },
  },

  // 7. plot_gradient_field —— 梯度场向量可视化
  {
    type: 'function',
    function: {
      name: 'plot_gradient_field',
      description: '绘制二元函数的梯度场向量图，可叠加等高线',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '二元函数表达式，含 x 和 y 变量',
          },
          xRange: {
            type: 'array',
            description: 'x 轴范围 [min, max]',
            items: { type: 'number' },
            default: [-5, 5],
          },
          yRange: {
            type: 'array',
            description: 'y 轴范围 [min, max]',
            items: { type: 'number' },
            default: [-5, 5],
          },
          density: {
            type: 'number',
            description: '向量密度（默认 15）',
            default: 15,
          },
          showContour: {
            type: 'boolean',
            description: '是否叠加等高线（默认 true）',
            default: true,
          },
        },
        required: ['expression'],
      },
    },
  },

  // 8. plot_surface_3d —— 三维曲面图
  {
    type: 'function',
    function: {
      name: 'plot_surface_3d',
      description: '绘制三维曲面图，支持视角旋转',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '二元函数表达式，含 x 和 y 变量，如 sin(sqrt(x^2+y^2))',
          },
          xRange: {
            type: 'array',
            description: 'x 轴范围 [min, max]',
            items: { type: 'number' },
            default: [-5, 5],
          },
          yRange: {
            type: 'array',
            description: 'y 轴范围 [min, max]',
            items: { type: 'number' },
            default: [-5, 5],
          },
          resolution: {
            type: 'number',
            description: '网格分辨率（默认 40）',
            default: 40,
          },
          colorScale: {
            type: 'string',
            description: '颜色方案（默认 Viridis）',
            default: 'Viridis',
          },
        },
        required: ['expression'],
      },
    },
  },

  // 9. animate_solid_of_revolution —— 旋转体动画
  {
    type: 'function',
    function: {
      name: 'animate_solid_of_revolution',
      description: '展示旋转体的生成动画，将函数曲线绕坐标轴旋转形成立体',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '函数表达式',
          },
          axis: {
            type: 'string',
            enum: ['x', 'y'],
            description: '旋转轴（默认 x）',
            default: 'x',
          },
          xFrom: {
            type: 'number',
            description: '旋转起始 x 值',
          },
          xTo: {
            type: 'number',
            description: '旋转终止 x 值',
          },
          stepInterval: {
            type: 'number',
            description: '动画步进间隔（毫秒，默认 200）',
            default: 200,
          },
          angleIncrement: {
            type: 'number',
            description: '每步旋转角度增量（度，默认 10）',
            default: 10,
          },
        },
        required: ['expression', 'xFrom', 'xTo'],
      },
    },
  },

  // 10. show_step_card —— 解题步骤卡片
  {
    type: 'function',
    function: {
      name: 'show_step_card',
      description: '展示分步解题过程，每步可含公式、状态标注和注释',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '解题卡片标题',
          },
          steps: {
            type: 'array',
            description: '解题步骤列表',
            items: {
              type: 'object',
              properties: {
                index: { type: 'number', description: '步骤序号' },
                description: { type: 'string', description: '步骤描述' },
                formula: { type: 'string', description: '步骤公式（LaTeX）' },
                status: {
                  type: 'string',
                  enum: ['normal', 'correct', 'error', 'highlight'],
                  description: '步骤状态',
                  default: 'normal',
                },
                annotation: { type: 'string', description: '步骤注释' },
              },
              required: ['description'],
            },
          },
        },
        required: ['steps'],
      },
    },
  },

  // 11. show_knowledge_tip —— 知识点提示
  {
    type: 'function',
    function: {
      name: 'show_knowledge_tip',
      description: '展示数学知识点提示框，支持定义、定理、公式、备注等类型',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['definition', 'theorem', 'formula', 'note'],
            description: '知识点类型',
          },
          title: {
            type: 'string',
            description: '知识点标题',
          },
          content: {
            type: 'string',
            description: '知识点内容（支持 LaTeX）',
          },
          conditions: {
            type: 'string',
            description: '适用条件或前提',
          },
        },
        required: ['type', 'title', 'content'],
      },
    },
  },

  // 12. control_parameter_slider —— 参数滑块联动
  {
    type: 'function',
    function: {
      name: 'control_parameter_slider',
      description: '创建带参数滑块的交互式函数图像，拖动滑块实时更新图像',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '含参数的函数表达式，如 a*sin(b*x)',
          },
          parameters: {
            type: 'array',
            description: '参数定义列表',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: '参数名' },
                min: { type: 'number', description: '最小值' },
                max: { type: 'number', description: '最大值' },
                step: { type: 'number', description: '步长' },
                default: { type: 'number', description: '默认值' },
              },
              required: ['name', 'min', 'max'],
            },
          },
          xRange: {
            type: 'array',
            description: 'x 轴范围 [min, max]',
            items: { type: 'number' },
            default: [-10, 10],
          },
        },
        required: ['expression', 'parameters'],
      },
    },
  },

  // 13. plot_polar_curve —— 极坐标曲线
  {
    type: 'function',
    function: {
      name: 'plot_polar_curve',
      description: '绘制极坐标曲线，如玫瑰线、心形线、螺线等',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '极坐标方程 r = f(θ)，变量为 theta，如 2*cos(3*theta)',
          },
          thetaRange: {
            type: 'array',
            description: 'θ 范围 [min, max]（默认 [0, 2π]）',
            items: { type: 'number' },
            default: [0, 6.2832],
          },
          points: {
            type: 'number',
            description: '采样点数（默认 500）',
            default: 500,
          },
        },
        required: ['expression'],
      },
    },
  },

  // 14. plot_parametric_curve —— 参数方程曲线
  {
    type: 'function',
    function: {
      name: 'plot_parametric_curve',
      description: '绘制参数方程曲线 x=f(t), y=g(t)，支持动画展示轨迹',
      parameters: {
        type: 'object',
        properties: {
          xExpression: {
            type: 'string',
            description: 'x(t) 表达式，变量为 t',
          },
          yExpression: {
            type: 'string',
            description: 'y(t) 表达式，变量为 t',
          },
          tRange: {
            type: 'array',
            description: 't 范围 [min, max]（默认 [0, 2π]）',
            items: { type: 'number' },
            default: [0, 6.2832],
          },
          points: {
            type: 'number',
            description: '采样点数（默认 500）',
            default: 500,
          },
          showMotion: {
            type: 'boolean',
            description: '是否展示运动轨迹动画（默认 false）',
            default: false,
          },
        },
        required: ['xExpression', 'yExpression'],
      },
    },
  },

  // 15. animate_series_convergence —— 级数收敛动画
  {
    type: 'function',
    function: {
      name: 'animate_series_convergence',
      description: '展示级数部分和的收敛过程，逐步增加项数观察逼近效果',
      parameters: {
        type: 'object',
        properties: {
          seriesExpression: {
            type: 'string',
            description: '通项表达式 an（可选），如 1/n',
          },
          partialSumExpression: {
            type: 'string',
            description: '部分和 Sn 的表达式，变量为 n',
          },
          maxTerms: {
            type: 'number',
            description: '最大展示项数（默认 20）',
            default: 20,
          },
          nRange: {
            type: 'array',
            description: 'n 的范围 [min, max]',
            items: { type: 'number' },
            default: [1, 50],
          },
          stepInterval: {
            type: 'number',
            description: '动画步进间隔（毫秒，默认 300）',
            default: 300,
          },
        },
        required: ['partialSumExpression'],
      },
    },
  },

  // 16. plot_fourier_series —— 傅里叶级数逼近
  {
    type: 'function',
    function: {
      name: 'plot_fourier_series',
      description: '展示傅里叶级数逐步逼近目标波形（方波、锯齿波、三角波）的过程',
      parameters: {
        type: 'object',
        properties: {
          targetFunction: {
            type: 'string',
            enum: ['square', 'sawtooth', 'triangle'],
            description: '目标波形类型',
            default: 'square',
          },
          maxTerms: {
            type: 'number',
            description: '最大展开项数（默认 10）',
            default: 10,
          },
          xRange: {
            type: 'array',
            description: 'x 轴范围 [min, max]',
            items: { type: 'number' },
            default: [-6.2832, 6.2832],
          },
        },
      },
    },
  },

  // 17. plot_matrix_transform —— 线性变换可视化
  {
    type: 'function',
    function: {
      name: 'plot_matrix_transform',
      description: '可视化 2x2 矩阵对平面的线性变换效果，展示变换前后的对比',
      parameters: {
        type: 'object',
        properties: {
          matrix: {
            type: 'array',
            description: '2x2 变换矩阵 [[a,b],[c,d]]',
            items: { type: 'array', items: { type: 'number' } },
          },
          showBasis: {
            type: 'boolean',
            description: '是否显示基向量（默认 true）',
            default: true,
          },
        },
        required: ['matrix'],
      },
    },
  },

  // 18. plot_eigenvectors —— 特征值与特征向量
  {
    type: 'function',
    function: {
      name: 'plot_eigenvectors',
      description: '可视化 2x2 矩阵的特征值和特征向量，在向量场中展示',
      parameters: {
        type: 'object',
        properties: {
          matrix: {
            type: 'array',
            description: '2x2 矩阵 [[a,b],[c,d]]',
            items: { type: 'array', items: { type: 'number' } },
          },
        },
        required: ['matrix'],
      },
    },
  },

  // 19. plot_distribution —— 概率分布函数
  {
    type: 'function',
    function: {
      name: 'plot_distribution',
      description: '绘制概率分布的 PDF 和 CDF 曲线，支持正态、均匀、指数、Gamma、Beta、卡方、t 分布',
      parameters: {
        type: 'object',
        properties: {
          distribution: {
            type: 'string',
            enum: ['normal', 'uniform', 'exponential', 'gamma', 'beta', 'chi_squared', 't'],
            description: '分布类型',
            default: 'normal',
          },
          params: {
            type: 'object',
            description: '分布参数，如 {mean:0, std:1} 或 {lambda:2} 等',
          },
        },
        required: ['distribution'],
      },
    },
  },

  // 20. animate_clt —— 中心极限定理动画
  {
    type: 'function',
    function: {
      name: 'animate_clt',
      description: '中心极限定理动画：从任意分布抽样，逐步展示样本均值的分布趋向正态分布',
      parameters: {
        type: 'object',
        properties: {
          sourceDistribution: {
            type: 'string',
            enum: ['uniform', 'exponential', 'bernoulli'],
            description: '源分布类型',
            default: 'uniform',
          },
          sampleSizes: {
            type: 'array',
            description: '可切换的样本量列表',
            items: { type: 'number' },
            default: [1, 2, 5, 10, 30, 50],
          },
          samplesPerStep: {
            type: 'number',
            description: '每步抽样的样本数（默认 500）',
            default: 500,
          },
          numSteps: {
            type: 'number',
            description: '动画步数（默认 20）',
            default: 20,
          },
          stepInterval: {
            type: 'number',
            description: '动画步进间隔（毫秒，默认 200）',
            default: 200,
          },
        },
      },
    },
  },

  // 21. plot_multivariable_integral —— 多元积分区域可视化
  {
    type: 'function',
    function: {
      name: 'plot_multivariable_integral',
      description: '在三维空间可视化二重积分的积分区域和体积，并给出数值积分近似值',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '二元函数表达式，含 x 和 y 变量',
          },
          xRange: {
            type: 'array',
            description: 'x 轴范围 [min, max]',
            items: { type: 'number' },
            default: [-3, 3],
          },
          yRange: {
            type: 'array',
            description: 'y 轴范围 [min, max]',
            items: { type: 'number' },
            default: [-3, 3],
          },
          resolution: {
            type: 'number',
            description: '网格分辨率（默认 30）',
            default: 30,
          },
        },
        required: ['expression'],
      },
    },
  },

  // 22. show_comparison_table —— 方法对比表
  {
    type: 'function',
    function: {
      name: 'show_comparison_table',
      description: '生成结构化对比表格，用于比较不同方法的异同，如积分方法、收敛判别法等',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '表格标题',
          },
          headers: {
            type: 'array',
            description: '表头列表',
            items: { type: 'string' },
          },
          rows: {
            type: 'array',
            description: '表格行数据，每行为字符串数组',
            items: { type: 'array', items: { type: 'string' } },
          },
        },
        required: ['headers', 'rows'],
      },
    },
  },

  // 23. interactive_quiz —— 交互式小测验
  {
    type: 'function',
    function: {
      name: 'interactive_quiz',
      description: '生成交互式选择题测验，用户点击选项后即时反馈对错和解析',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '测验标题',
          },
          questions: {
            type: 'array',
            description: '题目列表',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string', description: '题目内容（支持 LaTeX）' },
                options: { type: 'array', items: { type: 'string' }, description: '选项列表' },
                correctAnswer: { type: 'number', description: '正确答案索引（从 0 开始）' },
                explanation: { type: 'string', description: '答案解析' },
              },
              required: ['question', 'options', 'correctAnswer'],
            },
          },
        },
        required: ['questions'],
      },
    },
  },

  // 24. plot_sequence —— 数列可视化
  {
    type: 'function',
    function: {
      name: 'plot_sequence',
      description: '可视化数列，支持散点图和蛛网图（递推数列），可显示收敛趋势',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '数列通项或递推表达式，变量为 n',
          },
          nRange: {
            type: 'array',
            description: 'n 的范围 [min, max]',
            items: { type: 'number' },
            default: [1, 20],
          },
          mode: {
            type: 'string',
            enum: ['scatter', 'numberline', 'cobweb'],
            description: '展示模式：scatter(散点)、numberline(数轴标注)、cobweb(蛛网图)',
            default: 'scatter',
          },
          showConvergence: {
            type: 'boolean',
            description: '是否显示收敛趋势线（默认 true）',
            default: true,
          },
        },
        required: ['expression'],
      },
    },
  },
];