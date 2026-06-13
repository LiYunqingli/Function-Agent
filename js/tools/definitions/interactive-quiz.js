/**
 * interactive_quiz 工具执行器 —— 交互式小测验
 */
export async function executeInteractiveQuiz(args) {
  const { title, questions } = args;

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    throw new Error('questions 参数必须是非空数组');
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question) throw new Error(`第 ${i + 1} 题缺少 question 字段`);
    if (!q.options || !Array.isArray(q.options)) throw new Error(`第 ${i + 1} 题缺少 options 字段`);
    if (q.correctAnswer == null) throw new Error(`第 ${i + 1} 题缺少 correctAnswer 字段`);
  }

  return {
    componentType: 'interactive-quiz',
    props: { title, questions },
  };
}
