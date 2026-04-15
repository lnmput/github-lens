import { buildSummaryPrompt, buildRecommendationPrompt } from "~lib/prompts"
import { callLLM, testConnection } from "~lib/llm"
import { loadProviderConfig, loadUserSettings } from "~lib/storage"
import {
  getOutputLanguageLabel,
  hasHostPermission,
  parseJsonResponse
} from "~lib/utils"
import type {
  SummaryDepth,
  RuntimeMessage,
  RuntimeResponse,
  SummaryResult,
  RecommendationResult
} from "~types"

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  void handleMessage(message)
    .then((response) => sendResponse(response))
    .catch((error: Error) =>
      sendResponse({
        success: false,
        error: error.message
      })
    )

  return true
})

async function handleMessage(
  message: RuntimeMessage
): Promise<RuntimeResponse<SummaryResult | RecommendationResult | Awaited<ReturnType<typeof testConnection>>>> {
  if (message.type === "OPEN_OPTIONS") {
    await chrome.runtime.openOptionsPage()
    return {
      success: true
    }
  }

  if (message.type === "TEST_CONNECTION") {
    if (!(await hasHostPermission(message.payload.baseUrl))) {
      throw new Error("The current model URL has not been authorized. Please grant permission first.")
    }

    return {
      success: true,
      data: await testConnection(message.payload)
    }
  }

  const config = await loadProviderConfig()

  if (!config) {
    throw new Error("Please configure the model and API Key in the settings page first.")
  }

  if (!(await hasHostPermission(config.baseUrl))) {
    throw new Error("The current model URL has not been authorized. Please return to the settings page to save or re-authorize.")
  }

  const settings = await loadUserSettings()
  const languageLabel = getOutputLanguageLabel(message.payload.outputLanguage)
  const isChinese = message.payload.outputLanguage === "zh"
  const requestedSummaryDepth: SummaryDepth =
    message.type === "SUMMARIZE"
      ? message.payload.summaryDepthOverride ?? settings.summaryDepth
      : settings.summaryDepth
  
  const languageInstruction = isChinese 
    ? `\n重要指令：所有可翻译的字段（总结、特点、描述、理由等）必须严格使用“中文”输出。保持专有名词、仓库名、URL 原始格式。`
    : `\nIMPORTANT: All translatable fields must be output in ${languageLabel}. Keep proper nouns, repo names, and URLs in their original form.`

  const depthHint =
    requestedSummaryDepth === "detailed"
      ? (isChinese ? "\n输出内容应尽可能详细且保持结构化。" : "\nOutput should be as detailed as possible but remain structured.")
      : (isChinese ? "\n输出内容应保持简洁，避免冗长。" : "\nOutput should be concise and avoid verbosity.")

  const summaryDepthOverrideInstruction =
    message.type === "SUMMARIZE" && requestedSummaryDepth === "detailed"
      ? `\n[DEEP ANALYSIS OVERRIDE] These rules take precedence over any length/count limits in the template:\n- oneLiner: allow 1~25 words with stronger value/use-case context.\n- techStack: provide 4~8 items, including framework, rendering/build strategy, and key infrastructure when relevant.\n- targetUsers: allow 10~40 words with more specific audience and goals.\n- highlights: provide 5~7 items, each 8~22 words, emphasizing implementation details, performance traits, and engineering tradeoffs.\n- Must still return strict JSON with the same field names.`
      : ""

  if (message.type === "SUMMARIZE") {
    const prompt =
      buildSummaryPrompt(
        message.payload.repoData,
        languageLabel,
        settings.promptTemplates.summaryPrompt
      ) +
      languageInstruction +
      depthHint +
      summaryDepthOverrideInstruction
    const raw = await callLLM(config, prompt)
    return {
      success: true,
      data: parseJsonResponse<SummaryResult>(raw)
    }
  }

  if (message.type === "GET_RECOMMENDATIONS") {
    const prompt =
      buildRecommendationPrompt(
        message.payload.repoData,
        languageLabel,
        settings.promptTemplates.recommendationPrompt
      ) +
      languageInstruction +
      depthHint
    const raw = await callLLM(config, prompt)
    return {
      success: true,
      data: parseJsonResponse<RecommendationResult>(raw)
    }
  }

  throw new Error(`Unknown message type: ${(message as any).type}`)
}
