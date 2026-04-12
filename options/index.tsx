import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, Loader2, Save, Trash2, Wifi } from "lucide-react"

import iconUrl from "url:~assets/icon.png"

import { Badge } from "~components/ui/badge"
import { Button } from "~components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~components/ui/card"
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

  const updateConfig = (patch: Partial<ProviderConfig>) => {
    setFormConfig((current) => ({
      ...current,
      ...patch
    }))
  }

  const handleProviderChange = (provider: ProviderType) => {
    // If we have a saved config for this provider, use it
    const saved = settings?.configs[provider]
    if (saved) {
      setFormConfig(saved)
      return
    }

    // Otherwise use defaults
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
    <div className="github-lens-root min-h-screen bg-[#fcfcfd] p-8 dark:bg-slate-950 font-sans">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Modern Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <img src={iconUrl} alt="Logo" className="h-7 w-7" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              GitHub Lens
            </h1>
            <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
              AI-powered repository explorer for deep insights and smart discovery.
            </p>
          </div>
        </div>

        {/* Segmented Control Mode Tabs */}
        <div className="inline-flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
              className={cn(
                "px-4 py-1.5 text-sm font-bold transition-all duration-200 rounded-md",
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Model Config" ? (
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Provider</span>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2"
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
                    className="w-full rounded-md border bg-background px-3 py-2"
                    onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                    value={formConfig.baseUrl}
                  />
                  <p className="text-xs text-muted-foreground">
                    Permission for this domain will be requested dynamically during test/save.
                  </p>
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium">API Key</span>
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2"
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

              <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Preset Models</span>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2"
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
                    className="w-full rounded-md border bg-background px-3 py-2"
                    onChange={(e) => updateConfig({ model: e.target.value })}
                    placeholder="Enter model name"
                    value={formConfig.model}
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Custom Headers</span>
                <textarea
                  className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                  onChange={(e) =>
                    updateConfig({ customHeaders: e.target.value })
                  }
                  placeholder={'{ "X-Custom-Auth": "your-token" }'}
                  value={formConfig.customHeaders ?? ""}
                />
              </label>

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
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  {testResult.success ? (
                    <p>✅ Connection Success ({testResult.latency}ms)</p>
                  ) : (
                    <p>❌ {testResult.error}</p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "Summary Preferences" ? (
          <Card>
            <CardHeader>
              <CardTitle>Summary Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium">Output Language</p>
                <div className="flex gap-2">
                  {[
                    { value: "auto", label: "Auto" },
                    { value: "zh", label: "Chinese" },
                    { value: "en", label: "English" }
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
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Summary Detail Level</p>
                <div className="flex gap-2">
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
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">"Analyze Repository" Prompt</p>
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
                  className="min-h-[260px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                  onChange={(e) => setSummaryPrompt(e.target.value)}
                  value={summaryPrompt}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">"Related Recommendations" Prompt</p>
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
                  className="min-h-[320px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                  onChange={(e) => setRecommendationPrompt(e.target.value)}
                  value={recommendationPrompt}
                />
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
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

              <div className="flex items-center gap-3">
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About GitHub Lens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Version: 0.0.1</p>
                <p>
                  Description: AI-powered GitHub repository explorer for instant insights, summaries, and smart recommendations.
                </p>
                <p>
                  Active Configuration:
                  <span className="ml-2 font-medium text-foreground">
                    {settings?.providerConfig?.provider ?? "Not Configured"}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-100/50 dark:border-red-900/20">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Clear Search & Discovery Cache</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This will remove all locally stored analysis results and recommendations. AI models will be re-queried on your next visit.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    onClick={handleClearCache}
                    type="button"
                    variant="ghost">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Cache Now
                  </Button>
                  {message && (
                    <Badge variant="secondary">{message}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
