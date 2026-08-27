"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

/** Controlled search box: leading icon, auto-focus on mount, trailing clear button. */
export function SearchInput({ value, onChange }: SearchInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="relative flex items-center">
      <Search className="pointer-events-none absolute start-3.5 size-4 text-text-tertiary" aria-hidden />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("search.placeholder")}
        aria-label={t("common.search")}
        className="ps-10 pe-10"
      />
      {value.length > 0 && (
        <IconButton
          icon={<X className="size-4" />}
          label={t("search.clearFilter")}
          variant="ghost"
          size="sm"
          onClick={() => onChange("")}
          className="absolute end-1"
        />
      )}
    </div>
  );
}
