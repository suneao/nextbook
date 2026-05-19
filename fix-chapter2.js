const fs = require("fs");
let c = fs.readFileSync("src/lib/chapter-ai.ts", "utf8");

// Add signal parameter to analyzeChapters
c = c.replace(
  "export async function analyzeChapters(\n  pdfText: string,\n  modelId: string,\n): Promise<Chapter[]> {",
  "export async function analyzeChapters(\n  pdfText: string,\n  modelId: string,\n  signal?: AbortSignal,\n): Promise<Chapter[]> {"
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

// Replace the second temperature line (for extractKnowledgePoints)
// Find after extractKnowledgePoints function body starts
const extractIdx = c.indexOf("export async function extractKnowledgePoints");
const tempLineIdx = c.indexOf("    { temperature: 0.3, maxTokens: 4096 },", extractIdx);
if (tempLineIdx !== -1) {
  c = c.slice(0, tempLineIdx) + "    { temperature: 0.3, maxTokens: 4096, signal }," + c.slice(tempLineIdx + 48);
}

// Add regenerateSubChapter function before "// ── Parsers"
const lines = [
  '',
  '// ── Regenerate Single Sub-Chapter ────────────────────────────────────────',
  '',
  'export async function regenerateSubChapter(',
  '  pdfText: string,',
  '  subChapterTitle: string,',
  '  modelId: string,',
  '  instructions: string,',
  '  signal?: AbortSignal,',
  '): Promise<{ knowledgePoints: KnowledgePoint[]; examples: Example[]; exercises: Exercise[] }> {',
  '  const systemPrompt = "你是一个教育内容分析专家。请根据用户要求优化内容。";',
  '',
  '  const userPrompt = "请分析以下教材文本中关于\\"' + " + subChapterTitle + " + '\\"的内容。\\n\\n" +',
  '    "用户的改进要求：' + instructions + '\\n\\n" +',
  '    "请根据上述改进要求优化知识点、例题和习题。\\n\\n" +',
  '    "重要：所有数学公式请使用LaTeX格式：行内用 $...$，块级用 $$...$$。\\n\\n" +',
  '    "返回格式（严格JSON，不要markdown代码块）：\\n" +',
  '    "{\\n" +',
  '    "  \\"knowledgePoints\\": [{ \\"title\\": \\"...\\", \\"content\\": \\"...\\" }],\\n" +',
  '    "  \\"examples\\": [{ \\"question\\": \\"...\\", \\"solution\\": \\"...\\" }],\\n" +',
  '    "  \\"exercises\\": [{ \\"question\\": \\"...\\", \\"solution\\": \\"...\\" }]\\n" +',
  '    "}\\n\\n" +',
  '    "教材文本：\\n" + pdfText.slice(0, 10000);',
  '',
  '  const response = await chatCompletion(modelId, [',
  '    { role: "system", content: systemPrompt },',
  '    { role: "user", content: userPrompt },',
  '  ], { temperature: 0.3, maxTokens: 4096, signal });',
  '',
  '  return parseKnowledgeResponse(response);',
  '}',
].join('\n');

c = c.replace("// ── Parsers ──", regenFn + "\n\n// ── Parsers ──");

fs.writeFileSync("src/lib/chapter-ai.ts", c);
console.log("done");
