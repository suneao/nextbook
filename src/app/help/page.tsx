"use client";

import {
  Upload,
  Sparkles,
  FolderKanban,
  FileText,
  MessageCircle,
  Settings,
  Download,
  Globe,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n";

const helpSections = [
  {
    key: "projects",
    icon: FolderKanban,
    steps: 4,
  },
  {
    key: "materials",
    icon: Upload,
    steps: 4,
  },
  {
    key: "aiChapters",
    icon: Sparkles,
    steps: 4,
  },
  {
    key: "study",
    icon: FileText,
    steps: 4,
  },
  {
    key: "language",
    icon: Globe,
    steps: 3,
  },
  {
    key: "models",
    icon: Settings,
    steps: 4,
  },
  {
    key: "aiChat",
    icon: MessageCircle,
    steps: 4,
  },
  {
    key: "importExport",
    icon: Download,
    steps: 4,
  },
  {
    key: "tools",
    icon: Wrench,
    steps: 3,
  },
];

export default function HelpPage() {
  const { t } = useLocale();

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("help.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("help.subtitle")}
          </p>
        </div>

        <div className="space-y-4">
          {helpSections.map((section, i) => {
            const Icon = section.icon;
            return (
              <Card key={i} className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-4 text-primary" />
                    </div>
                    {t(`help.section.${section.key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {Array.from({ length: section.steps }, (_, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground mt-0.5">
                          {j + 1}
                        </span>
                        {t(`help.section.${section.key}.step.${j}`)}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
