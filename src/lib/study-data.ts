"use client";

// Re-export all types and data from the server-safe module
export type {
  Project,
  Textbook,
  ExercisePDF,
  ExamPDF,
  Chapter,
  SubChapter,
  KnowledgePoint,
  Example,
  Exercise,
  AIModel,
  AppSettings,
} from "./study-data-server";

export { defaultProjects, defaultSettings } from "./study-data-server";
