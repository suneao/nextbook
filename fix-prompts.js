const fs = require("fs");
let c = fs.readFileSync("src/lib/chapter-ai.ts", "utf8");

// Replace the extractKnowledgePoints prompt with detailed instructions
const oldUserPrompt = `请分析以下教材文本中关于"${subChapterTitle}"的内容，提取：`;

const newUserPrompt = `请分析以下教材文本中关于"${subChapterTitle}"的内容，提取详细的学习材料。

【知识点要求 - 务必详细】
- 每个知识点必须包含200字以上的详细说明
- 必须使用Markdown格式：## 标题、**加粗**、- 列表、\`代码\`
- 每个知识点应包含：概念定义、核心性质、推导过程（如有）、典型应用场景、记忆技巧
- 公式必须使用LaTeX格式：行内 \$...\$，块级 \\$\\$...\\$\\$
- 分数 \\frac{}{}，根号 \\sqrt{}，积分 \\int，求和 \\sum，极限 \\lim
- 知识点数量：3-6个，确保覆盖完整

【例题要求 - 务必完整】
- 每题必须包含完整的解答步骤，每步都要说明原因
- 题目和解答中使用 \$...\$ 包裹所有数学公式
- 例题数量：2-4道，从易到难

【课后习题要求】
- 每题必须包含详细解答
- 习题数量：1-3道

返回格式（严格JSON，不要markdown代码块）：
{
  "knowledgePoints": [
    { "title": "知识点标题", "content": "详细的Markdown格式说明，包含定义、性质、示例、公式等。至少200字。" }
  ],
  "examples": [
    { "question": "题目描述（含\$公式\$）", "solution": "详细解答步骤，每步说明原因（含\$公式\$）" }
  ],
  "exercises": [
    { "question": "习题题目（含\$公式\$）", "solution": "详细解答（含\$公式\$）" }
  ]
}

教材文本：`;

if (c.includes(oldUserPrompt)) {
  c = c.replace(oldUserPrompt, newUserPrompt);
  console.log("Replaced extractKnowledgePoints prompt");
} else {
  console.log("oldUserPrompt not found");
}

// Fix block math instruction (was $...$ for both, now $$...$$ for block)
c = c.replace(
  "- 块级公式用 $...$ 包裹",
  "- 块级公式用 $$...$$ 包裹（独占一行）"
);

// Update regenerateSubChapter prompt to also be detailed
const oldRegenPrompt = '请分析以下教材文本中关于\\"';
if (c.includes(oldRegenPrompt)) {
  c = c.replace(
    oldRegenPrompt,
    '请详细分析以下教材文本中关于\\"'
  );
  // Add detailed requirements to regenerate prompt
  c = c.replace(
    '请根据上述改进要求优化知识点、例题和习题。',
    '请根据上述改进要求优化知识点、例题和习题。要求：每个知识点200字以上详细说明，使用Markdown格式，公式用$...$或$$...$$格式，例题含完整解答步骤。'
  );
}

fs.writeFileSync("src/lib/chapter-ai.ts", c);
console.log("done");
