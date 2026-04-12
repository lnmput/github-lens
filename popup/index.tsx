import { useEffect, useState } from "react"
import { ExternalLink, Settings2 } from "lucide-react"

import { Badge } from "~components/ui/badge"
import { Button } from "~components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~components/ui/card"
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
    <div className="github-lens-root min-w-[320px] p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>GitHub Lens</span>
            <Badge variant={configured ? "success" : "warning"}>
              {configured ? "Configured" : "Not Configured"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate AI summaries, technical insights, and smart recommendations directly on GitHub.
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Provider</span>
              <span className="text-muted-foreground">
                {settings?.providerConfig?.provider ?? "Not Set"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Language</span>
              <span className="text-muted-foreground">
                {settings?.language ?? "auto"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => chrome.runtime.openOptionsPage()} variant="outline">
              <Settings2 className="h-4 w-4" />
              Settings
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
