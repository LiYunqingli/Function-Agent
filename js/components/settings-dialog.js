/**
 * 设置弹窗组件
 */

import { buildSystemPrompt, DEFAULT_PROMPT_PARTS } from '../prompt.js';
// 注意：WebCryptoFallback 不是通过 ES Module 导入，而是通过 IIFE 直接挂到 window 全局
// 这样可以避免 fallback 自身的语法检查问题（它是 IIFE 包起来的）

/** @type {Object} settingsStore 引用 */
let _settingsStore = null;
/** @type {Object} chatStore 引用 */
let _chatStore = null;

// Web Crypto 加密/解密工具

/** AES-GCM 参数 */
const ENC_ALGO = 'AES-GCM';
/** PBKDF2 迭代次数 */
const PBKDF2_ITERATIONS = 200000;
/** 密钥长度 (bits) */
const KEY_LENGTH = 256;
/** 盐值长度 (bytes) */
const SALT_LENGTH = 16;
/** IV 长度 (bytes，GCM 推荐 12) */
const IV_LENGTH = 12;

/**
 * 将 ArrayBuffer 转为 Base64 字符串
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 将 Base64 字符串转为 ArrayBuffer
 * 自动忽略空白/换行/回车等非 Base64 字符，容错处理
 */
function base64ToArrayBuffer(base64) {
  // 去除 BOM、首尾空白和所有空白字符（换行、回车、制表、空格）
  const cleaned = String(base64)
    .replace(/^\uFEFF/, '')
    .replace(/[\r\n\t\s]+/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 获取可用的 WebCrypto subtle 接口
 * 优先级：原生 crypto.subtle > 纯 JS fallback（处理 file://、受限 webview 等情况）
 */
function getSubtle() {
  if (typeof crypto !== 'undefined' && crypto && crypto.subtle) {
    return crypto.subtle;
  }
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  // 回退到纯 JS 实现（性能较差但功能完全兼容）
  if (
    typeof window !== 'undefined' &&
    window.WebCryptoFallback &&
    window.WebCryptoFallback.subtle
  ) {
    return window.WebCryptoFallback.subtle;
  }
  return null;
}

/**
 * 从密码派生 AES-GCM 密钥
 * @param {string} password
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(password, salt) {
  const subtle = getSubtle();
  if (!subtle) {
    throw new Error(
      '当前环境不支持 WebCrypto API（crypto.subtle 不可用），且未加载纯 JS 兜底实现。' +
      '请使用 HTTPS 协议访问页面，或在 localhost 下打开，并避免被浏览器扩展/中间脚本拦截 crypto 对象。'
    );
  }
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: ENC_ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * 加密 JSON 数据，返回 Base64 密文
 * 格式: salt(16B) + iv(12B) + ciphertext
 * @param {Object} data
 * @param {string} password
 * @returns {Promise<string>} Base64 编码的密文
 */
async function encryptData(data, password) {
  // 加密时也要确保 crypto.subtle 可用（deriveKey 内部会再次检查）
  if (!getSubtle()) {
    throw new Error(
      '当前环境不支持 WebCrypto API（crypto.subtle 不可用）。' +
      '请使用 HTTPS 协议访问页面，或在 localhost 下打开，并避免被浏览器扩展/中间脚本拦截 crypto 对象。'
    );
  }
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);
  const subtle = getSubtle();
  const ciphertext = await subtle.encrypt({ name: ENC_ALGO, iv }, key, plaintext);

  // 拼接: salt + iv + ciphertext
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * 解密 Base64 密文，返回 JSON 对象
 * @param {string} ciphertextBase64
 * @param {string} password
 * @returns {Promise<Object>}
 */
async function decryptData(ciphertextBase64, password) {
  // 预处理：去除 BOM / 空白 / 换行
  const cleanedBase64 = String(ciphertextBase64 ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/[\r\n\t\s]+/g, '');

  if (!cleanedBase64) {
    throw new Error('密文为空');
  }

  let combined;
  try {
    combined = new Uint8Array(base64ToArrayBuffer(cleanedBase64));
  } catch (e) {
    throw new Error('密文不是有效的 Base64 编码：' + e.message);
  }

  if (combined.length < SALT_LENGTH + IV_LENGTH + 1) {
    throw new Error('密文格式无效或已损坏（长度不足）');
  }

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  let plaintext;
  try {
    const subtle = getSubtle();
    if (!subtle) {
      throw new Error(
        '当前环境不支持 WebCrypto API（crypto.subtle 不可用）。' +
        '请使用 HTTPS 协议访问页面，或在 localhost 下打开，并避免被浏览器扩展/中间脚本拦截 crypto 对象。'
      );
    }
    plaintext = await subtle.decrypt({ name: ENC_ALGO, iv }, key, ciphertext);
  } catch (e) {
    // 如果是已经格式化过的 \"当前环境不支持\" 错误，直接抛出
    if (e.message && e.message.includes('WebCrypto API')) {
      throw e;
    }
    // AES-GCM 认证失败：密码错误 或 密文被篡改
    throw new Error('解密失败：密码错误或密文已被篡改');
  }

  const dec = new TextDecoder();
  try {
    return JSON.parse(dec.decode(plaintext));
  } catch (e) {
    throw new Error('解密成功但 JSON 解析失败：' + e.message);
  }
}

// 文件下载 / 上传

/**
 * 触发文件下载
 * @param {string} content - 文件内容
 * @param {string} filename
 */
function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 触发 JSON 文件下载（聊天记录导出用）
 * @param {Object} data
 * @param {string} filename
 */
function downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 初始化

/**
 * 初始化设置弹窗
 * @param {Object} settingsStore
 * @param {Object} chatStore
 */
export function initSettingsDialog(settingsStore, chatStore) {
  _settingsStore = settingsStore;
  _chatStore = chatStore;

  const dialog = document.getElementById('settings-dialog');
  const openBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('settings-close');
  const saveBtn = document.getElementById('settings-save');
  const cancelBtn = document.getElementById('settings-cancel');
  const tempSlider = document.getElementById('temperature');
  const tempVal = document.getElementById('temp-val');

  // 打开设置
  openBtn.addEventListener('click', () => {
    // 关闭收藏面板
    const favPanel = document.getElementById('favorites-panel');
    const favOverlay = document.getElementById('favorites-overlay');
    if (favPanel) favPanel.classList.remove('open');
    if (favOverlay) favOverlay.classList.remove('active');
    document.body.style.overflow = '';

    loadFormFromStore();
    dialog.style.display = 'flex';
  });

  // 关闭设置
  closeBtn.addEventListener('click', () => {
    dialog.style.display = 'none';
    resetImportPanel();
  });

  cancelBtn.addEventListener('click', () => {
    dialog.style.display = 'none';
    resetImportPanel();
  });

  // 点击遮罩关闭
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.style.display = 'none';
      resetImportPanel();
    }
  });

  // Temperature 滑块实时更新
  tempSlider.addEventListener('input', () => {
    tempVal.textContent = tempSlider.value;
  });

  // 分段提示词：折叠/展开
  document.querySelectorAll('.prompt-part-header').forEach((header) => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const body = document.getElementById(targetId);
      if (!body) return;
      const isOpen = body.classList.toggle('open');
      header.classList.toggle('open', isOpen);
    });
  });

  // 预览完整 Prompt
  const previewBtn = document.getElementById('preview-prompt-btn');
  const previewPanel = document.getElementById('prompt-preview-panel');
  const previewText = document.getElementById('prompt-preview-text');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const isVisible = previewPanel.style.display !== 'none';
      if (isVisible) {
        previewPanel.style.display = 'none';
        previewBtn.textContent = '👁️ 预览完整 Prompt';
      } else {
        const parts = readPromptPartsFromForm();
        previewText.textContent = buildSystemPrompt(parts);
        previewPanel.style.display = 'block';
        previewBtn.textContent = '🙈 收起预览';
      }
    });
  }

  // 恢复默认提示词
  const resetPromptBtn = document.getElementById('reset-prompt-btn');
  if (resetPromptBtn) {
    resetPromptBtn.addEventListener('click', () => {
      if (!confirm('确定要将提示词恢复为默认值吗？')) return;
      writePromptPartsToForm(DEFAULT_PROMPT_PARTS);
      if (previewPanel) previewPanel.style.display = 'none';
    });
  }

  // 保存设置
  saveBtn.addEventListener('click', () => {
    const titleModeRadio = document.querySelector('input[name="title-naming-mode"]:checked');
    const titleNamingMode = titleModeRadio ? titleModeRadio.value : 'first-sentence';
    const titleMaxLength = parseInt(document.getElementById('title-max-length').value, 10) || 15;

    const favModeRadio = document.querySelector('input[name="favorite-naming-mode"]:checked');
    const favoriteNamingMode = favModeRadio ? favModeRadio.value : 'first-sentence';
    const favoriteTitleMaxLength = parseInt(document.getElementById('favorite-title-max-length').value, 10) || 30;

    // 读取分段提示词并组合
    const promptParts = readPromptPartsFromForm();
    const systemPrompt = buildSystemPrompt(promptParts);

    const newSettings = {
      apiUrl: document.getElementById('api-url').value.trim(),
      apiKey: document.getElementById('api-key').value.trim(),
      model: document.getElementById('model-name').value.trim(),
      visionApiUrl: document.getElementById('vision-api-url').value.trim(),
      visionApiKey: document.getElementById('vision-api-key').value.trim(),
      visionModel: document.getElementById('vision-model-name').value.trim(),
      visionSystemPrompt: document.getElementById('vision-system-prompt').value,
      temperature: parseFloat(tempSlider.value),
      maxTokens: parseInt(document.getElementById('max-tokens').value, 10) || 4096,
      promptParts,
      systemPrompt,
      titleNamingMode,
      titleMaxLength,
      favoriteNamingMode,
      favoriteTitleMaxLength,
    };
    _settingsStore.updateSettings(newSettings);
    dialog.style.display = 'none';
  });

  // 数据管理

  // 清空所有聊天记录
  document.getElementById('clear-chats-btn').addEventListener('click', () => {
    if (!confirm('确定要清空所有聊天记录吗？此操作不可恢复！')) return;
    const sessions = _chatStore.getState().sessions;
    sessions.forEach((s) => _chatStore.deleteSession(s.id));
    dialog.style.display = 'none';
  });

  // 清空所有信息
  document.getElementById('clear-all-btn').addEventListener('click', () => {
    if (!confirm('确定要清空所有信息吗？包括聊天记录、设置等，此操作不可恢复！')) return;
    localStorage.clear();
    alert('已清空所有本地数据，页面将刷新。');
    location.reload();
  });

  // 导出设置信息（加密）
  document.getElementById('export-settings-btn').addEventListener('click', async () => {
    const settings = _settingsStore.getState();
    // 完整导出，包含 API Key
    const exportData = {
      exportTime: new Date().toISOString(),
      type: 'function-agent-settings',
      settings: { ...settings },
    };

    // 提示输入密码
    const password = prompt('请设置加密密码（用于保护您的 API Key 等敏感信息）：');
    if (!password) return;

    const confirmPwd = prompt('请再次输入密码确认：');
    if (confirmPwd !== password) {
      alert('两次密码不一致，导出取消。');
      return;
    }

    try {
      const ciphertext = await encryptData(exportData, password);
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadFile(ciphertext, `function-agent-settings-${ts}.enc`);
    } catch (err) {
      console.error('导出加密失败:', err);
      alert('导出加密失败：' + err.message);
    }
  });

  // 导入设置信息
  const importPanel = document.getElementById('import-settings-panel');

  document.getElementById('import-settings-btn').addEventListener('click', () => {
    importPanel.style.display = 'block';
    document.getElementById('import-ciphertext').value = '';
    document.getElementById('import-password').value = '';
    document.getElementById('import-file-input').value = '';
  });

  // 上传 .enc 文件 → 读入 textarea
  const importFileInput = document.getElementById('import-file-input');
  document.getElementById('import-upload-btn').addEventListener('click', () => {
    importFileInput.click();
  });
  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // 去除可能存在的 BOM
      let content = String(reader.result ?? '');
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      document.getElementById('import-ciphertext').value = content;
    };
    reader.onerror = () => {
      alert('文件读取失败，请重试。');
    };
    reader.readAsText(file, 'utf-8');
  });

  document.getElementById('import-cancel-btn').addEventListener('click', () => {
    resetImportPanel();
  });

  document.getElementById('import-confirm-btn').addEventListener('click', async () => {
    const ciphertext = document.getElementById('import-ciphertext').value.trim();
    const password = document.getElementById('import-password').value;

    if (!ciphertext) {
      alert('请粘贴加密密文。');
      return;
    }
    if (!password) {
      alert('请输入解密密码。');
      return;
    }

    try {
      const data = await decryptData(ciphertext, password);

      // 验证导入数据格式
      if (!data.settings || typeof data.settings !== 'object') {
        throw new Error('导入数据格式不正确，缺少 settings 字段');
      }

      _settingsStore.updateSettings(data.settings);

      // 重新加载表单
      loadFormFromStore();

      resetImportPanel();
      alert('设置导入成功！');
    } catch (err) {
      console.error('导入解密失败:', err);
      // 优先显示 decryptData 抛出的具体错误（包含 "密文"、"解密"、"JSON"、"格式" 等关键字）
      if (
        err.message.includes('密文') ||
        err.message.includes('解密') ||
        err.message.includes('JSON') ||
        err.message.includes('格式')
      ) {
        alert('导入失败：' + err.message);
      } else {
        alert('导入失败：密码错误或密文已损坏。');
      }
    }
  });

  // 导出聊天记录（明文 JSON）
  document.getElementById('export-chats-btn').addEventListener('click', () => {
    const sessions = _chatStore.getState().sessions;
    if (sessions.length === 0) {
      alert('当前没有聊天记录可导出。');
      return;
    }
    const exportData = {
      exportTime: new Date().toISOString(),
      totalSessions: sessions.length,
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messages ? s.messages.length : 0,
        messages: s.messages || [],
      })),
    };
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadJSON(exportData, `function-agent-chats-${ts}.json`);
  });
}

/**
 * 隐藏并清空导入面板
 */
function resetImportPanel() {
  const panel = document.getElementById('import-settings-panel');
  if (panel) {
    panel.style.display = 'none';
    document.getElementById('import-ciphertext').value = '';
    document.getElementById('import-password').value = '';
    document.getElementById('import-file-input').value = '';
  }
}

/**
 * 从分段提示词表单中读取各部分文本
 * @returns {{ roleDefinition: string, toolsList: string, guidelines: string, supplement: string }}
 */
function readPromptPartsFromForm() {
  return {
    roleDefinition: (document.getElementById('prompt-role-definition')?.value ?? '').trim(),
    toolsList: (document.getElementById('prompt-tools-list')?.value ?? '').trim(),
    guidelines: (document.getElementById('prompt-guidelines')?.value ?? '').trim(),
    supplement: (document.getElementById('prompt-supplement')?.value ?? '').trim(),
  };
}

/**
 * 将各部分提示词写入对应表单控件
 * @param {{ roleDefinition?: string, toolsList?: string, guidelines?: string, supplement?: string }} parts
 */
function writePromptPartsToForm(parts) {
  const el = (id) => document.getElementById(id);
  if (el('prompt-role-definition')) el('prompt-role-definition').value = parts.roleDefinition ?? '';
  if (el('prompt-tools-list')) el('prompt-tools-list').value = parts.toolsList ?? '';
  if (el('prompt-guidelines')) el('prompt-guidelines').value = parts.guidelines ?? '';
  if (el('prompt-supplement')) el('prompt-supplement').value = parts.supplement ?? '';
}

/**
 * 从 settingsStore 加载值到表单
 */
function loadFormFromStore() {
  const state = _settingsStore.getState();
  document.getElementById('api-url').value = state.apiUrl || '';
  document.getElementById('api-key').value = state.apiKey || '';
  document.getElementById('model-name').value = state.model || '';
  document.getElementById('vision-api-url').value = state.visionApiUrl || '';
  document.getElementById('vision-api-key').value = state.visionApiKey || '';
  document.getElementById('vision-model-name').value = state.visionModel || '';
  document.getElementById('vision-system-prompt').value = state.visionSystemPrompt || '';
  document.getElementById('temperature').value = state.temperature || 0.7;
  document.getElementById('temp-val').textContent = state.temperature || 0.7;
  document.getElementById('max-tokens').value = state.maxTokens || 4096;

  // 分段提示词：优先从 promptParts 加载，其次尝试从 systemPrompt 回退填入角色定义
  const parts = state.promptParts || DEFAULT_PROMPT_PARTS;
  writePromptPartsToForm(parts);

  // 隐藏预览面板
  const previewPanel = document.getElementById('prompt-preview-panel');
  if (previewPanel) previewPanel.style.display = 'none';
  const previewBtn = document.getElementById('preview-prompt-btn');
  if (previewBtn) previewBtn.textContent = '👁️ 预览完整 Prompt';

  // 会话命名
  const mode = state.titleNamingMode || 'first-sentence';
  const modeRadio = document.querySelector(`input[name="title-naming-mode"][value="${mode}"]`);
  if (modeRadio) modeRadio.checked = true;
  document.getElementById('title-max-length').value = state.titleMaxLength || 15;

  // 收藏命名
  const favMode = state.favoriteNamingMode || 'first-sentence';
  const favModeRadio = document.querySelector(`input[name="favorite-naming-mode"][value="${favMode}"]`);
  if (favModeRadio) favModeRadio.checked = true;
  document.getElementById('favorite-title-max-length').value = state.favoriteTitleMaxLength || 30;
}
