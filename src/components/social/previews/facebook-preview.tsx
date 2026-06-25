"use client"

import { ThumbsUp, MessageSquare, Share2, Globe } from "lucide-react"

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

interface FacebookPreviewProps {
  draft: PreviewDraft
}

export function FacebookPreview({ draft }: FacebookPreviewProps) {
  const firstImage = draft.media_urls[0] ?? null

  const hashtagStr =
    draft.hashtags.length > 0
      ? "\n\n" +
        draft.hashtags
          .map((h) => (h.startsWith("#") ? h : `#${h}`))
          .join(" ")
      : ""

  const fullText = draft.caption + hashtagStr

  const renderText = (text: string) =>
    text.split(/(\s#\w+|^#\w+)/gm).map((part, i) =>
      part.trim().startsWith("#") ? (
        <span key={i} className="text-blue-700 cursor-pointer hover:underline font-medium">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    )

  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="shrink-0">
          {draft.account?.avatar_url ? (
            <img
              src={draft.account.avatar_url}
              alt={draft.account.name}
              className="h-10 w-10 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-sm font-bold">
              {(draft.account?.name ?? "P")[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">
            {draft.account?.name ?? "Your Page"}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="text-xs text-gray-500">Just now · </p>
            <Globe className="h-3 w-3 text-gray-500" />
          </div>
        </div>
        <div className="text-gray-400 text-lg font-bold cursor-pointer">···</div>
      </div>

      {/* Caption (above image, FB style) */}
      {fullText && (
        <div className="px-4 pb-3 text-sm text-gray-900 leading-snug">
          {renderText(fullText)}
        </div>
      )}
      {!fullText && (
        <div className="px-4 pb-3 text-sm text-gray-400 italic">
          Your caption will appear here…
        </div>
      )}

      {/* Image */}
      {firstImage ? (
        <div className="w-full bg-gray-100">
          <img
            src={firstImage}
            alt="Post"
            className="w-full object-cover max-h-72"
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-gray-50 flex flex-col items-center justify-center border-y border-gray-100">
          <div className="text-4xl mb-2">🖼</div>
          <p className="text-xs text-gray-400">No image uploaded</p>
        </div>
      )}

      {/* Reactions summary */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <span className="flex -space-x-1">
            <span className="h-4 w-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[8px]">👍</span>
            <span className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px]">❤️</span>
          </span>
          <span className="ml-1">47</span>
        </div>
        <div className="flex items-center gap-2">
          <span>12 comments</span>
          <span>5 shares</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center divide-x divide-gray-100 px-2 py-1">
        {[
          { icon: ThumbsUp, label: "Like" },
          { icon: MessageSquare, label: "Comment" },
          { icon: Share2, label: "Share" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors rounded-lg"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
