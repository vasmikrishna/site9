"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ExternalLink, EyeOff, Plus, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { PaginatedList } from "@/components/paginated-list"
import type { BlogPost } from "@/types"

interface Tenant {
  id: string
  name: string
  slug: string
}

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "site9.in"

export function BlogModeration({ tenants }: { tenants: Tenant[] }) {
  const [tenantId, setTenantId] = useState("")
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const selected = tenants.find((t) => t.id === tenantId) ?? null

  async function selectTenant(id: string) {
    setTenantId(id)
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`/api/superadmin/blog?tenant_id=${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error("Failed to load posts")
      const data = await res.json()
      setPosts(data.posts || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts")
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  async function unpublish(id: string) {
    if (!window.confirm("Unpublish this post? It will no longer be visible on the site.")) return
    setBusy(id)
    setError("")
    try {
      const res = await fetch(`/api/superadmin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      })
      if (!res.ok) throw new Error("Failed to unpublish")
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "draft", published_at: null } : p)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unpublish")
    } finally {
      setBusy(null)
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this post permanently? This cannot be undone.")) return
    setBusy(id)
    setError("")
    try {
      const res = await fetch(`/api/superadmin/blog/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={tenantId} onValueChange={selectTenant}>
          <SelectTrigger className="w-full sm:w-96" data-testid="blog-site-select">
            <SelectValue placeholder="Select a site…" />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} <span className="text-muted-foreground">· {t.slug}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <Button asChild variant="brand" className="sm:ml-auto" data-testid="blog-new">
            <Link href={`/superadmin/blog/new?tenant=${selected.id}`}>
              <Plus className="h-4 w-4" /> New Post
            </Link>
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!selected ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Choose a site above to see its posts.
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading posts…</div>
      ) : posts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No blog posts on this site yet.
          </CardContent>
        </Card>
      ) : (
        <PaginatedList
          items={posts}
          pageSize={10}
          searchPlaceholder="Search posts by title, slug, or status..."
          testId="blog"
          searchText={(post) => `${post.title} ${post.slug} ${post.status}`}
        >
          {(pagePosts) => (
            <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
              {pagePosts.map((post) => (
                <div key={post.id} className="flex items-center gap-4 px-4 py-3 hover:bg-accent transition-colors group">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/superadmin/blog/${post.id}`}
                      data-testid={`blog-edit-${post.id}`}
                      className="block"
                    >
                      <p className="font-medium truncate hover:underline">{post.title}</p>
                      <p className="text-xs text-muted-foreground truncate">/{post.slug}</p>
                    </Link>
                  </div>
                  <Badge
                    variant={post.status === "published" ? "default" : "outline"}
                    className="flex-shrink-0 capitalize"
                  >
                    {post.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex-shrink-0 w-28 text-right hidden sm:block">
                    {formatDate(post.updated_at || post.created_at)}
                  </span>
                  <a
                    href={`https://${selected.slug}.${BASE_DOMAIN}/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`blog-view-${post.id}`}
                    className="flex-shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="View post on site"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {post.status === "published" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      data-testid={`blog-unpublish-${post.id}`}
                      onClick={() => unpublish(post.id)}
                      disabled={busy === post.id}
                      aria-label="Unpublish post"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    data-testid={`blog-delete-${post.id}`}
                    onClick={() => remove(post.id)}
                    disabled={busy === post.id}
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </PaginatedList>
      )}
    </div>
  )
}
