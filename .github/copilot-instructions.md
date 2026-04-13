# Copilot Instructions

## Build, test, and lint commands

This repository is a Plasmo browser extension and uses `pnpm`.

- `pnpm install` - install dependencies
- `pnpm dev` - start Plasmo dev mode; load `build/chrome-mv3-dev` as the unpacked extension in Chrome
- `pnpm build` - production build for the Chrome MV3 target
- `pnpm package` - create a packaged extension build

There is currently no test runner, no lint script, and no single-test command configured in `package.json`. There are also no `*.test.*` or `*.spec.*` files in the repo.

## High-level architecture

- **Entry points are thin Plasmo wrappers.** `background.ts`, `options.tsx`, and `popup.tsx` only import the real implementations from `background/index.ts`, `options/index.tsx`, and `popup/index.tsx`.
- **The content script owns GitHub page integration.** `contents/github-sidebar.tsx` runs on `https://github.com/*`, detects actual repository homepages with `isGitHubRepoHomepage()`, finds the repo sidebar with both current and legacy selectors, and mounts the React panel into a shadow DOM host so extension styles stay isolated from GitHub styles.
- **`SummaryPanel` is the main feature orchestrator.** `components/SummaryPanel.tsx` loads saved settings, resolves output language from user preference or page language, lazily requests summary or discovery data only when a tab is opened, and reads/writes cached results through `lib/storage.ts`.
- **The background service worker is the single LLM gateway.** `background/index.ts` handles runtime messages (`OPEN_OPTIONS`, `TEST_CONNECTION`, `SUMMARIZE`, `GET_RECOMMENDATIONS`), loads provider config and user settings from storage, verifies host permission for the configured model URL, builds prompts, calls the provider, and parses the returned JSON.
- **`lib/github.ts` scrapes repository data directly from the DOM.** It extracts full name, description, language, star/fork/watch counts, topics, last commit, and a README excerpt, with fallbacks for both new and legacy GitHub layouts.
- **`lib/llm.ts` abstracts provider calls.** Anthropic uses `/v1/messages`; every other provider is treated as OpenAI-compatible and routed to `/v1/chat/completions`. Custom headers are passed as JSON and request timeout is enforced centrally.
- **`lib/storage.ts` and `lib/utils.ts` define the persistence model.** User settings live in `chrome.storage.local`, provider configs are stored both as the active config and as a per-provider map, and cached summary/recommendation results are keyed by repo plus a fingerprint of provider, base URL, model, language, depth, and prompt template.

## Key conventions

- Use the `~` alias for internal imports and keep import groups in the order enforced by `.prettierrc.mjs`: built-ins, third-party packages, `@plasmo`, `@plasmohq`, `~` aliases, then relative imports.
- Formatting follows Prettier with **no semicolons**, **double quotes**, and **80-column** wrapping.
- Keep background/UI communication inside the typed message contracts in `types/index.ts`. New actions should extend `RuntimeMessage` and `RuntimeResponse` instead of passing ad hoc payloads.
- Route settings changes through `loadUserSettings()` and `saveUserSettings()` rather than writing arbitrary storage keys. Those helpers keep the active provider config, per-provider config history, language/depth preferences, and prompt templates consistent.
- Preserve the cache fingerprinting scheme when changing AI behavior. Cache invalidation intentionally depends on provider, base URL, model, output language, summary depth, and prompt template fingerprint.
- The sidebar UI is designed to live under `.github-lens-root` and usually inside a shadow root. Reuse that pattern for new injected UI so Tailwind variables and dark mode stay isolated from GitHub page styles.
- Provider access requires dynamic host permissions. The options page requests permission for the configured model origin before save/test, and the background worker re-checks permission before making network calls.
- GitHub page detection is intentionally defensive. If you change repo-page detection or sidebar injection, keep support for both modern GitHub selectors and legacy fallbacks in `lib/github.ts`.
