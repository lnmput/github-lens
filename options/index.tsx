import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, Loader2, Save, Trash2, Wifi } from "lucide-react"

import { Badge } from "~components/ui/badge"
import { Button } from "~components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~components/ui/card"
import LogoMark from "~components/LogoMark"
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

const tabs = ["Model Config", "Summary Preferences", "About"] as const
const tabDescriptions: Record<(typeof tabs)[number], string> = {
  "Model Config":
    "Connect a provider, authorize its origin, and choose the model used by GitHub Lens.",
  "Summary Preferences":
    "Tune language, detail level, and prompt templates that shape generated output.",
  About:
    "Review the extension state and clear cached analysis data when you need a fresh run."
}

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
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]>("Model Config")
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
  const [message, setMessage] = useState("")
  const [testResult, setTestResult] = useState<TestResult | null>(null)
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
  }, [])

  const presetModels = useMemo(
    () => PRESET_MODELS[formConfig.provider] ?? [],
    [formConfig.provider]
  )

  const activeProviderLabel =
    settings?.providerConfig?.provider ?? formConfig.provider ?? "Not Configured"

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
    setMessage("")

    if (formConfig.customHeaders?.trim()) {
      try {
        JSON.parse(formConfig.customHeaders)
      } catch {
        setSaving(false)
        setMessage("Custom Headers are not valid JSON.")
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
      setMessage(error instanceof Error ? error.message : "Authorization failed")
      return
    }

    await saveUserSettings(nextSettings)
    setSettings(nextSettings)
    setMessage("Settings saved.")
    setSaving(false)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setMessage("")

    try {
      await ensureProviderPermission(formConfig)
    } catch (error) {
      setTesting(false)
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Authorization failed"
      })
      return
    }

    const response = await sendRuntimeMessage<TestResult>({
      type: "TEST_CONNECTION",
      payload: formConfig
    })

    if (!response.success || !response.data) {
      setTestResult({
        success: false,
        error: response.error ?? "Connection test failed"
      })
    } else {
      setTestResult(response.data)
    }

    setTesting(false)
  }

  const handleSavePreferences = async () => {
    if (!settings) {
      return
    }

    setSaving(true)
    setMessage("")

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
    setMessage("Preferences saved.")
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
      setMessage("No cache to clear.")
      return
    }

    await chrome.storage.local.remove(keysToRemove)
    setMessage(`Successfully cleared ${keysToRemove.length} analysis cache(s).`)
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
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <aside className="space-y-5 lg:sticky lg:top-8">
          <Card className="overflow-hidden border-primary/10 shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center gap-4">
                <LogoMark className="h-12 w-12 rounded-[20px]" />
                <div className="space-y-0.5">
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    GitHub Lens
                  </h1>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    AI-powered repository explorer for deep insights and smart discovery.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border/70 bg-secondary/70 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Provider
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {activeProviderLabel}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-secondary/70 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Language
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
                    {tab}
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
              {activeTab}
            </p>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                  {activeTab === "Model Config"
                    ? "Configure the model pipeline"
                    : activeTab === "Summary Preferences"
                      ? "Shape the AI output"
                      : "Review the extension state"}
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

          {activeTab === "Model Config" ? (
            <Card className="border-primary/10 shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
              <CardHeader className="space-y-1 border-b border-border/70">
                <CardTitle>Model Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Set the provider endpoint, credentials, and model selection used by the background worker.
                </p>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <section className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Provider & endpoint</p>
                    <p className="text-xs text-muted-foreground">
                      Choose the backend and authorize the origin that will receive extension requests.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Provider</span>
                      <select
                        className={fieldClassName}
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
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Base URL</span>
                      <input
                        className={fieldClassName}
                        onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                        value={formConfig.baseUrl}
                      />
                      <p className="text-xs text-muted-foreground">
                        Permission for this domain will be requested dynamically during test/save.
                      </p>
                    </label>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Authentication & model</p>
                    <p className="text-xs text-muted-foreground">
                      Keep credentials and model selection grouped so the request stack reads cleanly from top to bottom.
                    </p>
                  </div>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">API Key</span>
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
                      <span className="font-medium">Preset Models</span>
                      <select
                        className={fieldClassName}
                        onChange={(e) => updateConfig({ model: e.target.value })}
                        value={presetModels.includes(formConfig.model) ? formConfig.model : ""}>
                        <option value="">Manual Input</option>
                        {presetModels.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Model</span>
                      <input
                        className={fieldClassName}
                        onChange={(e) => updateConfig({ model: e.target.value })}
                        placeholder="Enter model name"
                        value={formConfig.model}
                      />
                    </label>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Advanced request headers</p>
                    <p className="text-xs text-muted-foreground">
                      Optional JSON headers for proxies, gateways, or custom auth layers.
                    </p>
                  </div>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Custom Headers</span>
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
                      Save Settings
                    </Button>
                    <Button onClick={handleTestConnection} type="button" variant="outline">
                      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                      Test Connection
                    </Button>
                    {message ? <Badge variant="secondary">{message}</Badge> : null}
                  </div>

                  {testResult ? (
                    <div className="rounded-2xl border border-border/70 bg-secondary/70 p-3 text-sm">
                      {testResult.success ? (
                        <p className="font-medium text-emerald-700 dark:text-emerald-300">
                          ✅ Connection Success ({testResult.latency}ms)
                        </p>
                      ) : (
                        <p className="font-medium text-rose-700 dark:text-rose-300">
                          ❌ {testResult.error}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "Summary Preferences" ? (
            <Card className="border-primary/10 shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
              <CardHeader className="space-y-1 border-b border-border/70">
                <CardTitle>Summary Preferences</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Control how detailed the output should be and which prompt templates shape repository analysis.
                </p>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <section className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">Output language</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "auto", label: "Auto" },
                        { value: "zh", label: "Chinese" },
                        { value: "en", label: "English" },
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
                    <p className="text-sm font-semibold text-foreground">Summary detail level</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "brief", label: "Brief" },
                        { value: "detailed", label: "Detailed" }
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
                      <p className="text-sm font-semibold text-foreground">"Analyze Repository" Prompt</p>
                      <p className="text-xs text-muted-foreground">
                        Main analysis prompt used for summaries and health recommendations.
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        setSummaryPrompt(DEFAULT_PROMPT_TEMPLATES.summaryPrompt)
                      }
                      type="button"
                      variant="outline">
                      Reset Defaults
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
                      <p className="text-sm font-semibold text-foreground">"Related Recommendations" Prompt</p>
                      <p className="text-xs text-muted-foreground">
                        Discovery prompt for adjacent repos, tools, apps, and articles.
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        setRecommendationPrompt(DEFAULT_PROMPT_TEMPLATES.recommendationPrompt)
                      }
                      type="button"
                      variant="outline">
                      Reset Defaults
                    </Button>
                  </div>
                  <textarea
                    className={`min-h-[320px] ${textAreaFieldClassName}`}
                    onChange={(e) => setRecommendationPrompt(e.target.value)}
                    value={recommendationPrompt}
                  />
                </section>

                <div className="rounded-2xl border border-primary/10 bg-[linear-gradient(135deg,rgba(239,246,255,0.82),rgba(238,242,255,0.92))] p-4 text-sm text-slate-600 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.7),rgba(49,46,129,0.5))] dark:text-slate-300">
                  <p className="font-medium text-foreground">Available Variables</p>
                  <p className="mt-1">
                    Use these placeholders in your prompt; they will be replaced with repository info at runtime.
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
                    Save Preferences
                  </Button>
                  {message ? <Badge variant="secondary">{message}</Badge> : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "About" ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="border-primary/10 shadow-[0_18px_40px_rgba(37,99,235,0.08)]">
                <CardHeader>
                  <CardTitle>About GitHub Lens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>Version: 0.0.1</p>
                  <p>
                    Description: AI-powered repository explorer for instant insights, summaries, and smart recommendations.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-secondary/70 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Active Configuration
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {settings?.providerConfig?.provider ?? "Not Configured"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-secondary/70 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Output Language
                      </p>
                      <p className="mt-1 font-medium text-foreground">{language}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-100/60 shadow-[0_18px_40px_rgba(244,63,94,0.08)] dark:border-red-900/20">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Clear Search & Discovery Cache</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      This will remove all locally stored analysis results and recommendations. AI models will be re-queried on your next visit.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Button
                      className="w-full justify-center bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/40"
                      onClick={handleClearCache}
                      type="button"
                      variant="ghost">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Cache Now
                    </Button>
                    {message && <Badge variant="secondary">{message}</Badge>}
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
