"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Sun,
  Moon,
  Monitor,
  Eye,
  EyeOff,
  Download,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AppSettings,
  type AIModel,
  defaultSettings,
} from "@/lib/study-data";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { useLocale } from "@/lib/i18n";

// ── Constants ──────────────────────────────────────────────────────────

const STORAGE_KEY = "nextbook-settings";

const LANGUAGE_OPTIONS: { value: AppSettings["language"]; label: string }[] = [
  { value: "zh-CN", label: "中文" },
  { value: "en-US", label: "English" },
  { value: "ja-JP", label: "日本語" },
];

const THEME_OPTIONS: {
  value: AppSettings["theme"];
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "亮色", icon: Sun },
  { value: "dark", label: "暗色", icon: Moon },
  { value: "system", label: "系统", icon: Monitor },
];

// ── Helpers ────────────────────────────────────────────────────────────

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultSettings;
}

function saveSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function maskApiKey(key: string): string {
  if (!key) return "●●●●";
  if (key.length > 8) {
    return key.slice(0, 3) + "..." + key.slice(-4);
  }
  return "●●●●";
}

// ── Page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const { setTheme } = useTheme();
  const { setLocale, t } = useLocale();
  const { toast } = useToast();

  useEffect(() => {
    const stored = loadSettings();
    startTransition(() => {
      setSettings(stored);
      setLoaded(true);
    });
  }, []);

  // Persist on every change
  const update = useCallback(
    (partial: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        saveSettings(next);
        return next;
      });
      if (partial.theme) {
        startTransition(() => setTheme(partial.theme!));
      }
    },
    [setTheme],
  );

  // ── Model management ──────────────────────────────────────

  const [addModelOpen, setAddModelOpen] = useState(false);
  const [editModelId, setEditModelId] = useState<string | null>(null);
  const [modelForm, setModelForm] = useState({
    name: "",
    provider: "",
    modelId: "",
    apiKey: "",
    apiUrl: "",
    maxContextTokens: 16000,
    maxOutputTokens: 16384,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [presetMode, setPresetMode] = useState(false);

  const MODEL_PRESETS = {
    // OpenAI
    "gpt-4.1": {
      name: "GPT-4.1",
      provider: "OpenAI",
      modelId: "gpt-4.1",
      apiUrl: "https://api.openai.com/v1",
      maxContextTokens: 1000000,
      maxOutputTokens: 32768,
    },
    "gpt-4.1-mini": {
      name: "GPT-4.1 Mini",
      provider: "OpenAI",
      modelId: "gpt-4.1-mini",
      apiUrl: "https://api.openai.com/v1",
      maxContextTokens: 1000000,
      maxOutputTokens: 16384,
    },
    "gpt-4o": {
      name: "GPT-4o",
      provider: "OpenAI",
      modelId: "gpt-4o",
      apiUrl: "https://api.openai.com/v1",
      maxContextTokens: 128000,
      maxOutputTokens: 16384,
    },
    // Anthropic
    "claude-opus-4": {
      name: "Claude Opus 4",
      provider: "Anthropic",
      modelId: "claude-opus-4-20250514",
      apiUrl: "https://api.anthropic.com/v1",
      maxContextTokens: 200000,
      maxOutputTokens: 32768,
    },
    "claude-sonnet-4": {
      name: "Claude Sonnet 4",
      provider: "Anthropic",
      modelId: "claude-sonnet-4-20250514",
      apiUrl: "https://api.anthropic.com/v1",
      maxContextTokens: 200000,
      maxOutputTokens: 16384,
    },
    "claude-haiku-3.5": {
      name: "Claude Haiku 3.5",
      provider: "Anthropic",
      modelId: "claude-haiku-3-5-20250514",
      apiUrl: "https://api.anthropic.com/v1",
      maxContextTokens: 200000,
      maxOutputTokens: 8192,
    },
    // Google
    "gemini-3.1-pro": {
      name: "Gemini 3.1 Pro",
      provider: "Google",
      modelId: "gemini-3.1-pro",
      apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      maxContextTokens: 2000000,
      maxOutputTokens: 65536,
    },
    "gemini-3.5-flash": {
      name: "Gemini 3.5 Flash",
      provider: "Google",
      modelId: "gemini-3.5-flash",
      apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      maxContextTokens: 2000000,
      maxOutputTokens: 65536,
    },
    "gemini-2.5-pro": {
      name: "Gemini 2.5 Pro",
      provider: "Google",
      modelId: "gemini-2.5-pro",
      apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      maxContextTokens: 2000000,
      maxOutputTokens: 65536,
    },
    "gemini-2.5-flash": {
      name: "Gemini 2.5 Flash",
      provider: "Google",
      modelId: "gemini-2.5-flash",
      apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      maxContextTokens: 1000000,
      maxOutputTokens: 8192,
    },
    // DeepSeek
    "deepseek-v4-pro": {
      name: "DeepSeek V4 Pro",
      provider: "DeepSeek",
      modelId: "deepseek-v4-pro",
      apiUrl: "https://api.deepseek.com",
      maxContextTokens: 1000000,
      maxOutputTokens: 384000,
    },
    "deepseek-v4-flash": {
      name: "DeepSeek V4 Flash",
      provider: "DeepSeek",
      modelId: "deepseek-v4-flash",
      apiUrl: "https://api.deepseek.com",
      maxContextTokens: 1000000,
      maxOutputTokens: 384000,
    },
    // xAI
    "grok-4.3": {
      name: "Grok 4.3",
      provider: "xAI",
      modelId: "grok-4.3",
      apiUrl: "https://api.x.ai/v1",
      maxContextTokens: 1000000,
      maxOutputTokens: 32768,
    },
    // Alibaba
    "qwen-3": {
      name: "Qwen 3 (235B)",
      provider: "Alibaba",
      modelId: "qwen3-235b-a22b",
      apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      maxContextTokens: 262144,
      maxOutputTokens: 32768,
    },
    // Moonshot
    "kimi-2.6": {
      name: "Kimi 2.6",
      provider: "Moonshot",
      modelId: "kimi-2.6",
      apiUrl: "https://api.moonshot.cn/v1",
      maxContextTokens: 128000,
      maxOutputTokens: 16384,
    },
    // MiniMax
    "minimax-m1": {
      name: "MiniMax M1",
      provider: "MiniMax",
      modelId: "minimax-m1",
      apiUrl: "https://api.minimaxi.com/v1",
      maxContextTokens: 1000000,
      maxOutputTokens: 32768,
    },
  } as Record<
    string,
    {
      name: string;
      provider: string;
      modelId: string;
      apiUrl: string;
      maxContextTokens: number;
      maxOutputTokens: number;
    }
  >;

  const openAddModel = () => {
    setModelForm({
      name: "",
      provider: "",
      modelId: "",
      apiKey: "",
      apiUrl: "",
      maxContextTokens: 16000,
      maxOutputTokens: 16384,
    });
    setEditModelId(null);
    setShowApiKey(false);
    setAddModelOpen(true);
  };

  const openEditModel = (model: AIModel) => {
    setModelForm({
      name: model.name,
      provider: model.provider,
      modelId: model.modelId,
      apiKey: model.apiKey,
      apiUrl: model.apiUrl,
      maxContextTokens: model.maxContextTokens ?? 16000,
      maxOutputTokens: model.maxOutputTokens ?? 16384,
    });
    setEditModelId(model.id);
    setShowApiKey(false);
    setAddModelOpen(true);
  };

  const cancelModelForm = () => {
    setAddModelOpen(false);
    setEditModelId(null);
  };

  const submitModel = () => {
    if (
      !(modelForm?.name ?? "").trim() ||
      !(modelForm?.provider ?? "").trim() ||
      !(modelForm?.modelId ?? "").trim() ||
      !(modelForm?.apiKey ?? "").trim()
    )
      return;

    if (editModelId) {
      update({
        models: settings.models.map((m) =>
          m.id === editModelId
            ? {
                ...m,
                name: modelForm.name,
                provider: modelForm.provider,
                modelId: modelForm.modelId,
                apiKey: modelForm.apiKey,
                apiUrl: modelForm.apiUrl,
                maxContextTokens: modelForm.maxContextTokens,
                maxOutputTokens: modelForm.maxOutputTokens,
              }
            : m,
        ),
      });
    } else {
      const newModel: AIModel = {
        id: `m-${Date.now()}`,
        name: modelForm.name.trim(),
        provider: modelForm.provider.trim(),
        modelId: modelForm.modelId.trim(),
        apiKey: modelForm.apiKey.trim(),
        apiUrl: modelForm.apiUrl.trim(),
        maxContextTokens: modelForm.maxContextTokens,
        maxOutputTokens: modelForm.maxOutputTokens,
      };
      update({ models: [...settings.models, newModel] });
    }
    cancelModelForm();
  };

  const deleteModel = (id: string) => {
    update({ models: settings.models.filter((m) => m.id !== id) });
  };

  const handleExportSettings = () => {
    try {
      const json = JSON.stringify(settings, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nextbook-settings.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(
        "Export failed: " + (e instanceof Error ? e.message : String(e)),
        "error",
      );
    }
  };

  const handleImportSettings = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        const merged: AppSettings = {
          ...defaultSettings,
          ...imported,
          models: Array.isArray(imported.models) ? imported.models : [],
        };
        startTransition(() => {
          setSettings(merged);
          saveSettings(merged);
          if (merged.theme) setTheme(merged.theme);
        });
        toast("Settings imported successfully!", "success");
      } catch (e) {
        toast(
          "Import failed: " + (e instanceof Error ? e.message : String(e)),
          "error",
        );
      }
    };
    input.click();
  };

  if (!loaded) return null;

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto pb-16 md:pb-0">
      <div className="mx-auto max-w-2xl w-full px-3 sm:px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("settings.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant="outline" size="sm" onClick={handleImportSettings}>
              <Download className="size-4" />
              {t("settings.import")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSettings}>
              <Upload className="size-4" />
              {t("settings.export")}
            </Button>
          </div>
        </div>

        {/* ── 1. 外观设置 ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("settings.appearance")}
            </CardTitle>
            <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <Button
                    key={opt.value}
                    variant={
                      settings.theme === opt.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => update({ theme: opt.value })}
                    className="flex-1"
                  >
                    <Icon className="size-4" />
                    {t(`settings.${opt.value}`)}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── 2. 大模型设置 ────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("settings.models")}</CardTitle>
            <CardDescription>{t("settings.modelsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ModelSelectRow
              label={t("settings.chapterModel")}
              value={settings.chapterModel}
              models={settings.models}
              onChange={(v) => update({ chapterModel: v })}
            />
            <ModelSelectRow
              label={t("settings.summaryModel")}
              value={settings.summaryModel}
              models={settings.models}
              onChange={(v) => update({ summaryModel: v })}
            />
            <ModelSelectRow
              label={t("settings.qaModel")}
              value={settings.qaModel}
              models={settings.models}
              onChange={(v) => update({ qaModel: v })}
            />
          </CardContent>
        </Card>

        {/* ── 3. 大模型管理 ────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("settings.modelManage")}
            </CardTitle>
            <CardDescription>{t("settings.modelManageDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.models.map((model) => (
              <div
                key={model.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{model.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {model.provider} · {model.modelId}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {maskApiKey(model.apiKey)}
                  </p>
                  {model.apiUrl && (
                    <p className="text-xs text-muted-foreground/70 truncate">
                      {model.apiUrl}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/50 mt-0.5">
                    {t("common.maxContext")}:{" "}
                    {(model.maxContextTokens ?? 16000).toLocaleString()} |
                    {t("common.maxOutput")}:{" "}
                    {(model.maxOutputTokens ?? 16384).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModel(model)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteModel(model.id)}
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Inline add/edit form */}
            {addModelOpen ? (
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">
                    {editModelId
                      ? t("common.edit") + " " + t("settings.models")
                      : t("settings.addModel")}
                  </p>
                  <Button variant="ghost" size="icon" onClick={cancelModelForm}>
                    <X className="size-3" />
                  </Button>
                </div>
                {/* Preset selector (only when adding new, not editing) */}
                {!editModelId && (
                  <Select
                    value={presetMode ? "preset" : "custom"}
                    onValueChange={(v) => {
                      if (v === "custom") {
                        setPresetMode(false);
                        setModelForm({
                          name: "",
                          provider: "",
                          modelId: "",
                          apiKey: "",
                          apiUrl: "",
                          maxContextTokens: 16000,
                          maxOutputTokens: 16384,
                        });
                      } else {
                        setPresetMode(true);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">
                        {t("settings.customModel")}
                      </SelectItem>
                      {Object.entries(MODEL_PRESETS).map(([key, preset]) => (
                        <SelectItem key={key} value={key}>
                          {preset.name} ({preset.provider})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {/* When a preset is selected, show preset selector for which preset */}
                {!editModelId && presetMode && (
                  <Select
                    value={
                      Object.keys(MODEL_PRESETS).find(
                        (k) => MODEL_PRESETS[k].name === modelForm.name,
                      ) || ""
                    }
                    onValueChange={(v) => {
                      if (!v) return;
                      const preset = MODEL_PRESETS[v];
                      if (preset) {
                        setModelForm({
                          name: preset.name,
                          provider: preset.provider,
                          modelId: preset.modelId,
                          apiKey: modelForm.apiKey,
                          apiUrl: preset.apiUrl,
                          maxContextTokens: preset.maxContextTokens,
                          maxOutputTokens: preset.maxOutputTokens,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择预设模型..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODEL_PRESETS).map(([key, preset]) => (
                        <SelectItem key={key} value={key}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      名称
                    </label>
                    <Input
                      placeholder="GPT-4o"
                      value={modelForm.name}
                      onChange={(e) =>
                        setModelForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      提供商
                    </label>
                    <Input
                      placeholder="OpenAI"
                      value={modelForm.provider}
                      onChange={(e) =>
                        setModelForm((f) => ({
                          ...f,
                          provider: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    模型ID
                  </label>
                  <Input
                    placeholder="gpt-4o"
                    value={modelForm.modelId}
                    onChange={(e) =>
                      setModelForm((f) => ({ ...f, modelId: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    API Key
                  </label>
                  <div className="flex gap-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={modelForm.apiKey}
                      onChange={(e) =>
                        setModelForm((f) => ({ ...f, apiKey: e.target.value }))
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setShowApiKey((v) => !v)}
                    >
                      {showApiKey ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    API URL
                  </label>
                  <Input
                    placeholder="https://api.openai.com/v1"
                    value={modelForm.apiUrl}
                    onChange={(e) =>
                      setModelForm((f) => ({ ...f, apiUrl: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      最大上下文
                    </label>
                    <Input
                      type="number"
                      placeholder="16000"
                      value={modelForm.maxContextTokens}
                      onChange={(e) =>
                        setModelForm((f) => ({
                          ...f,
                          maxContextTokens: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      最大输出Tokens
                    </label>
                    <Input
                      type="number"
                      placeholder="16384"
                      value={modelForm.maxOutputTokens}
                      onChange={(e) =>
                        setModelForm((f) => ({
                          ...f,
                          maxOutputTokens: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancelModelForm}>
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={submitModel}
                    disabled={
                      !(modelForm?.name ?? "").trim() ||
                      !(modelForm?.provider ?? "").trim() ||
                      !(modelForm?.modelId ?? "").trim() ||
                      !(modelForm?.apiKey ?? "").trim()
                    }
                  >
                    <Check className="size-3.5" />
                    {editModelId ? t("common.save") : t("common.add")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={openAddModel}
              >
                <Plus className="size-3.5" />
                添加模型
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── 4. 多语言支持 ────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("settings.language")}</CardTitle>
            <CardDescription>{t("settings.languageDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={settings.language}
              onValueChange={(v) => {
                if (v) {
                  const loc = v as AppSettings["language"];
                  update({ language: loc });
                  setLocale(loc);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* ── Save indicator ───────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className="text-emerald-500 border-emerald-500/30"
          >
            <CheckCircleIcon className="size-3 mr-1" />
            {t("settings.autoSaved")}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ── Model Select Row ───────────────────────────────────────────────────

function ModelSelectRow({
  label,
  value,
  models,
  onChange,
}: {
  label: string;
  value: string;
  models: AIModel[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v) onChange(v);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map((m) => (
            <SelectItem key={m.id} value={m.modelId}>
              {m.name} ({m.provider})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Tiny helper for the auto-save badge
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-3", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
