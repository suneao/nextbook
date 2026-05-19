// ── Types ──────────────────────────────────────────────────────────────

export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: string;
  textbooks: Textbook[];
  exercises: ExercisePDF[];
  exams: ExamPDF[];
  chapters: Chapter[];
};

export type Textbook = {
  id: string;
  name: string;
  fileUrl: string;
  totalPages: number;
  fileData?: string;
  pageMap?: ChapterPageRange[];
};

export type KnowledgePoint = {
  id: string;
  title: string;
  content: string;
};

export type Example = {
  id: string;
  question: string;
  solution: string;
};

export type Exercise = {
  id: string;
  question: string;
  solution: string;
};

export type ChapterPageRange = {
  chapterId: string;
  title: string;
  pageStart: number;
  pageEnd: number;
};

export type ExercisePDF = {
  id: string;
  name: string;
  fileUrl: string;
  fileData?: string;
};

export type ExamPDF = {
  id: string;
  name: string;
  fileUrl: string;
  year?: string;
  fileData?: string;
};

export type Chapter = {
  id: string;
  title: string;
  order: number;
  type: "native" | "custom";
  pageStart?: number;
  pageEnd?: number;
  subChapters: SubChapter[];
};

export type SubChapter = {
  id: string;
  title: string;
  order: number;
  completed: boolean;
  knowledgePoints: KnowledgePoint[];
  examples: Example[];
  exercises: Exercise[];
};

export type AIModel = {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  apiKey: string;
  apiUrl: string;
};

export type AppSettings = {
  theme: "light" | "dark" | "system";
  language: "zh-CN" | "en-US" | "ja-JP";
  chapterModel: string;
  summaryModel: string;
  qaModel: string;
  models: AIModel[];
};

export const defaultSettings: AppSettings = {
  theme: "system",
  language: "zh-CN",
  chapterModel: "gpt-4o",
  summaryModel: "gpt-4o",
  qaModel: "gpt-4o",
  models: [],
};

export const defaultProjects: Project[] = [
  {
    id: "proj1",
    name: "示例项目",
    description: "上传教材开始学习",
    color: "#3b82f6",
    icon: "📐",
    createdAt: new Date().toISOString(),
    textbooks: [],
    exercises: [],
    exams: [],
    chapters: [],
  },
];
