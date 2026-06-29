"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { BlogEditor } from "@/components/admin/blog-editor"
import { Loader2 } from "lucide-react"
import type { BlogPost } from "@/types"

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

interface BlogFormProps {
  mode: "create" | "edit"
  id?: string
  // Defaults target the tenant admin; super admin overrides these to author
  // for a specific site via the cross-tenant API.
  apiBase?: string
  tenantId?: string
  listHref?: string
  uploadUrl?: string
}

export function BlogForm({
  mode,
  id,
  apiBase = "/api/admin/blog",
  tenantId,
  listHref = "/admin/blog",
  uploadUrl = "/api/build/upload",
}: BlogFormProps) {
  const router = useRouter()
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: "",
    slug: "",
    excerpt: "",
    content_html: "",
    content_json: undefined,
    cover_image_url: "",
    author_name: "",
    status: "draft",
  })
  const [slugDirty, setSlugDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(mode === "edit")
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)

  // Load post data if editing
  useEffect(() => {
    if (mode !== "edit" || !id) return
    async function fetchPost() {
      try {
        const res = await fetch(`${apiBase}/${id}`)
        if (!res.ok) throw new Error("Failed to fetch post")
        const data = await res.json()
        setPost(data.post)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load post")
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [mode, id, apiBase, setLoading])

  function updateTitle(title: string) {
    setPost(p => ({ ...p, title }))
    if (!slugDirty) {
      setPost(p => ({ ...p, slug: slugify(title) }))
    }
  }

  async function uploadCoverImage(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(uploadUrl, { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      setPost(p => ({ ...p, cover_image_url: data.url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function saveBlog() {
    if (!post.title?.trim()) {
      setError("Title is required")
      return
    }
    if (!post.slug?.trim()) {
      setError("Slug is required")
      return
    }
    if (!post.content_html?.trim()) {
      setError("Content is required")
      return
    }

    setSaving(true)
    setError("")
    try {
      const body = {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || "",
        content_html: post.content_html,
        content_json: post.content_json,
        cover_image_url: post.cover_image_url || null,
        author_name: post.author_name || null,
        status: post.status || "draft",
        ...(tenantId ? { tenant_id: tenantId } : {}),
      }

      const res = await fetch(
        mode === "create" ? apiBase : `${apiBase}/${id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Save failed")
      }

      const data = await res.json()
      if (mode === "create") {
        router.push(`${listHref}/${data.post.id}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post")
    } finally {
      setSaving(false)
    }
  }

  if (loading && mode === "edit") {
    return <div className="text-center py-12 text-muted-foreground">Loading post...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{mode === "create" ? "New Blog Post" : "Edit Blog Post"}</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="blog-field-title" className="mb-2 block">Title *</Label>
            <Input
              id="blog-field-title"
              data-testid="blog-field-title"
              placeholder="Blog post title"
              value={post.title || ""}
              onChange={e => updateTitle(e.target.value)}
            />
          </div>

          {/* Slug */}
          <div>
            <Label htmlFor="blog-field-slug" className="mb-2 block">Slug *</Label>
            <Input
              id="blog-field-slug"
              data-testid="blog-field-slug"
              placeholder="auto-generated-slug"
              value={post.slug || ""}
              onChange={e => {
                setPost(p => ({ ...p, slug: e.target.value }))
                setSlugDirty(true)
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">Auto-generated from title or customize manually</p>
          </div>

          {/* Excerpt */}
          <div>
            <Label htmlFor="blog-field-excerpt" className="mb-2 block">Excerpt</Label>
            <Textarea
              id="blog-field-excerpt"
              data-testid="blog-field-excerpt"
              placeholder="Short summary for previews"
              value={post.excerpt || ""}
              onChange={e => setPost(p => ({ ...p, excerpt: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Author Name */}
          <div>
            <Label htmlFor="blog-field-author_name" className="mb-2 block">Author Name</Label>
            <Input
              id="blog-field-author_name"
              data-testid="blog-field-author_name"
              placeholder="e.g. John Doe"
              value={post.author_name || ""}
              onChange={e => setPost(p => ({ ...p, author_name: e.target.value }))}
            />
          </div>

          {/* Cover Image */}
          <div>
            <Label htmlFor="blog-field-cover_image" className="mb-2 block">Cover Image</Label>
            <div className="flex gap-2">
              <Input
                id="blog-field-cover_image"
                data-testid="blog-field-cover_image"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={e => {
                  const file = e.currentTarget.files?.[0]
                  if (file) uploadCoverImage(file)
                }}
              />
            </div>
            {post.cover_image_url && (
              <div className="mt-3">
                <img
                  src={post.cover_image_url}
                  alt="Cover"
                  className="h-32 w-full object-cover rounded-lg border border-border"
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="blog-field-status" className="mb-2 block">Status</Label>
            <select
              id="blog-field-status"
              data-testid="blog-field-status"
              value={post.status || "draft"}
              onChange={e => setPost(p => ({ ...p, status: e.target.value as "draft" | "published" }))}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Content *</CardTitle>
        </CardHeader>
        <CardContent>
          <BlogEditor
            value={post.content_html || ""}
            json={post.content_json}
            onChange={(html, json) => setPost(p => ({ ...p, content_html: html, content_json: json }))}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          data-testid="blog-save"
          onClick={saveBlog}
          disabled={saving}
        >
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? "Saving..." : mode === "create" ? "Create Post" : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
