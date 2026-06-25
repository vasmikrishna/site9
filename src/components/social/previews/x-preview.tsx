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

interface XPreviewProps {
  draft: PreviewDraft
}

export function XPreview({ draft }: XPreviewProps) {
  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border border-gray-200 bg-white shadow-sm p-5 font-sans">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center text-white font-bold text-sm shrink-0">
          X
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{draft.account?.name ?? "Your Account"}</p>
          <p className="text-xs text-gray-500">@{draft.account?.username?.replace(/^@/, "") ?? "handle"}</p>
        </div>
      </div>
      <p className="text-sm text-gray-900 leading-relaxed">
        {draft.caption || <span className="text-gray-400 italic">Your post will appear here…</span>}
        {draft.hashtags.length > 0 && (
          <span className="text-blue-500 ml-1">
            {draft.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
          </span>
        )}
      </p>
      {draft.media_urls[0] && (
        <img src={draft.media_urls[0]} alt="Post" className="mt-3 w-full rounded-xl object-cover max-h-48" />
      )}
      <p className="text-xs text-gray-400 mt-2">Just now · X (stub preview)</p>
    </div>
  )
}
