# Function-Agent

> AI 驱动的高等数学智能助手 —— 通过自然语言对话 + 可视化图形组件，让抽象数学概念变得直观可理解。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tools](https://img.shields.io/badge/LLM_Tools-24-orange.svg)

## 产品定位

Function-Agent 面向高校学生，覆盖 **微积分、线性代数、概率统计** 三大数学主干课程。用户只需用自然语言提问，AI 会自动调用前端可视化组件来辅助解释数学概念。

**核心特性**：
- 自然语言问答，支持 Markdown + LaTeX 公式渲染
- 24 个可视化工具组件，LLM 通过 Function Calling 自动调用
- 纯前端架构，数据全部存于 localStorage，无需后端服务
- 用户自带 API Key，零部署、零运维

## 快速开始

### 1. 打开应用

直接用浏览器打开 `index.html` 即可运行（需要网络环境加载 CDN 资源）：

```bash
# 方式一：直接打开
open index.html

# 方式二：本地 HTTP 服务（推荐，避免部分浏览器 CORS 限制）
npx serve .
# 或
python -m http.server 8080
```

### 2. 配置 API

点击右上角设置按钮，填入你的 LLM API 信息：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| API URL | OpenAI 兼容接口地址 | `https://api.openai.com/v1` |
| API Key | 你的 API 密钥 | `sk-...` |
| Model | 模型名称 | `gpt-4o`、`qwen-plus`、`deepseek-chat` 等 |

> 支持任何兼容 OpenAI Function Calling 协议的 API 服务（OpenAI、DeepSeek、Qwen、Ollama 等）。

### 3. 开始使用

在输入框中输入数学问题，例如：
- "求 lim(x→0) sin(x)/x"
- "画出 sin(x) 的图像及其泰勒展开"
- "可视化矩阵 [[2,1],[1,2]] 的线性变换效果"
- "正态分布 N(0,1) 的 PDF 和 CDF 是什么样子"
- "帮我出一道关于不定积分的测验题"

## 技术架构

### 工具链四段解耦

每个可视化组件遵循统一的四段式架构，新增组件只需按标准流程编写，无需修改核心代码：

```
┌─────────────┐    ┌──────────────┐    ┌────────────┐    ┌─────────────┐
│   schemas    │───▶│  definitions  │───▶│  executor   │───▶│  renderer   │
│  (参数 Schema)│    │ (工具执行逻辑) │    │ (调用分发器) │    │ (前端渲染器) │
└─────────────┘    └──────────────┘    └────────────┘    └─────────────┘
      │                   │                   │                  │
  schemas.js      definitions/*.js      executor.js    components/math/*.js
```

1. **Schema** (`js/tools/schemas.js`) — OpenAI Function Calling 参数定义，描述 LLM 可调用的工具
2. **Definition** (`js/tools/definitions/*.js`) — 工具执行逻辑，解析参数并返回渲染数据
3. **Executor** (`js/tools/executor.js`) — 根据工具名分发给对应 definition
4. **Renderer** (`js/components/math/*.js`) — 前端可视化渲染（Plotly / Canvas 2D / DOM）

### 核心模块

```
js/
├── app.js                  # 应用入口，初始化各模块
├── config.js               # 全局配置（API、工具映射、图标等）
│
├── tools/                  # 工具链层
│   ├── schemas.js          # 24 个 Function Calling Schema
│   ├── register-all.js     # 工具注册中心
│   ├── registry.js         # 工具注册表
│   ├── executor.js         # 工具执行器
│   └── definitions/        # 各工具的执行逻辑
│       ├── plot-function.js
│       ├── animate-limit.js
│       ├── plot-matrix-transform.js
│       └── ... (24 个)
│
├── components/             # UI 组件层
│   ├── chat-area.js        # 聊天主区域
│   ├── message-list.js    # 消息列表
│   ├── message-bubble.js   # 消息气泡
│   ├── input-bar.js       # 输入栏
│   ├── sidebar.js         # 侧边栏（会话管理）
│   ├── settings-dialog.js # 设置弹窗
│   ├── tool-call-card.js   # 工具调用卡片（聚焦/全屏）
│   ├── markdown-renderer.js # Markdown + LaTeX 渲染
│   └── math/              # 数学可视化渲染器
│       ├── function-plot.js
│       ├── limit-animation.js
│       ├── matrix-transform.js
│       └── ... (24 个)
│
├── services/               # 服务层
│   ├── ai-client.js       # LLM API 客户端（SSE 流式）
│   ├── stream-parser.js   # 流式响应解析器
│   ├── math-evaluator.js  # 数学表达式求值（mathjs）
│   └── storage-adapter.js # localStorage 适配器
│
├── stores/                 # 状态管理层（发布-订阅）
│   ├── chat-store.js       # 会话 & 消息状态
│   ├── settings-store.js  # 设置状态
│   ├── tool-store.js       # 工具调用状态
│   └── store-base.js       # Store 基类
│
└── utils/                  # 工具函数
    ├── dom.js             # DOM 操作辅助
    ├── formatters.js      # 格式化
    ├── helpers.js         # 通用辅助
    └── id.js              # UUID 生成
```

### 样式层

```
css/
├── variables.css           # CSS 变量（颜色、间距、字体）
├── base.css                # 基础重置与全局样式
├── layout.css              # 页面布局（header + sidebar + main）
├── sidebar.css             # 侧边栏样式
├── chat.css                # 聊天区域
├── message.css             # 消息气泡 + 工具卡片 + 全屏模式
├── math-components.css     # 数学组件专用样式
├── settings.css           # 设置弹窗
├── modal.css               # 通用弹窗
└── animations.css          # 动画与过渡
```

## 工具组件一览（24 个）

### 微积分（12 个）

| 工具名 | 功能 | 渲染技术 |
|--------|------|----------|
| `plot_function` | 函数图像绘制（多曲线、积分区域填充、切线） | Plotly 2D |
| `animate_limit` | 极限逼近动画（x→x₀，双侧/左/右） | Canvas 2D 动画 |
| `animate_taylor_series` | 泰勒级数逐项叠加逼近动画 | Plotly 动画 |
| `show_differential` | 微分近似示意图（dy vs Δy） | Plotly |
| `plot_integral_area` | 定积分面积填充 + 黎曼和（可拖拽区间） | Plotly |
| `plot_gradient_field` | 二元函数梯度向量场 + 等高线 | Plotly |
| `plot_surface_3d` | 三维曲面可视化（拖拽旋转） | Plotly 3D |
| `animate_solid_of_revolution` | 旋转体生成动画 | Plotly 3D 动画 |
| `plot_polar_curve` | 极坐标曲线（玫瑰线、心形线、螺线） | Plotly 2D |
| `plot_parametric_curve` | 参数方程曲线（支持运动轨迹动画） | Plotly 2D |
| `animate_series_convergence` | 级数部分和收敛过程动画 | Plotly 动画 |
| `plot_multivariable_integral` | 二重积分 3D 区域 + 数值积分 | Plotly 3D |

### 线性代数（2 个）

| 工具名 | 功能 | 渲染技术 |
|--------|------|----------|
| `plot_matrix_transform` | 2×2 矩阵线性变换前后对比 | Canvas 2D 双画面 |
| `plot_eigenvectors` | 特征值/特征向量 + 向量场可视化 | Canvas 2D |

### 概率统计（2 个）

| 工具名 | 功能 | 渲染技术 |
|--------|------|----------|
| `plot_distribution` | 7 种概率分布的 PDF + CDF（正态、均匀、指数、Gamma、Beta、卡方、t） | Plotly |
| `animate_clt` | 中心极限定理抽样演示动画 | Plotly 直方图 |

### 级数与数列（2 个）

| 工具名 | 功能 | 渲染技术 |
|--------|------|----------|
| `plot_fourier_series` | 傅里叶级数逼近波形（方波/锯齿波/三角波，可调项数） | Plotly |
| `plot_sequence` | 数列可视化（散点图、数轴标注、蛛网图） | Plotly |

### UI 辅助（6 个）

| 工具名 | 功能 | 渲染技术 |
|--------|------|----------|
| `render_latex` | LaTeX 公式渲染（多行、对齐、分步推导） | KaTeX DOM |
| `show_step_card` | 解题步骤卡片（支持正确/错误/高亮标注） | DOM 卡片 |
| `show_knowledge_tip` | 知识点提示（定义/定理/公式/注意） | DOM 卡片 |
| `control_parameter_slider` | 参数滑块联动函数图像 | Plotly + 滑块 |
| `show_comparison_table` | 结构化方法对比表（支持 LaTeX） | DOM 表格 |
| `interactive_quiz` | 交互式选择题测验（即时反馈对错） | DOM 卡片 |

## 新增组件指南

只需 7 步即可添加一个新工具组件：

1. **编写 Schema** — 在 `js/tools/schemas.js` 中添加 OpenAI Function Calling 定义
2. **编写 Definition** — 在 `js/tools/definitions/` 创建工具执行逻辑文件
3. **编写 Renderer** — 在 `js/components/math/` 创建渲染器文件
4. **注册 Definition** — 在 `js/tools/register-all.js` 中注册执行器
5. **注册 Renderer** — 在 `js/components/math/index.js` 中添加动态导入
6. **更新映射** — 在 `js/config.js` 的 `TOOL_COMPONENT_MAP` 和 `TOOL_ICONS` 中添加映射
7. **更新 Prompt** — 在 `js/config.js` 的 `systemPrompt` 中添加工具说明

不需要修改 `executor.js`、`ai-client.js`、`stream-parser.js` 等核心代码。

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 运行时 | 原生 ES Modules | 模块化，无构建工具 |
| 公式渲染 | KaTeX | 高性能 LaTeX 渲染 |
| 2D/3D 图表 | Plotly.js | 交互式图表、3D 曲面、动画 |
| 画布渲染 | Canvas 2D API | 线性变换、特征向量等自定义绘图 |
| 数学计算 | math.js | 表达式解析与数值计算 |
| Markdown | marked.js | AI 回复文本渲染 |
| 代码高亮 | highlight.js | 代码块语法高亮 |
| 状态管理 | 自研发布-订阅 Store | 轻量，无依赖 |
| 持久化 | localStorage | 会话、设置本地存储 |
| API 通信 | 原生 fetch + SSE | LLM 流式输出 |

## 设计规范

### 滚动与交互

- 工具组件**未聚焦时**，Plotly/Canvas 不响应指针事件（`pointer-events: none`），滚轮直接穿透到页面，走浏览器原生滚动，无卡顿
- **点击组件**后进入聚焦态（`.focused`），指针事件恢复，Plotly 缩放/平移可用
- **鼠标移出**后自动失焦

### 全屏模式

- 每个工具卡片支持全屏展开
- 全屏状态下图表/画布自动撑满可用空间
- Canvas 组件通过 `ResizeObserver` 监听容器尺寸变化，全屏切换时自动重绘

### 主题

- 支持浅色 / 深色 / 跟随系统三种主题
- 所有颜色通过 CSS 变量定义，主题切换时一键替换

## 数据存储

所有数据存储在浏览器 `localStorage` 中（5MB 限额）：

| 键名 | 内容 | 类型 |
|------|------|------|
| `gaoshu_sessions` | 所有会话数据 | `Session[]` |
| `gaoshu_active_session_id` | 当前会话 ID | `string` |
| `gaoshu_settings` | 应用设置 | `AppSettings` |
| `gaoshu_theme` | 主题设置 | `string` |

自动清理策略：最多保留 100 条会话，单会话最多 500 条消息。

## License

MIT
