"use client";

import { chatCompletion } from "./ai-service";
import type {
  Chapter,
  KnowledgePoint,
  Example,
  Exercise,
} from "./study-data-server";

// ── Locale-aware prompt helpers ─────────────────────────────────────────

type Locale = "zh-CN" | "en-US" | "ja-JP";

function resolveLocale(locale?: string): Locale {
  if (locale === "en-US" || locale === "ja-JP" || locale === "zh-CN") {
    return locale;
  }
  return "zh-CN";
}

// ── Chapter Division ────────────────────────────────────────────────────

export async function analyzeChapters(
  pdfText: string,
  modelId: string,
  signal?: AbortSignal,
  locale?: string,
): Promise<Chapter[]> {
  const loc = resolveLocale(locale);

  const prompts: Record<Locale, { system: string; user: string }> = {
    "zh-CN": {
      system:
        "你是一个教材分析专家。请根据提供的教材文本，识别并划分章节结构。请始终使用简体中文输出所有章节标题。",
      user:
        "请分析以下教材文本，识别出所有章节（大章）和小节（小章），返回JSON格式。\n\n" +
        "要求：\n" +
        '1. 识别所有大章标题（如"第一章 xxx"、"Chapter 1 xxx"等）\n' +
        "2. 只识别教材正文中的知识章节，跳过答案、附录、复习题、练习、索引、目录等非教学内容\n" +
        '3. 每个大章下识别所有小节（如"1.1 xxx"、"§1.2 xxx"等）\n' +
        "4. 如果文本中没有明确的章节标识，请根据内容主题自行划分\n" +
        "5. 每大章的小节数量不固定，根据实际内容确定\n" +
        "6. 所有标题必须使用简体中文输出\n" +
        '7. 【重要】每个小节都必须包含posMarker字段：找到该小节标题行最近的位置标记【POS_XXXXX】，返回编号（如"POS_05000"）。每个小节的posMarker都不能省略！\n\n' +
        "返回格式（严格JSON，不要markdown代码块）：\n" +
        "[\n" +
        "  {\n" +
        '    "title": "第一章：函数与极限",\n' +
        '    "order": 0,\n' +
        '    "subChapters": [\n' +
        '      { "title": "1.1 函数的概念", "order": 0, "posMarker": "POS_05000" },\n' +
        '      { "title": "1.2 极限的定义", "order": 1, "posMarker": "POS_12000" }\n' +
        "    ]\n" +
        "  }\n" +
        "]\n\n" +
        "教材文本：\n",
    },
    "en-US": {
      system:
        "You are a textbook analysis expert. Identify and divide the chapter structure from the provided text. Always output all chapter titles in English.",
      user:
        "Analyze the following textbook text, identify all chapters and sub-sections, and return JSON.\n\n" +
        "Requirements:\n" +
        '1. Identify all chapter titles (e.g. "Chapter 1: Functions", "1. Introduction")\n' +
        "2. Only identify instructional content chapters. Skip answer keys, appendices, review exercises, practice sets, indices, tables of contents, etc.\n" +
        '3. Under each chapter, identify all sub-sections (e.g. "1.1 Definition", "§2.1 Overview")\n' +
        "4. If there are no explicit chapter markers, divide by content topics\n" +
        "5. The number of sub-sections per chapter is not fixed; determine based on actual content\n" +
        "6. ALL titles MUST be in English\n" +
        '7. [REQUIRED] Every subchapter MUST include a posMarker field: find the nearest 【POS_XXXXX】 marker to the subchapter heading and return its number (e.g. "POS_05000"). Do NOT omit this field!\n\n' +
        "Output format (strict JSON, no markdown code block):\n" +
        "[\n" +
        "  {\n" +
        '    "title": "Chapter 1: Functions and Limits",\n' +
        '    "order": 0,\n' +
        '    "subChapters": [\n' +
        '      { "title": "1.1 Concept of Functions", "order": 0, "posMarker": "POS_05000" },\n' +
        '      { "title": "1.2 Definition of Limits", "order": 1, "posMarker": "POS_12000" }\n' +
        "    ]\n" +
        "  }\n" +
        "]\n\n" +
        "Textbook text:\n",
    },
    "ja-JP": {
      system:
        "あなたは教材分析の専門家です。提供されたテキストから章構成を識別・分割してください。すべての章タイトルを日本語で出力してください。",
      user:
        "以下の教材テキストを分析し、すべての章（大章）と節（小章）を識別してJSON形式で返してください。\n\n" +
        "要件：\n" +
        "1. すべての大章タイトルを識別（例：「第一章 xxx」「Chapter 1 xxx」など）\n" +
        "2. 各大章の下にすべての節を識別（例：「1.1 xxx」「§1.2 xxx」など）\n" +
        "4. テキストに明確な章の区切りがない場合は、内容のトピックに基づいて分割\n" +
        "5. 各大章の節数は固定せず、実際の内容に基づいて決定\n" +
        "6. すべてのタイトルを日本語で出力してください\n" +
        '7. テキスト内に【POS_XXXXX】のような位置マーカーがあります。各節について最も近いマーカー番号をposMarkerフィールドとして返してください（例："POS_05000"）\n\n' +
        "出力形式（厳密なJSON、マークダウンのコードブロックなし）：\n" +
        "[\n" +
        "  {\n" +
        '    "title": "第一章：関数と極限",\n' +
        '    "order": 0,\n' +
        '    "subChapters": [\n' +
        '      { "title": "1.1 関数の概念", "order": 0, "posMarker": "POS_05000" },\n' +
        '      { "title": "1.2 極限の定義", "order": 1, "posMarker": "POS_12000" }\n' +
        "    ]\n" +
        "  }\n" +
        "]\n\n" +
        "教材テキスト：\n",
    },
  };

  const p = prompts[loc];
  const systemPrompt = p.system;
  const userPrompt = p.user + pdfText;

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
  locale?: string,
): Promise<{
  knowledgePoints: KnowledgePoint[];
  examples: Example[];
  exercises: Exercise[];
}> {
  const loc = resolveLocale(locale);

  const prompts: Record<
    Locale,
    { system: string; userPrefix: string; userSuffix: string }
  > = {
    "zh-CN": {
      system:
        "你是一个教育内容分析专家。请从提供的教材文本中提取知识点、例题和习题。请始终使用简体中文输出所有内容。在JSON中，LaTeX反斜杠命令必须双重转义（如 \\frac 而非 \frac），否则JSON解析会失败。",
      userPrefix: '请详细分析以下教材文本中关于"',
      userSuffix:
        '"的内容，提取详细的学习材料。\n\n' +
        "【知识点要求 - 务必详细】\n" +
        "- 每个知识点必须包含200字以上的详细说明\n" +
        "- 禁止使用Markdown标题格式（# ## ###），内容中使用**加粗**、*斜体*、==荧光高亮==强调重点\n" +
        "- 每个知识点应包含：概念定义、核心性质、推导过程（如有）、典型应用场景、记忆技巧\n" +
        "- 公式必须使用LaTeX：行内 $...$，块级 $...$（独占一行）\n" +
        "- 分数 \\frac{}{}，根号 \\sqrt{}，积分 \\int，求和 \\sum，极限 \\lim\n" +
        "- 知识点数量：3-6个，确保覆盖完整\n" +
        "- 所有内容必须使用简体中文\n\n" +
        "【例题要求 - 务必完整】\n" +
        "- 每题必须包含完整的解答步骤，每步都要说明原因\n" +
        "- 题目和解答中使用 $...$ 包裹所有数学公式\n" +
        "- 例题数量：2-4道，从易到难\n\n" +
        "【课后习题要求】\n" +
        "- 每题必须包含详细解答\n" +
        "- 习题数量：1-3道\n\n" +
        "返回格式（严格JSON，不要markdown代码块）：\n" +
        "{\n" +
        '  "knowledgePoints": [\n' +
        '    { "title": "知识点标题", "content": "详细说明（公式用$...$格式）" }\n' +
        "  ],\n" +
        '  "examples": [\n' +
        '    { "question": "题目（公式用$...$格式）", "solution": "解答步骤（公式用$...$格式）" }\n' +
        "  ],\n" +
        '  "exercises": [\n' +
        '    { "question": "题目内容", "solution": "解答步骤" }\n' +
        "  ]\n" +
        "}\n\n" +
        "教材文本：\n",
    },
    "en-US": {
      system:
        "You are an educational content analysis expert. Extract knowledge points, examples, and exercises from the provided textbook text. Always output ALL content in English. In JSON, LaTeX backslash commands MUST be double-escaped (e.g. \\frac not \frac), otherwise JSON parsing will fail.",
      userPrefix: 'Please analyze the following textbook text about "',
      userSuffix:
        '" in detail and extract comprehensive learning materials.\n\n' +
        "【Knowledge Points - Must be detailed】\n" +
        "- Each knowledge point must include 200+ words of detailed explanation\n" +
        "- Do NOT use Markdown heading format (# ## ###). Use **bold**, *italic*, ==highlight== for emphasis\n" +
        "- Each knowledge point should include: definition, key properties, derivations (if any), typical applications, memory tips\n" +
        "- Use LaTeX for formulas: inline $...$, block $$...$$\n" +
        "- Fractions \\frac{}{}, roots \\sqrt{}, integrals \\int, sums \\sum, limits \\lim\n" +
        "- Number of knowledge points: 3-6, ensure complete coverage\n" +
        "- ALL content MUST be in English\n\n" +
        "【Examples - Must be complete】\n" +
        "- Each example must include complete step-by-step solutions with explanations for each step\n" +
        "- Wrap all math formulas in $...$\n" +
        "- Number of examples: 2-4, from easy to hard\n\n" +
        "【Exercises】\n" +
        "- Each exercise must include a detailed solution\n" +
        "- Number of exercises: 1-3\n\n" +
        "Output format (strict JSON, no markdown code block):\n" +
        "{\n" +
        '  "knowledgePoints": [\n' +
        '    { "title": "Knowledge point title", "content": "Detailed explanation (use $...$ for formulas)" }\n' +
        "  ],\n" +
        '  "examples": [\n' +
        '    { "question": "Problem (use $...$ for formulas)", "solution": "Solution steps (use $...$ for formulas)" }\n' +
        "  ],\n" +
        '  "exercises": [\n' +
        '    { "question": "Problem", "solution": "Solution" }\n' +
        "  ]\n" +
        "}\n\n" +
        "Textbook text:\n",
    },
    "ja-JP": {
      system:
        "あなたは教育コンテンツ分析の専門家です。提供された教材テキストから知識ポイント、例題、練習問題を抽出してください。すべての内容を日本語で出力してください。JSON内ではLaTeXのバックスラッシュコマンドを二重エスケープしてください（例：\\frac のように。\fracではない）。",
      userPrefix: "以下の教材テキストの「",
      userSuffix:
        "」について詳細に分析し、包括的な学習教材を抽出してください。\n\n" +
        "【知識ポイント - 詳細必須】\n" +
        "- 各知識ポイントは200字以上の詳細な説明を含めること\n" +
        "- Markdownの見出し形式（# ## ###）は禁止。**太字**、*斜体*、==ハイライト==で強調\n" +
        "- 各知識ポイントに含める：概念の定義、核心的性質、導出過程（あれば）、典型的な応用場面、記憶のコツ\n" +
        "- 数式はLaTeXを使用：インライン $...$、ブロック $$...$$\n" +
        "- 分数 \\frac{}{}、ルート \\sqrt{}、積分 \\int、和 \\sum、極限 \\lim\n" +
        "- 知識ポイント数：3〜6個、完全なカバレッジを確保\n" +
        "- すべての内容を日本語で出力すること\n\n" +
        "【例題 - 完全必須】\n" +
        "- 各例題は完全な解答ステップを含め、各ステップの理由を説明\n" +
        "- 数式は $...$ で囲む\n" +
        "- 例題数：2〜4問、易から難へ\n\n" +
        "【練習問題】\n" +
        "- 各問題に詳細な解答を含める\n" +
        "- 問題数：1〜3問\n\n" +
        "出力形式（厳密なJSON、マークダウンのコードブロックなし）：\n" +
        "{\n" +
        '  "knowledgePoints": [\n' +
        '    { "title": "知識ポイントのタイトル", "content": "詳細な説明（数式は$...$形式）" }\n' +
        "  ],\n" +
        '  "examples": [\n' +
        '    { "question": "問題（数式は$...$形式）", "solution": "解答ステップ（数式は$...$形式）" }\n' +
        "  ],\n" +
        '  "exercises": [\n' +
        '    { "question": "問題内容", "solution": "解答ステップ" }\n' +
        "  ]\n" +
        "}\n\n" +
        "教材テキスト：\n",
    },
  };

  const p = prompts[loc];
  const systemPrompt = p.system;
  const userPrompt =
    p.userPrefix + subChapterTitle + p.userSuffix + pdfText.slice(0, 10000);

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
  locale?: string,
): Promise<{
  knowledgePoints: KnowledgePoint[];
  examples: Example[];
  exercises: Exercise[];
}> {
  const loc = resolveLocale(locale);

  const prompts: Record<
    Locale,
    { system: string; userPrefix: string; userMid: string; userSuffix: string }
  > = {
    "zh-CN": {
      system:
        "你是一个教育内容分析专家。请根据用户要求优化知识点、例题和习题。请始终使用简体中文输出所有内容。在JSON中，LaTeX反斜杠命令必须双重转义（如 \\frac 而非 \frac），否则JSON解析会失败。",
      userPrefix: '请分析以下教材文本中关于"',
      userMid: '"的内容。\n\n用户的改进要求：',
      userSuffix:
        "\n\n请根据上述改进要求优化生成的内容。\n\n" +
        "重要：禁止使用Markdown标题格式（# ## ###），请用**加粗**、*斜体*、==荧光高亮==；" +
        "所有数学公式请使用LaTeX格式：行内公式用 $...$，块级用 $$...$$。\n\n" +
        "返回格式（严格JSON，不要markdown代码块）：\n" +
        "{\n" +
        '  "knowledgePoints": [{ "title": "...", "content": "..." }],\n' +
        '  "examples": [{ "question": "...", "solution": "..." }],\n' +
        '  "exercises": [{ "question": "...", "solution": "..." }]\n' +
        "}\n\n" +
        "教材文本：\n",
    },
    "en-US": {
      system:
        "You are an educational content analysis expert. Optimize knowledge points, examples, and exercises based on user requirements. Always output ALL content in English. In JSON, LaTeX backslash commands MUST be double-escaped (e.g. \\frac not \frac), otherwise JSON parsing will fail.",
      userPrefix: 'Please analyze the following textbook text about "',
      userMid: "\".\n\nUser's improvement requirements: ",
      userSuffix:
        "\n\nPlease optimize the generated content based on the above requirements.\n\n" +
        "Important: Do NOT use Markdown heading format (# ## ###). Use **bold**, *italic*, ==highlight==. " +
        "Use LaTeX for all math formulas: inline $...$, block $$...$$.\n\n" +
        "Output format (strict JSON, no markdown code block):\n" +
        "{\n" +
        '  "knowledgePoints": [{ "title": "...", "content": "..." }],\n' +
        '  "examples": [{ "question": "...", "solution": "..." }],\n' +
        '  "exercises": [{ "question": "...", "solution": "..." }]\n' +
        "}\n\n" +
        "Textbook text:\n",
    },
    "ja-JP": {
      system:
        "あなたは教育コンテンツ分析の専門家です。ユーザーの要件に基づいて知識ポイント、例題、練習問題を最適化してください。すべての内容を日本語で出力してください。JSON内ではLaTeXのバックスラッシュコマンドを二重エスケープしてください（例：\\frac のように。\fracではない）。",
      userPrefix: "以下の教材テキストの「",
      userMid: "」について分析してください。\n\nユーザーの改善要件：",
      userSuffix:
        "\n\n上記の改善要件に基づいて生成コンテンツを最適化してください。\n\n" +
        "重要：Markdownの見出し形式（# ## ###）は禁止。**太字**、*斜体*、==ハイライト==を使用。\n" +
        "すべての数式はLaTeX形式：インライン $...$、ブロック $$...$$。\n\n" +
        "出力形式（厳密なJSON、マークダウンのコードブロックなし）：\n" +
        "{\n" +
        '  "knowledgePoints": [{ "title": "...", "content": "..." }],\n' +
        '  "examples": [{ "question": "...", "solution": "..." }],\n' +
        '  "exercises": [{ "question": "...", "solution": "..." }]\n' +
        "}\n\n" +
        "教材テキスト：\n",
    },
  };

  const p = prompts[loc];
  const systemPrompt = p.system;
  const userPrompt =
    p.userPrefix +
    subChapterTitle +
    p.userMid +
    instructions +
    p.userSuffix +
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

/**
 * Try to extract chapter structure from reasoning/thinking text
 * when JSON parsing fails (e.g. DeepSeek V4 Flash outputs reasoning_content).
 *
 * Handles patterns like:
 *   "大章1: "1 Functions" 小节: "1.1 ...", "1.2 ...""
 *   "Chapter 1: \"Limits\" subChapters: \"1.1 ...\""
 */
function tryExtractFromReasoning(text: string): RawChapter[] {
  const chapters: RawChapter[] = [];

  // Pattern: 大章N: "Title" or Chapter N: "Title"
  const chapterRegex =
    /(?:大章|Chapter|Ch)\s*(\d+)\s*[:：]\s*[""]([^""]+)[""]/gi;

  let chMatch: RegExpExecArray | null;

  // Find all chapter boundaries first
  const chapterInfos: { index: number; num: number; title: string }[] = [];
  while ((chMatch = chapterRegex.exec(text)) !== null) {
    chapterInfos.push({
      index: chMatch.index,
      num: parseInt(chMatch[1], 10),
      title: chMatch[2].trim(),
    });
  }

  if (chapterInfos.length === 0) {
    // Try alternative pattern: numbered lines like "1 Functions", "2 Limits and Continuity"
    // that appear in a table of contents style
    const tocRegex =
      /(?:^|\n)\s*(\d{1,2})\s+([A-Z][^\n]{2,60}?)(?:\s+\d+\s*$|\s*$)/gm;
    while ((chMatch = tocRegex.exec(text)) !== null) {
      const num = parseInt(chMatch[1], 10);
      const title = chMatch[2].trim();
      // Filter out things that are clearly sub-chapters or page numbers
      if (num >= 1 && num <= 30 && !title.match(/^\d+\.\d/)) {
        chapterInfos.push({ index: chMatch.index, num, title });
      }
    }
  }

  if (chapterInfos.length === 0) return chapters;

  // For each chapter, find its sub-chapters
  for (let i = 0; i < chapterInfos.length; i++) {
    const ch = chapterInfos[i];
    const nextCh = chapterInfos[i + 1];
    const chText = text.slice(ch.index, nextCh ? nextCh.index : undefined);

    // Extract sub-chapters: "小节: "1.1 Title", "1.2 Title""
    // or "subChapters: "1.1 ...""
    const subMatch = chText.match(
      /(?:小节|subChapters?|sections?)\s*[:：]\s*([\s\S]+?)(?=(?:大章|Chapter|Ch)\s*\d+|$)/i,
    );

    const subChapters: { title: string; order: number }[] = [];
    if (subMatch) {
      // Extract individual sub-chapter titles: "1.1 Title", "1.2 Title"
      const subRegex = /[""]([^""]+)[""]/g;
      let subM: RegExpExecArray | null;
      let scOrder = 0;
      while ((subM = subRegex.exec(subMatch[1])) !== null) {
        subChapters.push({
          title: subM[1].trim(),
          order: scOrder++,
        });
      }
    }

    // If no sub-chapters found via the pattern above, try to find
    // numbered sub-sections like "X.Y Title" within this chapter's scope
    if (subChapters.length === 0) {
      const prefix = ch.num + ".";
      const subNumRegex = new RegExp(
        `${prefix.replace(/\./g, "\\.")}\\d+\\s+([^\\n]{2,80}?)(?:\\s*$|\\s*\")`,
        "gm",
      );
      let subM: RegExpExecArray | null;
      let scOrder = 0;
      while ((subM = subNumRegex.exec(chText)) !== null) {
        const title = subM[1].trim();
        // Avoid duplicates
        if (!subChapters.some((s) => s.title === title)) {
          subChapters.push({ title, order: scOrder++ });
        }
      }
    }

    chapters.push({
      title: ch.title,
      order: chapters.length,
      subChapters,
    });
  }

  return chapters;
}

function parseChapterResponse(response: string): Chapter[] {
  // Strip markdown code blocks if present
  let clean = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try to extract JSON array from response if it contains extra text
  const arrayMatch = clean.match(/\[[\s\S]*\]/);
  if (arrayMatch) clean = arrayMatch[0];

  let raw: RawChapter[];
  try {
    raw = JSON.parse(clean);
  } catch {
    // Try fixing common issues
    try {
      clean = clean
        .replace(/,](\s*)/g, "]")
        .replace(/,\s*}/g, "}")
        .replace(/}(\s*)\]/g, "}]");
      raw = JSON.parse(clean);
    } catch {
      // Try extracting chapters from reasoning text (DeepSeek V4 Flash etc.)
      const fromReasoning = tryExtractFromReasoning(response);
      if (fromReasoning.length > 0) {
        console.log(
          `[chapter-ai] Extracted ${fromReasoning.length} chapters from reasoning content.`,
        );
        raw = fromReasoning;
      } else {
        // Return fallback with the actual response text for debugging
        console.warn(
          "Failed to parse chapter response:",
          response.slice(0, 200),
        );
        return [
          {
            id: `ch-ai-${Date.now()}`,
            title: "AI 响应解析失败",
            order: 0,
            type: "native",
            pageStart: 1,
            pageEnd: 30,
            subChapters: [
              {
                id: `sc-ai-${Date.now()}-0`,
                title: "请增加模型的maxOutputTokens（建议8192+）后重试",
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
  }

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
}

function sanitizeJsonString(s: string): string {
  // JSON spec allows only these chars after \: " \ / b f n r t u
  // Any other \X (e.g. \{, \}, \[, \(, \^, \_, or any letter) is invalid JSON.
  // We walk character-by-character to double-escape all invalid backslash sequences.
  const validJsonEscapeChars = new Set([
    '"',
    "\\",
    "/",
    "b",
    "f",
    "n",
    "r",
    "t",
    "u",
  ]);

  let result = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === "\\") {
        // Already an escaped backslash \\ — keep as-is and skip the second \
        result += "\\\\";
        i++;
      } else if (validJsonEscapeChars.has(next)) {
        // Valid JSON escape sequence (\n, \t, \", \/, \b, \f, \r, \uXXXX)
        // Emit the backslash as-is; the next char will be appended normally
        result += ch;
      } else {
        // Invalid JSON escape (LaTeX: \{, \}, \[, \], \(, \), \^, \_, letters, etc.)
        // Double the backslash so \{ becomes \\{ which JSON.parse decodes as \{
        result += "\\\\";
      }
    } else {
      result += ch;
    }
  }
  // Remove trailing commas before ] or }
  result = result.replace(/,(\s*[}\]])/g, "$1");
  return result;
}

function parseKnowledgeResponse(response: string): {
  knowledgePoints: KnowledgePoint[];
  examples: Example[];
  exercises: Exercise[];
} {
  const clean = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  let raw: RawKnowledge | undefined;

  // Attempt 1: parse as-is (AI already escaped correctly)
  try {
    raw = JSON.parse(clean);
  } catch {
    // Attempt 2: sanitize backslashes and retry
    try {
      raw = JSON.parse(sanitizeJsonString(clean));
    } catch (e2) {
      console.warn(
        "[chapter-ai] JSON parse failed after sanitization:",
        (e2 as Error).message.slice(0, 120),
        "\nResponse prefix:",
        clean.slice(0, 200),
      );
    }
  }

  if (!raw) {
    raw = { knowledgePoints: [], examples: [], exercises: [] };
  }

  // Normalize: flatten any nested knowledgePoints and ensure title/content exist
  const kps: KnowledgePoint[] = [];
  let kpIdx = 0;
  for (const item of raw.knowledgePoints || []) {
    // If the item itself has a nested knowledgePoints array, flatten it
    if (Array.isArray((item as Record<string, unknown>).knowledgePoints)) {
      const nested = (item as Record<string, unknown>).knowledgePoints as Array<
        Record<string, unknown>
      >;
      for (const n of nested) {
        kps.push({
          id: "kp-ai-" + Date.now() + "-" + kpIdx++,
          title: String(n.title || ""),
          content: String(n.content || ""),
        });
      }
    } else {
      kps.push({
        id: "kp-ai-" + Date.now() + "-" + kpIdx++,
        title: String((item as Record<string, unknown>).title || ""),
        content: String((item as Record<string, unknown>).content || ""),
      });
    }
  }

  const exs: Example[] = (raw.examples || []).map((ex, i) => ({
    id: "ex-ai-" + Date.now() + "-" + i,
    question: String((ex as Record<string, unknown>).question || ""),
    solution: String((ex as Record<string, unknown>).solution || ""),
  }));

  const hws: Exercise[] = (raw.exercises || []).map((ex, i) => ({
    id: "hw-ai-" + Date.now() + "-" + i,
    question: String((ex as Record<string, unknown>).question || ""),
    solution: String((ex as Record<string, unknown>).solution || ""),
  }));

  return {
    knowledgePoints: kps,
    examples: exs,
    exercises: hws,
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
