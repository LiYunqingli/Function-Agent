/**
 * 设置弹窗组件
 */

/** @type {Object} settingsStore 引用 */
let _settingsStore = null;

/**
 * 初始化设置弹窗
 * @param {Object} settingsStore
 */
export function initSettingsDialog(settingsStore) {
  _settingsStore = settingsStore;

  const dialog = document.getElementById('settings-dialog');
  const openBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('settings-close');
  const saveBtn = document.getElementById('settings-save');
  const cancelBtn = document.getElementById('settings-cancel');
  const tempSlider = document.getElementById('temperature');
  const tempVal = document.getElementById('temp-val');

  // 打开设置
  openBtn.addEventListener('click', () => {
    loadFormFromStore();
    dialog.style.display = 'flex';
  });

  // 关闭设置
  closeBtn.addEventListener('click', () => {
    dialog.style.display = 'none';
  });

  cancelBtn.addEventListener('click', () => {
    dialog.style.display = 'none';
  });

  // 点击遮罩关闭
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.style.display = 'none';
    }
  });

  // Temperature 滑块实时更新
  tempSlider.addEventListener('input', () => {
    tempVal.textContent = tempSlider.value;
  });

  // 保存设置
  saveBtn.addEventListener('click', () => {
    const newSettings = {
      apiUrl: document.getElementById('api-url').value.trim(),
      apiKey: document.getElementById('api-key').value.trim(),
      model: document.getElementById('model-name').value.trim(),
      temperature: parseFloat(tempSlider.value),
      maxTokens: parseInt(document.getElementById('max-tokens').value, 10) || 4096,
      systemPrompt: document.getElementById('system-prompt').value,
    };
    _settingsStore.updateSettings(newSettings);
    dialog.style.display = 'none';
  });
}

/**
 * 从 settingsStore 加载值到表单
 */
function loadFormFromStore() {
  const state = _settingsStore.getState();
  document.getElementById('api-url').value = state.apiUrl || '';
  document.getElementById('api-key').value = state.apiKey || '';
  document.getElementById('model-name').value = state.model || '';
  document.getElementById('temperature').value = state.temperature || 0.7;
  document.getElementById('temp-val').textContent = state.temperature || 0.7;
  document.getElementById('max-tokens').value = state.maxTokens || 4096;
  document.getElementById('system-prompt').value = state.systemPrompt || '';
}