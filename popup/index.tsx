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
    <div className="github-lens-root min-w-[320px] bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18),_transparent_58%)] p-4">
      <Card className="overflow-hidden border-primary/10 shadow-[0_18px_40px_rgba(37,99,235,0.12)]">
        <CardHeader className="border-b border-border/60 bg-[linear-gradient(135deg,rgba(59,130,246,0.09),rgba(99,102,241,0.12))]">
          <CardTitle className="flex items-center justify-between text-slate-900 dark:text-slate-50">
            <div className="flex items-center gap-2">
              <LogoMark className="h-9 w-9 rounded-[16px]" imageClassName="h-[82%] w-[82%]" />
              <span>{t("extensionName", undefined, "GitHub Lens")}</span>
            </div>
            <Badge variant={configured ? "success" : "warning"}>
              {configured
                ? t("statusConfigured", undefined, "Configured")
                : t("statusNotConfigured", undefined, "Not Configured")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className="rounded-2xl border border-primary/10 bg-[linear-gradient(135deg,rgba(239,246,255,0.9),rgba(238,242,255,0.95))] p-4 dark:border-primary/15 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.72),rgba(30,27,75,0.72))]">
            <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
              {t(
                "popupTagline",
                undefined,
                "Generate AI summaries, technical insights, and smart recommendations directly on GitHub."
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-border/70 bg-secondary/70 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("labelProvider", undefined, "Provider")}
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {settings?.providerConfig?.provider ??
                  t("statusNotSet", undefined, "Not Set")}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-secondary/70 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("labelLanguage", undefined, "Language")}
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {settings?.language ?? "auto"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button onClick={() => chrome.runtime.openOptionsPage()} variant="outline">
              <Settings2 className="h-4 w-4" />
              {t("actionSettings", undefined, "Settings")}
            </Button>
            <Button
              onClick={() => chrome.tabs.create({ url: "https://github.com" })}>
              <ExternalLink className="h-4 w-4" />
              GitHub
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
