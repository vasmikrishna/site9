"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, ImageIcon, Trash2, Loader2 } from "lucide-react"
import type { BrandAsset } from "@/lib/build-assets"

interface AssetLibraryProps {
  onInsertImage: (url: string) => void
}

export function AssetLibrary({ onInsertImage }: AssetLibraryProps) {
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/build/assets")
      .then(r => r.json())
      .then(d => setAssets(d.assets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const photos = assets.filter(a => a.kind === "photo")
  const logos = assets.filter(a => a.kind === "logo")

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/build/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) return
      const saveRes = await fetch("/api/build/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.url, kind: "photo", label: file.name }),
      })
      const saveData = await saveRes.json()
      if (saveData.assets) setAssets(saveData.assets)
    } catch { /* ignore */ }
    finally { setUploading(false) }
  }

  async function handleDelete(id: string) {
    setAssets(prev => prev.filter(a => a.id !== id))
    try {
      const res = await fetch("/api/build/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (data.assets) setAssets(data.assets)
    } catch { /* ignore */ }
  }

  return (
    <div className="flex h-full flex-col" data-testid="asset-library">
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            My Assets
          </p>
          <Badge variant="outline" className="text-[9px]">{assets.length}</Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          data-testid="asset-upload-btn"
        >
          {uploading
            ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Uploading…</>
            : <><Upload className="mr-1.5 h-3 w-3" /> Upload images</>}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files
            if (files) Array.from(files).forEach(f => handleUpload(f))
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-6 w-6 mx-auto mb-2" />
            <p className="text-xs">No assets yet</p>
            <p className="text-[10px] mt-1">Upload photos to use on your website</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logos.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Logos</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {logos.map(asset => (
                    <div key={asset.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => onInsertImage(asset.url)}
                        className="w-full aspect-square rounded-lg border bg-white p-2 flex items-center justify-center hover:border-brand/60 transition-colors"
                        title="Click to insert"
                        data-testid={`asset-insert-${asset.id}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.url} alt="" className="max-h-full max-w-full object-contain" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(asset.id)}
                        className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white"
                        data-testid={`asset-delete-${asset.id}`}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {photos.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Photos</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {photos.map(asset => (
                    <div key={asset.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => onInsertImage(asset.url)}
                        className="w-full aspect-square rounded-lg border overflow-hidden hover:border-brand/60 transition-colors"
                        title="Click to insert"
                        data-testid={`asset-insert-${asset.id}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.url} alt={asset.label ?? ""} className="h-full w-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(asset.id)}
                        className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white"
                        data-testid={`asset-delete-${asset.id}`}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
