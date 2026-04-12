import type { PlasmoCSConfig } from "plasmo"
import { createRoot, type Root } from "react-dom/client"
import React from "react"

import SummaryPanel from "~components/SummaryPanel"
import {
  extractRepoDataFromPage,
  findSidebarAnchor,
  isGitHubRepoHomepage
} from "~lib/github"
import type { RepoData } from "~types"
import styleText from "data-text:~styles/globals.css"

export const config: PlasmoCSConfig = {
  matches: ["https://github.com/*"],
  run_at: "document_idle"
}

const HOST_ID = "github-lens-sidebar-host"

let root: Root | null = null
let panelContainer: HTMLDivElement | null = null
let shadowHost: HTMLDivElement | null = null
let scheduled = false
let renderToken = 0

async function syncPanel() {
  scheduled = false
  const token = ++renderToken

  if (!isGitHubRepoHomepage()) {
    destroyPanel()
    return
  }

  const sidebar = findSidebarAnchor()
  const repoData = await extractRepoDataFromPage()

  if (token !== renderToken) {
    return
  }

  if (!sidebar || !repoData) {
    destroyPanel()
    return
  }

  ensurePanel(sidebar)
  renderPanel(repoData)
}

function ensurePanel(sidebar: HTMLElement) {
  if (!shadowHost) {
    shadowHost = document.createElement("div")
    shadowHost.id = HOST_ID
    shadowHost.style.marginBottom = "16px"
    shadowHost.style.display = "block"

    const shadowRoot = shadowHost.attachShadow({ mode: "open" })
    const style = document.createElement("style")
    style.textContent = styleText

    panelContainer = document.createElement("div")
    shadowRoot.append(style, panelContainer)
    root = createRoot(panelContainer)
  }

  if (shadowHost.parentElement !== sidebar) {
    if (sidebar.tagName === "RAILS-PARTIAL" && sidebar.firstElementChild) {
      sidebar.insertBefore(shadowHost, sidebar.firstElementChild)
      return
    }

    sidebar.prepend(shadowHost)
  }
}

function renderPanel(repoData: RepoData) {
  if (!root) {
    return
  }

  const theme =
    document.documentElement.getAttribute("data-color-mode") === "dark"
      ? "dark"
      : "light"

  root.render(
    <React.StrictMode>
      <SummaryPanel repoData={repoData} theme={theme} />
    </React.StrictMode>
  )
}

function destroyPanel() {
  root?.unmount()
  root = null
  panelContainer = null
  shadowHost?.remove()
  shadowHost = null
}

function queueSync() {
  if (scheduled) {
    return
  }

  scheduled = true
  window.requestAnimationFrame(() => {
    void syncPanel()
  })
}

document.addEventListener("pjax:end", queueSync)
window.addEventListener("popstate", queueSync)

const observer = new MutationObserver(() => {
  queueSync()
})

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["data-color-mode"]
})

queueSync()
