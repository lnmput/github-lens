import { DEFAULT_PROMPT_TEMPLATES } from "~lib/prompts"
import {
  createTextFingerprint,
  createSummaryCacheKey,
  createRecommendationCacheKey,
  createVerdictVariantFingerprint,
  safeJsonParse
} from "~lib/utils"
import type {
  PromptTemplates,
  ResolvedOutputLanguage,
  OutputLanguage,
  ProviderConfig,
  SummaryDepth,
  UserSettings,
  SummaryCacheEntry,
  SummaryResult,
  VerdictCacheEntry,
  VerdictResult
} from "~types"

const PROVIDER_CONFIG_KEY = "provider_config"
const API_KEY_KEY = "api_key"
const ALL_CONFIGS_KEY = "provider_configs"
const USER_PREFS_KEY = "user_prefs"
const VERDICT_CACHE_TTL = 24 * 60 * 60 * 1000

export const DEFAULT_LANGUAGE: OutputLanguage = "auto"
export const DEFAULT_SUMMARY_DEPTH: SummaryDepth = "brief"

export const saveProviderConfig = async (config: ProviderConfig) => {
  // Save active config
  await chrome.storage.local.set({
    [PROVIDER_CONFIG_KEY]: {
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      customHeaders: config.customHeaders ?? ""
    },
    [API_KEY_KEY]: config.apiKey
  })

  // Also save to the full list
  const data = await chrome.storage.local.get(ALL_CONFIGS_KEY)
  const configs = data[ALL_CONFIGS_KEY] || {}
  configs[config.provider] = config
  await chrome.storage.local.set({ [ALL_CONFIGS_KEY]: configs })
}

export const clearProviderConfig = async () => {
  await chrome.storage.local.remove([PROVIDER_CONFIG_KEY, API_KEY_KEY])
}

export const loadProviderConfig = async (): Promise<ProviderConfig | null> => {
  const data = await chrome.storage.local.get([PROVIDER_CONFIG_KEY, API_KEY_KEY])

  if (!data[PROVIDER_CONFIG_KEY]) {
    return null
  }

  return {
    ...(data[PROVIDER_CONFIG_KEY] as Omit<ProviderConfig, "apiKey">),
    apiKey: String(data[API_KEY_KEY] ?? "")
  }
}

export const saveUserPreferences = async (preferences: {
  language: OutputLanguage
  summaryDepth: SummaryDepth
  promptTemplates: PromptTemplates
}) => {
  await chrome.storage.local.set({
    [USER_PREFS_KEY]: preferences
  })
}

export const loadUserSettings = async (): Promise<UserSettings> => {
  const [providerConfig, data, configsData] = await Promise.all([
    loadProviderConfig(),
    chrome.storage.local.get(USER_PREFS_KEY),
    chrome.storage.local.get(ALL_CONFIGS_KEY)
  ])

  const prefs = safeJsonParse(
    JSON.stringify(data[USER_PREFS_KEY] ?? {}),
    {} as Partial<UserSettings>
  )

  return {
    providerConfig,
    configs: configsData[ALL_CONFIGS_KEY] || {},
    language: prefs.language ?? DEFAULT_LANGUAGE,
    summaryDepth: prefs.summaryDepth ?? DEFAULT_SUMMARY_DEPTH,
    promptTemplates: {
      summaryPrompt:
        prefs.promptTemplates?.summaryPrompt?.trim() ??
        DEFAULT_PROMPT_TEMPLATES.summaryPrompt,
      recommendationPrompt:
        prefs.promptTemplates?.recommendationPrompt?.trim() ??
        DEFAULT_PROMPT_TEMPLATES.recommendationPrompt
    }
  }
}

export const saveUserSettings = async (settings: UserSettings) => {
  if (settings.providerConfig) {
    await saveProviderConfig(settings.providerConfig)
  } else {
    await clearProviderConfig()
  }

  // Ensure all configs are saved if provided
  if (settings.configs) {
    await chrome.storage.local.set({ [ALL_CONFIGS_KEY]: settings.configs })
  }

  await saveUserPreferences({
    language: settings.language,
    summaryDepth: settings.summaryDepth,
    promptTemplates: settings.promptTemplates
  })
}

export const saveCachedSummary = async (
  repoFullName: string,
  config: ProviderConfig,
  outputLanguage: ResolvedOutputLanguage,
  summaryDepth: SummaryDepth,
  summaryPromptTemplate: string,
  result: SummaryResult
) => {
  const promptFingerprint = createTextFingerprint(summaryPromptTemplate)
  const key = createSummaryCacheKey(
    repoFullName,
    config,
    outputLanguage,
    summaryDepth,
    promptFingerprint
  )
  const cacheEntry: SummaryCacheEntry = {
    createdAt: Date.now(),
    providerFingerprint: createVerdictVariantFingerprint(
      config,
      outputLanguage,
      summaryDepth,
      promptFingerprint
    ),
    outputLanguage,
    summaryDepth,
    promptFingerprint,
    result
  }

  await chrome.storage.local.set({
    [key]: cacheEntry
  })
}

export const loadCachedSummary = async (
  repoFullName: string,
  config: ProviderConfig,
  outputLanguage: ResolvedOutputLanguage,
  summaryDepth: SummaryDepth,
  summaryPromptTemplate: string
): Promise<SummaryResult | null> => {
  const promptFingerprint = createTextFingerprint(summaryPromptTemplate)
  const key = createSummaryCacheKey(
    repoFullName,
    config,
    outputLanguage,
    summaryDepth,
    promptFingerprint
  )
  const data = await chrome.storage.local.get(key)
  const entry = data[key] as SummaryCacheEntry | undefined

  if (!entry) {
    return null
  }

  if (
    entry.providerFingerprint !==
      createVerdictVariantFingerprint(
        config,
        outputLanguage,
        summaryDepth,
        promptFingerprint
      ) ||
    entry.outputLanguage !== outputLanguage ||
    entry.summaryDepth !== summaryDepth ||
    entry.promptFingerprint !== promptFingerprint ||
    Date.now() - entry.createdAt > VERDICT_CACHE_TTL
  ) {
    await chrome.storage.local.remove(key)
    return null
  }

  return entry.result
}

export const saveCachedRecommendation = async (
  repoFullName: string,
  config: ProviderConfig,
  outputLanguage: ResolvedOutputLanguage,
  summaryDepth: SummaryDepth,
  recommendationPromptTemplate: string,
  result: RecommendationResult
) => {
  const promptFingerprint = createTextFingerprint(recommendationPromptTemplate)
  const key = createRecommendationCacheKey(
    repoFullName,
    config,
    outputLanguage,
    summaryDepth,
    promptFingerprint
  )
  const cacheEntry: RecommendationCacheEntry = {
    createdAt: Date.now(),
    providerFingerprint: createVerdictVariantFingerprint(
      config,
      outputLanguage,
      summaryDepth,
      promptFingerprint
    ),
    outputLanguage,
    summaryDepth,
    promptFingerprint,
    result
  }

  await chrome.storage.local.set({
    [key]: cacheEntry
  })
}

export const loadCachedRecommendation = async (
  repoFullName: string,
  config: ProviderConfig,
  outputLanguage: ResolvedOutputLanguage,
  summaryDepth: SummaryDepth,
  recommendationPromptTemplate: string
): Promise<RecommendationResult | null> => {
  const promptFingerprint = createTextFingerprint(recommendationPromptTemplate)
  const key = createRecommendationCacheKey(
    repoFullName,
    config,
    outputLanguage,
    summaryDepth,
    promptFingerprint
  )
  const data = await chrome.storage.local.get(key)
  const entry = data[key] as RecommendationCacheEntry | undefined

  if (!entry) {
    return null
  }

  if (
    entry.providerFingerprint !==
      createVerdictVariantFingerprint(
        config,
        outputLanguage,
        summaryDepth,
        promptFingerprint
      ) ||
    entry.outputLanguage !== outputLanguage ||
    entry.summaryDepth !== summaryDepth ||
    entry.promptFingerprint !== promptFingerprint ||
    Date.now() - entry.createdAt > VERDICT_CACHE_TTL
  ) {
    await chrome.storage.local.remove(key)
    return null
  }

  return entry.result
}
