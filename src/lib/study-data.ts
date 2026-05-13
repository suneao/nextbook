"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────

export type Subject = {
  id: string;
  name: string;
  color: string;
  icon: string;
  totalTopics: number;
  completedTopics: number;
};

export type Task = {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  dueDate: string; // ISO date
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "done";
  estimatedMinutes: number;
  actualMinutes?: number;
};

export type ReviewSession = {
  id: string;
  subjectId: string;
  date: string;
  durationMinutes: number;
  topicsReviewed: number;
  notes: string;
};

// ── Default Data ────────────────────────────────────────────────────────

const defaultSubjects: Subject[] = [
  {
    id: "math",
    name: "Mathematics",
    color: "#3b82f6",
    icon: "📐",
    totalTopics: 12,
    completedTopics: 5,
  },
  {
    id: "physics",
    name: "Physics",
    color: "#ef4444",
    icon: "⚡",
    totalTopics: 8,
    completedTopics: 3,
  },
  {
    id: "cs",
    name: "Computer Science",
    color: "#8b5cf6",
    icon: "💻",
    totalTopics: 15,
    completedTopics: 7,
  },
  {
    id: "history",
    name: "History",
    color: "#f59e0b",
    icon: "📜",
    totalTopics: 10,
    completedTopics: 2,
  },
];

const defaultTasks: Task[] = [
  {
    id: "t1",
    subjectId: "math",
    title: "Linear Algebra Review",
    description: "Review eigenvalues, eigenvectors, and matrix diagonalization.",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    priority: "high",
    status: "pending",
    estimatedMinutes: 90,
  },
  {
    id: "t2",
    subjectId: "physics",
    title: "Quantum Mechanics Chapter 5",
    description: "Read and take notes on wave-particle duality.",
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString(),
    priority: "high",
    status: "in-progress",
    estimatedMinutes: 120,
  },
  {
    id: "t3",
    subjectId: "cs",
    title: "Data Structures Implementation",
    description: "Implement BST, AVL tree, and Red-Black tree in TypeScript.",
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    priority: "medium",
    status: "pending",
    estimatedMinutes: 180,
  },
  {
    id: "t4",
    subjectId: "history",
    title: "Renaissance Period Notes",
    description: "Compile notes on Italian Renaissance art and architecture.",
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    priority: "low",
    status: "pending",
    estimatedMinutes: 60,
  },
  {
    id: "t5",
    subjectId: "math",
    title: "Statistics Problem Set",
    description: "Complete problems 1-20 on hypothesis testing.",
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString(),
    priority: "medium",
    status: "pending",
    estimatedMinutes: 75,
  },
  {
    id: "t6",
    subjectId: "cs",
    title: "Operating Systems: Memory Management",
    description: "Study virtual memory, paging, and segmentation.",
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    priority: "medium",
    status: "done",
    estimatedMinutes: 90,
    actualMinutes: 105,
  },
  {
    id: "t7",
    subjectId: "physics",
    title: "Electromagnetism Lab Report",
    description: "Write up the Faraday's law experiment results.",
    dueDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    priority: "high",
    status: "pending",
    estimatedMinutes: 120,
  },
];

const defaultSessions: ReviewSession[] = [
  {
    id: "s1",
    subjectId: "math",
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
    durationMinutes: 45,
    topicsReviewed: 2,
    notes: "Reviewed matrix operations and determinants.",
  },
  {
    id: "s2",
    subjectId: "cs",
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    durationMinutes: 60,
    topicsReviewed: 3,
    notes: "Practiced graph algorithms: BFS, DFS, Dijkstra.",
  },
  {
    id: "s3",
    subjectId: "physics",
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    durationMinutes: 30,
    topicsReviewed: 1,
    notes: "Quick review of Newton's laws.",
  },
];

// ── LocalStorage Helpers ────────────────────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`nextbook-${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`nextbook-${key}`, JSON.stringify(data));
}

// ── Hooks ───────────────────────────────────────────────────────────────

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>(() =>
    loadFromStorage("subjects", defaultSubjects),
  );

  useEffect(() => {
    saveToStorage("subjects", subjects);
  }, [subjects]);

  const addSubject = useCallback((s: Subject) => {
    setSubjects((prev) => [...prev, s]);
  }, []);

  const updateSubject = useCallback((id: string, patch: Partial<Subject>) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }, []);

  const removeSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { subjects, addSubject, updateSubject, removeSubject };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() =>
    loadFromStorage("tasks", defaultTasks),
  );

  useEffect(() => {
    saveToStorage("tasks", tasks);
  }, [tasks]);

  const addTask = useCallback((t: Task) => {
    setTasks((prev) => [...prev, t]);
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTaskStatus = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status:
                t.status === "done"
                  ? ("pending" as const)
                  : ("done" as const),
              actualMinutes:
                t.status !== "done" ? t.estimatedMinutes : undefined,
            }
          : t,
      ),
    );
  }, []);

  return { tasks, addTask, updateTask, removeTask, toggleTaskStatus };
}

export function useSessions() {
  const [sessions, setSessions] = useState<ReviewSession[]>(() =>
    loadFromStorage("sessions", defaultSessions),
  );

  useEffect(() => {
    saveToStorage("sessions", sessions);
  }, [sessions]);

  const addSession = useCallback((s: ReviewSession) => {
    setSessions((prev) => [...prev, s]);
  }, []);

  return { sessions, addSession };
}

// ── Utilities ───────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const dayMs = 86400000;

  if (Math.abs(diff) < dayMs && d.getDate() === now.getDate())
    return "Today";
  if (diff > 0 && diff < dayMs * 2 && d.getDate() === now.getDate() + 1)
    return "Tomorrow";
  if (diff < 0 && diff > -dayMs * 2 && d.getDate() === now.getDate() - 1)
    return "Yesterday";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < new Date().getTime();
}

export function getTotalStudyMinutes(sessions: ReviewSession[]): number {
  return sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function getSubjectById(
  subjects: Subject[],
  id: string,
): Subject | undefined {
  return subjects.find((s) => s.id === id);
}
