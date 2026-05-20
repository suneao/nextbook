"use client";

import { chatCompletion } from "./ai-service";
import type {
  Chapter,
  KnowledgePoint,
  Example,
  Exercise,
} from "./study-data-server";

// ── Chapter Division ────────────────────────────────────────────────────

export async function analyzeChapters(
  pdfText: string,
  modelId: string,
  signal?: AbortSignal,
): Promise<Chapter[]> {
  const systemPrompt =
    "你是一个教材分析专家。请根据提供的教材文本，识别并划分章节结构。";

  const userPrompt = `请分析以下教材文本，识别出所有章节（大章）和小节（小章），返回JSON格式。

要求：
1. 识别所有大章标题（如"第一章 xxx"、"Chapter 1 xxx"等）
2. 每个大章下识别所有小节（如"1.1 xxx"、"§1.2 xxx"等）
3. 如果文本中没有明确的章节标识，请根据内容主题自行划分
4. 每个大章包含1-5个小节

返回格式（严格JSON，不要markdown代码块）：
[
  {
    "title": "第一章：函数与极限",
    "order": 0,
    "subChapters": [
      { "title": "1.1 函数的概念", "order": 0 },
      { "title": "1.2 极限的定义", "order": 1 }
    ]
  }
]

教材文本：
${pdfText.slice(0, 15000)}`;

  const response = await chatCompletion(
    modelId,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, signal },
  );

  return parseChapterResponse(response);
}

// ── Knowledge Extraction ─────────────────────────────────────────────────

export async function extractKnowledgePoints(
  pdfText: string,
  subChapterTitle: string,
  modelId: string,
  signal?: AbortSignal,
): Promise<{
  knowledgePoints: KnowledgePoint[];
  examples: Example[];
  exercises: Exercise[];
}> {
  const systemPrompt =
    "你是一个教育内容分析专家。请从提供的教材文本中提取知识点、例题和习题。";

  const userPrompt = `请详细分析以下教材文本中关于"${subChapterTitle}"的内容，提取详细的学习材料。\n\n【知识点要求 - 务必详细】\n- 每个知识点必须包含200字以上的详细说明\n- 必须使用Markdown格式：## 标题、**加粗**、- 列表、反引号代码块\n- 每个知识点应包含：概念定义、核心性质、推导过程（如有）、典型应用场景、记忆技巧\n- 公式必须使用LaTeX：行内 $...$，块级 $...$（独占一行）\n- 分数 \\frac{}{}，根号 \\sqrt{}，积分 \\int，求和 \\sum，极限 \\lim\n- 知识点数量：3-6个，确保覆盖完整\n\n【例题要求 - 务必完整】\n- 每题必须包含完整的解答步骤，每步都要说明原因\n- 题目和解答中使用 $...$ 包裹所有数学公式\n- 例题数量：2-4道，从易到难\n\n【课后习题要求】\n- 每题必须包含详细解答\n- 习题数量：1-3道\n\n1. 知识点（每个包含标题和200字以上详细说明，Markdown格式，公式用$...$格式）\n2. 例题（每个包含题目和完整解答步骤）\n3. 课后习题（每个包含题目和详细解答）

返回格式（严格JSON，不要markdown代码块）：
{
  "knowledgePoints": [
    { "title": "知识点标题", "content": "详细说明（公式用$...$格式）" }
  ],
  "examples": [
    { "question": "题目（公式用$...$格式）", "solution": "解答步骤（公式用$...$格式）" }
  ],
  "exercises": [
    { "question": "题目内容", "solution": "解答步骤" }
  ]
}

教材文本：
${pdfText.slice(0, 10000)}`;

  const response = await chatCompletion(
    modelId,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, signal },
  );

  return parseKnowledgeResponse(response);
}

// ── Regenerate Single Sub-Chapter ────────────────────────────────────────

export async function regenerateSubChapter(
  pdfText: string,
  subChapterTitle: string,
  modelId: string,
  instructions: string,
  signal?: AbortSignal,
): Promise<{
  knowledgePoints: KnowledgePoint[];
  examples: Example[];
  exercises: Exercise[];
}> {
  const systemPrompt =
    "你是一个教育内容分析专家。请根据用户要求优化知识点、例题和习题。";

  const userPrompt =
    '请分析以下教材文本中关于"' +
    subChapterTitle +
    '"的内容。\n\n' +
    "用户的改进要求：" +
    instructions +
    "\n\n" +
    "请根据上述改进要求优化生成的内容。\n\n" +
    "重要：所有数学公式请使用LaTeX格式：行内公式用 \$...\$，块级用 \$\$...\$\$。\n\n" +
    "返回格式（严格JSON，不要markdown代码块）：\n" +
    "{\n" +
    '  "knowledgePoints": [{ "title": "...", "content": "..." }],\n' +
    '  "examples": [{ "question": "...", "solution": "..." }],\n' +
    '  "exercises": [{ "question": "...", "solution": "..." }]\n' +
    "}\n\n" +
    "教材文本：\n" +
    pdfText.slice(0, 10000);

  const response = await chatCompletion(
    modelId,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, signal },
  );

  return parseKnowledgeResponse(response);
}

// ── Parsers ──────────────────────────────────────────────────────────────

function parseChapterResponse(response: string): Chapter[] {
  try {
    // Strip markdown code blocks if present
    const clean = response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const raw = JSON.parse(clean) as RawChapter[];

    let chOrder = 0;
    return raw.map((ch, chIdx) => {
      const chapter: Chapter = {
        id: `ch-ai-${Date.now()}-${chOrder}`,
        title: ch.title,
        order: chOrder++,
        type: "native",
        pageStart: Math.floor((chIdx / raw.length) * 400) + 1,
        pageEnd: Math.floor(((chIdx + 1) / raw.length) * 400),
        subChapters: (ch.subChapters || []).map((sc, scIdx) => ({
          id: `sc-ai-${Date.now()}-${chOrder}-${scIdx}`,
          title: sc.title,
          order: scIdx,
          completed: false,
          knowledgePoints: [],
          examples: [],
          exercises: [],
        })),
      };
      return chapter;
    });
  } catch {
    // Fallback: return a single chapter
    return [
      {
        id: `ch-ai-${Date.now()}`,
        title: "自动分析结果",
        order: 0,
        type: "native",
        pageStart: 1,
        pageEnd: 30,
        subChapters: [
          {
            id: `sc-ai-${Date.now()}-0`,
            title: "待整理内容",
            order: 0,
            completed: false,
            knowledgePoints: [],
            examples: [],
            exercises: [],
          },
        ],
      },
    ];
  }
}

function parseKnowledgeResponse(response: string): {
  knowledgePoints: KnowledgePoint[];
  examples: Example[];
  exercises: Exercise[];
} {
  let clean = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  let raw: RawKnowledge;
  try {
    raw = JSON.parse(clean);
  } catch {
    try {
      raw = JSON.parse(clean + '"} ] }');
    } catch {}
    try {
      raw = JSON.parse(clean + '"]}');
    } catch {}
    try {
      const last = clean.lastIndexOf('"}');
      if (last > 0) raw = JSON.parse(clean.slice(0, last + 2) + "]}");
      else raw = { knowledgePoints: [], examples: [], exercises: [] };
    } catch {
      raw = { knowledgePoints: [], examples: [], exercises: [] };
    }
  }
  return {
    knowledgePoints: (raw.knowledgePoints || []).map((kp, i) => ({
      id: "kp-ai-" + Date.now() + "-" + i,
      title: kp.title || "",
      content: kp.content || "",
    })),
    examples: (raw.examples || []).map((ex, i) => ({
      id: "ex-ai-" + Date.now() + "-" + i,
      question: ex.question || "",
      solution: ex.solution || "",
    })),
    exercises: (raw.exercises || []).map((ex, i) => ({
      id: "hw-ai-" + Date.now() + "-" + i,
      question: ex.question || "",
      solution: ex.solution || "",
    })),
  };
}

// ── Raw types for JSON parsing ──────────────────────────────────────────

interface RawChapter {
  title: string;
  order: number;
  subChapters: { title: string; order: number }[];
}

interface RawKnowledge {
  knowledgePoints: { title: string; content: string }[];
  examples: { question: string; solution: string }[];
  exercises: { question: string; solution: string }[];
}
