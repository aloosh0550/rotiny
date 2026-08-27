"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { SubpageHeader } from "@/components/more/SubpageHeader";
import { db } from "@/lib/db/schema";
import { backupDataSchema, type BackupData } from "@/lib/types/schemas";
import { todayKey } from "@/lib/time/dateUtils";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { ROUTES } from "@/lib/constants/routes";

const BACKUP_VERSION = 1;

const ALL_TABLES = [
  db.appointments,
  db.tasks,
  db.habits,
  db.habitCompletions,
  db.dhikrCategories,
  db.adhkar,
  db.dhikrProgress,
  db.settings,
  db.syncQueue,
];

export default function BackupSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingImport, setPendingImport] = useState<BackupData | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    const [
      appointments,
      tasks,
      habits,
      habitCompletions,
      dhikrCategories,
      adhkar,
      dhikrProgress,
      settings,
      syncQueue,
    ] = await Promise.all([
      db.appointments.toArray(),
      db.tasks.toArray(),
      db.habits.toArray(),
      db.habitCompletions.toArray(),
      db.dhikrCategories.toArray(),
      db.adhkar.toArray(),
      db.dhikrProgress.toArray(),
      db.settings.toArray(),
      db.syncQueue.toArray(),
    ]);

    const backup: BackupData = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        appointments,
        tasks,
        habits,
        habitCompletions,
        dhikrCategories,
        adhkar,
        dhikrProgress,
        settings,
        syncQueue,
      },
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `routini-backup-${todayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        const result = backupDataSchema.safeParse(parsed);
        if (!result.success) {
          show(t("settings.backupImportError"), { tone: "error" });
          return;
        }
        setPendingImport(result.data);
        setImportDialogOpen(true);
      } catch {
        show(t("settings.backupImportError"), { tone: "error" });
      }
    };
    reader.onerror = () => show(t("settings.backupImportError"), { tone: "error" });
    reader.readAsText(file);
  }

  async function confirmImport() {
    if (!pendingImport) return;
    setBusy(true);
    try {
      const { data } = pendingImport;
      await db.transaction("rw", ALL_TABLES, async () => {
        await db.appointments.clear();
        await db.tasks.clear();
        await db.habits.clear();
        await db.habitCompletions.clear();
        await db.dhikrCategories.clear();
        await db.adhkar.clear();
        await db.dhikrProgress.clear();
        await db.settings.clear();
        await db.syncQueue.clear();

        if (data.appointments.length) await db.appointments.bulkAdd(data.appointments);
        if (data.tasks.length) await db.tasks.bulkAdd(data.tasks);
        if (data.habits.length) await db.habits.bulkAdd(data.habits);
        if (data.habitCompletions.length) await db.habitCompletions.bulkAdd(data.habitCompletions);
        if (data.dhikrCategories.length) await db.dhikrCategories.bulkAdd(data.dhikrCategories);
        if (data.adhkar.length) await db.adhkar.bulkAdd(data.adhkar);
        if (data.dhikrProgress.length) await db.dhikrProgress.bulkAdd(data.dhikrProgress);
        if (data.settings.length) await db.settings.bulkAdd(data.settings);
        if (data.syncQueue.length) await db.syncQueue.bulkAdd(data.syncQueue);
      });
      show(t("settings.backupImportSuccess"), { tone: "success" });
    } catch {
      show(t("settings.backupImportError"), { tone: "error" });
    } finally {
      setBusy(false);
      setPendingImport(null);
    }
  }

  async function confirmReset() {
    setBusy(true);
    try {
      await db.transaction("rw", ALL_TABLES, async () => {
        await db.appointments.clear();
        await db.tasks.clear();
        await db.habits.clear();
        await db.habitCompletions.clear();
        await db.dhikrCategories.clear();
        await db.adhkar.clear();
        await db.dhikrProgress.clear();
        await db.settings.clear();
        await db.syncQueue.clear();
      });
      router.push(ROUTES.onboarding);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SubpageHeader title={t("settings.backupTitle")} backHref={ROUTES.settings} />

      <section className="flex flex-col gap-3 px-4">
        <Card className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-purple/10 text-accent-purple">
            <Download className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">{t("settings.backupExport")}</p>
            <p className="text-xs text-text-tertiary">{t("settings.backupExportSubtitle")}</p>
          </div>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void handleExport()}>
            {t("common.export")}
          </Button>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-blue/10 text-accent-blue">
            <Upload className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">{t("settings.backupImport")}</p>
            <p className="text-xs text-text-tertiary">{t("settings.backupImportSubtitle")}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("common.import")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileSelected}
          />
        </Card>
      </section>

      <section className="px-4">
        <Card className="flex items-center gap-3 border-danger/20">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <RotateCcw className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">{t("settings.resetAppTitle")}</p>
            <p className="text-xs text-text-tertiary">{t("settings.resetAppSubtitle")}</p>
          </div>
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => setResetDialogOpen(true)}>
            {t("common.delete")}
          </Button>
        </Card>
      </section>

      <ConfirmDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onConfirm={() => void confirmImport()}
        title={t("settings.backupImport")}
        body={t("settings.backupImportConfirm")}
        confirmLabel={t("common.import")}
      />

      <ConfirmDialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={() => void confirmReset()}
        title={t("settings.resetAppTitle")}
        body={t("settings.resetAppConfirm")}
        confirmLabel={t("common.delete")}
      />
    </div>
  );
}
