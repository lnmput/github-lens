import { useEffect, useState } from "react"
import { Activity, ChevronRight, Code2, RefreshCw, Settings2, Sparkles } from "lucide-react"

import iconUrl from "url:~assets/icon.png"
import SummaryResult from "~components/SummaryResult"
import RecommendationResult from "~components/RecommendationResult"
import {
  loadCachedSummary,
  loadCachedRecommendation,
  loadUserSettings,
  saveCachedSummary,
  saveCachedRecommendation
} from "~lib/storage"
import {
  detectPageLanguage,
  cn,
  isProviderConfigured,
  resolveOutputLanguage,
  sendRuntimeMessage
} from "~lib/utils"
import type {
  RepoData,
  ResolvedOutputLanguage,
  SummaryResult as SummaryResultType,
  UserSettings,
  RecommendationResult as RecommendationResultType
} from "~types"

interface SummaryPanelProps {
  repoData: RepoData
  theme: "light" | "dark"
}

type LoadingAction = "summary" | "recommendation" | null
type PanelTab = "summary" | "recommendation"

export default function SummaryPanel({
  repoData,
  theme
}: SummaryPanelProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [summaryResult, setSummaryResult] = useState<SummaryResultType | null>(
    null
  )
  const [recommendationResult, setRecommendationResult] = useState<RecommendationResultType | null>(
    null
  )
  const [activeTab, setActiveTab] = useState<PanelTab | null>(null)
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null)
  const [error, setError] = useState("")

  const isConfigured = isProviderConfigured(settings?.providerConfig)
  const outputLanguage: ResolvedOutputLanguage = resolveOutputLanguage(
    settings?.language,
    detectPageLanguage()
  )

  useEffect(() => {
    void loadUserSettings().then(setSettings)

    const listener = () => {
      void loadUserSettings().then(setSettings)
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  useEffect(() => {
    setSummaryResult(null)
    setRecommendationResult(null)
    setActiveTab(null)
    setLoadingAction(null)
    setError("")
  }, [repoData.fullName])

  const handleSummarize = async (force: boolean = false) => {
    if (!settings?.providerConfig) {
      setError("Please configure model and API Key first")
      return
    }

    setLoadingAction("summary")
    setError("")

    if (!force) {
      const cached = await loadCachedSummary(
        repoData.fullName,
        settings.providerConfig,
        outputLanguage,
        settings.summaryDepth,
        settings.promptTemplates.summaryPrompt
      )
      if (cached) {
        setSummaryResult(cached)
        setLoadingAction(null)
        return
      }
    }

    const response = await sendRuntimeMessage<SummaryResultType>({
      type: "SUMMARIZE",
      payload: {
        repoData,
        outputLanguage
      }
    })

    if (!response.success || !response.data) {
      setError(response.error ?? "Failed to generate summary")
      setLoadingAction(null)
      return
    }

    setSummaryResult(response.data)
    await saveCachedSummary(
      repoData.fullName,
      settings.providerConfig,
      outputLanguage,
      settings.summaryDepth,
      settings.promptTemplates.summaryPrompt,
      response.data
    )
    setLoadingAction(null)
  }

  const handleRecommendation = async (force: boolean = false) => {
    if (!settings?.providerConfig) {
      setError("Please configure model and API Key first")
      return
    }

    setLoadingAction("recommendation")
    setError("")

    if (!force) {
      const cached = await loadCachedRecommendation(
        repoData.fullName,
        settings.providerConfig,
        outputLanguage,
        settings.summaryDepth,
        settings.promptTemplates.recommendationPrompt
      )
      if (cached) {
        setRecommendationResult(cached)
        setLoadingAction(null)
        return
      }
    }

    const response = await sendRuntimeMessage<RecommendationResultType>({
      type: "GET_RECOMMENDATIONS",
      payload: {
        repoData,
        outputLanguage
      }
    })

    if (!response.success || !response.data) {
      setError(response.error ?? "Discovery failed")
      setLoadingAction(null)
      return
    }

    setRecommendationResult(response.data)
    await saveCachedRecommendation(
      repoData.fullName,
      settings.providerConfig,
      outputLanguage,
      settings.summaryDepth,
      settings.promptTemplates.recommendationPrompt,
      response.data
    )
    setLoadingAction(null)
  }

  const handleOpenOptions = async () => {
    const response = await sendRuntimeMessage<undefined>({
      type: "OPEN_OPTIONS"
    })

    if (!response.success) {
      setError(response.error ?? "Unable to open settings")
    }
  }

  const tabOptions: Array<{
    key: PanelTab
    label: string
    icon: React.ReactNode
    onSelect: () => Promise<void>
  }> = [
      {
        key: "summary",
        label: "Analysis",
        icon: <Activity className="h-4 w-4" />,
        onSelect: handleSummarize
      },
      {
        key: "recommendation",
        label: "Discovery",
        icon: <Sparkles className="h-4 w-4" />,
        onSelect: handleRecommendation
      }
    ]

  const handleTabSelect = async (tab: PanelTab) => {
    setActiveTab(tab)

    if (loadingAction) {
      return
    }

    if (tab === "summary" && !summaryResult) {
      await handleSummarize()
      return
    }

    if (tab === "recommendation" && !recommendationResult) {
      await handleRecommendation()
    }
  }

  return (
    <div className={cn("github-lens-root font-sans", theme === "dark" && "dark")}>
      <div className="w-full max-w-[300px] overflow-hidden rounded-lg border border-border/50 bg-card shadow-panel">
        {/* Header */}
        <div className="relative overflow-hidden bg-[#f8fafc] py-2.5 px-3.5 dark:bg-slate-900/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <img alt="GitHub Lens Logo" className="h-5 w-5" src={iconUrl} />
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-slate-800" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100 uppercase leading-tight">
                  GitHub Lens
                </h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
                  {repoData.fullName.split("/").length > 1 ? repoData.fullName.split("/").join(" / ") : repoData.fullName}
                </p>
              </div>
            </div>

            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition-all hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400"
              onClick={handleOpenOptions}
              title="Settings"
              type="button">
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-2.5">
          {!isConfigured ? (
            <div className="group relative overflow-hidden rounded-md bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 transition-all hover:shadow-md dark:from-amber-950/20 dark:to-orange-950/20">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Activate AI Power
                    </p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800/70 dark:text-amber-300/60">
                    Configure your API Key to unlock deep insights and technical discovery.
                  </p>
                  <button
                    className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                    onClick={handleOpenOptions}
                    type="button">
                    Go to Settings <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Tab Navigation */}
              <div className="flex rounded-md bg-slate-100/80 p-0.5 dark:bg-slate-800/80">
                {tabOptions.map((tab) => (
                  <button
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-[12px] font-bold transition-all",
                      activeTab === tab.key
                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-blue-400 dark:ring-slate-600"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                    key={tab.key}
                    onClick={() => void handleTabSelect(tab.key)}
                    type="button">
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {error && (
                <div className="rounded-md border border-red-100 bg-red-50/50 p-3 text-xs dark:border-red-900/30 dark:bg-red-950/20">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 rounded-full bg-red-100 p-0.5 dark:bg-red-900/50">
                      <Settings2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="grid flex-1 gap-2">
                      <p className="font-medium text-red-800 dark:text-red-300">{error}</p>
                      <div className="flex flex-wrap gap-2">
                        {error.toLowerCase().includes("api key") || error.toLowerCase().includes("401") || error.toLowerCase().includes("unauthorized") ? (
                          <button
                            className="w-fit rounded-md bg-red-600 px-3 py-1 font-bold text-white transition-colors hover:bg-red-700"
                            onClick={handleOpenOptions}
                            type="button">
                            Go to Settings
                          </button>
                        ) : null}
                        <button
                          className="w-fit rounded-md bg-white/50 px-3 py-1 font-bold text-red-700 transition-colors hover:bg-white/80 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
                          onClick={() =>
                            activeTab === "recommendation"
                              ? handleRecommendation()
                              : activeTab === "summary"
                                ? handleSummarize()
                                : Promise.resolve()
                          }
                          type="button">
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Content Area */}
              <div className={cn(!error && "min-h-[90px]")}>
                {loadingAction ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative mb-3 flex h-10 w-10 items-center justify-center group">
                      <div className="absolute inset-0 animate-pulse rounded-md bg-blue-100/50 dark:bg-blue-900/30" />
                      <div className="relative flex h-full w-full items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700 overflow-hidden">
                        <Code2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        {/* Scanning Bar for Loading */}
                        <div className="absolute inset-x-0 h-0.5 w-full animate-[scan_1.5s_ease-in-out_infinite] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      </div>
                    </div>
                    <div className="space-y-1.5 px-4 text-center">
                      <div className="mx-auto h-0.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full w-1/3 animate-[progress_1.5s_ease-in-out_infinite] bg-blue-600 dark:bg-blue-400" />
                      </div>
                      <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                        {loadingAction === "summary" ? "Analyzing repository..." : "Discovering treasures..."}
                      </p>
                    </div>
                  </div>
                ) : !activeTab ? (
                  <div className="flex flex-col items-center justify-center py-5 text-center animate-in fade-in duration-300">
                    <div className="relative mb-3 group">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-700 overflow-hidden">
                        <Code2 className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                        <div className="absolute inset-x-0 h-0.5 w-full animate-[scan_3s_ease-in-out_infinite] bg-blue-400/30 blur-[1px]" />
                      </div>
                    </div>
                    <h4 className="text-[12px] font-bold text-slate-700 dark:text-slate-100 uppercase tracking-tight">Select a tab to start</h4>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500 max-w-[160px]">
                      AI-Powered Insight Hub
                    </p>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                    {activeTab === "summary" && summaryResult && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2 rounded-md bg-indigo-50/50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 shadow-sm dark:bg-indigo-950/20 dark:text-indigo-400">
                            <Activity className="h-3.5 w-3.5" />
                            Analysis Ready
                          </div>
                          <button
                            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                            onClick={() => void handleSummarize(true)}
                            title="Regenerate"
                            type="button">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <SummaryResult result={summaryResult} />
                      </div>
                    )}

                    {activeTab === "recommendation" && recommendationResult && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2 rounded-md bg-blue-50/50 px-2.5 py-1 text-[10px] font-bold text-blue-700 shadow-sm dark:bg-blue-950/20 dark:text-blue-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            Discovery Ready
                          </div>
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                            onClick={() => void handleRecommendation(true)}
                            title="Refresh"
                            type="button">
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>
                        <RecommendationResult result={recommendationResult} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes scan {
          0%, 100% { transform: translateY(0); opacity: 0; }
          50% { transform: translateY(68px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
