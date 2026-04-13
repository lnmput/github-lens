export type ProviderType =
  | "anthropic"
  | "openai"
  | "deepseek"
  | "moonshot"
  | "qwen"
  | "groq"
  | "openrouter"
  | "custom"

export type OutputLanguage = "auto" | "zh" | "en" | "ja" | "ko" | "de" | "fr" | "es"
export type ResolvedOutputLanguage = "zh" | "en" | "ja" | "ko" | "de" | "fr" | "es"
export type SummaryDepth = "brief" | "detailed"

export interface ProviderConfig {
  provider: ProviderType
  baseUrl: string
  apiKey: string
  model: string
  customHeaders?: string
}

export interface TestResult {
  success: boolean
  latency?: number
  error?: string
}

export interface RepoData {
  fullName: string
  description: string
  language: string
  stars: number
  forks: number
  watchers?: number
  topics: string[]
  readme: string
  lastCommit: string
}

export interface SummaryResult {
  oneLiner: string
  techStack: string[]
  targetUsers: string
  highlights: string[]
  activeStatus: "Active" | "Maintained" | "Inactive" | "活跃" | "维护中" | "不活跃"
  recommendation: "Worth Watching" | "Use with Caution" | "Not Recommended" | "值得关注" | "谨慎使用" | "不推荐"
}

export interface DiscoveryItem {
  type: "repo" | "app" | "tool" | "article"
  name: string
  url: string
  description: string
  whyBetter: string
}

export interface RecommendationResult {
  overview: string
  items: DiscoveryItem[]
  dataQuality: string
}

export interface PromptTemplates {
  summaryPrompt: string
  recommendationPrompt: string
}

export interface UserSettings {
  providerConfig: ProviderConfig | null
  configs: Record<string, ProviderConfig>
  language: OutputLanguage
  summaryDepth: SummaryDepth
  promptTemplates: PromptTemplates
}

export interface SummaryCacheEntry {
  createdAt: number
  providerFingerprint: string
  outputLanguage: ResolvedOutputLanguage
  summaryDepth: SummaryDepth
  promptFingerprint: string
  result: SummaryResult
}

export interface RecommendationCacheEntry {
  createdAt: number
  providerFingerprint: string
  outputLanguage: ResolvedOutputLanguage
  summaryDepth: SummaryDepth
  promptFingerprint: string
  result: RecommendationResult
}

export type RuntimeMessage =
  | {
    type: "SUMMARIZE"
    payload: {
      repoData: RepoData
      outputLanguage: ResolvedOutputLanguage
    }
  }
  | {
    type: "GET_RECOMMENDATIONS"
    payload: {
      repoData: RepoData
      outputLanguage: ResolvedOutputLanguage
    }
  }
  | { type: "OPEN_OPTIONS" }
  | { type: "TEST_CONNECTION"; payload: ProviderConfig }

export interface RuntimeResponse<T> {
  success: boolean
  data?: T
  error?: string
}
