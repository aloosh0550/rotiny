"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ListChecks, Repeat2, Search, Send } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { useToast } from "@/components/ui/Toast";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { ruleBasedIntentParser } from "@/lib/services/nlp/RuleBasedIntentParser";
import type { IntentType, ParsedIntent, Priority } from "@/lib/types";
import { appointmentsRepository, habitsRepository, tasksRepository } from "@/lib/db/repositories";
import { generateId } from "@/lib/utils/id";
import { createSyncMeta } from "@/lib/utils/sync";
import { combineDateAndTime, formatWeekday, todayKey } from "@/lib/time/dateUtils";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const INTENT_ICON: Record<string, typeof CalendarDays> = {
  create_appointment: CalendarDays,
  create_task: ListChecks,
  create_habit: Repeat2,
  search_query: Search,
};

export function SmartInputBox({ onDone }: { onDone: () => void }) {
  const { t, locale } = useTranslation();
  const { show } = useToast();
  const router = useRouter();

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedIntent | null>(null);
  const [intentOverride, setIntentOverride] = useState<IntentType | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [saving, setSaving] = useState(false);

  const intentType = intentOverride ?? parsed?.intentType ?? "create_task";

  const recurrenceSummary = useMemo(() => {
    if (!parsed?.recurrence) return null;
    const rule = parsed.recurrence.value;
    if (rule.byWeekday && rule.byWeekday.length > 0) {
      const days = rule.byWeekday.map((d) => formatWeekday(new Date(2026, 0, 4 + d), locale, "long"));
      return t("appointments.repeatOn") + " " + days.join(locale === "ar" ? " و" : ", ");
    }
    return rule.frequency === "daily" ? t("habits.recurrenceDaily") : t("habits.recurrenceWeekly");
  }, [parsed, locale, t]);

  function handleParse() {
    if (!text.trim()) return;
    const result = ruleBasedIntentParser.parse(text, { locale });
    setParsed(result);
    setIntentOverride(null);
    setTitle(result.title.value || text);
    setDate(result.date?.value ?? "");
    setTime(result.time?.value ?? "");
    setPriority(result.priority?.value ?? "normal");
  }

  function reset() {
    setText("");
    setParsed(null);
    setIntentOverride(null);
  }

  async function handleSave() {
    if (!parsed) return;

    if (intentType === "search_query") {
      router.push(ROUTES.search);
      onDone();
      return;
    }

    setSaving(true);
    try {
      if (intentType === "create_appointment") {
        const day = date || todayKey();
        const startTime = time || "09:00";
        const startAt = combineDateAndTime(day, startTime);
        const durationMinutes = parsed.durationMinutes?.value ?? 60;
        const endAt = new Date(new Date(startAt).getTime() + durationMinutes * 60_000).toISOString();
        await appointmentsRepository.create({
          id: generateId(),
          title: title || text,
          startAt,
          endAt,
          allDay: false,
          reminders: [{ id: generateId(), offsetMinutes: 30, method: "inapp" }],
          participants: parsed.entities.filter((e) => e.type === "person").map((e) => e.value),
          calendarProviderId: "local",
          sync: createSyncMeta(),
        });
        show(t("common.saved"), { tone: "success" });
      } else if (intentType === "create_task") {
        await tasksRepository.create({
          id: generateId(),
          title: title || text,
          dueAt: date ? combineDateAndTime(date, time || "09:00") : null,
          hasTime: !!time,
          priority,
          status: "pending",
          reminders: [],
          sync: createSyncMeta(),
        });
        show(t("common.saved"), { tone: "success" });
      } else if (intentType === "create_habit") {
        if (!parsed.recurrence) {
          router.push(`${ROUTES.habits}?add=1`);
          onDone();
          return;
        }
        await habitsRepository.create({
          id: generateId(),
          title: title || text,
          recurrence: parsed.recurrence.value,
          target: parsed.durationMinutes ? { type: "duration", value: parsed.durationMinutes.value } : null,
          reminders: [],
          sync: createSyncMeta(),
        });
        show(t("common.saved"), { tone: "success" });
      }
      reset();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  if (!parsed) {
    return (
      <div className="flex flex-col gap-3">
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleParse();
          }}
          placeholder={t("home.quickAddPlaceholder")}
        />
        <Button onClick={handleParse} disabled={!text.trim()} icon={<Send className="size-4" />}>
          {t("common.confirm")}
        </Button>
      </div>
    );
  }

  const Icon = INTENT_ICON[intentType] ?? ListChecks;
  const intentClarification = parsed.clarifications.find((c) => c.field === "intent");
  const timeClarification = parsed.clarifications.find((c) => c.field === "time");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-lg bg-accent-purple/10 px-3 py-2 text-accent-purple">
        <Icon className="size-4 shrink-0" />
        <span className="text-xs font-medium">&ldquo;{parsed.rawText}&rdquo;</span>
      </div>

      {intentClarification && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-secondary">{intentClarification.question}</p>
          <div className="flex flex-wrap gap-2">
            {intentClarification.options?.map((opt) => (
              <Chip
                key={String(opt.value)}
                selected={intentType === opt.value}
                onClick={() => setIntentOverride(opt.value as IntentType)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <Input value={title} onChange={(e) => setTitle(e.target.value)} label={t("tasks.fieldTitle")} />

      {(intentType === "create_appointment" || intentType === "create_task") && (
        <div className="grid grid-cols-2 gap-3">
          <DatePicker value={date} onChange={(e) => setDate(e.target.value)} label={t("appointments.fieldDate")} />
          {timeClarification ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-secondary">{t("appointments.fieldStartTime")}</span>
              <div className="flex gap-2">
                {timeClarification.options?.map((opt) => (
                  <Chip key={String(opt.value)} selected={time === opt.value} onClick={() => setTime(String(opt.value))}>
                    {opt.label}
                  </Chip>
                ))}
              </div>
            </div>
          ) : (
            <TimePicker value={time} onChange={(e) => setTime(e.target.value)} label={t("appointments.fieldStartTime")} />
          )}
        </div>
      )}

      {intentType === "create_task" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-secondary">{t("tasks.fieldPriority")}</span>
          <div className="flex gap-2">
            {(["important", "normal", "later"] as Priority[]).map((p) => (
              <Chip key={p} selected={priority === p} onClick={() => setPriority(p)}>
                {t(`priority.${p}`)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {intentType === "create_habit" && (
        <div className={cn("rounded-lg border px-3 py-2.5 text-sm", parsed.recurrence ? "border-border bg-surface text-text-primary" : "border-warning/30 bg-warning/10 text-warning")}>
          {recurrenceSummary ?? (locale === "ar" ? "لم يتم التعرف على تكرار — سيتم فتح النموذج الكامل" : "No recurrence detected — opening the full form instead")}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" fullWidth onClick={reset}>
          {t("common.back")}
        </Button>
        <Button fullWidth onClick={handleSave} loading={saving}>
          {t("tasks.confirmAndSave")}
        </Button>
      </div>
    </div>
  );
}
