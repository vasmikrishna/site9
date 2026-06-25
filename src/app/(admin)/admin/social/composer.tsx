"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  X,
  ImagePlus,
  Clock,
  Zap,
  FileText,
  Camera,
  Share2,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PostPreview, type PreviewPlatform, type PreviewDraft } from "@/components/social/previews/post-preview"
import type { SocialAccount, SocialPost, SocialPostTarget } from "@/types"

interface ComposerProps {
  open: boolean
  onClose: () => void
  accounts: SocialAccount[]
  post?: SocialPost & { social_post_targets: SocialPostTarget[] }
  onSaved: () => void
}

type ScheduleMode = "now" | "schedule" | "draft"

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Camera className="h-4 w-4" />,
  facebook: <Share2 className="h-4 w-4" />,
}

const IG_MAX = 2200

export function Composer({ open, onClose, accounts, post, onSaved }: ComposerProps) {
  const isEdit = !!post

  const [caption, setCaption] = useState(post?.caption ?? "")
  const [hashtagInput, setHashtagInput] = useState(
    post?.hashtags?.join(", ") ?? ""
  )
  const [mediaUrls, setMediaUrls] = useState<string[]>(post?.media_urls ?? [])
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    post?.social_post_targets?.map((t) => t.social_account_id) ?? []
  )
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>(
    post?.scheduled_at ? "schedule" : "draft"
  )
  const [scheduledAt, setScheduledAt] = useState(
    post?.scheduled_at
      ? post.scheduled_at.slice(0, 16)
      : ""
  )
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>("instagram")
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hashtags = hashtagInput
    .split(/[,\s]+/)
    .map((h) => h.replace(/^#/, "").trim())
    .filter(Boolean)

  const previewAccount = accounts.find((a) =>
    selectedAccountIds.includes(a.id) && a.platform === previewPlatform
  ) ?? accounts.find((a) => selectedAccountIds.includes(a.id))

  const draft: PreviewDraft = {
    caption,
    hashtags,
    media_urls: mediaUrls,
    account: previewAccount
      ? {
          name: previewAccount.name,
          username: previewAccount.username ?? previewAccount.name,
          avatar_url: previewAccount.avatar_url,
        }
      : undefined,
  }

  async function uploadFile(file: File) {
    setUploading(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/admin/social/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      setMediaUrls((prev) => [...prev, data.url as string])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ""
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(mode: ScheduleMode) {
    setError("")
    if (selectedAccountIds.length === 0) {
      setError("Select at least one account to post to.")
      return
    }
    if (!caption.trim()) {
      setError("Caption is required.")
      return
    }
    if (mode === "schedule" && !scheduledAt) {
      setError("Pick a schedule date/time.")
      return
    }

    setSaving(true)
    try {
      const action =
        mode === "now" ? "publish_now" : mode === "schedule" ? "schedule" : "draft"

      const body = {
        caption,
        hashtags,
        media_urls: mediaUrls,
        target_account_ids: selectedAccountIds,
        scheduled_at: mode === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
        action,
      }

      let res: Response
      if (isEdit) {
        res = await fetch(`/api/admin/social/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, target_account_ids: selectedAccountIds }),
        })
      } else {
        res = await fetch("/api/admin/social/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) throw new Error("Failed to save post")
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save post")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-testid="social-composer"
        className="max-w-5xl w-full h-[90vh] p-0 overflow-hidden flex flex-col"
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle>{isEdit ? "Edit Post" : "New Post"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT — Editor */}
          <div className="flex-1 flex flex-col overflow-y-auto px-6 py-5 gap-5 border-r border-border">
            {/* Caption */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="composer-caption">Caption</Label>
                <span
                  className={cn(
                    "text-xs",
                    caption.length > IG_MAX ? "text-destructive font-semibold" : "text-muted-foreground"
                  )}
                >
                  {caption.length} / {IG_MAX}
                </span>
              </div>
              <Textarea
                id="composer-caption"
                data-testid="composer-caption"
                placeholder="Write your caption…"
                className="min-h-32 resize-none text-sm"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-1.5">
              <Label htmlFor="composer-hashtags">Hashtags</Label>
              <Input
                id="composer-hashtags"
                data-testid="composer-hashtags"
                placeholder="nature, travel, photography (comma or space separated)"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
              />
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hashtags.map((h) => (
                    <Badge key={h} variant="outline" className="text-sky-600 border-sky-200 bg-sky-50 text-xs">
                      #{h}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Images</Label>
              <div
                data-testid="composer-upload-zone"
                className={cn(
                  "border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent/50"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">
                      Drag & drop or{" "}
                      <span className="text-primary font-medium">click to upload</span>
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  data-testid="composer-file-input"
                />
              </div>

              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt={`Upload ${i + 1}`}
                        className="h-20 w-20 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        data-testid={`composer-remove-image-${i}`}
                        onClick={() => setMediaUrls((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Selection */}
            <div className="space-y-2">
              <Label>Post to accounts</Label>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No accounts connected. Connect one in the Connections tab.
                </p>
              ) : (
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <label
                      key={acc.id}
                      data-testid={`composer-account-${acc.id}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                        selectedAccountIds.includes(acc.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selectedAccountIds.includes(acc.id)}
                        onChange={() => toggleAccount(acc.id)}
                      />
                      <div
                        className={cn(
                          "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          selectedAccountIds.includes(acc.id)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        )}
                      >
                        {selectedAccountIds.includes(acc.id) && (
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {acc.avatar_url ? (
                        <img src={acc.avatar_url} alt={acc.name} className="h-8 w-8 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                          {acc.name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{acc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{acc.platform}</p>
                      </div>
                      <div className="ml-auto text-muted-foreground">
                        {PLATFORM_ICONS[acc.platform]}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label>Timing</Label>
              <div className="flex gap-2">
                {[
                  { mode: "draft" as ScheduleMode, icon: FileText, label: "Save draft" },
                  { mode: "now" as ScheduleMode, icon: Zap, label: "Publish now" },
                  { mode: "schedule" as ScheduleMode, icon: Clock, label: "Schedule" },
                ].map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    data-testid={`composer-mode-${mode}`}
                    onClick={() => setScheduleMode(mode)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                      scheduleMode === mode
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {scheduleMode === "schedule" && (
                <Input
                  type="datetime-local"
                  data-testid="composer-schedule-at"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={onClose}
                data-testid="composer-cancel"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                data-testid="composer-submit"
                onClick={() => handleSubmit(scheduleMode)}
                disabled={saving || uploading}
                className="flex-1"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {scheduleMode === "draft"
                  ? "Save Draft"
                  : scheduleMode === "now"
                  ? "Publish Now"
                  : "Schedule Post"}
              </Button>
            </div>
          </div>

          {/* RIGHT — Preview */}
          <div className="w-80 shrink-0 flex flex-col bg-muted/30 overflow-y-auto">
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Live Preview
              </p>
              <div className="flex gap-1">
                {(["instagram", "facebook"] as PreviewPlatform[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    data-testid={`composer-preview-${p}`}
                    onClick={() => setPreviewPlatform(p)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                      previewPlatform === p
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p === "instagram" ? (
                      <Camera className="h-3 w-3" />
                    ) : (
                      <Share2 className="h-3 w-3" />
                    )}
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 px-4 py-5">
              <PostPreview platform={previewPlatform} draft={draft} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
