const fs = require("fs");
let c = fs.readFileSync("src/lib/chapter-ai.ts", "utf8");

// Add signal parameter to analyzeChapters
c = c.replace(
  "export async function analyzeChapters(\n  pdfText: string,\n  modelId: string,\n): Promise<Chapter[]> {",
  "export async function analyzeChapters(\n  pdfText: string,\n  modelId: string,\n  signal?: AbortSignal,\n): Promise<Chapter[]> {"
);
c = c.replace(
  "  const response = await chatCompletion(\n    modelId,",
  "  const response = await chatCompletion(\n    modelId,"
);
c = c.replace(
  "    { temperature: 0.3, maxTokens: 4096 },",
  "    { temperature: 0.3, maxTokens: 4096, signal },"
);

// Add signal parameter to extractKnowledgePoints
c = c.replace(
  "export async function extractKnowledgePoints(\n  pdfText: string,\n  subChapterTitle: string,\n  modelId: string,\n): Promise<{",
  "export async function extractKnowledgePoints(\n  pdfText: string,\n  subChapterTitle: string,\n  modelId: string,\n  signal?: AbortSignal,\n): Promise<{"
);

// Find the second chatCompletion call and add signal
const secondCall = c.indexOf("    { temperature: 0.3, maxTokens: 4096 },", c.indexOf("extractKnowledgePoints"));
if (secondCall !== -1) {
  c = c.slice(0, secondCall) + "    { temperature: 0.3, maxTokens: 4096, signal }," + c.slice(secondCall + 48);
}

// Add regenerateSingleSubChapter function before the parsers
const parserSection = "\n// ── Parsers ──";
const regenFn = `

// ── Regenerate Single Sub-Chapter ────────────────────────────────────────

export async function regenerateSubChapter(
  pdfText: string,
  subChapterTitle: string,
  modelId: string,
  instructions: string,
  signal?: AbortSignal,
): Promise<{ knowledgePoints: KnowledgePoint[]; examples: Example[]; exercises: Exercise[] }> {
  const systemPrompt = "你是一个教育内容分析专家。请从提供的教材文本中提取知识点、例题和习题。";

  const userPrompt = `请分析以下教材文本中关于"${subChapterTitle}"的内容，提取：
1. 知识点（每个包含标题和详细说明）
2. 例题（每个包含题目和解答）
3. 课后习题（每个包含题目和解答）

重要：所有数学公式请使用LaTeX格式：行内公式用 $...$，块级用 $$...$$

用户的改进要求：${instructions}

请根据上述改进要求优化生成的内容。

返回格式（严格JSON，不要markdown代码块）：
{
  "knowledgePoints": [{ "title": "...", "content": "..." }],
  "examples": [{ "question": "...", "solution": "..." }],
  "exercises": [{ "question": "...", "solution": "..." }]
}

教材文本：
${pdfText.slice(0, 10000)}`;

  const response = await chatCompletion(modelId, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], { temperature: 0.3, maxTokens: 4096, signal });

  return parseKnowledgeResponse(response);
}
`;

c = c.replace(parserSection, regenFn + parserSection);

fs.writeFileSync("src/lib/chapter-ai.ts", c);
console.log("done");
