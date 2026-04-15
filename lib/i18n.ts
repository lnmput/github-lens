export function t(
  key: string,
  substitutions?: string | string[],
  fallback?: string
) {
  try {
    const message = chrome.i18n.getMessage(key, substitutions as any)
    if (message) {
      return message
    }
  } catch {
    // ignore and use fallback
  }

  return fallback ?? key
}
