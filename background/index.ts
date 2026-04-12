import { buildSummaryPrompt, buildRecommendationPrompt } from "~lib/prompts"
import { callLLM, testConnection } from "~lib/llm"
import { loadProviderConfig, loadUserSettings } from "~lib/storage"
import {
  getOutputLanguageLabel,
  hasHostPermission,
  parseJsonResponse
} from "~lib/utils"
import type {
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
  const language = getOutputLanguageLabel(message.payload.outputLanguage)
  const depthHint =
    settings.summaryDepth === "detailed"
      ? "\nOutput should be as detailed as possible but remain structured."
      : "\nOutput should be concise and avoid verbosity."

  if (message.type === "SUMMARIZE") {
    const prompt =
      buildSummaryPrompt(
        message.payload.repoData,
        language,
        settings.promptTemplates.summaryPrompt
      ) +
      "\nAll translatable fields must be output in the target language; keep proper nouns, repo names, and API names in their original form." +
      depthHint
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
        language,
        settings.promptTemplates.recommendationPrompt
      ) +
      "\nAll translatable fields must be output in the target language; keep proper nouns, repo names, and API names in their original form." +
      depthHint
    const raw = await callLLM(config, prompt)
    return {
      success: true,
      data: parseJsonResponse<RecommendationResult>(raw)
    }
  }

  throw new Error(`Unknown message type: ${(message as any).type}`)
}
