/**
 * interactive_quiz 工具执行器 —— 交互式小测验（支持多题型）
 *
 * 题型：single（单选）、multiple（多选）、true-false（判断）、fill-blank（填空）、subjective（主观）
 */
export async function executeInteractiveQuiz(args) {
  const { title, questions } = args;

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    throw new Error('questions 参数必须是非空数组');
  }

  const VALID_TYPES = ['single', 'multiple', 'true-false', 'fill-blank', 'subjective'];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question) throw new Error(`第 ${i + 1} 题缺少 question 字段`);
    // 兼容旧格式：没有 type 字段时默认为单选题
    if (!q.type) q.type = 'single';
    if (!VALID_TYPES.includes(q.type)) {
      throw new Error(`第 ${i + 1} 题的 type "${q.type}" 不是有效题型，可选：${VALID_TYPES.join('/')}`);
    }
    // 各题型必填校验
    if ((q.type === 'single' || q.type === 'multiple') && (!q.options || !Array.isArray(q.options))) {
      throw new Error(`第 ${i + 1} 题（${q.type}）缺少 options 字段`);
    }
    if (q.type === 'single' && q.correctAnswer == null) {
      throw new Error(`第 ${i + 1} 题（单选）缺少 correctAnswer 字段`);
    }
    if (q.type === 'multiple' && (!q.correctAnswers || !Array.isArray(q.correctAnswers))) {
      throw new Error(`第 ${i + 1} 题（多选）缺少 correctAnswers 字段`);
    }
    if (q.type === 'true-false' && q.correctBool == null) {
      throw new Error(`第 ${i + 1} 题（判断）缺少 correctBool 字段`);
    }
    if (q.type === 'fill-blank' && (!q.acceptableAnswers || !Array.isArray(q.acceptableAnswers))) {
      throw new Error(`第 ${i + 1} 题（填空）缺少 acceptableAnswers 字段`);
    }
    // subjective 不强制要求 referenceAnswer（AI 阅卷时按有无参考答案采用不同策略）
  }

  return {
    componentType: 'interactive-quiz',
    props: { title, questions },
  };
}
