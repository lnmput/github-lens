import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Eye, EyeOff, Loader2, Save, Trash2, Wifi } from "lucide-react"
import { Toaster, toast } from "sonner"
import "sonner/dist/styles.css"

import { Badge } from "~components/ui/badge"
import { Button } from "~components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~components/ui/card"
import LogoMark from "~components/LogoMark"
import { t } from "~lib/i18n"
import { PRESET_MODELS, PROVIDER_BASE_URLS, PROVIDER_LABELS } from "~lib/providers"
import { DEFAULT_PROMPT_TEMPLATES } from "~lib/prompts"
import {
  DEFAULT_LANGUAGE,
  DEFAULT_SUMMARY_DEPTH,
  loadUserSettings,
  saveUserSettings
} from "~lib/storage"
import { cn, getHostPermissionPattern, sendRuntimeMessage } from "~lib/utils"
import type { ProviderConfig, ProviderType, TestResult, UserSettings } from "~types"

const tabs = ["modelConfig", "summaryPreferences", "about"] as const
type TabKey = (typeof tabs)[number]

const promptVariables = [
  "{{language}}",
  "{{repo.fullName}}",
  "{{repo.description}}",
  "{{repo.language}}",
  "{{repo.stars}}",
  "{{repo.forks}}",
  "{{repo.topics}}",
  "{{repo.lastCommit}}",
  "{{repo.readme}}"
] as const

const fieldClassName =
  "w-full rounded-xl border border-input/90 bg-background/90 px-3 py-2.5 text-foreground shadow-sm shadow-slate-950/[0.02] outline-none transition-[border-color,box-shadow,background-color] focus:border-primary/40 focus:bg-background focus:ring-4 focus:ring-primary/10"

const selectFieldClassName = `${fieldClassName} appearance-none pr-10`

const textAreaFieldClassName = `${fieldClassName} font-mono text-sm`

function createDefaultConfig(provider: ProviderType = "anthropic"): ProviderConfig {
  return {
    provider,
    baseUrl: PROVIDER_BASE_URLS[provider],
    apiKey: "",
    model: PRESET_MODELS[provider][0] ?? "",
    customHeaders: ""
  }
}

export default function OptionsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("modelConfig")
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [formConfig, setFormConfig] = useState<ProviderConfig>(
    createDefaultConfig()
  )
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
  const [summaryDepth, setSummaryDepth] = useState(DEFAULT_SUMMARY_DEPTH)
  const [summaryPrompt, setSummaryPrompt] = useState(
    DEFAULT_PROMPT_TEMPLATES.summaryPrompt
  )
  const [recommendationPrompt, setRecommendationPrompt] = useState(
    DEFAULT_PROMPT_TEMPLATES.recommendationPrompt
  )
  const [showApiKey, setShowApiKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadUserSettings().then((loaded) => {
      setSettings(loaded)
      setFormConfig(loaded.providerConfig ?? createDefaultConfig())
      setLanguage(loaded.language)
      setSummaryDepth(loaded.summaryDepth)
      setSummaryPrompt(loaded.promptTemplates.summaryPrompt)
      setRecommendationPrompt(loaded.promptTemplates.recommendationPrompt)
    })
    document.title = chrome.i18n.getMessage('extensionName')
  }, [])

  const presetModels = useMemo(
    () => PRESET_MODELS[formConfig.provider] ?? [],
    [formConfig.provider]
  )

  const activeProviderLabel =
    settings?.providerConfig?.provider ??
    formConfig.provider ??
    t("statusNotConfigured", undefined, "Not Configured")

  const tabLabels: Record<TabKey, string> = {
    modelConfig: t("optionsTabModelConfig", undefined, "Model Config"),
    summaryPreferences: t(
      "optionsTabSummaryPreferences",
      undefined,
      "Summary Preferences"
    ),
    about: t("optionsTabAbout", undefined, "About")
  }

  const tabDescriptions: Record<TabKey, string> = {
    modelConfig: t(
      "optionsTabModelConfigDesc",
      undefined,
      "Connect a provider, authorize its origin, and choose the model used by GitHub Lens."
    ),
    summaryPreferences: t(
      "optionsTabSummaryPreferencesDesc",
      undefined,
      "Tune language, detail level, and prompt templates that shape generated output."
    ),
    about: t(
      "optionsTabAboutDesc",
      undefined,
      "Review the extension state and clear cached analysis data when you need a fresh run."
    )
  }

  const updateConfig = (patch: Partial<ProviderConfig>) => {
    setFormConfig((current) => ({
      ...current,
      ...patch
    }))
  }

  const handleProviderChange = (provider: ProviderType) => {
    const saved = settings?.configs[provider]
    if (saved) {
      setFormConfig(saved)
      return
    }

    setFormConfig({
      provider,
      baseUrl: PROVIDER_BASE_URLS[provider],
      apiKey: "",
      model: PRESET_MODELS[provider][0] ?? "",
      customHeaders: ""
    })
  }

  const handleSave = async () => {
    setSaving(true)

    if (formConfig.customHeaders?.trim()) {
      try {
        JSON.parse(formConfig.customHeaders)
      } catch {
        setSaving(false)
        toast.error(
          t(
            "optionsMsgInvalidCustomHeadersJson",
            undefined,
            "Custom Headers are not valid JSON."
          )
        )
        return
      }
    }

    const nextConfigs = {
      ...(settings?.configs || {}),
      [formConfig.provider]: formConfig
    }

    const nextSettings: UserSettings = {
      providerConfig: formConfig,
      configs: nextConfigs,
      language,
      summaryDepth,
      promptTemplates: {
        summaryPrompt,
        recommendationPrompt
      }
    }

    try {
      await ensureProviderPermission(formConfig)
    } catch (error) {
      setSaving(false)
      toast.error(
        error instanceof Error
          ? error.message
          : t("optionsMsgAuthorizationFailed", undefined, "Authorization failed")
      )
      return
    }

    await saveUserSettings(nextSettings)
    setSettings(nextSettings)
    toast.success(t("optionsMsgSettingsSaved", undefined, "Settings saved."))
    setSaving(false)
  }

  const handleTestConnection = async () => {
    setTesting(true)

    try {
      await ensureProviderPermission(formConfig)
    } catch (error) {
      setTesting(false)
      toast.error(
        error instanceof Error
          ? error.message
          : t("optionsMsgAuthorizationFailed", undefined, "Authorization failed")
      )
      return
    }

    const response = await sendRuntimeMessage<TestResult>({
      type: "TEST_CONNECTION",
      payload: formConfig
    })

    if (!response.success || !response.data) {
      toast.error(
        response.error ??
          t("optionsMsgConnectionTestFailed", undefined, "Connection test failed")
      )
    } else {
      toast.success(
        `✅ ${t("optionsConnectionSuccess", undefined, "Connection Success")} (${response.data.latency}ms)`
      )
    }

    setTesting(false)
  }

  const handleSavePreferences = async () => {
    if (!settings) {
      return
    }

    setSaving(true)

    const nextSettings: UserSettings = {
      providerConfig: settings.providerConfig,
      configs: settings.configs,
      language,
      summaryDepth,
      promptTemplates: {
        summaryPrompt,
        recommendationPrompt
      }
    }

    await saveUserSettings(nextSettings)
    setSettings(nextSettings)
    toast.success(t("optionsMsgPreferencesSaved", undefined, "Preferences saved."))
    setSaving(false)
  }

  const handleClearCache = async () => {
    const data = await chrome.storage.local.get(null)
    const keysToRemove = Object.keys(data).filter(
      (key) =>
        key.startsWith("verdict_cache:") ||
        key.startsWith("summary_cache:") ||
        key.startsWith("recommendation_cache:")
    )

    if (keysToRemove.length === 0) {
      toast.message(t("optionsMsgNoCacheToClear", undefined, "No cache to clear."))
      return
    }

    await chrome.storage.local.remove(keysToRemove)
    toast.success(
      t(
        "optionsMsgClearedCache",
        String(keysToRemove.length),
        `Successfully cleared ${keysToRemove.length} analysis cache(s).`
      )
    )
  }

  const ensureProviderPermission = async (config: ProviderConfig) => {
    const pattern = getHostPermissionPattern(config.baseUrl)
    const alreadyGranted = await chrome.permissions.contains({
      origins: [pattern]
    })

    if (alreadyGranted) {
      return
    }

    const granted = await chrome.permissions.request({
      origins: [pattern]
    })

    if (!granted) {
      throw new Error(`Permission not granted for ${pattern}`)
    }
  }

  return (
    <div className="github-lens-root min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_48%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.98))] p-8 font-sans dark:bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.16),_transparent_45%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.98))]">
      <Toaster position="top-center" richColors />
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="space-y-5 lg:sticky lg:top-8">
          <Card className="overflow-hidden border-primary/10 shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center gap-4">
                <LogoMark className="h-12 w-12 rounded-[20px]" />
                <div className="space-y-0.5">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    {t("extensionName", undefined, "GitHub Lens")}
                  </h1>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t(
                      "optionsHeaderTagline",
                      undefined,
                      "AI-powered repository explorer for deep insights and smart discovery."
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border/70 bg-secondary/70 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("labelProvider", undefined, "Provider")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {activeProviderLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-secondary/70 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("labelLanguage", undefined, "Language")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {language}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
            <CardContent className="space-y-3 p-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                  className={cn(
                    "w-full rounded-2xl px-4 py-3 text-left transition-all duration-200",
                    activeTab === tab
                      ? "bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(224,231,255,0.95))] shadow-[0_10px_24px_rgba(59,130,246,0.10)] ring-1 ring-primary/10 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.92),rgba(49,46,129,0.78))]"
                      : "hover:bg-secondary/70"
                  )}>
                  <p
                    className={cn(
                      "text-sm font-bold",
                      activeTab === tab
                        ? "text-primary dark:text-sky-300"
                        : "text-slate-700 dark:text-slate-200"
                    )}>
                    {tabLabels[tab]}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {tabDescriptions[tab]}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        <main className="mt-8 space-y-6 lg:mt-0">
          <div className="rounded-[28px] border border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(239,246,255,0.86))] p-5 shadow-[0_18px_40px_rgba(37,99,235,0.08)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.88))]">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/70">
              {tabLabels[activeTab]}
            </p>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                  {activeTab === "modelConfig"
                    ? t(
                      "optionsHeroModelConfigTitle",
                      undefined,
                      "Configure the model pipeline"
                    )
                    : activeTab === "summaryPreferences"
                      ? t("optionsHeroSummaryTitle", undefined, "Shape the AI output")
                      : t("optionsHeroAboutTitle", undefined, "Review the extension state")}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tabDescriptions[activeTab]}
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                {activeProviderLabel}
              </Badge>
            </div>
          </div>

          {activeTab === "modelConfig" ? (
            <Card className="border-primary/10 shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
              <CardHeader className="space-y-1 border-b border-border/70">
                <CardTitle>{t("optionsModelConfigTitle", undefined, "Model Configuration")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "optionsModelConfigDesc",
                    undefined,
                    "Set the provider endpoint, credentials, and model selection used by the background worker."
                  )}
                </p>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <section className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t("optionsProviderEndpointTitle", undefined, "Provider & endpoint")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "optionsProviderEndpointDesc",
                        undefined,
                        "Choose the backend and authorize the origin that will receive extension requests."
                      )}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">
                        {t("labelProvider", undefined, "Provider")}
                      </span>
                      <div className="relative">
                        <select
                          className={selectFieldClassName}
                          onChange={(e) =>
                            handleProviderChange(e.target.value as ProviderType)
                          }
                          value={formConfig.provider}>
                          {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium">{t("labelBaseUrl", undefined, "Base URL")}</span>
                      <input
                        className={fieldClassName}
                        onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                        value={formConfig.baseUrl}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "optionsBaseUrlPermissionHint",
                          undefined,
                          "Permission for this domain will be requested dynamically during test/save."
                        )}
                      </p>
                    </label>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t("optionsAuthModelTitle", undefined, "Authentication & model")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "optionsAuthModelDesc",
                        undefined,
                        "Keep credentials and model selection grouped so the request stack reads cleanly from top to bottom."
                      )}
                    </p>
                  </div>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">{t("labelApiKey", undefined, "API Key")}</span>
                    <div className="flex gap-2">
                      <input
                        className={fieldClassName}
                        onChange={(e) => updateConfig({ apiKey: e.target.value })}
                        type={showApiKey ? "text" : "password"}
                        value={formConfig.apiKey}
                      />
                      <Button
                        onClick={() => setShowApiKey((current) => !current)}
                        type="button"
                        variant="outline">
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </label>

                  <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">
                        {t("optionsPresetModels", undefined, "Preset Models")}
                      </span>
                      <div className="relative">
                        <select
                          className={selectFieldClassName}
                          onChange={(e) => updateConfig({ model: e.target.value })}
                          value={presetModels.includes(formConfig.model) ? formConfig.model : ""}>
                          <option value="">
                            {t("optionsManualInput", undefined, "Manual Input")}
                          </option>
                          {presetModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium">{t("labelModel", undefined, "Model")}</span>
                      <input
                        className={fieldClassName}
                        onChange={(e) => updateConfig({ model: e.target.value })}
                        placeholder={t("optionsEnterModelName", undefined, "Enter model name")}
                        value={formConfig.model}
                      />
                    </label>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t("optionsAdvancedHeadersTitle", undefined, "Advanced request headers")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "optionsAdvancedHeadersDesc",
                        undefined,
                        "Optional JSON headers for proxies, gateways, or custom auth layers."
                      )}
                    </p>
                  </div>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">
                      {t("optionsCustomHeaders", undefined, "Custom Headers")}
                    </span>
                    <textarea
                      className={`min-h-[120px] ${textAreaFieldClassName}`}
                      onChange={(e) =>
                        updateConfig({ customHeaders: e.target.value })
                      }
                      placeholder={'{ "X-Custom-Auth": "your-token" }'}
                      value={formConfig.customHeaders ?? ""}
                    />
                  </label>
                </section>

                <div className="flex flex-col gap-4 border-t border-border/70 pt-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleSave} type="button">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {t("actionSaveSettings", undefined, "Save Settings")}
                    </Button>
                    <Button onClick={handleTestConnection} type="button" variant="outline">
                      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                      {t("actionTestConnection", undefined, "Test Connection")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "summaryPreferences" ? (
            <Card className="border-primary/10 shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
              <CardHeader className="space-y-1 border-b border-border/70">
                <CardTitle>{t("optionsSummaryPrefsTitle", undefined, "Summary Preferences")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "optionsSummaryPrefsDesc",
                    undefined,
                    "Control how detailed the output should be and which prompt templates shape repository analysis."
                  )}
                </p>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <section className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {t("optionsOutputLanguage", undefined, "Output language")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "auto", label: t("languageAuto", undefined, "Auto") },
                        { value: "zh", label: t("languageChinese", undefined, "Chinese") },
                        { value: "en", label: t("languageEnglish", undefined, "English") },
                        { value: "ja", label: "Japanese" },
                        { value: "ko", label: "Korean" },
                        { value: "de", label: "German" },
                        { value: "fr", label: "French" },
                        { value: "es", label: "Spanish" }
                      ].map((item) => (
                        <Button
                          key={item.value}
                          onClick={() => setLanguage(item.value as UserSettings["language"])}
                          type="button"
                          variant={language === item.value ? "default" : "outline"}>
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {t("optionsSummaryDetailLevel", undefined, "Summary detail level")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "brief", label: t("summaryDepthBrief", undefined, "Brief") },
                        {
                          value: "detailed",
                          label: t("summaryDepthDetailed", undefined, "Detailed")
                        }
                      ].map((item) => (
                        <Button
                          key={item.value}
                          onClick={() =>
                            setSummaryDepth(item.value as UserSettings["summaryDepth"])
                          }
                          type="button"
                          variant={summaryDepth === item.value ? "default" : "outline"}>
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {t(
                          "optionsAnalyzeRepoPromptTitle",
                          undefined,
                          "\"Analyze Repository\" Prompt"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "optionsAnalyzeRepoPromptDesc",
                          undefined,
                          "Main analysis prompt used for summaries and health recommendations."
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        setSummaryPrompt(DEFAULT_PROMPT_TEMPLATES.summaryPrompt)
                      }
                      type="button"
                      variant="outline">
                      {t("actionResetDefaults", undefined, "Reset Defaults")}
                    </Button>
                  </div>
                  <textarea
                    className={`min-h-[260px] ${textAreaFieldClassName}`}
                    onChange={(e) => setSummaryPrompt(e.target.value)}
                    value={summaryPrompt}
                  />
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {t(
                          "optionsRelatedRecommendationsPromptTitle",
                          undefined,
                          "\"Related Recommendations\" Prompt"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "optionsRelatedRecommendationsPromptDesc",
                          undefined,
                          "Discovery prompt for adjacent repos, tools, apps, and articles."
                        )}
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        setRecommendationPrompt(DEFAULT_PROMPT_TEMPLATES.recommendationPrompt)
                      }
                      type="button"
                      variant="outline">
                      {t("actionResetDefaults", undefined, "Reset Defaults")}
                    </Button>
                  </div>
                  <textarea
                    className={`min-h-[320px] ${textAreaFieldClassName}`}
                    onChange={(e) => setRecommendationPrompt(e.target.value)}
                    value={recommendationPrompt}
                  />
                </section>

                <div className="rounded-2xl border border-primary/10 bg-[linear-gradient(135deg,rgba(239,246,255,0.82),rgba(238,242,255,0.92))] p-4 text-sm text-slate-600 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.7),rgba(49,46,129,0.5))] dark:text-slate-300">
                  <p className="font-medium text-foreground">
                    {t("optionsAvailableVariables", undefined, "Available Variables")}
                  </p>
                  <p className="mt-1">
                    {t(
                      "optionsAvailableVariablesDesc",
                      undefined,
                      "Use these placeholders in your prompt; they will be replaced with repository info at runtime."
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {promptVariables.map((variable) => (
                      <Badge key={variable} variant="secondary">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-6">
                  <Button onClick={handleSavePreferences} type="button">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t("actionSavePreferences", undefined, "Save Preferences")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "about" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="border-primary/10 shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
                <CardHeader>
                  <CardTitle>{t("optionsAboutTitle", undefined, "About GitHub Lens")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>{t("optionsAboutVersion", undefined, "Version:")} 0.0.2</p>
                  <p>
                    {t("optionsAboutDescriptionLabel", undefined, "Description:")}{" "}
                    {t(
                      "extensionDescription",
                      undefined,
                      "AI-powered GitHub repository explorer for instant insights, summaries, and smart recommendations."
                    )}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-secondary/70 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("optionsActiveConfiguration", undefined, "Active Configuration")}
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {settings?.providerConfig?.provider ??
                          t("statusNotConfigured", undefined, "Not Configured")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-secondary/70 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("optionsOutputLanguage", undefined, "Output language")}
                      </p>
                      <p className="mt-1 font-medium text-foreground">{language}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-100/60 shadow-[0_18px_40px_rgba(244,63,94,0.08)] dark:border-red-900/20">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">
                    {t("optionsDangerZone", undefined, "Danger Zone")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {t("optionsClearCacheTitle", undefined, "Clear Search & Discovery Cache")}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t(
                        "optionsClearCacheDesc",
                        undefined,
                        "This will remove all locally stored analysis results and recommendations. AI models will be re-queried on your next visit."
                      )}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Button
                      className="w-full justify-center bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/40"
                      onClick={handleClearCache}
                      type="button"
                      variant="ghost">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("actionClearCacheNow", undefined, "Clear Cache Now")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
