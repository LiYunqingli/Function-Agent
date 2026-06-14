/**
 * show_flashcards 工具执行器 —— 抽认卡
 */
export async function executeShowFlashcards(args) {
  const { title, cards } = args;

  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    throw new Error('必须提供 cards 参数（卡片列表）');
  }

  // 验证每张卡片
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (!card.front) throw new Error(`第 ${i + 1} 张卡片缺少 front 字段`);
    if (!card.back) throw new Error(`第 ${i + 1} 张卡片缺少 back 字段`);
  }

  return {
    componentType: 'flashcards',
    props: { title, cards },
  };
}
