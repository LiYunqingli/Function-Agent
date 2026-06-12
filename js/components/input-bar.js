/**
 * 输入栏组件 —— 自动调高、快捷键、图片上传和预览
 */

/** 当前待发送的图片文件列表 (File 对象) */
let _selectedImages = [];

/**
 * 初始化输入栏
 * @returns {Object} API - { getImages, clearImages }
 */
export function initInputBar() {
  const input = document.getElementById('message-input');
  if (!input) return;

  // 自动调高
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  });

  // 聚焦
  input.focus();

  // ── 图片上传 ──
  const uploadBtn = document.getElementById('image-upload-btn');
  const fileInput = document.getElementById('image-file-input');
  const previewBar = document.getElementById('image-preview-bar');

  if (uploadBtn && fileInput && previewBar) {
    // 点击按钮 → 打开文件选择
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    // 文件选择
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          _selectedImages.push(file);
        }
      }
      fileInput.value = ''; // 重置以支持重复选择同一文件
      renderPreviews();
    });

    // 支持粘贴图片 (Ctrl+V)
    document.addEventListener('paste', (e) => {
      // 只在输入框聚焦时处理
      if (document.activeElement !== input) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            _selectedImages.push(file);
          }
        }
      }
      renderPreviews();
    });

    // 支持拖拽图片
    input.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.style.borderColor = 'var(--color-accent)';
    });

    input.addEventListener('dragleave', () => {
      input.style.borderColor = '';
    });

    input.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.style.borderColor = '';
      const files = Array.from(e.dataTransfer?.files || []);
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          _selectedImages.push(file);
        }
      }
      renderPreviews();
    });
  }

  /**
   * 渲染图片预览条
   */
  function renderPreviews() {
    if (!previewBar) return;

    // 清空
    previewBar.innerHTML = '';

    if (_selectedImages.length === 0) {
      previewBar.style.display = 'none';
      uploadBtn.classList.remove('has-images');
      return;
    }

    previewBar.style.display = 'flex';
    uploadBtn.classList.add('has-images');

    _selectedImages.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'preview-item';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = `图片 ${index + 1}`;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '✕';
      removeBtn.title = '移除图片';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // 释放 object URL
        URL.revokeObjectURL(img.src);
        _selectedImages.splice(index, 1);
        renderPreviews();
      });

      item.appendChild(img);
      item.appendChild(removeBtn);
      previewBar.appendChild(item);
    });
  }

  return {
    /**
     * 获取当前选中的图片文件列表
     * @returns {File[]}
     */
    getImages: () => [..._selectedImages],

    /**
     * 清空图片选择
     */
    clearImages: () => {
      // 释放所有 object URL
      if (previewBar) {
        previewBar.querySelectorAll('img').forEach((img) => {
          URL.revokeObjectURL(img.src);
        });
      }
      _selectedImages = [];
      renderPreviews();
    },
  };
}
