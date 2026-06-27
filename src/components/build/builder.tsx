"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowRight, Send, Wand2, Upload, ImageIcon, MousePointerClick,
  ExternalLink, Sparkles, Link2, Trash2, Monitor, Tablet, Smartphone,
  LayoutGrid, LayoutTemplate, ChevronUp, ChevronDown, Search, FileText,
  Undo2, Redo2, AlignLeft, AlignCenter, AlignRight, Minus, Plus,
  Files, Home, Trash, Link as LinkIcon, X,
} from "lucide-react"
import { EDITOR_OVERLAY_CSS, EDITOR_SCRIPT } from "@/lib/editor-inject"
import { GenerationLoader } from "@/components/build/generation-loader"
import { SectionLibrary } from "@/components/build/section-library"
import { TemplateBrowser } from "@/components/build/template-browser"
import { UpgradeBanner } from "@/components/build/upgrade-banner"
import { BlogPanel } from "@/components/build/blog-panel"
import { AssetLibrary } from "@/components/build/asset-library"
import { scopeSectionCss, wrapSectionHtml, getScopeClass } from "@/lib/section-css"
import type { BusinessDetails } from "@/lib/onboarding"
import type { SectionTemplate } from "@/types"

interface BoxMetrics {
  pt: number; pr: number; pb: number; pl: number
  mt: number; mr: number; mb: number; ml: number
  ta: string
}

interface SelectedElement {
  editKey: string
  content: string
  tagName: string
  s9Type: "text" | "image" | "link" | "section"
  href?: string
  rect?: { width: number; height: number }
  box?: BoxMetrics
}

interface PageMeta {
  id: string | null
  slug: string
  title: string
  is_homepage: boolean
  status?: string
}

type Viewport = "desktop" | "tablet" | "mobile"
const VIEWPORT_WIDTHS: Record<Viewport, string> = { desktop: "100%", tablet: "768px", mobile: "375px" }

export function Builder({
  initialDetails,
  ownerName,
  host,
  initialHtml,
  subscribed = false,
}: {
  initialDetails: BusinessDetails
  ownerName: string
  host: string
  initialHtml?: string
  subscribed?: boolean
}) {
  const [prompt, setPrompt] = useState("")
  const [rawHtml, setRawHtml] = useState(initialHtml ?? "")
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [error, setError] = useState("")
  const [selectedEl, setSelectedEl] = useState<SelectedElement | null>(null)
  const [viewport, setViewport] = useState<Viewport>("desktop")
  const [showSectionLib, setShowSectionLib] = useState(false)
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false)
  const [showBlogPanel, setShowBlogPanel] = useState(false)
  const [showAssetLib, setShowAssetLib] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // -- Multi-page ------------------------------------------------------------
  const [pages, setPages] = useState<PageMeta[]>([])
  const [activePage, setActivePage] = useState<PageMeta>({ id: null, slug: "home", title: "Home", is_homepage: true })
  const [showPagesMenu, setShowPagesMenu] = useState(false)
  const [pageBusy, setPageBusy] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const htmlResolveRef = useRef<((h: string) => void) | null>(null)
  const promptRef = useRef<HTMLInputElement>(null)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>("")

  // -- Undo/redo history -------------------------------------------------------
  // `currentHtmlRef` always holds the latest HTML (including inline edits made
  // inside the iframe, which don't flow through React state). History snapshots
  // are taken from it so undo/redo and publish stay accurate.
  const currentHtmlRef = useRef<string>(initialHtml ?? "")
  const historyRef = useRef<string[]>(initialHtml && initialHtml.length > 100 ? [initialHtml] : [])
  const histIdxRef = useRef<number>(initialHtml && initialHtml.length > 100 ? 0 : -1)
  const isRestoringRef = useRef(false)
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Where the next section-library insert should land (set by the in-iframe "+").
  const insertAnchorRef = useRef<string | null>(null)

  function refreshHistoryFlags() {
    setCanUndo(histIdxRef.current > 0)
    setCanRedo(histIdxRef.current < historyRef.current.length - 1)
  }

  /** Push a new snapshot, truncating any redo branch. No-op if unchanged. */
  const commitHistory = useCallback((html: string) => {
    if (!html || html.length < 50) return
    if (historyRef.current[histIdxRef.current] === html) return
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1)
    historyRef.current.push(html)
    // Cap history depth to keep memory bounded.
    if (historyRef.current.length > 50) historyRef.current.shift()
    histIdxRef.current = historyRef.current.length - 1
    currentHtmlRef.current = html
    refreshHistoryFlags()
  }, [])

  const restoreSnapshot = useCallback((html: string) => {
    isRestoringRef.current = true
    currentHtmlRef.current = html
    setSelectedEl(null)
    setRawHtml(html)
    refreshHistoryFlags()
    // Allow the iframe to re-render before accepting new change events.
    setTimeout(() => { isRestoringRef.current = false }, 80)
  }, [])

  const undo = useCallback(() => {
    if (histIdxRef.current <= 0) return
    histIdxRef.current -= 1
    restoreSnapshot(historyRef.current[histIdxRef.current])
  }, [restoreSnapshot])

  const redo = useCallback(() => {
    if (histIdxRef.current >= historyRef.current.length - 1) return
    histIdxRef.current += 1
    restoreSnapshot(historyRef.current[histIdxRef.current])
  }, [restoreSnapshot])

  const hasContent = rawHtml.length > 100

  // -- Auto-save draft (debounced 3s after last change) ----------------------
  useEffect(() => {
    if (!rawHtml || rawHtml.length < 100) return
    if (rawHtml === lastSavedRef.current) return

    // Save to localStorage immediately as a fast fallback
    try { localStorage.setItem("s9_draft_html", rawHtml) } catch { /* quota */ }

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      lastSavedRef.current = rawHtml
      fetch("/api/build/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: rawHtml }),
      }).catch(() => { /* silent — localStorage is the fallback */ })
    }, 3000)

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [rawHtml])

  // -- postMessage listener --------------------------------------------------
  const handleMessage = useCallback((e: MessageEvent) => {
    const d = e.data
    if (!d || typeof d.type !== "string" || !d.type.startsWith("s9:")) return
    if (d.type === "s9:select") {
      const s9Type = d.s9Type === "image" ? "image" as const
        : d.s9Type === "link" ? "link" as const
        : d.s9Type === "section" ? "section" as const
        : "text" as const
      setSelectedEl({ editKey: d.editKey, content: d.content, tagName: d.tagName, s9Type, href: d.href || "", rect: d.rect, box: d.box })
    } else if (d.type === "s9:deselect" || d.type === "s9:deleted") {
      setSelectedEl(null)
    } else if (d.type === "s9:html") {
      htmlResolveRef.current?.(d.html)
      htmlResolveRef.current = null
    } else if (d.type === "s9:changed" && typeof d.html === "string") {
      // Inline edit happened in the iframe. Track it and debounce a snapshot.
      if (isRestoringRef.current) return
      currentHtmlRef.current = d.html
      try { localStorage.setItem("s9_draft_html", d.html) } catch { /* quota */ }
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
      commitTimerRef.current = setTimeout(() => commitHistory(d.html), 600)
    } else if (d.type === "s9:insertRequest") {
      // The in-iframe "+" between sections was clicked.
      insertAnchorRef.current = d.afterEditKey ?? null
      setShowTemplateBrowser(false); setShowBlogPanel(false); setShowAssetLib(false)
      setShowSectionLib(true)
    }
  }, [commitHistory])

  useEffect(() => {
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [handleMessage])

  // Keyboard shortcuts: ⌘/Ctrl+Z = undo, ⌘/Ctrl+Shift+Z (or Ctrl+Y) = redo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      if (typing) return
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === "z" && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); redo() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo])

  function postToIframe(msg: Record<string, unknown>) {
    iframeRef.current?.contentWindow?.postMessage(msg, "*")
  }

  // -- Build srcDoc ----------------------------------------------------------
  function buildSrcDoc(fullHtml: string): string {
    let doc = fullHtml
    if (doc.includes("</head>")) {
      doc = doc.replace("</head>", `<style id="s9-overlay">${EDITOR_OVERLAY_CSS}</style></head>`)
    } else {
      doc = `<style id="s9-overlay">${EDITOR_OVERLAY_CSS}</style>` + doc
    }
    if (doc.includes("</body>")) {
      doc = doc.replace("</body>", `<script id="s9-script">${EDITOR_SCRIPT}</script></body>`)
    } else {
      doc += `<script id="s9-script">${EDITOR_SCRIPT}</script>`
    }
    return doc
  }

  // -- AI generate / follow-up ------------------------------------------------
  async function handleGenerate() {
    const text = prompt.trim()
    if (!text) return
    setError("")
    setGenerating(true)
    setSelectedEl(null)
    try {
      const res = await fetch("/api/build/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, currentHtml: hasContent ? (currentHtmlRef.current || rawHtml) : undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error ?? "Generation failed"); return }
      setRawHtml(data.html)
      commitHistory(data.html)
      setPrompt("")
      setPublished(false)
    } catch {
      setError("Could not reach AI. Check your connection.")
    } finally {
      setGenerating(false)
      promptRef.current?.focus()
    }
  }

  // -- Section insert ----------------------------------------------------------
  function handleInsertSection(section: SectionTemplate) {
    const scopeClass = getScopeClass(section.id)
    const wrappedHtml = wrapSectionHtml(section.html, section.id)
    const scopedCss = scopeSectionCss(section.css, scopeClass)
    if (scopedCss) postToIframe({ type: "s9:addCss", css: scopedCss })
    postToIframe({ type: "s9:insertSection", html: wrappedHtml, afterEditKey: insertAnchorRef.current ?? undefined })
    insertAnchorRef.current = null
    setShowSectionLib(false)
  }

  function handleMoveSection(editKey: string, direction: "up" | "down") {
    postToIframe({ type: "s9:moveSection", editKey, direction })
  }

  // -- Element actions --------------------------------------------------------
  function handleUpdate(editKey: string, content: string) {
    postToIframe({ type: "s9:update", editKey, content })
  }
  function handleUpdateAttr(editKey: string, attr: string, value: string) {
    postToIframe({ type: "s9:updateAttr", editKey, attr, value })
  }
  function handleDelete(editKey: string) {
    postToIframe({ type: "s9:delete", editKey })
  }
  function handleSetStyle(editKey: string, prop: string, value: string) {
    postToIframe({ type: "s9:setStyle", editKey, prop, value })
  }

  // -- Pages -----------------------------------------------------------------
  const loadPages = useCallback(async () => {
    try {
      const res = await fetch("/api/build/pages")
      const data = await res.json()
      const list: PageMeta[] = data.pages ?? []
      setPages(list)
      // Seed the active page's id from the homepage row (the builder opens on it).
      setActivePage((cur) => {
        if (cur.id) return cur
        const home = list.find((p) => p.is_homepage)
        return home ? { ...home } : cur
      })
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadPages() }, [loadPages])

  async function switchPage(page: PageMeta) {
    setShowPagesMenu(false)
    if (page.id === activePage.id) return
    if (!page.id) return
    setPageBusy(true)
    try {
      const res = await fetch(`/api/build/pages/${page.id}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Could not open page"); return }
      const html: string = data.page.css ? `<style>${data.page.css}</style>${data.page.html}` : data.page.html
      // Reset the editor + history to the opened page.
      isRestoringRef.current = true
      currentHtmlRef.current = html
      historyRef.current = [html]
      histIdxRef.current = 0
      refreshHistoryFlags()
      setSelectedEl(null)
      setActivePage(page)
      setRawHtml(html)
      setTimeout(() => { isRestoringRef.current = false }, 80)
    } catch {
      setError("Could not open page")
    } finally {
      setPageBusy(false)
    }
  }

  async function addPage() {
    const title = typeof window !== "undefined" ? window.prompt("New page name (e.g. About, Services)") : ""
    if (!title || !title.trim()) return
    setPageBusy(true)
    setError("")
    try {
      const res = await fetch("/api/build/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Could not add page"); return }
      await loadPages()
      await switchPage(data.page)
    } catch {
      setError("Could not add page")
    } finally {
      setPageBusy(false)
    }
  }

  async function deletePage(page: PageMeta) {
    if (page.is_homepage || !page.id) return
    if (typeof window !== "undefined" && !window.confirm(`Delete the "${page.title}" page?`)) return
    try {
      await fetch(`/api/build/pages?id=${page.id}`, { method: "DELETE" })
      if (activePage.id === page.id) {
        const home = pages.find((p) => p.is_homepage)
        if (home) await switchPage(home)
      }
      await loadPages()
    } catch { /* ignore */ }
  }

  // Insert a themed nav that links every page (home → "/", others → "/p/slug").
  function insertPageNav() {
    setShowPagesMenu(false)
    const links = pages
      .map((p) => `<a href="${p.is_homepage ? "/" : `/p/${p.slug}`}" style="color:inherit;text-decoration:none;font-weight:500;padding:8px 12px;" data-s9-type="link">${p.title}</a>`)
      .join("")
    const nav = `<nav style="display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(0,0,0,0.08);" data-s9-type="section">${links}</nav>`
    postToIframe({ type: "s9:insertSection", html: nav })
  }

  // -- Publish ----------------------------------------------------------------
  async function handlePublish() {
    setError("")
    setPublishing(true)
    await fetch("/api/build/save", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ details: initialDetails }),
    })
    const res = await fetch("/api/build/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "ai",
        html: currentHtmlRef.current || rawHtml,
        pageSlug: activePage.slug,
        pageTitle: activePage.title,
      }),
    })
    setPublishing(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Could not publish"); return }
    setPublished(true)
  }

  const srcDoc = hasContent ? buildSrcDoc(rawHtml) : ""

  // -- Render -----------------------------------------------------------------
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-brand" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold">Site9 Builder</p>
            <p className="text-xs text-muted-foreground">{ownerName} · {host}</p>
          </div>

          {/* Pages dropdown */}
          {hasContent && (
            <div className="relative">
              <button
                onClick={() => setShowPagesMenu((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                data-testid="pages-menu-toggle"
                title="Pages"
              >
                {activePage.is_homepage ? <Home className="h-3.5 w-3.5 shrink-0" /> : <Files className="h-3.5 w-3.5 shrink-0" />}
                <span className="max-w-[4.5rem] truncate sm:max-w-[10rem]">{activePage.title}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
              {showPagesMenu && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" aria-hidden tabIndex={-1} onClick={() => setShowPagesMenu(false)} />
                  <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-lg" data-testid="pages-menu">
                    <div className="max-h-72 overflow-y-auto py-1">
                      {pages.map((p) => (
                        <div key={p.id ?? p.slug} className={`flex items-center gap-1 px-1 ${activePage.id === p.id ? "bg-accent/60" : ""}`}>
                          <button
                            onClick={() => switchPage(p)}
                            className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                            data-testid={`page-item-${p.slug}`}
                          >
                            {p.is_homepage ? <Home className="h-3.5 w-3.5 text-muted-foreground" /> : <Files className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className="flex-1 truncate">{p.title}</span>
                            {p.status === "published" && <span className="text-[9px] text-green-500">●</span>}
                          </button>
                          {!p.is_homepage && (
                            <button onClick={() => deletePage(p)} title="Delete page" className="rounded-md p-1 text-muted-foreground hover:text-destructive" data-testid={`page-delete-${p.slug}`}>
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border p-1">
                      <button onClick={addPage} disabled={pageBusy} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-accent transition-colors" data-testid="page-add">
                        <Plus className="h-3.5 w-3.5" /> Add page
                      </button>
                      <button onClick={insertPageNav} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors" data-testid="page-insert-nav">
                        <LinkIcon className="h-3.5 w-3.5" /> Insert page navigation
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        {hasContent && (
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
              title="Undo (⌘Z)"
              data-testid="builder-undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
              title="Redo (⌘⇧Z)"
              data-testid="builder-redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Viewport toggle — desktop only (you're already on a phone on mobile) */}
        {hasContent && (
          <div className="hidden lg:flex items-center gap-1 rounded-lg border border-border p-0.5">
            {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([vp, Icon]) => (
              <button
                key={vp}
                onClick={() => setViewport(vp)}
                className={`rounded-md p-1.5 transition-colors ${viewport === vp ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                title={vp.charAt(0).toUpperCase() + vp.slice(1)}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Panel toggles — hidden on phones to keep Publish reachable */}
          <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => { setShowTemplateBrowser(!showTemplateBrowser); if (!showTemplateBrowser) { setShowSectionLib(false); setShowBlogPanel(false); setShowAssetLib(false) } }}
            className={`rounded-md p-1.5 transition-colors ${showTemplateBrowser ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            title="Browse Templates"
            data-testid="toggle-template-browser"
          >
            <LayoutTemplate className="h-4 w-4" />
          </button>
          {hasContent && (
            <button
              onClick={() => { setShowSectionLib(!showSectionLib); if (!showSectionLib) { setShowTemplateBrowser(false); setShowBlogPanel(false); setShowAssetLib(false) } }}
              className={`rounded-md p-1.5 transition-colors ${showSectionLib ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
              title="Section Library"
              data-testid="toggle-section-lib"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          )}
          {hasContent && (
            <button
              onClick={() => { setShowAssetLib(!showAssetLib); if (!showAssetLib) { setShowTemplateBrowser(false); setShowSectionLib(false); setShowBlogPanel(false) } }}
              className={`rounded-md p-1.5 transition-colors ${showAssetLib ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
              title="My Assets"
              data-testid="toggle-asset-lib"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => { setShowBlogPanel(!showBlogPanel); if (!showBlogPanel) { setShowTemplateBrowser(false); setShowSectionLib(false); setShowAssetLib(false) } }}
            className={`rounded-md p-1.5 transition-colors ${showBlogPanel ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            title="Blog"
            data-testid="toggle-blog-panel"
          >
            <FileText className="h-4 w-4" />
          </button>
          </div>
          {published && (
            <a href={`https://${host}`} target="_blank" rel="noopener" className="hidden sm:inline-flex items-center gap-1.5 text-xs text-brand hover:underline">
              <ExternalLink className="h-3 w-3" /> View live
            </a>
          )}
          <Button size="sm" variant="brand" disabled={!hasContent || publishing} onClick={handlePublish} data-testid="builder-publish">
            {publishing ? "Publishing…" : published ? "Published ✓" : "Publish"} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Soft upsell — never blocks publishing, hidden once subscribed */}
      <UpgradeBanner subscribed={subscribed} />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Template browser sidebar */}
        {showTemplateBrowser && (
          <div className="w-72 shrink-0 border-r border-border bg-card overflow-y-auto">
            <TemplateBrowser onSelect={(html, css) => {
              const combined = css ? `<style>${css}</style>${html}` : html
              setRawHtml(combined)
              commitHistory(combined)
              setShowTemplateBrowser(false)
              setSelectedEl(null)
            }} />
          </div>
        )}

        {/* Section library sidebar */}
        {hasContent && showSectionLib && !showTemplateBrowser && (
          <div className="w-64 shrink-0 border-r border-border bg-card overflow-y-auto">
            <SectionLibrary onInsert={handleInsertSection} />
          </div>
        )}

        {/* Asset library sidebar */}
        {hasContent && showAssetLib && !showTemplateBrowser && !showSectionLib && !showBlogPanel && (
          <div className="w-64 shrink-0 border-r border-border bg-card overflow-y-auto">
            <AssetLibrary onInsertImage={(url) => {
              if (selectedEl?.s9Type === "image") {
                handleUpdateAttr(selectedEl.editKey, "src", url)
              } else {
                postToIframe({ type: "s9:insertSection", html: `<div style="padding:24px;text-align:center;" data-s9-type="section"><img src="${url}" alt="" style="max-width:100%;border-radius:12px;" data-s9-type="image" loading="lazy" /></div>` })
              }
              setShowAssetLib(false)
            }} />
          </div>
        )}

        {/* Blog panel sidebar */}
        {showBlogPanel && !showTemplateBrowser && !showSectionLib && !showAssetLib && (
          <div className="w-72 shrink-0 border-r border-border bg-card flex flex-col">
            <BlogPanel host={host} />
          </div>
        )}

        {/* Preview */}
        <div className="flex-1 flex flex-col items-center bg-muted/30 overflow-auto">
          {!hasContent && !generating ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-lg">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
                  <Wand2 className="h-8 w-8 text-brand" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">What do you want to build?</h1>
                <p className="mt-2 text-muted-foreground">Describe your website and AI will create it instantly.</p>
                <div className="mt-6 space-y-2 text-left">
                  {[
                    `A modern website for ${initialDetails.name || "my business"} with services, about, and contact`,
                    "A photography portfolio with dark theme and full-width gallery",
                    "A restaurant landing page with menu, hours, and reservation CTA",
                    "A SaaS landing page with pricing, features, and testimonials",
                  ].map((s) => (
                    <button key={s} onClick={() => { setPrompt(s); promptRef.current?.focus() }}
                      className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground hover:border-brand/50 hover:text-foreground transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : generating ? (
            <div className="flex-1 flex items-center justify-center">
              <GenerationLoader mode={hasContent ? "update" : "create"} />
            </div>
          ) : (
            <div className="w-full h-full flex justify-center" style={{ padding: viewport !== "desktop" ? "1rem" : 0 }}>
              <iframe
                ref={iframeRef}
                title="Website preview"
                data-testid="builder-preview"
                srcDoc={srcDoc}
                sandbox="allow-scripts"
                className="bg-white transition-all duration-300 h-full"
                style={{
                  width: VIEWPORT_WIDTHS[viewport],
                  maxWidth: "100%",
                  borderRadius: viewport !== "desktop" ? "12px" : 0,
                  boxShadow: viewport !== "desktop" ? "0 4px 24px rgba(0,0,0,0.3)" : "none",
                }}
              />
            </div>
          )}
        </div>

        {/* Right panel */}
        {hasContent && !generating && (
          <div className="hidden lg:flex w-80 shrink-0 flex-col border-l border-border bg-card overflow-y-auto">
            {selectedEl ? (
              <ElementEditor
                key={selectedEl.editKey}
                selected={selectedEl}
                onUpdate={handleUpdate}
                onUpdateAttr={handleUpdateAttr}
                onDelete={handleDelete}
                onMoveSection={handleMoveSection}
                onSetStyle={handleSetStyle}
                businessName={initialDetails.name ?? ""}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
                <MousePointerClick className="h-8 w-8" />
                <p className="text-sm font-medium">Click any element to edit</p>
                <p className="text-xs">Select text, images, links, or sections.<br />Use the prompt bar for bigger changes.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile element editor — bottom sheet (desktop uses the right panel) */}
      {hasContent && !generating && selectedEl && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 flex max-h-[72vh] flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl" data-testid="mobile-element-editor">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold">Edit element</span>
            <button
              onClick={() => { setSelectedEl(null); postToIframe({ type: "s9:deselect" }) }}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
              data-testid="mobile-editor-close"
              aria-label="Close editor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain">
            <ElementEditor
              key={selectedEl.editKey}
              selected={selectedEl}
              onUpdate={handleUpdate}
              onUpdateAttr={handleUpdateAttr}
              onDelete={handleDelete}
              onMoveSection={handleMoveSection}
              onSetStyle={handleSetStyle}
              businessName={initialDetails.name ?? ""}
            />
          </div>
        </div>
      )}

      {/* Bottom prompt bar */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
        {error && <p className="mb-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">{error}</p>}
        <form onSubmit={(e) => { e.preventDefault(); handleGenerate() }} className="mx-auto flex max-w-3xl items-center gap-2">
          <Input ref={promptRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={hasContent ? "Describe changes… e.g. 'add testimonials' or 'use real social media icons'" : "Describe your website…"}
            disabled={generating} className="flex-1" data-testid="builder-prompt" />
          <Button type="submit" disabled={generating || !prompt.trim()} data-testid="builder-send"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Element editor panel
// ---------------------------------------------------------------------------

function ElementEditor({
  selected, onUpdate, onUpdateAttr, onDelete, onMoveSection, onSetStyle, businessName,
}: {
  selected: SelectedElement
  onUpdate: (key: string, content: string) => void
  onUpdateAttr: (key: string, attr: string, val: string) => void
  onDelete: (key: string) => void
  onMoveSection: (key: string, direction: "up" | "down") => void
  onSetStyle: (key: string, prop: string, val: string) => void
  businessName: string
}) {
  const [editValue, setEditValue] = useState(selected.content)
  const [imageUrl, setImageUrl] = useState(selected.s9Type === "image" ? selected.content : "")
  const [linkHref, setLinkHref] = useState(selected.href ?? "")
  const [aiInstruction, setAiInstruction] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [err, setErr] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const isLink = selected.s9Type === "link" || selected.tagName === "a" || !!selected.href
  const isSection = selected.s9Type === "section"
  const isImage = selected.s9Type === "image"
  const isText = selected.s9Type === "text" || selected.s9Type === "link"

  async function aiRewrite() {
    if (!aiInstruction.trim()) return
    setErr(""); setAiLoading(true)
    try {
      const res = await fetch("/api/build/edit-element", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentContent: editValue, instruction: aiInstruction, businessName }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error ?? "Failed"); return }
      setEditValue(d.content); onUpdate(selected.editKey, d.content); setAiInstruction("")
    } catch { setErr("AI unreachable.") }
    finally { setAiLoading(false) }
  }

  async function uploadImage(file: File) {
    setErr(""); setUploadLoading(true)
    try {
      const fd = new FormData(); fd.append("file", file)
      const res = await fetch("/api/build/upload", { method: "POST", body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(d.error ?? "Upload failed"); return }
      setImageUrl(d.url); onUpdateAttr(selected.editKey, "src", d.url)
    } catch { setErr("Upload failed.") }
    finally { setUploadLoading(false) }
  }

  const label = selected.tagName + (selected.rect ? ` (${selected.rect.width}×${selected.rect.height})` : "")

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Header with tag info + delete */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase">{label}</p>
          <p className="font-semibold text-sm">{selected.editKey.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
        </div>
        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(selected.editKey)} title="Delete this element">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {err && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{err}</p>}

      {/* Text editing */}
      {isText && (
        <>
          <Textarea rows={4} value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-sm" />
          <Button size="sm" variant="brand" onClick={() => onUpdate(selected.editKey, editValue)}>Update text</Button>
        </>
      )}

      {/* Link URL */}
      {isLink && (
        <div className="border-t border-border pt-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> Link URL</p>
          <div className="flex gap-2">
            <Input placeholder="https://..." value={linkHref} onChange={(e) => setLinkHref(e.target.value)} className="text-sm" />
            <Button size="sm" variant="outline" onClick={() => { if (linkHref.trim()) onUpdateAttr(selected.editKey, "href", linkHref.trim()) }}>Set</Button>
          </div>
        </div>
      )}

      {/* Image */}
      {isImage && (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl || selected.content} alt="Current" className="aspect-video w-full object-cover" />
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f) }} />
          <Button size="sm" variant="brand" loading={uploadLoading} onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Upload image
          </Button>
          <div className="border-t border-border pt-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Or paste URL</p>
            <div className="flex gap-2">
              <Input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="text-sm" />
              <Button size="sm" variant="outline" onClick={() => { if (imageUrl.trim()) onUpdateAttr(selected.editKey, "src", imageUrl.trim()) }}>
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Section info + move controls */}
      {isSection && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">This is a section/container. Click elements inside it to edit them, or delete the whole section.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onMoveSection(selected.editKey, "up")} data-testid="move-section-up">
              <ChevronUp className="h-3.5 w-3.5" /> Move Up
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onMoveSection(selected.editKey, "down")} data-testid="move-section-down">
              <ChevronDown className="h-3.5 w-3.5" /> Move Down
            </Button>
          </div>
        </div>
      )}

      {/* Spacing & alignment — for all element types */}
      <SpacingControls selected={selected} onSetStyle={onSetStyle} />

      {/* AI Rewrite — for all types */}
      <div className="border-t border-border pt-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">AI Edit</p>
        <Input placeholder="e.g. Make it shorter, add phone number..." value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} onKeyDown={(e) => e.key === "Enter" && aiRewrite()} className="text-sm" />
        <Button size="sm" variant="outline" className="mt-2 w-full" loading={aiLoading} disabled={!aiInstruction.trim()} onClick={aiRewrite}>
          <Wand2 className="h-3.5 w-3.5" /> Rewrite with AI
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Spacing & alignment controls (padding, margin, text alignment)
// ---------------------------------------------------------------------------

function SpacingControls({
  selected, onSetStyle,
}: {
  selected: SelectedElement
  onSetStyle: (key: string, prop: string, val: string) => void
}) {
  const box = selected.box
  // Treat padding/margin as uniform; seed from the dominant (top) value.
  const [pad, setPad] = useState<number>(box?.pt ?? 0)
  const [mar, setMar] = useState<number>(box?.mt ?? 0)
  const [align, setAlign] = useState<string>(box?.ta ?? "left")

  function applyPad(next: number) {
    const v = Math.max(0, Math.min(160, next))
    setPad(v)
    onSetStyle(selected.editKey, "padding", `${v}px`)
  }
  function applyMar(next: number) {
    const v = Math.max(0, Math.min(160, next))
    setMar(v)
    onSetStyle(selected.editKey, "margin-top", `${v}px`)
    onSetStyle(selected.editKey, "margin-bottom", `${v}px`)
  }
  function applyAlign(val: string) {
    setAlign(val)
    onSetStyle(selected.editKey, "text-align", val)
  }

  return (
    <div className="border-t border-border pt-3" data-testid="spacing-controls">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Spacing &amp; Layout</p>

      {/* Alignment */}
      <div className="mb-3">
        <p className="mb-1 text-[10px] text-muted-foreground">Align</p>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([val, Icon]) => (
            <button
              key={val}
              type="button"
              onClick={() => applyAlign(val)}
              className={`flex-1 rounded-md py-1.5 flex items-center justify-center transition-colors ${
                align === val ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`align-${val}`}
              title={`Align ${val}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Padding */}
      <Stepper label="Padding" value={pad} onChange={applyPad} testid="padding" />
      {/* Margin */}
      <Stepper label="Vertical margin" value={mar} onChange={applyMar} testid="margin" />
    </div>
  )
}

function Stepper({
  label, value, onChange, testid,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  testid: string
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(value - 4)}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
          data-testid={`${testid}-minus`}
          title="Decrease"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-10 text-center text-xs font-mono tabular-nums" data-testid={`${testid}-value`}>{value}px</span>
        <button
          type="button"
          onClick={() => onChange(value + 4)}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
          data-testid={`${testid}-plus`}
          title="Increase"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
