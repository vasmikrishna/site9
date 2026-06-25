/**
 * discoverAndDraft — AI-powered social post generation.
 *
 * 1. Searches for trending content via Tavily (or a built-in mock if no key).
 * 2. Sends the top result to DeepSeek (primary) or Gemini (fallback) to write
 *    a platform-ready caption + hashtags as JSON.
 * 3. Returns a social_posts insert object (does NOT persist — caller inserts).
 *
 * Exported helpers:
 *   - searchTrends(keywords, niche?) → TrendResult[]
 *   - discoverAndDraft(tenant, settings) → SocialPostInsert
 */

import type { SocialPost, SocialSettings } from "@/types"
import { GoogleGenAI } from "@google/genai"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrendResult {
  title: string
  url: string
  snippet: string
}

/** Shape returned by this module — suitable for inserting into social_posts. */
export type SocialPostInsert = Omit<
  SocialPost,
  "id" | "created_at" | "updated_at" | "published_at" | "scheduled_at" | "error" | "created_by"
> & {
  tenant_id: string
  status: "ready"
  source: "ai"
}

// ── Tavily search ─────────────────────────────────────────────────────────────

const TAVILY_URL = "https://api.tavily.com/search"

interface TavilyResult {
  title: string
  url: string
  content: string
}

interface TavilyResponse {
  results: TavilyResult[]
}

/**
 * Searches for trending content using Tavily.
 *
 * Falls back to a small static mock list when TAVILY_API_KEY is not set so
 * development works without an API key.
 */
export async function searchTrends(
  keywords: string[],
  niche?: string,
): Promise<TrendResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    // Mock data — good enough to test the rest of the pipeline
    return [
      {
        title: "Top Social Media Trends to Watch This Season",
        url: "https://example.com/social-media-trends",
        snippet:
          "Short-form video continues to dominate engagement metrics across all major platforms.",
      },
      {
        title: "How Businesses Are Winning on Instagram in 2025",
        url: "https://example.com/instagram-wins",
        snippet:
          "Authentic behind-the-scenes content drives 3x more saves and shares than polished ads.",
      },
    ]
  }

  const query = [
    ...keywords,
    niche ? `in ${niche}` : "",
    "trends news",
  ]
    .filter(Boolean)
    .join(" ")

  const res = await fetch(TAVILY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      topic: "news",
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Tavily search failed: ${err}`)
  }
  const data = (await res.json()) as TavilyResponse
  return (data.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }))
}

// ── Caption generation ────────────────────────────────────────────────────────

interface CaptionOutput {
  caption: string
  hashtags: string[]
}

function buildPrompt(
  trend: TrendResult,
  settings: SocialSettings,
  tenantName: string,
): string {
  return `You are a social media copywriter for "${tenantName}".

Write an engaging social media post based on this trending topic:
Title: ${trend.title}
URL: ${trend.url}
Summary: ${trend.snippet}

Requirements:
- Tone: ${settings.tone ?? "friendly"}
- Niche/industry: ${settings.niche ?? "general business"}
- Caption must be ≤2200 characters (Instagram limit)
- Include a clear call to action
- Do NOT include the URL in the caption itself

Respond ONLY with valid JSON in this exact shape (no markdown, no extra keys):
{"caption":"...", "hashtags":["tag1","tag2","tag3","tag4","tag5"]}`
}

async function generateWithDeepSeek(prompt: string): Promise<CaptionOutput> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set")

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${err}`)
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return parseCaption(data.choices[0]?.message?.content ?? "")
}

async function generateWithGemini(prompt: string): Promise<CaptionOutput> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set")

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  })
  return parseCaption(response.text ?? "")
}

function parseCaption(raw: string): CaptionOutput {
  // Strip markdown code fences if model wraps output
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim()
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    const caption = typeof parsed.caption === "string" ? parsed.caption : ""
    const hashtags = Array.isArray(parsed.hashtags)
      ? (parsed.hashtags as unknown[]).filter((h): h is string => typeof h === "string")
      : []
    // Clamp to 8 hashtags max and strip leading '#' if present
    const cleanedTags = hashtags
      .slice(0, 8)
      .map((h) => h.replace(/^#/, ""))
    return { caption, hashtags: cleanedTags }
  } catch {
    // Defensive: return raw text as caption, no hashtags
    return { caption: cleaned.slice(0, 2200), hashtags: [] }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Discovers a trending topic relevant to the tenant's settings and uses an AI
 * model to draft a social media caption + hashtags.
 *
 * Returns a partial social_posts row ready for insertion. Does NOT persist.
 */
export async function discoverAndDraft(
  tenant: { id: string; name: string },
  settings: SocialSettings,
): Promise<SocialPostInsert> {
  const trends = await searchTrends(settings.keywords, settings.niche ?? undefined)
  const top = trends[0]
  if (!top) {
    throw new Error("discoverAndDraft: no trends found — check keywords/niche settings")
  }

  const prompt = buildPrompt(top, settings, tenant.name)

  let output: CaptionOutput
  try {
    output = await generateWithDeepSeek(prompt)
  } catch {
    // Fallback to Gemini if DeepSeek fails or key missing
    output = await generateWithGemini(prompt)
  }

  return {
    tenant_id: tenant.id,
    status: "ready",
    source: "ai",
    caption: output.caption,
    hashtags: output.hashtags,
    media_urls: [],
    ai_source_url: top.url,
    ai_source_title: top.title,
  }
}
