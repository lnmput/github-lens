import type { ProviderType } from "~types"

export const PROVIDER_BASE_URLS: Record<ProviderType, string> = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com",
  deepseek: "https://api.deepseek.com",
  moonshot: "https://api.moonshot.cn",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode",
  groq: "https://api.groq.com/openai",
  custom: ""
}

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  deepseek: "DeepSeek",
  moonshot: "Moonshot AI",
  qwen: "Aliyun (Qwen)",
  groq: "Groq",
  custom: "Custom (OpenAI Proxy)"
}

export const PRESET_MODELS: Record<ProviderType, string[]> = {
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-haiku-4-5-20251001"
  ],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o3-mini"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  moonshot: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
  qwen: ["qwen-max", "qwen-plus", "qwen-turbo"],
  groq: [
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
    "gemma2-9b-it"
  ],
  custom: []
}
