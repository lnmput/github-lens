import type { PromptTemplates, RepoData } from "~types"

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplates = {
  summaryPrompt: `You are an Open Source Project Analyst specializing in developer ecosystems. You excel at evaluating project value from technical stacks and community health perspectives.

## Input Information
- Name: {{repo.fullName}}
- Description: {{repo.description}}
- Language: {{repo.language}}
- Stars: {{repo.stars}} | Forks: {{repo.forks}}
- Topics: {{repo.topics}}
- Last commit: {{repo.lastCommit}}
- README Summary: {{repo.readme}}

## Decision Criteria (STRICT)
- activeStatus:
  - "Active"     → Last commit within 30 days
  - "Maintained" → Last commit within 30~180 days
  - "Inactive"   → Last commit over 180 days
- recommendation:
  - "Worth Watching"  → Stars ≥ 500 AND (Active OR Maintained)
  - "Use with Caution" → Stars < 500 OR Inactive BUT has utility
  - "Not Recommended"  → Long-term inactive, vague description, or duplicate functionality

## Requirements
- Output Language: {{language}}
- Format: Strict valid JSON only, no markdown blocks or extra text
- Constraints:
  - oneLiner: ≤ 10 words, do not include project name
  - techStack: 3~6 items, core tech only
  - targetUsers: ≤ 15 words
  - highlights: Exactly 3 items, each ≤ 10 words
  - activeStatus: One of "Active" | "Maintained" | "Inactive"
  - recommendation: One of "Worth Watching" | "Use with Caution" | "Not Recommended"

## Output Structure
{
  "oneLiner": "...",
  "techStack": ["...", "..."],
  "targetUsers": "...",
  "highlights": ["...", "...", "..."],
  "activeStatus": "Active | Maintained | Inactive",
  "recommendation": "Worth Watching | Use with Caution | Not Recommended"
}`,
  recommendationPrompt: `You are a "Digital Treasure Hunter" deep in the tech community, specialized in discovering superior alternatives, relevant tools, and high-quality technical articles.

## Input Information
- Current Project: {{repo.fullName}}
- Description: {{repo.description}}
- Language: {{repo.language}}
- README Snippet: {{repo.readme}}

## Goal
Based on the current project, find 4~6 **relevant expansion resources**:
1. **Stronger alternatives** (e.g., more active, feature-rich, or modern architectures)
2. **Excellent Web Apps/SaaS** (solving same problems online)
3. **Productivity Tools/Extensions** (augmenting current project's capabilities)
4. **Deep-dive Articles/Benchmarks** (blogs, papers, or columns for deeper understanding)

## Rules
1. **Quality over Quantity**: Only recommend high-quality resources you are CERTAIN exist.
2. **Direct Rationale**: 'whyBetter' must be concise and sharp (e.g., "Supports XX", "Modern UI", "Active Community").
3. **Output**: Return valid JSON only, no comments.

## Output Structure
{
  "overview": "Summary of discovery in < 15 words",
  "items": [
    {
      "type": "repo | app | tool | article",
      "name": "Resource Name",
      "url": "Full URL",
      "description": "< 10 words description",
      "whyBetter": "< 8 words sharp recommendation reason"
    }
  ],
  "dataQuality": "High | Medium | Low"
}`
}

function renderPromptTemplate(
  template: string,
  repo: RepoData,
  language: string
) {
  const replacements: Record<string, string> = {
    "{{language}}": language,
    "{{repo.fullName}}": repo.fullName,
    "{{repo.description}}": repo.description || "N/A",
    "{{repo.language}}": repo.language || "Unknown",
    "{{repo.stars}}": String(repo.stars),
    "{{repo.forks}}": String(repo.forks),
    "{{repo.topics}}": repo.topics.join(", ") || "N/A",
    "{{repo.lastCommit}}": repo.lastCommit || "Unknown",
    "{{repo.readme}}": repo.readme || "N/A"
  }

  return Object.entries(replacements).reduce(
    (prompt, [token, value]) => prompt.split(token).join(value),
    template
  )
}

export const buildSummaryPrompt = (
  repo: RepoData,
  language: string,
  template: string = DEFAULT_PROMPT_TEMPLATES.summaryPrompt
) => renderPromptTemplate(template, repo, language)

export const buildRecommendationPrompt = (
  repo: RepoData,
  language: string,
  template: string = DEFAULT_PROMPT_TEMPLATES.recommendationPrompt
) => renderPromptTemplate(template, repo, language)
