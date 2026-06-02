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
  previousChapterTitles?: string[],
): Promise<Chapter[]> {
  const loc = resolveLocale(locale);
  const titlesStr = previousChapterTitles?.length
    ? previousChapterTitles.map((t) => `- ${t}`).join("\n")
    : "";

  const prompts: Record<Locale, { system: string; user: string }> = {
    "zh-CN": {
      system:
        "你是一个教材分析专家。请根据提供的教材文本，识别并划分章节结构。\n\n【语言强制要求】你必须100%使用简体中文输出所有章节标题和子节标题。严禁输出任何英文、日文或其他语言的标题。即使原文标题是其他语言，也必须翻译为简体中文后输出。",
      user:
        "请分析以下教材文本，识别出所有章节（大章）和小节（小章），返回JSON格式。\n\n" +
        "【语言强制要求 - 最重要】\n" +
        "- 所有title字段必须使用简体中文，严禁输出英文、日文或其他语言\n" +
        "- 如果原文标题是英文、日文或其他语言，你必须将它们翻译为简体中文\n" +
        "- 翻译时要准确、专业，符合中文学术教材的表达习惯\n\n" +
        "要求：\n" +
        '1. 识别所有大章标题（如"第一章 xxx"、"Chapter 1 xxx"等）\n' +
        "2. 【关键】文本开头可能有目录，目录中会列出各章节标题。你必须忽略目录，只从正文中识别章节。\n" +
        "   posMarker必须指向正文中该小节标题第一次出现的位置标记，绝对不能指向目录区域的位置标记。\n" +
        "   判断方法：如果文本前半部分密集出现大量编号标题且篇幅很短（每个只有一行），那部分是目录，请跳过。\n" +
        "3. 识别教材中所有章节，包括章末复习题等——只跳过纯答案页、索引页\n" +
        '4. 每个大章下识别所有小节（如"1.1 xxx"、"§1.2 xxx"等）\n' +
        "5. 如果正文中没有明确的章节标识，请根据内容主题自行划分\n" +
        "6. 每大章的小节数量不固定，根据实际内容确定\n" +
        "7. 【重申语言要求】所有标题必须使用简体中文，禁止使用其他语言\n" +
        "8. 【重要】每个小节都必须包含posMarker和endPosMarker字段：\n" +
        '   - posMarker: 正文中该小节标题之前最近的位置标记编号（如"POS_010000"）\n' +
        '   - endPosMarker: 正文中该小节内容结束之后最近的位置标记编号（如"POS_020000"）\n' +
        "   - 如果是最后一个小节，endPosMarker用文本最后一个标记\n" +
        "   - 每个小节的posMarker和endPosMarker都不能省略！\n\n" +
        "返回格式（严格JSON，不要markdown代码块）：\n" +
        "[\n" +
        "  {\n" +
        '    "title": "第一章：函数与极限",\n' +
        '    "order": 0,\n' +
        '    "subChapters": [\n' +
        '      { "title": "1.1 函数的概念", "order": 0, "posMarker": "POS_010000", "endPosMarker": "POS_020000" },\n' +
        '      { "title": "1.2 极限的定义", "order": 1, "posMarker": "POS_020000", "endPosMarker": "POS_030000" }\n' +
        "    ]\n" +
        "  }\n" +
        "]\n\n" +
        (titlesStr
          ? "【格式统一要求】前面已识别的章节标题：\n" +
            titlesStr +
            "\n\n请确保新识别的章节标题与上述已有标题保持完全一致的格式风格（包括编号方式、标点符号、空格等）。\n\n"
          : "") +
        "教材文本：\n",
    },
    "en-US": {
      system:
        "You are a textbook analysis expert. Identify and divide the chapter structure from the provided text.\n\n[LANGUAGE REQUIREMENT] You MUST output ALL chapter and sub-section titles in English. Absolutely no Chinese, Japanese, or any other language. If the original titles are in another language, you MUST translate them to English.",
      user:
        "Analyze the following textbook text, identify all chapters and sub-sections, and return JSON.\n\n" +
        "[LANGUAGE REQUIREMENT - MOST IMPORTANT]\n" +
        "- ALL title fields MUST be in English. Do NOT output Chinese, Japanese, or any other language.\n" +
        "- If the original titles are in Chinese, Japanese, or another language, you MUST translate them to English.\n" +
        "- Translations must be accurate, professional, and consistent with academic English textbook conventions.\n\n" +
        "Requirements:\n" +
        '1. Identify all chapter titles (e.g. "Chapter 1: Functions", "1. Introduction")\n' +
        "2. [CRITICAL] The text may contain a Table of Contents at the beginning listing chapter titles. IGNORE the TOC entirely — only identify chapters from the body text.\n" +
        "   posMarker MUST point to where the section title first appears in the body text, NEVER to TOC area markers.\n" +
        "   How to detect TOC: a dense cluster of numbered titles early in the text, each very short (one line), is the TOC — skip it.\n" +
        "3. Only identify instructional content chapters. Skip answer keys, appendices, review exercises, practice sets, indices, tables of contents, etc.\n" +
        '4. Under each chapter, identify all sub-sections (e.g. "1.1 Definition", "§2.1 Overview")\n' +
        "5. If there are no explicit chapter markers in the body text, divide by content topics\n" +
        "6. The number of sub-sections per chapter is not fixed; determine based on actual content\n" +
        "7. [REPEAT LANGUAGE RULE] ALL titles MUST be in English — no exceptions!\n" +
        "8. [REQUIRED] Every subchapter MUST include both posMarker and endPosMarker fields:\n" +
        '   - posMarker: the nearest 【POS_XXXXX】 marker BEFORE this subchapter heading in the BODY TEXT (e.g. "POS_010000")\n' +
        '   - endPosMarker: the nearest 【POS_XXXXX】 marker AFTER this subchapter content ends in the BODY TEXT (e.g. "POS_020000")\n' +
        "   - For the last subchapter, use the final marker in the body text as endPosMarker\n" +
        "   - Do NOT omit these fields!\n\n" +
        "Output format (strict JSON, no markdown code block):\n" +
        "[\n" +
        "  {\n" +
        '    "title": "Chapter 1: Functions and Limits",\n' +
        '    "order": 0,\n' +
        '    "subChapters": [\n' +
        '      { "title": "1.1 Concept of Functions", "order": 0, "posMarker": "POS_010000", "endPosMarker": "POS_020000" },\n' +
        '      { "title": "1.2 Definition of Limits", "order": 1, "posMarker": "POS_020000", "endPosMarker": "POS_030000" }\n' +
        "    ]\n" +
        "  }\n" +
        "]\n\n" +
        (titlesStr
          ? "[FORMAT CONSISTENCY] Previously identified chapter titles:\n" +
            titlesStr +
            "\n\nNew chapter titles MUST match the EXACT formatting style of the above titles (numbering, punctuation, spacing, etc.).\n\n"
          : "") +
        "Textbook text:\n",
    },
    "ja-JP": {
      system:
        "あなたは教材分析の専門家です。提供されたテキストから章構成を識別・分割してください。\n\n【言語強制要件】すべての章タイトルと節タイトルを必ず日本語で出力してください。英語、中国語、その他の言語は一切使用禁止です。原文が他の言語であっても、必ず日本語に翻訳して出力すること。",
      user:
        "以下の教材テキストを分析し、すべての章（大章）と節（小章）を識別してJSON形式で返してください。\n\n" +
        "【言語強制要件 - 最重要】\n" +
        "- すべてのtitleフィールドは必ず日本語で出力すること。英語、中国語など他の言語は絶対に使用しないこと\n" +
        "- 原文タイトルが中国語・英語・その他の言語であっても、必ず日本語に翻訳すること\n" +
        "- 翻訳は正確で専門的、日本の学術教科書の表現習慣に合ったものにすること\n\n" +
        "要件：\n" +
        "1. すべての大章タイトルを識別（例：「第一章 xxx」「Chapter 1 xxx」など）\n" +
        "2. 【重要】テキストの冒頭に目次がある場合があります。目次は無視し、本文からのみ章を識別してください。\n" +
        "   posMarkerは必ず本文中の節タイトルの位置マーカーを指し、絶対に目次領域のマーカーを使用しないでください。\n" +
        "   目次の見分け方：テキストの前半に番号付きタイトルが密集し、各行が短い（1行のみ）部分は目次です。スキップしてください。\n" +
        "3. 各大章の下にすべての節を識別（例：「1.1 xxx」「§1.2 xxx」など）\n" +
        "4. テキストに明確な章の区切りがない場合は、内容のトピックに基づいて分割\n" +
        "5. 各大章の節数は固定せず、実際の内容に基づいて決定\n" +
        "6. 【言語再確認】すべてのタイトルを日本語で出力してください。他の言語は禁止です\n" +
        "7. 【必須】各節にはposMarkerとendPosMarkerの両方のフィールドを含めてください：\n" +
        '   - posMarker: 本文中の節タイトルの直前にある最も近い【POS_XXXXX】マーカー番号（例："POS_010000"）\n' +
        '   - endPosMarker: 本文中の節内容が終わった直後にある最も近い【POS_XXXXX】マーカー番号（例："POS_020000"）\n' +
        "   - 最後の節の場合は、本文の最後のマーカーをendPosMarkerとして使用\n" +
        "   - これらのフィールドを省略しないでください！\n\n" +
        "出力形式（厳密なJSON、マークダウンのコードブロックなし）：\n" +
        "[\n" +
        "  {\n" +
        '    "title": "第一章：関数と極限",\n' +
        '    "order": 0,\n' +
        '    "subChapters": [\n' +
        '      { "title": "1.1 関数の概念", "order": 0, "posMarker": "POS_010000", "endPosMarker": "POS_020000" },\n' +
        '      { "title": "1.2 極限の定義", "order": 1, "posMarker": "POS_020000", "endPosMarker": "POS_030000" }\n' +
        "    ]\n" +
        "  }\n" +
        "]\n\n" +
        (titlesStr
          ? "【フォーマット統一】以前に識別された章タイトル：\n" +
            titlesStr +
            "\n\n新しい章タイトルは上記のタイトルと完全に同じフォーマットスタイル（番号付け、句読点、スペースなど）に合わせてください。\n\n"
          : "") +
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
        "你是一个教育内容分析专家。请从提供的教材文本中提取知识点、例题和习题。\n\n【语言强制要求】你必须100%使用简体中文输出所有内容（知识点标题、知识点内容、题目、解答等）。严禁输出任何英文、日文或其他语言的内容。在JSON中，LaTeX反斜杠命令必须双重转义（如 \\frac 而非 \frac），否则JSON解析会失败。",
      userPrefix: '请详细分析以下教材文本中关于"',
      userSuffix:
        '"的内容，提取详细的学习材料。\n\n' +
        "【语言强制要求 - 最重要】\n" +
        "- 所有输出内容必须使用简体中文：知识点标题、知识点内容、例题的question和solution、习题的question和solution\n" +
        "- 严禁在任何字段中输出英文、日文或其他语言\n" +
        "- 如果原文是其他语言，你必须将它们翻译为专业准确的中文\n\n" +
        "【知识点要求 - 务必详细】\n" +
        "- 每个知识点必须包含300字以上的详细说明，内容要充实、有深度\n" +
        "- 充分利用Markdown排版：用**加粗**标出核心概念，用*斜体*标出注意事项，用==荧光高亮==标出关键公式\n" +
        "- 段落之间使用空行分隔（连续两个\\n），让内容层次分明\n" +
        "- 善用无序列表（ - 开头）和有序列表（1. 开头）来组织要点，但不要使用Markdown标题（# ## ###）\n" +
        "- 每个知识点结构：**概念定义**（用明确的语言定义）、**核心性质**（列出并解释关键性质）、**推导过程**（如有，分步骤展示）、**应用场景**（至少2个具体例子）、**记忆技巧**（帮助记忆的口诀或方法）\n" +
        "- 所有数学公式必须使用LaTeX格式：行内公式用 $...$ 包裹，重要公式独占一行用 $$...$$ 包裹\n" +
        "- 【禁止】公式内部绝对不能换行！所有数学表达式必须写在同一行中\n" +
        "- 公式示例：分数 \\frac{a}{b}、根号 \\sqrt{x}、积分 \\int_a^b f(x)dx、极限 \\lim_{x\\to 0}、求和 \\sum_{i=1}^n\n" +
        "- 知识点数量：3-6个，确保覆盖完整\n\n" +
        "【例题要求 - 务必完整】\n" +
        "- 每题必须包含完整的解答步骤，使用 **第1步：**、**第2步：** 分段落标注\n" +
        "- 每步都要说明依据的定理或性质，如：**分析思路：**、**推导过程：**、**代入计算：**\n" +
        "- 解答最后用 **答案：** 给出最终结论，答案独占一个段落\n" +
        "- 所有数学公式使用 $...$ 或 $$...$$ 包裹\n" +
        "- 每题需包含 relatedKnowledgePoints 数组，列出本题涉及的知识点名称（与上文提取的知识点标题对应）\n" +
        "- 例题数量：2-4道，从易到难\n\n" +
        "【课后习题要求】\n" +
        "- 每题必须包含详细解答，结构与例题相同（分步骤、有答案）\n" +
        "- 每题需包含 relatedKnowledgePoints 数组\n" +
        "- 习题数量：1-3道\n\n" +
        "返回格式（严格JSON，不要markdown代码块）：\n" +
        "{\n" +
        '  "knowledgePoints": [\n' +
        '    { "title": "知识点标题", "content": "详细说明（公式用$...$格式）" }\n' +
        "  ],\n" +
        '  "examples": [\n' +
        '    { "question": "题目（公式用$...$格式）", "solution": "解答（分步骤，公式用$...$格式）", "relatedKnowledgePoints": ["知识点1", "知识点2"] }\n' +
        "  ],\n" +
        '  "exercises": [\n' +
        '    { "question": "题目内容", "solution": "解答", "relatedKnowledgePoints": ["知识点1"] }\n' +
        "  ]\n" +
        "}\n\n" +
        "教材文本：\n",
    },
    "en-US": {
      system:
        "You are an educational content analysis expert. Extract knowledge points, examples, and exercises from the provided textbook text.\n\n[LANGUAGE REQUIREMENT] You MUST output ALL content in English — knowledge point titles, knowledge point content, example questions and solutions, exercise questions and solutions. Absolutely no Chinese, Japanese, or any other language. In JSON, LaTeX backslash commands MUST be double-escaped (e.g. \\frac not \frac), otherwise JSON parsing will fail.",
      userPrefix: 'Please analyze the following textbook text about "',
      userSuffix:
        '" in detail and extract comprehensive learning materials.\n\n' +
        "[LANGUAGE REQUIREMENT - MOST IMPORTANT]\n" +
        "- ALL output content MUST be in English: knowledge point titles, knowledge point content, example questions/solutions, exercise questions/solutions\n" +
        "- Do NOT output Chinese, Japanese, or any other language in ANY field\n" +
        "- If the source text is in another language, you MUST translate everything to professional, accurate English\n\n" +
        "【Knowledge Points - Must be detailed】\n" +
        "- Each knowledge point must include 300+ words of detailed explanation in English with rich content\n" +
        "- Use Markdown formatting extensively: **bold** for core concepts, *italic* for notes/warnings, ==highlight== for important formulas\n" +
        "- Separate paragraphs with blank lines (double \\n) to create clear visual hierarchy\n" +
        "- Use bullet lists ( - item) and numbered lists (1. item) to organize key points, but avoid Markdown headings (# ## ###)\n" +
        "- Structure each knowledge point: **Definition** (clear language), **Key Properties** (list and explain), **Derivation** (if applicable, step-by-step), **Applications** (at least 2 concrete examples), **Memory Tips** (mnemonics or tricks)\n" +
        "- ALL math formulas MUST use LaTeX: inline formulas in $...$, important standalone formulas in $$...$$\n" +
        "- [FORBIDDEN] Never put line breaks inside math formulas! All math expressions must be on a single line\n" +
        "- Formula examples: fractions \\frac{a}{b}, roots \\sqrt{x}, integrals \\int_a^b f(x)dx, limits \\lim_{x\\to 0}, sums \\sum_{i=1}^n\n" +
        "- Number of knowledge points: 3-6, ensure complete coverage\n\n" +
        "【Examples - Must be complete】\n" +
        "- Each example must include complete step-by-step solutions using **Step 1:**, **Step 2:** as separate paragraphs\n" +
        "- Each step must explain the reasoning: **Analysis:**, **Derivation:**, **Calculation:**\n" +
        "- End with **Answer:** giving the final result as a separate paragraph\n" +
        "- All math formulas in $...$ or $$...$$\n" +
        "- Each example must include a relatedKnowledgePoints array\n" +
        "- Number of examples: 2-4, from easy to hard\n\n" +
        "【Exercises】\n" +
        "- Each exercise must include a detailed solution, same structure as examples (step-by-step with answer)\n" +
        "- Each exercise must include a relatedKnowledgePoints array\n" +
        "- Number of exercises: 1-3\n\n" +
        "Output format (strict JSON, no markdown code block):\n" +
        "{\n" +
        '  "knowledgePoints": [\n' +
        '    { "title": "Knowledge point title", "content": "Detailed explanation (use $...$ for formulas)" }\n' +
        "  ],\n" +
        '  "examples": [\n' +
        '    { "question": "Problem (use $...$ for formulas)", "solution": "Solution (step-by-step, use $...$)", "relatedKnowledgePoints": ["KP1", "KP2"] }\n' +
        "  ],\n" +
        '  "exercises": [\n' +
        '    { "question": "Problem", "solution": "Solution", "relatedKnowledgePoints": ["KP1"] }\n' +
        "  ]\n" +
        "}\n\n" +
        "Textbook text:\n",
    },
    "ja-JP": {
      system:
        "あなたは教育コンテンツ分析の専門家です。提供された教材テキストから知識ポイント、例題、練習問題を抽出してください。\n\n【言語強制要件】すべての内容を必ず日本語で出力してください（知識ポイントのタイトルと内容、例題の問題と解答、練習問題の問題と解答）。英語、中国語、その他の言語は一切禁止です。JSON内ではLaTeXのバックスラッシュコマンドを二重エスケープしてください（例：\\frac のように。\fracではない）。",
      userPrefix: "以下の教材テキストの「",
      userSuffix:
        "」について詳細に分析し、包括的な学習教材を抽出してください。\n\n" +
        "【言語強制要件 - 最重要】\n" +
        "- すべての出力内容は必ず日本語で出力すること：知識ポイントのタイトル・内容、例題の問題・解答、練習問題の問題・解答\n" +
        "- どのフィールドでも英語・中国語・その他の言語を絶対に使用しないこと\n" +
        "- 原文が他の言語の場合は、すべて専門的で正確な日本語に翻訳すること\n\n" +
        "【知識ポイント - 詳細必須】\n" +
        "- 各知識ポイントは300字以上の詳細な説明を含め、内容を充実させること\n" +
        "- Markdown形式を積極的に活用：**太字**で核心概念を強調、*斜体*で注意事項を表示、==ハイライト==で重要な公式を目立たせる\n" +
        "- 段落は空行（連続した\\n）で区切り、内容の階層を明確にすること\n" +
        "- 箇条書き（ - 項目）や番号付きリスト（1. 項目）を使って要��を整理するが、Markdown見出し（# ## ###）は使用禁止\n" +
        "- 各知識ポイントの構造：**概念定義**（明確な言葉で）、**核心的性質**（重要性質を列挙し説明）、**導出過程**（あれば段階的に）、**応用場面**（少なくとも2つの具体例）、**記憶のコツ**（覚え方の工夫）\n" +
        "- すべての数式はLaTeX形式：インライン $...$、重要な式は $$...$$ で単独行に\n" +
        "- 【禁止】数式の内部で絶対に改行しないこと！\n" +
        "- 数式例：分数 \\frac{a}{b}、ルート \\sqrt{x}、積分 \\int_a^b f(x)dx、極限 \\lim_{x\\to 0}、和 \\sum_{i=1}^n\n" +
        "- 知識ポイント数：3〜6個\n\n" +
        "【例題 - 完全必須】\n" +
        "- 各例題は **第1步：**、**第2步：** と段落分けして完全な解答を含めること\n" +
        "- 各ステップで **分析：**、**導出：**、**計算：** のように根拠を説明\n" +
        "- 最後に **答案：** で最終結論を別段落で示す\n" +
        "- すべての数式は $...$ または $$...$$ で囲む\n" +
        "- 各例題に relatedKnowledgePoints 配列を含めること\n" +
        "- 例題数：2〜4問、易から難へ\n\n" +
        "【練習問題】\n" +
        "- 各問題に詳細な解答を含め、例題と同じ構造（ステップ分け・答案付き）\n" +
        "- 各問題に relatedKnowledgePoints 配列を含めること\n" +
        "- 問題数：1〜3問\n\n" +
        "出力形式（厳密なJSON、マークダウンのコードブロックなし）：\n" +
        "{\n" +
        '  "knowledgePoints": [\n' +
        '    { "title": "知識ポイントのタイトル", "content": "詳細な説明（数式は$...$形式）" }\n' +
        "  ],\n" +
        '  "examples": [\n' +
        '    { "question": "問題（数式は$...$形式）", "solution": "解答（ステップ分け、数式は$...$形式）", "relatedKnowledgePoints": ["KP1", "KP2"] }\n' +
        "  ],\n" +
        '  "exercises": [\n' +
        '    { "question": "問題内容", "solution": "解答", "relatedKnowledgePoints": ["KP1"] }\n' +
        "  ]\n" +
        "}\n\n" +
        "教材テキスト：\n",
    },
  };

  const p = prompts[loc];
  const systemPrompt = p.system;
  const userPrompt =
    p.userPrefix + subChapterTitle + p.userSuffix + pdfText.slice(0, 30000);

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
        "你是一个教育内容分析专家。请根据用户要求优化知识点、例题和习题。\n\n【语言强制要求】你必须100%使用简体中文输出所有内容。严禁输出任何英文、日文或其他语言。在JSON中，LaTeX反斜杠命令必须双重转义（如 \\frac 而非 \frac），否则JSON解析会失败。",
      userPrefix: '请分析以下教材文本中关于"',
      userMid: '"的内容。\n\n用户的改进要求：',
      userSuffix:
        "\n\n请根据上述改进要求优化生成的内容。\n\n" +
        "【语言强制要求 - 最重要】\n" +
        "- 所有输出内容必须使用简体中文，严禁在任何字段中输出英文、日文或其他语言\n\n" +
        "重要：禁止使用Markdown标题格式（# ## ###），请用**加粗**、*斜体*、==荧光高亮==；" +
        "所有数学公式请使用LaTeX格式：行内公式用 $...$，块级用 $$...$$。公式内部绝对不能换行！\n\n" +
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
        "You are an educational content analysis expert. Optimize knowledge points, examples, and exercises based on user requirements.\n\n[LANGUAGE REQUIREMENT] You MUST output ALL content in English. Absolutely no Chinese, Japanese, or any other language. In JSON, LaTeX backslash commands MUST be double-escaped (e.g. \\frac not \frac), otherwise JSON parsing will fail.",
      userPrefix: 'Please analyze the following textbook text about "',
      userMid: "\".\n\nUser's improvement requirements: ",
      userSuffix:
        "\n\nPlease optimize the generated content based on the above requirements.\n\n" +
        "[LANGUAGE REQUIREMENT - MOST IMPORTANT]\n" +
        "- ALL output content MUST be in English. Do NOT output Chinese, Japanese, or any other language in ANY field.\n\n" +
        "Important: Do NOT use Markdown heading format (# ## ###). Use **bold**, *italic*, ==highlight==. " +
        "Use LaTeX for all math formulas: inline $...$, block $$...$$. Never put line breaks inside formulas!\n\n" +
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
        "あなたは教育コンテンツ分析の専門家です。ユーザーの要件に基づいて知識ポイント、例題、練習問題を最適化してください。\n\n【言語強制要件】すべての内容を必ず日本語で出力してください。英語、中国語、その他の言語は一切禁止です。JSON内ではLaTeXのバックスラッシュコマンドを二重エスケープしてください（例：\\frac のように。\fracではない）。",
      userPrefix: "以下の教材テキストの「",
      userMid: "」について分析してください。\n\nユーザーの改善要件：",
      userSuffix:
        "\n\n上記の改善要件に基づいて生成コンテンツを最適化してください。\n\n" +
        "【言語強制要件 - 最重要】\n" +
        "- すべての出力内容は必ず日本語で出力すること。英語・中国語・その他の言語は絶対に使用しないこと。\n\n" +
        "重要：Markdownの見出し形式（# ## ###）は禁止。**太字**、*斜体*、==ハイライト==を使用。\n" +
        "すべての数式はLaTeX形式：インライン $...$、ブロック $$...$$。数式内部で絶対に改行しないでください！\n\n" +
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
    pdfText.slice(0, 30000);

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
        posMarker: sc.posMarker != null ? String(sc.posMarker) : undefined,
        endPosMarker:
          sc.endPosMarker != null ? String(sc.endPosMarker) : undefined,
      })),
    };
    return chapter;
  });
}

function sanitizeJsonString(s: string): string {
  // JSON spec allows only these chars after \: " \ /
  // All other \X sequences (including \n, \r, \t, \b, \f and any letter)
  // are treated as unescaped LaTeX commands and will be double-escaped.
  // \uXXXX is handled separately — only valid Unicode escapes pass through.
  const HEX_DIGIT = /^[0-9a-fA-F]$/;

  function isHex(ch: string): boolean {
    return HEX_DIGIT.test(ch);
  }

  let result = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === "\\") {
        // Already an escaped backslash \\ — keep as-is and skip the second \
        result += "\\\\";
        i++;
      } else if (next === '"' || next === "/") {
        // Valid JSON escapes: \", \/ — pass through as-is
        result += ch;
      } else if (
        next === "u" &&
        i + 5 < s.length &&
        isHex(s[i + 2]) &&
        isHex(s[i + 3]) &&
        isHex(s[i + 4]) &&
        isHex(s[i + 5])
      ) {
        // Valid JSON Unicode escape \uXXXX
        result += ch;
      } else {
        // Invalid JSON escape (LaTeX: \{, \}, \frac, \textbf, \underline, etc.)
        // Double the backslash so \frac becomes \\frac which JSON.parse decodes as \frac
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
  let clean = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try to extract JSON object from response if it contains extra text
  const objectMatch = clean.match(/\{[\s\S]*\}/);
  if (objectMatch) clean = objectMatch[0];

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
          title: String(n.title ?? ""),
          content: String(n.content ?? ""),
        });
      }
    } else {
      kps.push({
        id: "kp-ai-" + Date.now() + "-" + kpIdx++,
        title: String((item as Record<string, unknown>).title ?? ""),
        content: String((item as Record<string, unknown>).content ?? ""),
      });
    }
  }

  const exs: Example[] = (raw.examples || []).map((ex, i) => ({
    id: "ex-ai-" + Date.now() + "-" + i,
    question: String((ex as Record<string, unknown>).question ?? ""),
    solution: String((ex as Record<string, unknown>).solution ?? ""),
    relatedKnowledgePoints: Array.isArray(
      (ex as Record<string, unknown>).relatedKnowledgePoints,
    )
      ? (
          (ex as Record<string, unknown>).relatedKnowledgePoints as string[]
        ).map(String)
      : undefined,
  }));

  const hws: Exercise[] = (raw.exercises || []).map((ex, i) => ({
    id: "hw-ai-" + Date.now() + "-" + i,
    question: String((ex as Record<string, unknown>).question ?? ""),
    solution: String((ex as Record<string, unknown>).solution ?? ""),
    relatedKnowledgePoints: Array.isArray(
      (ex as Record<string, unknown>).relatedKnowledgePoints,
    )
      ? (
          (ex as Record<string, unknown>).relatedKnowledgePoints as string[]
        ).map(String)
      : undefined,
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
  subChapters: {
    title: string;
    order: number;
    posMarker?: string | number;
    endPosMarker?: string | number;
  }[];
}

interface RawKnowledge {
  knowledgePoints: { title: string; content: string }[];
  examples: {
    question: string;
    solution: string;
    relatedKnowledgePoints?: string[];
  }[];
  exercises: {
    question: string;
    solution: string;
    relatedKnowledgePoints?: string[];
  }[];
}
