"use client";

const DB = "nextbook-db";
const VER = 3;
import type {
  Project,
  Textbook,
  ExercisePDF,
  ExamPDF,
} from "./study-data-server";
const PROJECTS_KEY = "nextbook-projects-index";

function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains("data"))
        r.result.createObjectStore("data");
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}

async function withDB<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  return new Promise((ok, fail) => {
    const tx = db.transaction("data", mode);
    const req = fn(tx.objectStore("data"));
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}

export async function saveData(key: string, value: string): Promise<void> {
  if (typeof window === "undefined") return;
  await withDB("readwrite", (s) => s.put(value, key));
}

export async function loadData(key: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    return await withDB("readonly", (s) => s.get(key));
  } catch {
    return null;
  }
}

export async function removeData(key: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await withDB("readwrite", (s) => s.delete(key));
  } catch {}
}

export async function getAllKeys(): Promise<string[]> {
  if (typeof window === "undefined") return [];
  try {
    return await withDB(
      "readonly",
      (s) => s.getAllKeys() as IDBRequest<string[]>,
    );
  } catch {
    return [];
  }
}

export async function getKeySize(key: string): Promise<number> {
  const v = await loadData(key);
  return v
    ? Math.round((new TextEncoder().encode(v).length / (1024 * 1024)) * 100) /
        100
    : 0;
}

export async function getStorageUsageMB(): Promise<number> {
  if (typeof window === "undefined") return 0;
  try {
    const keys = await getAllKeys();
    let bytes = 0;
    for (const k of keys) {
      const v = await loadData(k);
      if (v) bytes += new TextEncoder().encode(v).length;
    }
    return Math.round((bytes / (1024 * 1024)) * 10) / 10;
  } catch {
    return 0;
  }
}

// ── Project-level storage ────────────────────────────────────────────────

export type StoredFile = {
  name: string;
  sizeMB: number;
  type: "textbook" | "exercise" | "exam";
};

export type ProjectStorageInfo = {
  id: string;
  name: string;
  sizeMB: number;
  files: StoredFile[];
};

function collectFiles(proj: Project): StoredFile[] {
  const files: StoredFile[] = [];
  const add = (
    arr: (Textbook | ExercisePDF | ExamPDF)[],
    type: StoredFile["type"],
  ) => {
    for (const f of arr || []) {
      const bytes = f.fileData
        ? new TextEncoder().encode(f.fileData).length
        : f.fileSize || 0;
      files.push({
        name: f.name,
        sizeMB: Math.round((bytes / (1024 * 1024)) * 100) / 100,
        type,
      });
    }
  };
  add(proj.textbooks, "textbook");
  add(proj.exercises, "exercise");
  add(proj.exams, "exam");
  return files;
}

export async function getProjectStorageDetails(): Promise<
  ProjectStorageInfo[]
> {
  try {
    const rawIdx = await loadData(PROJECTS_KEY);
    if (!rawIdx) return [];
    const idx: { id: string; name: string }[] = JSON.parse(rawIdx) as {
      id: string;
      name: string;
    }[];
    const result: ProjectStorageInfo[] = [];
    for (const { id, name } of idx) {
      const projKey = "project-" + id;
      const raw = await loadData(projKey);
      const sizeMB = raw
        ? Math.round(
            (new TextEncoder().encode(raw).length / (1024 * 1024)) * 100,
          ) / 100
        : 0;
      let files: StoredFile[] = [];
      if (raw) {
        try {
          files = collectFiles(JSON.parse(raw));
        } catch {}
      }
      result.push({ id, name, sizeMB, files });
    }
    return result;
  } catch {
    return [];
  }
}

export async function deleteProjectStorage(projectId: string): Promise<void> {
  await removeData("project-" + projectId);
  // Update index
  const rawIdx = await loadData(PROJECTS_KEY);
  if (rawIdx) {
    try {
      const idx = JSON.parse(rawIdx);
      await saveData(
        PROJECTS_KEY,
        JSON.stringify(idx.filter((p: { id: string }) => p.id !== projectId)),
      );
    } catch {}
  }
}

export async function loadAllProjects(): Promise<Project[]> {
  const rawIdx = await loadData(PROJECTS_KEY);
  if (!rawIdx) return [];
  try {
    const idx: { id: string }[] = JSON.parse(rawIdx);
    const projects: Project[] = [];
    for (const p of idx) {
      const raw = await loadData("project-" + p.id);
      if (raw) projects.push(JSON.parse(raw));
    }
    return projects;
  } catch {
    return [];
  }
}

export async function saveProject(project: Project): Promise<void> {
  await saveData("project-" + project.id, JSON.stringify(project));
  // Update index
  const rawIdx = await loadData(PROJECTS_KEY);
  const idx: { id: string; name: string }[] = rawIdx ? JSON.parse(rawIdx) : [];
  const existing = idx.findIndex((p: { id: string }) => p.id === project.id);
  if (existing >= 0) idx[existing] = { id: project.id, name: project.name };
  else idx.push({ id: project.id, name: project.name });
  await saveData(PROJECTS_KEY, JSON.stringify(idx));
}

export async function saveAllProjects(projects: Project[]): Promise<void> {
  for (const p of projects) await saveProject(p);
}

export async function getStorageQuota(): Promise<{
  usage: number;
  quota: number;
}> {
  if (typeof window === "undefined" || !("storage" in navigator)) {
    return { usage: 0, quota: 0 };
  }
  try {
    const est = await navigator.storage.estimate();
    return {
      usage: est.usage || 0,
      quota: est.quota || 0,
    };
  } catch {
    return { usage: 0, quota: 0 };
  }
}

export async function clearAllStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  const keys = await getAllKeys();
  for (const k of keys) {
    await removeData(k);
  }
}

export { PROJECTS_KEY };
