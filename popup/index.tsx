import { useEffect, useState } from "react"
import { ExternalLink, Settings2 } from "lucide-react"

import LogoMark from "~components/LogoMark"
import { Badge } from "~components/ui/badge"
import { Button } from "~components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~components/ui/card"
import { t } from "~lib/i18n"
import { loadUserSettings } from "~lib/storage"
import { isProviderConfigured } from "~lib/utils"
import type { UserSettings } from "~types"

export default function PopupPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)

  useEffect(() => {
    void loadUserSettings().then(setSettings)
  }, [])

  const configured = isProviderConfigured(settings?.providerConfig)

  return (
    <div className="github-lens-root min-w-[310px] bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.16),_transparent_56%)] p-3">
      <Card className="overflow-hidden border-primary/15 shadow-[0_16px_32px_rgba(37,99,235,0.14)]">
        <CardHeader className="space-y-3 border-b border-border/60 bg-[linear-gradient(130deg,rgba(59,130,246,0.10),rgba(99,102,241,0.14))] px-4 pb-3 pt-3.5">
          <CardTitle className="flex items-center justify-between gap-3 text-slate-900 dark:text-slate-50">
            <div className="flex min-w-0 items-center gap-2.5">
              <LogoMark className="h-8 w-8 rounded-[14px]" imageClassName="h-[80%] w-[80%]" />
              <span className="truncate text-[1.3rem] font-black tracking-tight">
                {t("extensionName", undefined, "GitHub Lens")}
              </span>
            </div>
            <Badge className="shrink-0" variant={configured ? "success" : "warning"}>
              {configured
                ? t("statusConfigured", undefined, "Configured")
                : t("statusNotConfigured", undefined, "Not Configured")}
            </Badge>
          </CardTitle>

          <p className="max-h-[2.8em] overflow-hidden text-[13px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            {t(
              "popupTagline",
              undefined,
              "Generate AI summaries, technical insights, and smart recommendations directly on GitHub."
            )}
          </p>
        </CardHeader>

        <CardContent className="space-y-3.5 px-4 pb-4 pt-3.5">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-border/70 bg-secondary/65 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {t("labelProvider", undefined, "Provider")}
              </p>
              <p className="mt-0.5 truncate text-base font-black text-foreground">
                {settings?.providerConfig?.provider ??
                  t("statusNotSet", undefined, "Not Set")}
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-secondary/65 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {t("labelLanguage", undefined, "Language")}
              </p>
              <p className="mt-0.5 truncate text-base font-black text-foreground">
                {settings?.language ?? "auto"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-10 text-base font-black"
              onClick={() => chrome.tabs.create({ url: "https://github.com" })}>
              <ExternalLink className="h-4 w-4" />
              GitHub
            </Button>
            <Button
              className="h-10 text-base font-black"
              onClick={() => chrome.runtime.openOptionsPage()}
              variant="outline">
              <Settings2 className="h-4 w-4" />
              {t("actionSettings", undefined, "Settings")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
