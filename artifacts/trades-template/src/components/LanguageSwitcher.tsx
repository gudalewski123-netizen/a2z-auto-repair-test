import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "../i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageSwitcherProps {
  /** Visual style — "compact" hides the label, "full" shows the native name */
  variant?: "compact" | "full";
}

export function LanguageSwitcher({ variant = "compact" }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language.label")}
        className="inline-flex items-center gap-2 text-sm font-condensed uppercase tracking-wide text-white/80 hover:text-white transition-colors rounded px-3 py-2 border border-white/10 hover:border-white/30"
      >
        <Globe className="w-4 h-4" />
        {variant === "full" ? current.nativeLabel : current.code.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onSelect={() => i18n.changeLanguage(lang.code as SupportedLanguageCode)}
            className={
              lang.code === current.code
                ? "font-bold text-primary"
                : "cursor-pointer"
            }
          >
            <span className="mr-3 text-xs uppercase opacity-50">{lang.code}</span>
            {lang.nativeLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
