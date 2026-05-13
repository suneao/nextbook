"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  Clock,
  Flame,
  BookOpen,
  Plus,
  Calendar,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  useSubjects,
  useTasks,
  useSessions,
  formatDate,
  isOverdue,
  getTotalStudyMinutes,
  type Subject,
  type Task,
} from "@/lib/study-data";

// ── Stat Card ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4 flex items-center gap-4">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: color ? `${color}18` : undefined }}
        >
          <Icon className="size-5" style={{ color: color || undefined }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Subject Card ────────────────────────────────────────────────────────

function SubjectCard({ subject }: { subject: Subject }) {
  const pct = Math.round((subject.completedTopics / subject.totalTopics) * 100);

  return (
    <Card
      className="transition-all duration-200 hover:shadow-md cursor-pointer group"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: subject.color,
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{subject.icon}</span>
            <span className="font-semibold text-sm">{subject.name}</span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {subject.completedTopics} / {subject.totalTopics} topics
            </span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Task Row ────────────────────────────────────────────────────────────

const priorityColors: Record<Task["priority"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6b7280",
};

function TaskRow({
  task,
  subject,
  onToggle,
}: {
  task: Task;
  subject?: Subject;
  onToggle: (id: string) => void;
}) {
  const done = task.status === "done";
  const overdue = !done && isOverdue(task.dueDate);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-accent/50 group ${
        done ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={() => onToggle(task.id)}
        className="shrink-0 transition-colors hover:scale-110"
      >
        {done ? (
          <CheckCircle2 className="size-5 text-emerald-500" />
        ) : (
          <Circle className="size-5 text-muted-foreground" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={`text-sm font-medium truncate ${
              done ? "line-through" : ""
            }`}
          >
            {task.title}
          </p>
          {subject && (
            <span
              className="shrink-0 size-2 rounded-full"
              style={{ backgroundColor: subject.color }}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {task.description}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className="text-xs font-medium px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: `${priorityColors[task.priority]}18`,
            color: priorityColors[task.priority],
          }}
        >
          {task.priority}
        </span>

        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" />
          {task.estimatedMinutes}m
        </span>

        <span
          className={`text-xs font-medium ${
            overdue
              ? "text-red-500 font-semibold"
              : done
                ? "text-emerald-600"
                : "text-muted-foreground"
          }`}
        >
          {overdue ? "Overdue" : formatDate(task.dueDate)}
        </span>
      </div>
    </div>
  );
}

// ── Recent Session ──────────────────────────────────────────────────────

function RecentSessions() {
  const { sessions } = useSessions();
  const { subjects } = useSubjects();

  const recent = sessions.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Flame className="size-4 text-orange-500" />
          Recent Review Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No review sessions yet. Start studying!
          </p>
        ) : (
          <div>
            {recent.map((s, i) => {
              const subj = subjects.find((x) => x.id === s.subjectId);
              return (
                <div key={s.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-lg">{subj?.icon || "📚"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {subj?.name || s.subjectId}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.notes}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {s.durationMinutes}m
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.topicsReviewed} topics
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Add Task Dialog ─────────────────────────────────────────────────────

function QuickAddTask({
  subjects,
  onAdd,
}: {
  subjects: Subject[];
  onAdd: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [priority, setPriority] = useState<Task["priority"]>("medium");

  const handleAdd = () => {
    if (!title.trim()) return;
    const task: Task = {
      id: `t${Date.now()}`,
      subjectId,
      title: title.trim(),
      description: "",
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      priority,
      status: "pending",
      estimatedMinutes: 60,
    };
    onAdd(task);
    setTitle("");
    setOpen(false);
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Quick Add Task
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-card">
      <input
        className="flex-1 bg-transparent text-sm px-2 py-1 outline-none placeholder:text-muted-foreground"
        placeholder="Task title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") setOpen(false);
        }}
        autoFocus
      />
      <select
        className="text-xs bg-accent rounded px-1.5 py-1 outline-none"
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
      >
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.icon} {s.name}
          </option>
        ))}
      </select>
      <select
        className="text-xs bg-accent rounded px-1.5 py-1 outline-none"
        value={priority}
        onChange={(e) => setPriority(e.target.value as Task["priority"])}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <Button size="sm" onClick={handleAdd}>
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────

export default function Dashboard() {
  const { subjects } = useSubjects();
  const { tasks, addTask, toggleTaskStatus } = useTasks();
  const { sessions } = useSessions();

  const pendingTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const overdueCount = pendingTasks.filter((t) => isOverdue(t.dueDate)).length;
  const totalMinutes = getTotalStudyMinutes(sessions);
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your study progress and manage tasks.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Active Subjects"
          value={String(subjects.length)}
          sub={`${subjects.reduce((s, x) => s + x.totalTopics, 0)} total topics`}
          color="#3b82f6"
        />
        <StatCard
          icon={CircleAlert}
          label="Active Tasks"
          value={String(pendingTasks.length)}
          sub={overdueCount > 0 ? `${overdueCount} overdue` : "All on track"}
          color={overdueCount > 0 ? "#ef4444" : "#f59e0b"}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={String(doneTasks.length)}
          sub={`${doneTasks.reduce((s, t) => s + (t.actualMinutes || t.estimatedMinutes), 0)} min invested`}
          color="#10b981"
        />
        <StatCard
          icon={Flame}
          label="Study Time"
          value={`${totalHours}h`}
          sub={`${sessions.length} review sessions`}
          color="#f59e0b"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasks Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="size-4 text-blue-500" />
                Study Tasks
              </CardTitle>
              <QuickAddTask subjects={subjects} onAdd={addTask} />
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[420px]">
                <div className="px-3 pb-3 space-y-0.5">
                  {/* Overdue Section */}
                  {pendingTasks.filter((t) => isOverdue(t.dueDate)).length >
                    0 && (
                    <>
                      <p className="text-xs font-semibold text-red-500 uppercase tracking-wider px-3 py-2">
                        Overdue
                      </p>
                      {pendingTasks
                        .filter((t) => isOverdue(t.dueDate))
                        .sort(
                          (a, b) =>
                            new Date(a.dueDate).getTime() -
                            new Date(b.dueDate).getTime(),
                        )
                        .map((t) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            subject={subjects.find((s) => s.id === t.subjectId)}
                            onToggle={toggleTaskStatus}
                          />
                        ))}
                    </>
                  )}

                  {/* Upcoming Section */}
                  {pendingTasks.filter((t) => !isOverdue(t.dueDate)).length >
                    0 && (
                    <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 pt-2">
                        Upcoming
                      </p>
                      {pendingTasks
                        .filter((t) => !isOverdue(t.dueDate))
                        .sort(
                          (a, b) =>
                            new Date(a.dueDate).getTime() -
                            new Date(b.dueDate).getTime(),
                        )
                        .map((t) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            subject={subjects.find((s) => s.id === t.subjectId)}
                            onToggle={toggleTaskStatus}
                          />
                        ))}
                    </>
                  )}

                  {/* Completed Section */}
                  {doneTasks.length > 0 && (
                    <>
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider px-3 py-2 pt-2">
                        Completed
                      </p>
                      {doneTasks.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          subject={subjects.find((s) => s.id === t.subjectId)}
                          onToggle={toggleTaskStatus}
                        />
                      ))}
                    </>
                  )}

                  {tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No tasks yet. Add your first study task!
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Side Column */}
        <div className="space-y-4">
          {/* Subjects */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="size-4 text-violet-500" />
                Subjects
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {subjects.map((s) => (
                <SubjectCard key={s.id} subject={s} />
              ))}
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <RecentSessions />
        </div>
      </div>
    </div>
  );
}
