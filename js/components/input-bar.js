/**
 * 输入栏组件 —— 自动调高、快捷键
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
}