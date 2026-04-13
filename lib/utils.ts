import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import type {
  OutputLanguage,
  ProviderConfig,
  ResolvedOutputLanguage,
  RuntimeResponse,
  SummaryDepth
} from "~types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function parseCountText(input?: string | null) {
  if (!input) {
    return 0
  }

  const normalized = input.replace(/,/g, "").trim().toLowerCase()
  const value = parseFloat(normalized)

  if (Number.isNaN(value)) {
    const digits = normalized.match(/\d+(\.\d+)?/)
    if (!digits) {
      return 0
    }

    return parseCountText(digits[0])
  }

  if (normalized.includes("m")) {
    return Math.round(value * 1_000_000)
  }

  if (normalized.includes("k")) {
    return Math.round(value * 1_000)
  }

  return Math.round(value)
}

export function parseJsonResponse<T>(raw: string): T {
  const withoutFence = raw
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim()

  const firstBrace = withoutFence.indexOf("{")
  const lastBrace = withoutFence.lastIndexOf("}")

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Model did not return valid JSON")
  }

  return JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1)) as T
}

export function safeJsonParse<T>(value: string | undefined, fallback: T): T {
  if (!value?.trim()) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function createProviderFingerprint(config: ProviderConfig) {
  return [config.provider, config.baseUrl, config.model].join("|")
}

export function createTextFingerprint(text: string) {
  let hash = 0

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }

  return hash.toString(16)
}

export function createVerdictVariantFingerprint(
  config: ProviderConfig,
  outputLanguage: ResolvedOutputLanguage,
  summaryDepth: SummaryDepth,
  promptFingerprint: string
) {
  return [
    createProviderFingerprint(config),
    `lang:${outputLanguage}`,
    `depth:${summaryDepth}`,
    `prompt:${promptFingerprint}`
  ].join("|")
}

export function createSummaryCacheKey(
  repoFullName: string,
  config: ProviderConfig,
  outputLanguage: ResolvedOutputLanguage,
  summaryDepth: SummaryDepth,
  promptFingerprint: string
) {
  const normalizedRepo = repoFullName.toLowerCase().replace(/[^\w/-]+/g, "-")
  return `summary_cache:${normalizedRepo}:${btoa(
    createVerdictVariantFingerprint(
      config,
      outputLanguage,
      summaryDepth,
      promptFingerprint
    )
  )}`
}

export function createRecommendationCacheKey(
  repoFullName: string,
  config: ProviderConfig,
  outputLanguage: ResolvedOutputLanguage,
  summaryDepth: SummaryDepth,
  promptFingerprint: string
) {
  const normalizedRepo = repoFullName.toLowerCase().replace(/[^\w/-]+/g, "-")
  return `recommendation_cache:${normalizedRepo}:${btoa(
    createVerdictVariantFingerprint(
      config,
      outputLanguage,
      summaryDepth,
      promptFingerprint
    )
  )}`
}

export function isProviderConfigured(config?: ProviderConfig | null) {
  return Boolean(
    config?.apiKey.trim() && config.baseUrl.trim() && config.model.trim()
  )
}

export function detectPageLanguage() {
  const lang = document.documentElement.lang.toLowerCase()
  return lang.startsWith("zh") ? "zh" : "en"
}

export function resolveOutputLanguage(
  language: OutputLanguage | undefined,
  pageLanguage?: ResolvedOutputLanguage
): ResolvedOutputLanguage {
  if (language === "zh" || language === "en") {
    return language
  }

  return pageLanguage ?? "en"
}

export function getOutputLanguageLabel(language: ResolvedOutputLanguage) {
  const map: Record<ResolvedOutputLanguage, string> = {
    zh: "Chinese",
    en: "English",
    ja: "Japanese",
    ko: "Korean",
    de: "German",
    fr: "French",
    es: "Spanish"
  }
  return map[language] ?? "English"
}

export function getHostPermissionPattern(baseUrl: string) {
  let url: URL

  try {
    url = new URL(baseUrl)
  } catch {
    throw new Error("Base URL is not a valid URL")
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Base URL must use http or https")
  }

  return `${url.origin}/*`
}

export async function hasHostPermission(baseUrl: string) {
  return chrome.permissions.contains({
    origins: [getHostPermissionPattern(baseUrl)]
  })
}

export async function sendRuntimeMessage<T>(
  message: unknown
): Promise<RuntimeResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: RuntimeResponse<T>) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message
        })
        return
      }

      resolve(response)
    })
  })
}
