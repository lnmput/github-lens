import type { ProviderConfig, TestResult } from "~types"

const REQUEST_TIMEOUT = 30_000

export async function callLLM(
  config: ProviderConfig,
  prompt: string
): Promise<string> {
  if (!config.apiKey.trim()) {
    throw new Error("Please configure API Key first")
  }

  if (!config.baseUrl.trim()) {
    throw new Error("Please configure Base URL first")
  }

  if (!config.model.trim()) {
    throw new Error("Please configure model name first")
  }

  if (config.provider === "anthropic") {
    return callAnthropic(config, prompt)
  }

  return callOpenAICompatible(config, prompt)
}

export async function testConnection(
  config: ProviderConfig
): Promise<TestResult> {
  const startedAt = Date.now()

  try {
    await callLLM(config, "reply ok only")
    return {
      success: true,
      latency: Date.now() - startedAt
    }
  } catch (error) {
    return {
      success: false,
      error: parseError(error)
    }
  }
}

async function callOpenAICompatible(
  config: ProviderConfig,
  prompt: string
): Promise<string> {
  const response = await fetchWithTimeout(buildOpenAIEndpoint(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...parseCustomHeaders(config.customHeaders)
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200
    })
  })

  const data = await parseErrorAwareJson(response)
  const content = data?.choices?.[0]?.message?.content

  if (typeof content === "string") {
    return content
  }

  throw new Error("Model response format not supported")
}

async function callAnthropic(
  config: ProviderConfig,
  prompt: string
): Promise<string> {
  const response = await fetchWithTimeout(
    buildAnthropicEndpoint(config.baseUrl),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        ...parseCustomHeaders(config.customHeaders)
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }]
      })
    }
  )

  const data = await parseErrorAwareJson(response)
  const textBlock = Array.isArray(data?.content)
    ? data.content.find((item: { type?: string }) => item.type === "text")
    : null

  if (typeof textBlock?.text === "string") {
    return textBlock.text
  }

  throw new Error("Model response format not supported")
}

function buildOpenAIEndpoint(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "")

  if (normalized.endsWith("/chat/completions")) {
    return normalized
  }

  if (normalized.endsWith("/v1")) {
    return `${normalized}/chat/completions`
  }

  return `${normalized}/v1/chat/completions`
}

function buildAnthropicEndpoint(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, "")
  return normalized.endsWith("/v1/messages")
    ? normalized
    : `${normalized}/v1/messages`
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function parseErrorAwareJson(response: Response) {
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok) {
    const apiMessage =
      data?.error?.message ??
      data?.error?.type ??
      data?.message ??
      `${response.status} ${response.statusText}`

    throw new Error(apiMessage)
  }

  return data
}

function parseCustomHeaders(customHeaders?: string) {
  if (!customHeaders?.trim()) {
    return {}
  }

  try {
    const parsed = JSON.parse(customHeaders) as Record<string, string>

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    throw new Error("Custom Headers must be valid JSON")
  }

  throw new Error("Custom Headers must be an object")
}

function parseError(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "Request timeout, please check your network or model speed"
    }

    return error.message
  }

  return "Unknown error"
}
