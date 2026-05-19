"use client";

import { chatCompletion } from "./ai-service";
import type {
  Chapter,
  SubChapter,
  KnowledgePoint,
  Example,
  Exercise,
} from "./study-data-server";

// ── Chapter Division ────────────────────────────────────────────────────

export async function analyzeChapters(
  pdfText: string,
  modelId: string,
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
    { temperature: 0.3, maxTokens: 4096 },
  );

  return parseChapterResponse(response);
}

// ── Knowledge Extraction ─────────────────────────────────────────────────

export async function extractKnowledgePoints(
  pdfText: string,
  subChapterTitle: string,
  modelId: string,
): Promise<{
  knowledgePoints: KnowledgePoint[];
  examples: Example[];
  exercises: Exercise[];
}> {
  const systemPrompt =
    "你是一个教育内容分析专家。请从提供的教材文本中提取知识点、例题和习题。";

  const userPrompt = `请分析以下教材文本中关于"${subChapterTitle}"的内容，提取：
1. 知识点（每个包含标题和详细说明）
2. 例题（每个包含题目和解答）
3. 课后习题（每个包含题目和解答）

返回格式（严格JSON，不要markdown代码块）：
{
  "knowledgePoints": [
    { "title": "知识点标题", "content": "详细说明内容" }
  ],
  "examples": [
    { "question": "题目内容", "solution": "解答步骤" }
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
    { temperature: 0.3, maxTokens: 4096 },
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
        pageStart: chIdx * 30 + 1,
        pageEnd: (chIdx + 1) * 30,
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
  try {
    const clean = response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const raw = JSON.parse(clean) as RawKnowledge;

    return {
      knowledgePoints: (raw.knowledgePoints || []).map((kp, i) => ({
        id: `kp-ai-${Date.now()}-${i}`,
        title: kp.title,
        content: kp.content,
      })),
      examples: (raw.examples || []).map((ex, i) => ({
        id: `ex-ai-${Date.now()}-${i}`,
        question: ex.question,
        solution: ex.solution,
      })),
      exercises: (raw.exercises || []).map((ex, i) => ({
        id: `hw-ai-${Date.now()}-${i}`,
        question: ex.question,
        solution: ex.solution,
      })),
    };
  } catch {
    return { knowledgePoints: [], examples: [], exercises: [] };
  }
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
