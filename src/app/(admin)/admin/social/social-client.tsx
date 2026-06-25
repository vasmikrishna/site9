"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Camera,
  Share2,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  CalendarClock,
  AlertCircle,
  CheckCircle2,
  Clock,
  PenLine,
  Send,
  Eye,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Composer } from "./composer"
import { PostPreview } from "@/components/social/previews/post-preview"
import type { SocialAccount, SocialPost, SocialPostTarget, SocialSettings, SocialPlatform } from "@/types"

// ── Types ────────────────────────────────────────────────────────────────────

type PostWithTargets = SocialPost & { social_post_targets: SocialPostTarget[] }

// ── Status badge colours ─────────────────────────────────────────────────────

function statusVariant(status: SocialPost["status"]): string {
  switch (status) {
    case "published": return "bg-green-100 text-green-700 border-green-200"
    case "scheduled": return "bg-blue-100 text-blue-700 border-blue-200"
    case "publishing": return "bg-yellow-100 text-yellow-700 border-yellow-200"
    case "failed": return "bg-red-100 text-red-700 border-red-200"
    case "ready": return "bg-purple-100 text-purple-700 border-purple-200"
    default: return "bg-muted text-muted-foreground border-border"
  }
}

function StatusBadge({ status }: { status: SocialPost["status"] }) {
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border capitalize", statusVariant(status))}>
      {status}
    </span>
  )
}

// ── Inline toast ─────────────────────────────────────────────────────────────

function InlineBanner({ msg, type, onDismiss }: { msg: string; type: "success" | "error"; onDismiss: () => void }) {
  const isSuccess = type === "success"
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm",
      isSuccess
        ? "bg-green-50 border-green-200 text-green-700"
        : "bg-destructive/10 border-destructive/30 text-destructive"
    )}>
      {isSuccess ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      <span className="flex-1">{msg}</span>
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── Platform icon ─────────────────────────────────────────────────────────────

function PlatformIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  // Use Camera for Instagram-style, Share2 for Facebook-style
  if (platform === "instagram") return <Camera className={cn("h-4 w-4", className)} />
  return <Share2 className={cn("h-4 w-4", className)} />
}

// ── Post card (shared between Calendar + Drafts) ─────────────────────────────

interface PostCardProps {
  post: PostWithTargets
  accounts: SocialAccount[]
  onEdit: (post: PostWithTargets) => void
  onDelete: (id: string) => void
  onAction: (id: string, action: string) => void
  actioning: string | null
  deleting: string | null
}

function PostCard({ post, accounts, onEdit, onDelete, onAction, actioning, deleting }: PostCardProps) {
  const firstImage = post.media_urls[0]
  const targetAccounts = accounts.filter((a) =>
    post.social_post_targets.some((t) => t.social_account_id === a.id)
  )
  const publishedTarget = post.social_post_targets.find((t) => t.permalink)

  return (
    <div className="flex gap-4 p-4 rounded-xl border border-border bg-background hover:shadow-sm transition-shadow group">
      {/* Thumbnail */}
      <div className="shrink-0 w-16 h-16 rounded-lg bg-muted overflow-hidden border border-border">
        {firstImage ? (
          <img src={firstImage} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <PenLine className="h-5 w-5 opacity-40" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1.5">
          <p className="text-sm text-foreground line-clamp-2 flex-1 leading-snug">
            {post.caption || <span className="text-muted-foreground italic">No caption</span>}
          </p>
          <StatusBadge status={post.status} />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {/* Platforms */}
          <div className="flex items-center gap-1">
            {targetAccounts.map((a) => (
              <PlatformIcon key={a.id} platform={a.platform} className="text-muted-foreground" />
            ))}
          </div>

          {/* Time */}
          {post.scheduled_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(post.scheduled_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </span>
          )}
          {post.published_at && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {new Date(post.published_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </span>
          )}

          {/* Source badge for AI posts */}
          {post.source === "ai" && (
            <span className="flex items-center gap-1 text-purple-600">
              <Sparkles className="h-3 w-3" />
              AI-drafted
            </span>
          )}
        </div>

        {/* AI source */}
        {post.source === "ai" && post.ai_source_title && (
          <div className="mt-1.5">
            <a
              href={post.ai_source_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {post.ai_source_title}
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {publishedTarget?.permalink && (
          <a
            href={publishedTarget.permalink}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`post-view-${post.id}`}
          >
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </a>
        )}

        {(post.status === "draft" || post.status === "ready") && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              data-testid={`post-edit-${post.id}`}
              onClick={() => onEdit(post)}
            >
              <PenLine className="h-4 w-4" />
            </Button>
            {post.status === "ready" && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-green-600 hover:text-green-700"
                data-testid={`post-approve-${post.id}`}
                onClick={() => onAction(post.id, "schedule")}
                disabled={actioning === post.id}
              >
                {actioning === post.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            )}
          </>
        )}

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          data-testid={`post-delete-${post.id}`}
          onClick={() => onDelete(post.id)}
          disabled={deleting === post.id}
        >
          {deleting === post.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="flex gap-4 p-4 rounded-xl border border-border animate-pulse">
      <div className="w-16 h-16 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  )
}

// ── Toggle (accessible, no separate component needed) ────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  "data-testid"?: string
  label?: string
}

function Toggle({ checked, onChange, label, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={rest["data-testid"]}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

// ── Main Client ───────────────────────────────────────────────────────────────

export function SocialClient() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const [calendarPosts, setCalendarPosts] = useState<PostWithTargets[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(true)

  const [draftPosts, setDraftPosts] = useState<PostWithTargets[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [settings, setSettings] = useState<SocialSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [keywordsInput, setKeywordsInput] = useState("")

  const [composerOpen, setComposerOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<PostWithTargets | undefined>()

  const [deleting, setDeleting] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  const [banner, setBanner] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  function notify(msg: string, type: "success" | "error" = "success") {
    setBanner({ msg, type })
    setTimeout(() => setBanner(null), 4000)
  }

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/social/accounts")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAccounts(data.accounts ?? [])
    } catch {
      notify("Failed to load accounts", "error")
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  // Fetch calendar posts (scheduled + published + failed)
  const fetchCalendar = useCallback(async () => {
    try {
      const [s, p, f] = await Promise.all([
        fetch("/api/admin/social/posts?status=scheduled").then(r => r.json()),
        fetch("/api/admin/social/posts?status=published").then(r => r.json()),
        fetch("/api/admin/social/posts?status=failed").then(r => r.json()),
      ])
      setCalendarPosts([
        ...(s.posts ?? []),
        ...(p.posts ?? []),
        ...(f.posts ?? []),
      ])
    } catch {
      notify("Failed to load posts", "error")
    } finally {
      setLoadingCalendar(false)
    }
  }, [])

  // Fetch draft + ready posts
  const fetchDrafts = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([
        fetch("/api/admin/social/posts?status=draft").then(r => r.json()),
        fetch("/api/admin/social/posts?status=ready").then(r => r.json()),
      ])
      setDraftPosts([...(r.posts ?? []), ...(d.posts ?? [])])
    } catch {
      notify("Failed to load drafts", "error")
    } finally {
      setLoadingDrafts(false)
    }
  }, [])

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/social/settings")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSettings(data.settings)
      setKeywordsInput((data.settings?.keywords ?? []).join(", "))
    } catch {
      // settings may not exist yet — that's fine
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
    fetchCalendar()
    fetchDrafts()
    fetchSettings()
  }, [fetchAccounts, fetchCalendar, fetchDrafts, fetchSettings])

  // Connect platform
  async function connectPlatform(platform: string) {
    setConnecting(platform)
    try {
      const res = await fetch("/api/admin/social/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      })
      if (!res.ok) throw new Error("Connection failed")
      const data = await res.json()
      if (!data.mock && data.authUrl) {
        window.location.href = data.authUrl as string
      } else {
        setAccounts(data.accounts ?? [])
        notify(`${platform} connected (mock)`)
      }
    } catch {
      notify("Failed to connect account", "error")
    } finally {
      setConnecting(null)
    }
  }

  // Disconnect account
  async function disconnectAccount(id: string) {
    if (!window.confirm("Disconnect this account?")) return
    setDisconnecting(id)
    try {
      const res = await fetch(`/api/admin/social/accounts/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      notify("Account disconnected")
    } catch {
      notify("Failed to disconnect account", "error")
    } finally {
      setDisconnecting(null)
    }
  }

  // Delete post
  async function deletePost(id: string) {
    if (!window.confirm("Delete this post?")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/social/posts/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setCalendarPosts((prev) => prev.filter((p) => p.id !== id))
      setDraftPosts((prev) => prev.filter((p) => p.id !== id))
      notify("Post deleted")
    } catch {
      notify("Failed to delete post", "error")
    } finally {
      setDeleting(null)
    }
  }

  // Post action (approve / schedule / publish_now)
  async function postAction(id: string, action: string) {
    setActioning(id)
    try {
      const res = await fetch(`/api/admin/social/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error()
      fetchCalendar()
      fetchDrafts()
      notify("Post updated")
    } catch {
      notify("Failed to update post", "error")
    } finally {
      setActioning(null)
    }
  }

  // Generate AI post
  async function generatePost() {
    setGenerating(true)
    try {
      const res = await fetch("/api/admin/social/generate", { method: "POST" })
      if (!res.ok) throw new Error("Generation failed")
      const data = await res.json()
      setDraftPosts((prev) => [data.post as PostWithTargets, ...prev])
      notify("AI draft generated!")
    } catch {
      notify("Failed to generate post", "error")
    } finally {
      setGenerating(false)
    }
  }

  // Save settings
  async function saveSettings(partial: Partial<SocialSettings>) {
    if (!settings) return
    const updated = { ...settings, ...partial }
    setSettings(updated)
    setSavingSettings(true)
    try {
      const res = await fetch("/api/admin/social/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      })
      if (!res.ok) throw new Error()
      notify("Settings saved")
    } catch {
      notify("Failed to save settings", "error")
    } finally {
      setSavingSettings(false)
    }
  }

  function openComposer(post?: PostWithTargets) {
    setEditingPost(post)
    setComposerOpen(true)
  }

  function onComposerSaved() {
    fetchCalendar()
    fetchDrafts()
    notify("Post saved!")
  }

  // ── Grouped calendar posts ─────────────────────────────────────────────────

  const scheduledPosts = calendarPosts.filter((p) => p.status === "scheduled")
  const publishedPosts = calendarPosts.filter((p) => p.status === "published")
  const failedPosts = calendarPosts.filter((p) => p.status === "failed")

  const aiDrafts = draftPosts.filter((p) => p.source === "ai")
  const manualDrafts = draftPosts.filter((p) => p.source === "manual")

  const instagramAccounts = accounts.filter((a) => a.platform === "instagram")
  const facebookAccounts = accounts.filter((a) => a.platform === "facebook")

  return (
    <div className="space-y-4">
      {banner && (
        <InlineBanner
          msg={banner.msg}
          type={banner.type}
          onDismiss={() => setBanner(null)}
        />
      )}

      <Tabs defaultValue="connections">
        <TabsList data-testid="social-tabs" className="w-full sm:w-auto">
          <TabsTrigger value="connections" data-testid="social-tab-connections">Connections</TabsTrigger>
          <TabsTrigger value="calendar" data-testid="social-tab-calendar">Calendar</TabsTrigger>
          <TabsTrigger value="drafts" data-testid="social-tab-drafts">Drafts & AI</TabsTrigger>
          <TabsTrigger value="settings" data-testid="social-tab-settings">Settings</TabsTrigger>
        </TabsList>

        {/* ── CONNECTIONS ─────────────────────────────────────────────────── */}
        <TabsContent value="connections" className="mt-6">
          <div className="space-y-6">
            {/* Platform tabs */}
            <Tabs defaultValue="instagram">
              <TabsList>
                <TabsTrigger value="instagram" data-testid="social-platform-instagram">
                  <Camera className="h-4 w-4 mr-1.5" /> Instagram
                </TabsTrigger>
                <TabsTrigger value="facebook" data-testid="social-platform-facebook">
                  <Share2 className="h-4 w-4 mr-1.5" /> Facebook
                </TabsTrigger>
              </TabsList>

              {/* Coming soon chips */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {["X / Twitter", "LinkedIn", "YouTube"].map((name) => (
                  <span
                    key={name}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground border border-dashed border-border rounded-full px-3 py-1 opacity-60"
                  >
                    {name}
                    <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                      Coming soon
                    </span>
                  </span>
                ))}
              </div>

              {/* Instagram */}
              <TabsContent value="instagram" className="mt-5">
                <PlatformSection
                  platform="instagram"
                  platformAccounts={instagramAccounts}
                  loading={loadingAccounts}
                  connecting={connecting === "instagram"}
                  disconnecting={disconnecting}
                  onConnect={() => connectPlatform("instagram")}
                  onDisconnect={disconnectAccount}
                />
              </TabsContent>

              {/* Facebook */}
              <TabsContent value="facebook" className="mt-5">
                <PlatformSection
                  platform="facebook"
                  platformAccounts={facebookAccounts}
                  loading={loadingAccounts}
                  connecting={connecting === "facebook"}
                  disconnecting={disconnecting}
                  onConnect={() => connectPlatform("facebook")}
                  onDisconnect={disconnectAccount}
                />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* ── CALENDAR ────────────────────────────────────────────────────── */}
        <TabsContent value="calendar" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Scheduled & Published
              </h2>
              <Button
                size="sm"
                data-testid="social-new-post"
                onClick={() => openComposer()}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Post
              </Button>
            </div>

            {loadingCalendar ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
              </div>
            ) : calendarPosts.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No scheduled posts yet"
                description="Create a new post and schedule it to see it here."
                action={
                  <Button size="sm" onClick={() => openComposer()} data-testid="social-calendar-new-post">
                    <Plus className="h-4 w-4 mr-1.5" /> New Post
                  </Button>
                }
              />
            ) : (
              <div className="space-y-6">
                {scheduledPosts.length > 0 && (
                  <PostGroup label="Scheduled" posts={scheduledPosts} accounts={accounts}
                    onEdit={openComposer} onDelete={deletePost} onAction={postAction}
                    actioning={actioning} deleting={deleting} />
                )}
                {failedPosts.length > 0 && (
                  <PostGroup label="Failed" posts={failedPosts} accounts={accounts}
                    onEdit={openComposer} onDelete={deletePost} onAction={postAction}
                    actioning={actioning} deleting={deleting} />
                )}
                {publishedPosts.length > 0 && (
                  <PostGroup label="Published" posts={publishedPosts} accounts={accounts}
                    onEdit={openComposer} onDelete={deletePost} onAction={postAction}
                    actioning={actioning} deleting={deleting} />
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── DRAFTS & AI ─────────────────────────────────────────────────── */}
        <TabsContent value="drafts" className="mt-6">
          <div className="space-y-6">
            {/* AI Generate CTA */}
            <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-purple-900">AI Content Generation</h3>
                <p className="text-xs text-purple-700 mt-0.5">
                  Let AI draft a post based on your niche and keywords set in Settings.
                </p>
              </div>
              <Button
                data-testid="social-generate"
                onClick={generatePost}
                disabled={generating}
                className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Generate a post now</>
                )}
              </Button>
            </div>

            {loadingDrafts ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <PostSkeleton key={i} />)}
              </div>
            ) : draftPosts.length === 0 ? (
              <EmptyState
                icon={PenLine}
                title="No drafts yet"
                description="Generate an AI draft or create a post manually."
              />
            ) : (
              <div className="space-y-6">
                {aiDrafts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      AI Drafts ({aiDrafts.length})
                    </h3>
                    {aiDrafts.map((post) => (
                      <AiPostCard
                        key={post.id}
                        post={post}
                        accounts={accounts}
                        onEdit={() => openComposer(post)}
                        onDiscard={() => deletePost(post.id)}
                        onApprove={() => postAction(post.id, "approve")}
                        actioning={actioning === post.id}
                        deleting={deleting === post.id}
                      />
                    ))}
                  </div>
                )}
                {manualDrafts.length > 0 && (
                  <PostGroup
                    label="Manual Drafts"
                    posts={manualDrafts}
                    accounts={accounts}
                    onEdit={openComposer}
                    onDelete={deletePost}
                    onAction={postAction}
                    actioning={actioning}
                    deleting={deleting}
                  />
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── SETTINGS ────────────────────────────────────────────────────── */}
        <TabsContent value="settings" className="mt-6">
          {loadingSettings ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-muted rounded-xl" />
              ))}
            </div>
          ) : (
            <SocialSettingsForm
              settings={settings}
              keywordsInput={keywordsInput}
              setKeywordsInput={setKeywordsInput}
              onSave={saveSettings}
              saving={savingSettings}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Composer Dialog */}
      <Composer
        open={composerOpen}
        onClose={() => { setComposerOpen(false); setEditingPost(undefined) }}
        accounts={accounts}
        post={editingPost}
        onSaved={onComposerSaved}
      />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface PlatformSectionProps {
  platform: "instagram" | "facebook"
  platformAccounts: SocialAccount[]
  loading: boolean
  connecting: boolean
  disconnecting: string | null
  onConnect: () => void
  onDisconnect: (id: string) => void
}

function PlatformSection({
  platform,
  platformAccounts,
  loading,
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
}: PlatformSectionProps) {
  const Icon = platform === "instagram" ? Camera : Share2
  const color = platform === "instagram"
    ? "from-purple-500 via-pink-500 to-orange-400"
    : "bg-[#1877F2]"

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3 p-4 rounded-xl border border-border animate-pulse">
              <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : platformAccounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 flex flex-col items-center gap-4">
          <div className={cn(
            "h-16 w-16 rounded-2xl flex items-center justify-center text-white",
            platform === "instagram" ? `bg-gradient-to-tr ${color}` : color
          )}>
            <Icon className="h-8 w-8" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">No {platform === "instagram" ? "Instagram" : "Facebook"} accounts connected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your {platform === "instagram" ? "Instagram" : "Facebook"} account to start scheduling posts.
            </p>
          </div>
          <Button
            data-testid={`social-connect-${platform}`}
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Connecting…</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" />Connect {platform === "instagram" ? "Instagram" : "Facebook"}</>
            )}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {platformAccounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                onDisconnect={onDisconnect}
                disconnecting={disconnecting === acc.id}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            data-testid={`social-connect-${platform}`}
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Connecting…</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" />Add another {platform === "instagram" ? "Instagram" : "Facebook"} account</>
            )}
          </Button>
        </>
      )}
    </div>
  )
}

function AccountCard({
  account,
  onDisconnect,
  disconnecting,
}: {
  account: SocialAccount
  onDisconnect: (id: string) => void
  disconnecting: boolean
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background group hover:shadow-sm transition-shadow">
      {account.avatar_url ? (
        <img
          src={account.avatar_url}
          alt={account.name}
          className="h-12 w-12 rounded-full object-cover border-2 border-border shrink-0"
        />
      ) : (
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {account.name[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{account.name}</p>
        {account.username && (
          <p className="text-xs text-muted-foreground">@{account.username.replace(/^@/, "")}</p>
        )}
      </div>
      <Badge
        variant="outline"
        className={cn(
          "capitalize text-xs shrink-0",
          account.status === "active"
            ? "border-green-200 text-green-700 bg-green-50"
            : "border-red-200 text-red-700 bg-red-50"
        )}
      >
        {account.status}
      </Badge>
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        data-testid={`social-disconnect-${account.id}`}
        onClick={() => onDisconnect(account.id)}
        disabled={disconnecting}
      >
        {disconnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Trash2 className="h-4 w-4 mr-1.5" />
            Disconnect
          </>
        )}
      </Button>
    </div>
  )
}

interface PostGroupProps {
  label: string
  posts: PostWithTargets[]
  accounts: SocialAccount[]
  onEdit: (post: PostWithTargets) => void
  onDelete: (id: string) => void
  onAction: (id: string, action: string) => void
  actioning: string | null
  deleting: string | null
}

function PostGroup({ label, posts, accounts, onEdit, onDelete, onAction, actioning, deleting }: PostGroupProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label} ({posts.length})</h3>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          accounts={accounts}
          onEdit={onEdit}
          onDelete={onDelete}
          onAction={onAction}
          actioning={actioning}
          deleting={deleting}
        />
      ))}
    </div>
  )
}

interface AiPostCardProps {
  post: PostWithTargets
  accounts: SocialAccount[]
  onEdit: () => void
  onDiscard: () => void
  onApprove: () => void
  actioning: boolean
  deleting: boolean
}

function AiPostCard({ post, accounts, onEdit, onDiscard, onApprove, actioning, deleting }: AiPostCardProps) {
  const [showPreview, setShowPreview] = useState(false)
  const firstImage = post.media_urls[0]
  const targetAccounts = accounts.filter((a) =>
    post.social_post_targets?.some((t) => t.social_account_id === a.id)
  )
  const previewAccount = targetAccounts[0]

  return (
    <div className="rounded-2xl border border-purple-200 bg-white overflow-hidden shadow-sm">
      <div className="flex gap-4 p-4">
        {firstImage && (
          <img src={firstImage} alt="Post" className="h-20 w-20 rounded-xl object-cover shrink-0 border border-border" />
        )}
        <div className="flex-1 min-w-0">
          {post.ai_source_title && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
              <a
                href={post.ai_source_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-600 hover:underline truncate"
              >
                {post.ai_source_title}
              </a>
            </div>
          )}
          <p className="text-sm text-foreground line-clamp-3 leading-snug">{post.caption}</p>
          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {post.hashtags.slice(0, 5).map((h) => (
                <span key={h} className="text-xs text-sky-600">
                  #{h.replace(/^#/, "")}
                </span>
              ))}
              {post.hashtags.length > 5 && (
                <span className="text-xs text-muted-foreground">+{post.hashtags.length - 5} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {showPreview && (
        <div className="border-t border-purple-100 bg-purple-50/50 p-4">
          <PostPreview
            platform="instagram"
            draft={{
              caption: post.caption,
              hashtags: post.hashtags,
              media_urls: post.media_urls,
              account: previewAccount
                ? { name: previewAccount.name, username: previewAccount.username ?? previewAccount.name, avatar_url: previewAccount.avatar_url }
                : undefined,
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3 bg-purple-50/50 border-t border-purple-100">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground hover:text-foreground"
          data-testid={`ai-preview-${post.id}`}
          onClick={() => setShowPreview((v) => !v)}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          {showPreview ? "Hide preview" : "Preview"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          data-testid={`ai-edit-${post.id}`}
          onClick={onEdit}
        >
          <PenLine className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-destructive hover:text-destructive"
          data-testid={`ai-discard-${post.id}`}
          onClick={onDiscard}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Discard"}
        </Button>
        <Button
          size="sm"
          className="text-xs ml-auto bg-purple-600 hover:bg-purple-700"
          data-testid={`ai-approve-${post.id}`}
          onClick={onApprove}
          disabled={actioning}
        >
          {actioning ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1" />
          )}
          Approve & Schedule
        </Button>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

// ── Settings Form ────────────────────────────────────────────────────────────

interface SocialSettingsFormProps {
  settings: SocialSettings | null
  keywordsInput: string
  setKeywordsInput: (v: string) => void
  onSave: (partial: Partial<SocialSettings>) => void
  saving: boolean
}

function SocialSettingsForm({ settings, keywordsInput, setKeywordsInput, onSave, saving }: SocialSettingsFormProps) {
  const [local, setLocal] = useState<Partial<SocialSettings>>(settings ?? {})

  function patch<K extends keyof SocialSettings>(key: K, value: SocialSettings[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const keywords = keywordsInput
      .split(/[,\s]+/)
      .map((k) => k.trim())
      .filter(Boolean)
    onSave({ ...local, keywords })
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* auto_generate */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm font-medium">Auto-generate posts</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Let AI automatically draft posts based on your settings
          </p>
        </div>
        <Toggle
          checked={local.auto_generate ?? false}
          onChange={(v) => patch("auto_generate", v)}
          data-testid="settings-auto-generate"
          label="Auto-generate posts"
        />
      </div>

      {/* autopublish */}
      <div className="flex items-center justify-between py-3 border-b border-border">
        <div>
          <p className="text-sm font-medium">Auto-publish</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatically publish AI-generated posts without manual review
          </p>
        </div>
        <Toggle
          checked={local.autopublish ?? false}
          onChange={(v) => patch("autopublish", v)}
          data-testid="settings-autopublish"
          label="Auto-publish"
        />
      </div>

      {/* niche */}
      <div className="space-y-1.5">
        <Label htmlFor="settings-niche">Niche / Industry</Label>
        <Input
          id="settings-niche"
          data-testid="settings-niche"
          placeholder="e.g. Fitness, Technology, Real Estate…"
          value={local.niche ?? ""}
          onChange={(e) => patch("niche", e.target.value)}
        />
      </div>

      {/* keywords */}
      <div className="space-y-1.5">
        <Label htmlFor="settings-keywords">Keywords</Label>
        <Input
          id="settings-keywords"
          data-testid="settings-keywords"
          placeholder="comma or space separated keywords"
          value={keywordsInput}
          onChange={(e) => setKeywordsInput(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          These keywords guide AI content generation.
        </p>
      </div>

      {/* tone */}
      <div className="space-y-1.5">
        <Label htmlFor="settings-tone">Tone of Voice</Label>
        <Select
          value={local.tone ?? ""}
          onValueChange={(v) => patch("tone", v)}
        >
          <SelectTrigger id="settings-tone" data-testid="settings-tone">
            <SelectValue placeholder="Select a tone…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="playful">Playful</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* post_count_per_run */}
      <div className="space-y-1.5">
        <Label htmlFor="settings-post-count">Posts per generation run</Label>
        <Input
          id="settings-post-count"
          data-testid="settings-post-count"
          type="number"
          min={1}
          max={20}
          value={local.post_count_per_run ?? 3}
          onChange={(e) => patch("post_count_per_run", Number(e.target.value))}
          className="w-32"
        />
      </div>

      <Button
        data-testid="settings-save"
        onClick={handleSave}
        disabled={saving}
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Save Settings
      </Button>
    </div>
  )
}
