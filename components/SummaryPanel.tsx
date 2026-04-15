import { useEffect, useState } from "react"
import {
  Activity,
  ChevronRight,
  Code2,
  FileText,
  RefreshCw,
  Settings2,
  Sparkles
} from "lucide-react"

import LogoMark from "~components/LogoMark"
import SummaryResult from "~components/SummaryResult"
import RecommendationResult from "~components/RecommendationResult"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "~components/ui/tooltip"
import { t } from "~lib/i18n"
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
  SummaryDepth,
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

  const handleSummarize = async (
    force: boolean = false,
    summaryDepthOverride?: SummaryDepth
  ) => {
    if (!settings?.providerConfig) {
      setError(
        t(
          "errorConfigureModelAndApiKey",
          undefined,
          "Please configure model and API Key first"
        )
      )
      return
    }

    setLoadingAction("summary")
    setError("")
    const summaryDepthForRequest = summaryDepthOverride ?? settings.summaryDepth

    if (!force) {
      const cached = await loadCachedSummary(
        repoData.fullName,
        settings.providerConfig,
        outputLanguage,
        summaryDepthForRequest,
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
        outputLanguage,
        summaryDepthOverride
      }
    })

    if (!response.success || !response.data) {
      setError(
        response.error ??
        t("errorFailedToGenerateSummary", undefined, "Failed to generate summary")
      )
      setLoadingAction(null)
      return
    }

    setSummaryResult(response.data)
    await saveCachedSummary(
      repoData.fullName,
      settings.providerConfig,
      outputLanguage,
      summaryDepthForRequest,
      settings.promptTemplates.summaryPrompt,
      response.data
    )
    setLoadingAction(null)
  }

  const handleRecommendation = async (force: boolean = false) => {
    if (!settings?.providerConfig) {
      setError(
        t(
          "errorConfigureModelAndApiKey",
          undefined,
          "Please configure model and API Key first"
        )
      )
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
      setError(response.error ?? t("errorDiscoveryFailed", undefined, "Discovery failed"))
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
      setError(
        response.error ?? t("errorUnableToOpenSettings", undefined, "Unable to open settings")
      )
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
        label: t("tabAnalysis", undefined, "Analysis"),
        icon: <Activity className="h-4 w-4" />,
        onSelect: handleSummarize
      },
      {
        key: "recommendation",
        label: t("tabDiscovery", undefined, "Discovery"),
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
      <div className="w-full max-w-[300px] overflow-hidden rounded-[20px] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_24px_48px_rgba(37,99,235,0.12)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))]">
        {/* Header */}
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(224,231,255,0.85))] px-3.5 py-2.5 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.9),rgba(49,46,129,0.55))]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-10 w-10 rounded-[16px]" imageClassName="h-[82%] w-[82%]" />
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
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-white/70 hover:text-primary dark:text-slate-500 dark:hover:bg-slate-800/80 dark:hover:text-sky-300"
              onClick={handleOpenOptions}
              title={t("actionSettings", undefined, "Settings")}
              type="button">
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-3">
          {!isConfigured ? (
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 transition-all hover:shadow-md dark:from-amber-950/20 dark:to-orange-950/20">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {t("summaryPanelActivateAiPower", undefined, "Activate AI Power")}
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800/70 dark:text-amber-300/60">
                    {t(
                      "summaryPanelActivateAiDesc",
                      undefined,
                      "Configure your API Key to unlock deep insights and technical discovery."
                    )}
                  </p>
                </div>
                <button
                  className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                  onClick={handleOpenOptions}
                  type="button">
                  {t("actionGoToSettings", undefined, "Go to Settings")} <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Compact segmented tab navigation */}
              <div className="relative grid grid-cols-2 rounded-xl bg-slate-100/85 ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:ring-slate-700/80">
                <span className="pointer-events-none absolute bottom-2.5 left-1/2 top-2.5 z-20 w-px -translate-x-1/2 rounded-full bg-slate-400/90 dark:bg-slate-500/90" />
                {tabOptions.map((tab) => (
                  <button
                    className={cn(
                      "group relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold transition-all duration-200",
                      activeTab === tab.key
                        ? "bg-white text-slate-900 shadow-[0_6px_14px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/90 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                    key={tab.key}
                    onClick={() => void handleTabSelect(tab.key)}
                    type="button">
                    <span className={cn(
                      "transition-colors duration-200",
                      activeTab === tab.key
                        ? "text-blue-600 dark:text-blue-300"
                        : "text-slate-400 dark:text-slate-500"
                    )}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {error && (
                <div className="group relative overflow-hidden rounded-xl border border-red-200 bg-red-50/30 p-4 transition-all hover:bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/10">
                  <div className="space-y-3">
                    <div className="flex-1 space-y-1.5">
                      <h4 className="text-[13px] font-bold text-red-800 dark:text-red-200 text-center">
                        {error.toLowerCase().includes("rate limit")
                          ? t("summaryPanelErrorRateLimit", undefined, "API Rate Limit Reached")
                          : error.toLowerCase().includes("api key") ||
                            error.toLowerCase().includes("unauthorized")
                            ? t("summaryPanelErrorAuthFailed", undefined, "Authentication Failed")
                            : t(
                              "summaryPanelErrorGenericTitle",
                              undefined,
                              "Oops! Something went wrong"
                            )}
                      </h4>
                      <p className="text-[11px] leading-relaxed text-red-700/80 dark:text-red-400/70 text-center">
                        {error.toLowerCase().includes("rate limit") ? (
                          <>
                            {t(
                              "summaryPanelErrorRateLimitDesc",
                              undefined,
                              "Your current API tier has a limit. Please wait a few seconds and try again."
                            )}
                            {error.includes("in ") && <span className="block mt-1 font-mono text-[10px] opacity-70 italic">{error.split("in ")[1].split(".")[0]}s remaining</span>}
                          </>
                        ) : error.toLowerCase().includes("api key") || error.toLowerCase().includes("unauthorized") ? (
                          t(
                            "summaryPanelErrorAuthDesc",
                            undefined,
                            "Your API Key seems invalid or expired. Check your provider settings."
                          )
                        ) : (
                          error
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-[12px] font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-red-700 hover:shadow-lg active:scale-[0.98]"
                        onClick={() =>
                          activeTab === "recommendation"
                            ? handleRecommendation(true)
                            : handleSummarize(true)
                        }
                        type="button">
                        <RefreshCw className="h-4 w-4" />
                        {t("actionRetryAnalysis", undefined, "Retry Analysis")}
                      </button>

                      {(error.toLowerCase().includes("api key") || error.toLowerCase().includes("401") || error.toLowerCase().includes("unauthorized") || error.toLowerCase().includes("settings")) && (
                        <button
                          className="w-full rounded-xl border border-red-200 bg-white py-2 text-[11px] font-bold text-red-700 transition-all hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-900/20"
                          onClick={handleOpenOptions}
                          type="button">
                          {t("actionModifyApiSettings", undefined, "Modify API Settings")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Content Area */}
              <div className={cn(!error && "min-h-[108px]")}>
                {loadingAction ? (
                  <div className="flex min-h-[120px] flex-col items-center justify-center py-5">
                    <div className="relative mb-3 flex h-10 w-10 items-center justify-center group">
                      <div className="absolute inset-0 animate-pulse rounded-md bg-indigo-100/50 dark:bg-indigo-900/30" />
                      <div className="relative flex h-full w-full items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700 overflow-hidden">
                        <Code2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        {/* Scanning Bar for Loading */}
                        <div className="absolute inset-x-0 h-0.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-[scan_1.5s_ease-in-out_infinite]" />
                      </div>
                    </div>
                    <div className="space-y-1.5 px-4 text-center">
                      <div className="mx-auto h-0.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full w-1/3 animate-[progress_1.5s_ease-in-out_infinite] bg-blue-600 dark:bg-blue-400" />
                      </div>
                      <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                        {loadingAction === "summary"
                          ? t("summaryPanelLoadingAnalysis", undefined, "Analyzing repository...")
                          : t("summaryPanelLoadingDiscovery", undefined, "Discovering treasures...")}
                      </p>
                    </div>
                  </div>
                ) : !activeTab ? (
                  <div className="flex min-h-[120px] flex-col items-center justify-center py-6 text-center animate-in fade-in duration-300">
                    <div className="relative mb-3 group">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-700 overflow-hidden">
                        <Code2 className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                        <div className="absolute inset-x-0 h-0.5 w-full animate-[scan_3s_ease-in-out_infinite] bg-indigo-400/30 blur-[1px]" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                      {t("summaryPanelSelectTab", undefined, "Select a Tab to Start")}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      {t("summaryPanelInsightHub", undefined, "AI-Powered Insight Hub")}
                    </p>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                    {activeTab === "summary" && summaryResult && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2 rounded-md bg-indigo-50/50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 shadow-sm dark:bg-indigo-950/20 dark:text-indigo-400">
                            <Activity className="h-3.5 w-3.5" />
                            {t("summaryPanelAnalysisReady", undefined, "Analysis Ready")}
                          </div>
                          <TooltipProvider delayDuration={120}>
                            <div className="ml-auto flex items-center gap-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                                    onClick={() => void handleSummarize(true)}
                                    aria-label={t("actionRegenerate", undefined, "Regenerate")}
                                    type="button">
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {t("actionRegenerate", undefined, "Regenerate")}
                                </TooltipContent>
                              </Tooltip>

                              {settings?.summaryDepth === "brief" ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                                      onClick={() => void handleSummarize(true, "detailed")}
                                      aria-label={t(
                                        "actionDeepAnalyze",
                                        undefined,
                                        "Deep analysis (more detailed output)"
                                      )}
                                      type="button">
                                      <FileText className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {t(
                                      "actionDeepAnalyze",
                                      undefined,
                                      "Deep analysis (more detailed output)"
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </div>
                          </TooltipProvider>
                        </div>
                        <SummaryResult result={summaryResult} />
                      </div>
                    )}

                    {activeTab === "recommendation" && recommendationResult && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2 rounded-md bg-blue-50/50 px-2.5 py-1 text-[10px] font-bold text-blue-700 shadow-sm dark:bg-blue-950/20 dark:text-blue-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            {t("summaryPanelDiscoveryReady", undefined, "Discovery Ready")}
                          </div>
                          <button
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                            onClick={() => void handleRecommendation(true)}
                            title={t("actionRefresh", undefined, "Refresh")}
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
