"use client";

import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export type AppointmentsView = "hours" | "day" | "week";

export interface ViewSwitcherProps {
  value: AppointmentsView;
  onChange: (view: AppointmentsView) => void;
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  const { t } = useTranslation();

  const items: TabItem[] = [
    { value: "hours", label: t("appointments.viewHours") },
    { value: "day", label: t("appointments.viewDay") },
    { value: "week", label: t("appointments.viewWeek") },
  ];

  return <Tabs items={items} value={value} onChange={(v) => onChange(v as AppointmentsView)} />;
}
