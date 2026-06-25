"use client"

interface PreviewDraft {
  caption: string
  hashtags: string[]
  media_urls: string[]
  account?: {
    name: string
    username: string
    avatar_url: string | null
  }
}

interface LinkedInPreviewProps {
  draft: PreviewDraft
}

export function LinkedInPreview({ draft }: LinkedInPreviewProps) {
  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border border-gray-200 bg-white shadow-sm p-5 font-sans">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-12 w-12 rounded-md bg-[#0077B5] flex items-center justify-center text-white font-bold text-sm shrink-0">
          {(draft.account?.name ?? "L")[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{draft.account?.name ?? "Your Page"}</p>
          <p className="text-xs text-gray-500">Just now · 🌐</p>
        </div>
      </div>
      <p className="text-sm text-gray-900 leading-relaxed">
        {draft.caption || <span className="text-gray-400 italic">Your post will appear here…</span>}
        {draft.hashtags.length > 0 && (
          <span className="text-[#0077B5] ml-1">
            {draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
          </span>
        )}
      </p>
      {draft.media_urls[0] && (
        <img src={draft.media_urls[0]} alt="Post" className="mt-3 w-full rounded-lg object-cover max-h-56" />
      )}
      <p className="text-xs text-gray-400 mt-2">LinkedIn (stub preview)</p>
    </div>
  )
}
