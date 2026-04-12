import { parseCountText } from "~lib/utils"
import type { RepoData } from "~types"

export function isGitHubRepoHomepage(location = window.location) {
  if (location.hostname !== "github.com") {
    return false
  }

  const segments = location.pathname.split("/").filter(Boolean)

  if (segments.length !== 2) {
    return false
  }

  const repoMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="octolytics-dimension-repository_nwo"]'
  )

  if (repoMeta?.content) {
    return repoMeta.content.toLowerCase() === segments.join("/").toLowerCase()
  }

  return Boolean(findSidebarAnchor())
}

export function findSidebarAnchor() {
  const currentSidebar =
    document.querySelector<HTMLElement>(
      'div[data-position="end"] > div[class*="prc-PageLayout-Pane-"] > rails-partial[data-partial-name="codeViewRepoRoute.Sidebar"]'
    ) ??
    document.querySelector<HTMLElement>(
      'div[data-position="end"] [data-testid="repository-sidebar"]'
    )

  if (currentSidebar) {
    return currentSidebar
  }

  const legacySidebar =
    document.querySelector<HTMLElement>(
      "#repo-content-pjax-container .Layout-sidebar"
    ) ??
    document.querySelector<HTMLElement>("aside.Layout-sidebar") ??
    document.querySelector<HTMLElement>("div.Layout-sidebar")

  return legacySidebar ?? null
}

export async function extractRepoDataFromPage(): Promise<RepoData | null> {
  if (!isGitHubRepoHomepage()) {
    return null
  }

  const fullName = getRepoFullName()

  if (!fullName) {
    return null
  }

  const repoRoot = getRepoRoot()
  const lastCommitDate = extractLastCommitDate(repoRoot)

  return {
    fullName,
    description:
      extractScopedText(repoRoot, [
        'meta[property="og:description"]',
        'meta[name="description"]',
        'p.f4.my-3',
        'p[data-testid="repo-description"]'
      ]) || "No description provided.",
    language:
      extractScopedText(repoRoot, [
        'span[itemprop="programmingLanguage"]',
        '[data-testid="repository-language-stats"] li span',
        'li.d-inline span.color-fg-default'
      ]) || "Unknown",
    stars:
      extractScopedCount(document, [
        "#repo-stars-counter-star",
        'a[href$="/stargazers"] .Counter',
        'a[href$="/stargazers"] strong'
      ]) ?? 0,
    forks:
      extractScopedCount(document, [
        "#repo-network-counter",
        'a[href$="/network/members"] .Counter',
        'a[href$="/network/members"] strong'
      ]) ?? 0,
    watchers:
      extractScopedCount(document, [
        'a[href$="/watchers"] .Counter',
        'a[href$="/watchers"] strong'
      ]) ?? 0,
    topics: Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'a[data-octo-click="topic_click"], a[href*="/topics/"]'
      )
    )
      .map((item) => item.textContent?.trim() ?? "")
      .filter(Boolean)
      .slice(0, 12),
    readme: (
      document.querySelector<HTMLElement>("#readme .markdown-body")?.innerText ??
      document.querySelector<HTMLElement>("article.markdown-body")?.innerText ??
      ""
    )
      .trim()
      .slice(0, 3000),
    lastCommit:
      lastCommitDate?.toLocaleString() ??
      "Unknown"
  }
}

function getRepoFullName() {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="octolytics-dimension-repository_nwo"]'
  )

  if (meta?.content) {
    return meta.content
  }

  const [owner, repo] = window.location.pathname.split("/").filter(Boolean)
  return owner && repo ? `${owner}/${repo}` : ""
}

function extractScopedText(root: ParentNode, selectors: string[]) {
  for (const selector of selectors) {
    const element =
      root.querySelector<HTMLElement | HTMLMetaElement>(selector) ??
      document.querySelector<HTMLElement | HTMLMetaElement>(selector)

    if (!element) {
      continue
    }

    const value =
      element instanceof HTMLMetaElement
        ? element.content
        : element.innerText || element.textContent

    if (value?.trim()) {
      return value.trim()
    }
  }

  return ""
}

function extractScopedCount(root: ParentNode, selectors: string[]) {
  for (const selector of selectors) {
    const element =
      root.querySelector<HTMLElement>(selector) ??
      document.querySelector<HTMLElement>(selector)

    if (!element) {
      continue
    }

    const content =
      element.getAttribute("title") ||
      element.getAttribute("aria-label") ||
      element.innerText ||
      element.textContent

    const parsed = parseCountText(content)

    if (parsed > 0 || content?.includes("0")) {
      return parsed
    }
  }

  return null
}

function extractLastCommitDate(root: ParentNode) {
  const element =
    root.querySelector<HTMLElement>(
      '[data-testid="latest-commit"] relative-time, a[href*="/commit/"] relative-time'
    ) ??
    document.querySelector<HTMLElement>(
      '#repo-content-pjax-container [data-testid="latest-commit"] relative-time, #repo-content-pjax-container a[href*="/commit/"] relative-time'
    )
  const datetime = element?.getAttribute("datetime")

  return datetime ? new Date(datetime) : null
}

function getRepoRoot() {
  return (
    document.querySelector<HTMLElement>("#repo-content-pjax-container") ??
    document
  )
}
