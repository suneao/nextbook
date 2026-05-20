"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HardDrive,
  Trash2,
  RefreshCw,
  ChevronDown,
  BookOpen,
  Dumbbell,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  getStorageUsageMB,
  getProjectStorageDetails,
  deleteProjectStorage,
  getStorageQuota,
  clearAllStorage,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import type { ProjectStorageInfo, StoredFile } from "@/lib/storage";
import { useLocale } from "@/lib/i18n";

const fileTypeIcon = (type: StoredFile["type"]) => {
  switch (type) {
    case "textbook":
      return <BookOpen className="size-3 shrink-0 text-blue-500" />;
    case "exercise":
      return <Dumbbell className="size-3 shrink-0 text-amber-500" />;
    case "exam":
      return <FileText className="size-3 shrink-0 text-emerald-500" />;
  }
};

const fileTypeLabel = (type: StoredFile["type"]) => {
  switch (type) {
    case "textbook":
      return "教材";
    case "exercise":
      return "习题";
    case "exam":
      return "试卷";
  }
};

export default function StoragePage() {
  const { t } = useLocale();
  const [usage, setUsage] = useState(0);
  const [quota, setQuota] = useState(0);
  const [projects, setProjects] = useState<ProjectStorageInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [details, usageMB, q] = await Promise.all([
      getProjectStorageDetails(),
      getStorageUsageMB(),
      getStorageQuota(),
    ]);
    setProjects(details);
    setUsage(usageMB);
    setQuota(Math.round((q.quota / (1024 * 1024)) * 10) / 10);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("dialog.deleteProject"))) return;
    await deleteProjectStorage(id);
    await refresh();
  };

  const handleClearAll = async () => {
    if (!confirm(t("dialog.clearAllStorage"))) return;
    await clearAllStorage();
    await refresh();
  };

  const usagePercent = quota > 0 ? Math.min(100, (usage / quota) * 100) : 0;

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("storage.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("storage.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="size-4 mr-1" />
              {t("storage.refresh")}
            </Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <HardDrive className="size-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("storage.used")}
                  </p>
                  <p className="text-2xl font-bold">
                    {usage} MB
                    {quota > 0 && (
                      <span className="text-lg font-normal text-muted-foreground">
                        {" "}
                        / {quota} MB
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAll}
                disabled={usage === 0}
                className="gap-1"
              >
                <AlertTriangle className="size-4" />
                {t("storage.clearAll")}
              </Button>
            </div>
            <div className="space-y-1">
              <Progress value={usagePercent} className="h-3 rounded-full" />
              <p className="text-xs text-muted-foreground text-right">
                {t("storage.usedPercent")} {usagePercent.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            {t("storage.projects")} ({projects.length})
          </h2>
          {!loaded ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("storage.noProjects")}
            </p>
          ) : (
            <div className="space-y-2">
              {projects.map((proj) => (
                <Collapsible key={proj.id}>
                  <Card className="shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left group">
                          <ChevronDown className="size-4 text-muted-foreground shrink-0 transition-transform group-aria-expanded:rotate-180" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {proj.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {proj.sizeMB} MB · {proj.files.length}{" "}
                              {t("storage.files")}
                            </p>
                          </div>
                        </CollapsibleTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive"
                          onClick={() => handleDelete(proj.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <CollapsibleContent>
                        <div className="mt-3 ml-6 space-y-1 border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {t("storage.allFiles")}
                          </p>
                          {proj.files.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              {t("storage.noFiles")}
                            </p>
                          ) : (
                            proj.files.map((f, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                              >
                                {fileTypeIcon(f.type)}
                                <span className="truncate flex-1">
                                  {f.name}
                                </span>
                                <span className="text-xs text-muted-foreground/60 shrink-0">
                                  {fileTypeLabel(f.type)}
                                </span>
                                <span className="shrink-0 tabular-nums">
                                  {f.sizeMB} MB
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
