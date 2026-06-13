# Function-Agent API 参考文档

本文档描述项目内部模块的公共 API 接口。

---

## 1. 状态管理 API

### 1.1 Store 基类（`stores/store-base.js`）

```javascript
class Store {
  getState(): Object           // 获取当前状态浅拷贝
  setState(partial: Object): void  // 合并更新并通知监听器
  subscribe(key, callback): Function  // 订阅 key 变化，返回取消订阅函数
  subscribeAll(callback): Function    // 订阅所有变化，返回取消订阅函数
}
```

**subscribe 回调签名：**
- `subscribe(key, cb)`: `cb(newValue, oldValue, key)`
- `subscribeAll(cb)`: `cb(newState, oldState)`

### 1.2 ChatStore（`stores/chat-store.js`）

**状态结构：**
```javascript
{
  sessions: Session[],        // 会话列表
  activeSessionId: string|null,  // 活动会话 ID
  isStreaming: boolean,       // 是否正在流式输出
  abortController: AbortController|null  // 当前请求的 abort 控制器
}
```

**公共方法：**

| 方法 | 签名 | 说明 |
|------|------|------|
| createSession | `(title?: string) => Session` | 创建新会话并自动切换 |
| deleteSession | `(id: string) => void` | 删除会话 |
| switchSession | `(id: string) => void` | 切换活动会话 |
| renameSession | `(id: string, newTitle: string) => void` | 重命名会话 |
| addMessage | `(sessionId: string, message: Message) => void` | 添加消息 |
| updateMessage | `(sessionId: string, messageId: string, partial: Object) => void` | 更新消息 |
| deleteMessage | `(sessionId: string, messageId: string) => void` | 删除消息 |
| getActiveSession | `() => Session|null` | 获取活动会话 |
| getActiveMessages | `() => Message[]` | 获取活动会话的消息列表 |

### 1.3 SettingsStore（`stores/settings-store.js`）

**状态结构：**
```javascript
{
  // 大语言模型
  apiUrl: string,
  apiKey: string,
  model: string,
  temperature: number,
  maxTokens: number,
  systemPrompt: string,

  // 多模态大模型
  visionApiUrl: string,
  visionApiKey: string,
  visionModel: string,
  visionSystemPrompt: string,

  // 通用
  theme: 'light' | 'dark' | 'system',
}
```

### 1.4 ToolStore（`stores/tool-store.js`）

**状态结构：**
```javascript
{
  executingTools: {
    [toolCallId: string]: {
      toolName: string,
      status: 'executing' | 'success' | 'error',
      result?: Object,
      error?: string,
      startedAt: string,
    }
  }
}
```

**公共方法：**

| 方法 | 签名 | 说明 |
|------|------|------|
| startExecution | `(toolCallId, toolName) => void` | 标记开始执行 |
| completeExecution | `(toolCallId, result) => void` | 标记执行成功 |
| failExecution | `(toolCallId, error) => void` | 标记执行失败 |
| clear | `() => void` | 清空所有状态 |

---

## 2. AI 客户端 API（`services/ai-client.js`）

### createStream

执行单次 AI 流式 SSE 请求。

```javascript
createStream(
  messages: Array,           // 消息历史（含 tool 结果）
  tools: Array,              // 工具定义（OpenAI 格式）
  settings: {
    apiUrl: string,
    apiKey: string,
    model: string,
    temperature: number,
    maxTokens: number,
    systemPrompt: string,
  },
  callbacks: {
    onContentDelta: (text: string) => void,  // 文本增量回调
    onError: (error: Error) => void,         // 错误回调
  },
  signal: AbortSignal        // 中止信号
): Promise<{ toolCalls: Array|null, emptyResponse: boolean }>
```

**返回值说明：**
- `toolCalls`: 有工具调用时为工具调用对象数组，否则为 `null`
- `emptyResponse`: API 返回空响应（choices:[]）时为 `true`

### analyzeImages

调用多模态模型识别图片内容。

```javascript
analyzeImages(
  images: File[],            // 图片文件列表
  visionSettings: {
    visionApiUrl: string,
    visionApiKey: string,
    visionModel: string,
    visionSystemPrompt: string,
  },
  signal: AbortSignal
): Promise<string>           // 图片描述文本
```

### fileToBase64

将文件转为 base64 data URL。

```javascript
fileToBase64(file: File): Promise<string>  // "data:image/png;base64,..."
```

---

## 3. 工具链 API

### 3.1 ToolRegistry（`tools/registry.js`）

```javascript
class ToolRegistry {
  register(schema: Object, executor: Function): void
  getSchema(name: string): Object|undefined
  getExecutor(name: string): Function|undefined
  getAllSchemas(): Object[]   // 获取所有 schema（用于发送给 AI）
  has(name: string): boolean
}

// 单例导出
export const registry: ToolRegistry
```

### 3.2 executeToolCall（`tools/executor.js`）

```javascript
executeToolCall(
  toolCall: {
    id: string,
    type: 'function',
    function: {
      name: string,
      arguments: string,  // JSON 字符串
    }
  }
): Promise<{
  toolCallId: string,
  status: 'success' | 'error',
  componentType?: string,
  props?: Object,
  error?: string,
}>
```

### 3.3 registerAllTools（`tools/register-all.js`）

```javascript
registerAllTools(): void  // 注册所有 24 个工具到 registry
```

---

## 4. 组件 API

### 4.1 createToolCallCard（`components/tool-call-card.js`）

```javascript
createToolCallCard(
  toolCall: Object,        // LLM 返回的 tool_call 对象
  toolResult: Object|null, // 工具执行结果
  toolStore: ToolStore     // 工具状态 Store
): HTMLElement             // 返回卡片 DOM 元素
```

### 4.2 renderMathComponent（`components/math/index.js`）

```javascript
renderMathComponent(
  name: string,            // 组件名（如 'function-plot'）
  props: Object            // 组件属性
): Promise<HTMLElement|null>  // 返回渲染结果（异步，因为动态 import）
```

### 4.3 数学渲染器标准接口

每个 `components/math/*.js` 导出统一的 `render` 函数：

```javascript
render(container: HTMLElement, props: Object): HTMLElement
```

**参数：**
- `container`: 父容器元素
- `props`: 工具执行器返回的 `props` 对象

**返回值：** 包含可视化内容的 DOM 元素

---

## 5. 工具函数 API

### 5.1 generateId（`utils/id.js`）

```javascript
generateId(): string  // 生成 UUID v4 格式字符串
```

### 5.2 formatToolName（`utils/formatters.js`）

```javascript
formatToolName(name: string): string  // snake_case → 可读名称
// 例: 'plot_function' → 'Plot Function'
```

### 5.3 renderLatexHTML（`utils/latex.js`）

```javascript
renderLatexHTML(raw?: string): string
// 将含 LaTeX 的文本渲染为 HTML
// 支持 $$...$$（display）、\(...\)（inline）、$...$（inline）
```

### 5.4 debounce / deepClone（`utils/helpers.js`）

```javascript
debounce(fn: Function, ms: number): Function  // 防抖
deepClone(obj: Object): Object               // 深拷贝
```

### 5.5 DOM 操作（`utils/dom.js`）

```javascript
scrollToBottom(): void     // 滚动消息列表到底部
```

---

## 6. 存储适配器 API（`services/storage-adapter.js`）

```javascript
storageAdapter.get(key: string): any           // 读取 localStorage（自动 JSON.parse）
storageAdapter.set(key: string, value: any): void  // 写入 localStorage（自动 JSON.stringify，含容量检测）
```

---

## 7. 全局配置（`config.js`）

```javascript
// 存储键名
STORAGE_KEYS: {
  SESSIONS: string,
  ACTIVE_SESSION_ID: string,
  SETTINGS: string,
  THEME: string,
}

// 运行限制
MAX_TOOL_DEPTH: 25          // 最大工具调用深度
MAX_SESSIONS: 100           // 最大会话数
MAX_MESSAGES_PER_SESSION: 500  // 单会话最大消息数
LOCALSTORAGE_QUOTA: 5MB     // 存储限额

// 默认设置
DEFAULT_SETTINGS: Object    // 参见 settings-store 状态结构

// 工具映射
TOOL_COMPONENT_MAP: Object  // 工具名 → 组件名
TOOL_ICONS: Object          // 工具名 → emoji 图标
```

---

## 8. 全局暴露的 API

| 变量 | 来源 | 用途 |
|------|------|------|
| `window._gaoshuApplyTheme` | app.js | 主题切换函数，供 top-bar 调用 |
| `window.Plotly` | CDN | Plotly.js 全局对象，图表组件使用 |
| `window.katex` | CDN | KaTeX 全局对象，LaTeX 渲染使用 |
| `window.math` | CDN | math.js 全局对象，数学求值使用 |
| `window.marked` | CDN | marked.js 全局对象，Markdown 解析使用 |
| `window.hljs` | CDN | highlight.js 全局对象，代码高亮使用 |
