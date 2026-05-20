"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────

export type Locale = "zh-CN" | "en-US" | "ja-JP";

type TranslationDict = Record<string, string>;

const dictionaries: Record<Locale, TranslationDict> = {
  "zh-CN": {
    // App shell
    "app.title": "NextBook",
    "nav.dashboard": "学习仪表盘",
    "nav.projects": "项目管理",
    "nav.storage": "存储管理",
    "nav.settings": "设置",

    // Dashboard
    "dashboard.welcome": "欢迎回来，继续你的学习之旅",
    "dashboard.recentProjects": "最近项目",
    "dashboard.viewAll": "全部",
    "dashboard.todos": "待办事项",
    "dashboard.noTodos": "暂无待办",
    "dashboard.newProject": "创建新项目",
    "dashboard.uploadTextbook": "上传教材开始学习",

    // Projects
    "projects.title": "项目管理",
    "projects.subtitle": "管理你的学习项目",
    "projects.new": "新建项目",
    "projects.import": "导入",
    "projects.export": "导出",
    "projects.edit": "编辑",
    "projects.delete": "删除",
    "projects.empty": "还没有项目",
    "projects.emptyHint": "创建你的第一个学习项目开始学习",
    "projects.create": "创建项目",

    // Project detail
    "project.chapters": "章节目录",
    "project.addChapter": "添加章节",
    "project.aiAnalyze": "AI分析教材分章",
    "project.materials": "学习材料",
    "project.textbooks": "教材",
    "project.exercises": "习题",
    "project.exams": "试卷",
    "project.noTextbook": "暂无教材",
    "project.noExercise": "暂无习题",
    "project.noExam": "暂无试卷",
    "project.selectChapter": "从左侧目录树选择一个章节开始学习",
    "project.uploadHint": "也可以在下方学习材料区域上传教材PDF",
    "project.native": "原生",
    "project.custom": "自定义",
    "project.completed": "已完成",
    "project.complete": "完成学习",
    "project.markDone": "✓ 已完成",
    "project.knowledgePoints": "知识点",
    "project.examples": "例题",
    "project.exercisesSection": "课后习题",
    "project.addKp": "添加知识点",
    "project.addExample": "添加例题",
    "project.addExercise": "添加课后习题",

    // Settings
    "settings.title": "设置",
    "settings.subtitle": "管理应用偏好和AI模型配置",
    "settings.appearance": "外观设置",
    "settings.appearanceDesc": "选择应用程序的主题模式",
    "settings.models": "大模型设置",
    "settings.modelsDesc": "为不同的任务选择对应的AI模型",
    "settings.modelManage": "模型管理",
    "settings.modelManageDesc": "添加和配置自定义AI模型",
    "settings.language": "多语言支持",
    "settings.languageDesc": "选择应用程序的显示语言",
    "settings.chapterModel": "章节划分模型",
    "settings.summaryModel": "知识点总结模型",
    "settings.qaModel": "知识点问答模型",
    "settings.addModel": "添加模型",
    "settings.import": "导入",
    "settings.export": "导出",
    "settings.autoSaved": "设置已自动保存",
    "settings.light": "浅色",
    "settings.dark": "深色",
    "settings.system": "跟随系统",

    // Storage
    "storage.title": "存储管理",
    "storage.subtitle": "IndexedDB 存储空间 · 每 5 秒自动刷新",
    "storage.used": "已用空间",
    "storage.clearAll": "清空所有",
    "storage.refresh": "刷新",
    "storage.projects": "项目",
    "storage.files": "个文件",
    "storage.allFiles": "所有文件",
    "storage.noFiles": "暂无文件",
    "storage.noProjects": "暂无项目数据",
    "storage.usedPercent": "已使用",

    // Common
    "common.save": "保存",
    "common.cancel": "取消",
    "common.confirm": "确定",
    "common.delete": "删除",
    "common.back": "返回",
    "common.edit": "编辑",
    "common.preview": "点击预览",
    "common.regenerate": "重新生成",
    "common.addSubChapter": "添加小节",
    "common.deleteChapter": "删除章节",
    "common.stopGenerate": "停止生成",

    // Dialogs
    "dialog.deleteProject": "确定删除此项目？所有数据将被清除。",
    "dialog.clearAllStorage":
      "确定要清空所有存储数据吗？此操作不可撤销，所有项目和文件将被永久删除。",
    "dialog.importSuccess": "导入成功！",
    "dialog.invalidProject": "无效的项目文件：未找到 project.json",
    "dialog.importFailed": "导入失败",
    "dialog.exportFailed": "导出失败",
  },

  "en-US": {
    "app.title": "NextBook",
    "nav.dashboard": "Dashboard",
    "nav.projects": "Projects",
    "nav.storage": "Storage",
    "nav.settings": "Settings",

    "dashboard.welcome": "Welcome back, continue your learning journey",
    "dashboard.recentProjects": "Recent Projects",
    "dashboard.viewAll": "View All",
    "dashboard.todos": "Todo List",
    "dashboard.noTodos": "No todos yet",
    "dashboard.newProject": "Create New Project",
    "dashboard.uploadTextbook": "Upload a textbook to get started",

    "projects.title": "Projects",
    "projects.subtitle": "Manage your learning projects",
    "projects.new": "New Project",
    "projects.import": "Import",
    "projects.export": "Export",
    "projects.edit": "Edit",
    "projects.delete": "Delete",
    "projects.empty": "No projects yet",
    "projects.emptyHint":
      "Create your first learning project to get started",
    "projects.create": "Create Project",

    "project.chapters": "Chapters",
    "project.addChapter": "Add Chapter",
    "project.aiAnalyze": "AI Analyze Textbook",
    "project.materials": "Learning Materials",
    "project.textbooks": "Textbooks",
    "project.exercises": "Exercises",
    "project.exams": "Exams",
    "project.noTextbook": "No textbooks",
    "project.noExercise": "No exercises",
    "project.noExam": "No exams",
    "project.selectChapter":
      "Select a chapter from the sidebar to start learning",
    "project.uploadHint":
      "You can also upload a textbook PDF in the materials section below",
    "project.native": "Native",
    "project.custom": "Custom",
    "project.completed": "Completed",
    "project.complete": "Mark Complete",
    "project.markDone": "✓ Completed",
    "project.knowledgePoints": "Knowledge Points",
    "project.examples": "Examples",
    "project.exercisesSection": "Exercises",
    "project.addKp": "Add Knowledge Point",
    "project.addExample": "Add Example",
    "project.addExercise": "Add Exercise",

    "settings.title": "Settings",
    "settings.subtitle": "Manage app preferences and AI model configuration",
    "settings.appearance": "Appearance",
    "settings.appearanceDesc": "Choose the application theme",
    "settings.models": "AI Model Settings",
    "settings.modelsDesc": "Select AI models for different tasks",
    "settings.modelManage": "Model Management",
    "settings.modelManageDesc": "Add and configure custom AI models",
    "settings.language": "Language",
    "settings.languageDesc": "Choose the application display language",
    "settings.chapterModel": "Chapter Analysis Model",
    "settings.summaryModel": "Summary Model",
    "settings.qaModel": "Q&A Model",
    "settings.addModel": "Add Model",
    "settings.import": "Import",
    "settings.export": "Export",
    "settings.autoSaved": "Settings auto-saved",
    "settings.light": "Light",
    "settings.dark": "Dark",
    "settings.system": "System",

    "storage.title": "Storage Management",
    "storage.subtitle": "IndexedDB Storage · Auto-refreshes every 5s",
    "storage.used": "Used Space",
    "storage.clearAll": "Clear All",
    "storage.refresh": "Refresh",
    "storage.projects": "Projects",
    "storage.files": "files",
    "storage.allFiles": "All Files",
    "storage.noFiles": "No files",
    "storage.noProjects": "No project data",
    "storage.usedPercent": "Used",

    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.delete": "Delete",
    "common.back": "Back",
    "common.edit": "Edit",
    "common.preview": "Click to preview",
    "common.regenerate": "Regenerate",
    "common.addSubChapter": "Add Subsection",
    "common.deleteChapter": "Delete Chapter",
    "common.stopGenerate": "Stop Generating",

    "dialog.deleteProject":
      "Are you sure you want to delete this project? All data will be lost.",
    "dialog.clearAllStorage":
      "Are you sure you want to clear all storage? This action cannot be undone. All projects and files will be permanently deleted.",
    "dialog.importSuccess": "Import successful!",
    "dialog.invalidProject": "Invalid project file: project.json not found",
    "dialog.importFailed": "Import failed",
    "dialog.exportFailed": "Export failed",
  },

  "ja-JP": {
    "app.title": "NextBook",
    "nav.dashboard": "ダッシュボード",
    "nav.projects": "プロジェクト",
    "nav.storage": "ストレージ",
    "nav.settings": "設定",

    "dashboard.welcome": "お帰りなさい、学習を続けましょう",
    "dashboard.recentProjects": "最近のプロジェクト",
    "dashboard.viewAll": "すべて表示",
    "dashboard.todos": "ToDoリスト",
    "dashboard.noTodos": "ToDoはありません",
    "dashboard.newProject": "新規プロジェクト",
    "dashboard.uploadTextbook": "教科書をアップロードして始めましょう",

    "projects.title": "プロジェクト管理",
    "projects.subtitle": "学習プロジェクトを管理",
    "projects.new": "新規プロジェクト",
    "projects.import": "インポート",
    "projects.export": "エクスポート",
    "projects.edit": "編集",
    "projects.delete": "削除",
    "projects.empty": "プロジェクトがありません",
    "projects.emptyHint":
      "最初の学習プロジェクトを作成して始めましょう",
    "projects.create": "プロジェクト作成",

    "project.chapters": "章目次",
    "project.addChapter": "章を追加",
    "project.aiAnalyze": "AI教科書分析",
    "project.materials": "学習教材",
    "project.textbooks": "教科書",
    "project.exercises": "演習問題",
    "project.exams": "試験",
    "project.noTextbook": "教科書なし",
    "project.noExercise": "演習問題なし",
    "project.noExam": "試験なし",
    "project.selectChapter":
      "サイドバーから章を選択して学習を開始",
    "project.uploadHint":
      "下の教材エリアから教科書PDFをアップロードできます",
    "project.native": "ネイティブ",
    "project.custom": "カスタム",
    "project.completed": "完了",
    "project.complete": "完了にする",
    "project.markDone": "✓ 完了",
    "project.knowledgePoints": "知識ポイント",
    "project.examples": "例題",
    "project.exercisesSection": "練習問題",
    "project.addKp": "知識ポイントを追加",
    "project.addExample": "例題を追加",
    "project.addExercise": "練習問題を追加",

    "settings.title": "設定",
    "settings.subtitle": "アプリの設定とAIモデルの構成を管理",
    "settings.appearance": "外観設定",
    "settings.appearanceDesc": "アプリケーションのテーマを選択",
    "settings.models": "AIモデル設定",
    "settings.modelsDesc": "各タスクのAIモデルを選択",
    "settings.modelManage": "モデル管理",
    "settings.modelManageDesc": "カスタムAIモデルを追加・設定",
    "settings.language": "言語",
    "settings.languageDesc": "表示言語を選択",
    "settings.chapterModel": "章分析モデル",
    "settings.summaryModel": "要約モデル",
    "settings.qaModel": "質疑応答モデル",
    "settings.addModel": "モデル追加",
    "settings.import": "インポート",
    "settings.export": "エクスポート",
    "settings.autoSaved": "設定は自動保存されました",
    "settings.light": "ライト",
    "settings.dark": "ダーク",
    "settings.system": "システム",

    "storage.title": "ストレージ管理",
    "storage.subtitle": "IndexedDBストレージ · 5秒ごとに自動更新",
    "storage.used": "使用容量",
    "storage.clearAll": "すべて削除",
    "storage.refresh": "更新",
    "storage.projects": "プロジェクト",
    "storage.files": "ファイル",
    "storage.allFiles": "全ファイル",
    "storage.noFiles": "ファイルなし",
    "storage.noProjects": "プロジェクトデータなし",
    "storage.usedPercent": "使用率",

    "common.save": "保存",
    "common.cancel": "キャンセル",
    "common.confirm": "確認",
    "common.delete": "削除",
    "common.back": "戻る",
    "common.edit": "編集",
    "common.preview": "クリックでプレビュー",
    "common.regenerate": "再生成",
    "common.addSubChapter": "サブセクション追加",
    "common.deleteChapter": "章を削除",
    "common.stopGenerate": "生成停止",

    "dialog.deleteProject":
      "このプロジェクトを削除してもよろしいですか？すべてのデータが失われます。",
    "dialog.clearAllStorage":
      "すべてのストレージを消去してもよろしいですか？この操作は取り消せません。すべてのプロジェクトとファイルが完全に削除されます。",
    "dialog.importSuccess": "インポート成功！",
    "dialog.invalidProject":
      "無効なプロジェクトファイル：project.jsonが見つかりません",
    "dialog.importFailed": "インポート失敗",
    "dialog.exportFailed": "エクスポート失敗",
  },
};

// ── Context ──────────────────────────────────────────────────────────────

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextType>({
  locale: "zh-CN",
  setLocale: () => {},
  t: (key: string) => key,
});

// ── Storage ──────────────────────────────────────────────────────────────

const LOCALE_STORAGE_KEY = "nextbook-locale";

function loadLocale(): Locale {
  if (typeof window === "undefined") return "zh-CN";
  try {
    const raw = localStorage.getItem("nextbook-settings");
    if (raw) {
      const settings = JSON.parse(raw);
      if (
        settings.language &&
        ["zh-CN", "en-US", "ja-JP"].includes(settings.language)
      ) {
        return settings.language as Locale;
      }
    }
  } catch {}
  return "zh-CN";
}

// ── Provider ─────────────────────────────────────────────────────────────

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("nextbook-settings") || "{}";
        const settings = JSON.parse(raw);
        settings.language = next;
        localStorage.setItem("nextbook-settings", JSON.stringify(settings));
      } catch {}
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      return dictionaries[locale]?.[key] ?? key;
    },
    [locale],
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useLocale() {
  return useContext(LocaleContext);
}
