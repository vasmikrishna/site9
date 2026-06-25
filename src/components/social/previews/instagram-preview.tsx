"use client"

import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react"

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

interface InstagramPreviewProps {
  draft: PreviewDraft
}

export function InstagramPreview({ draft }: InstagramPreviewProps) {
  const fullText =
    draft.caption +
    (draft.hashtags.length > 0
      ? "\n\n" +
        draft.hashtags
          .map((h) => (h.startsWith("#") ? h : `#${h}`))
          .join(" ")
      : "")

  const firstImage = draft.media_urls[0] ?? null

  const renderCaption = (text: string) =>
    text.split(/(\s#\w+|^#\w+)/gm).map((part, i) =>
      part.trim().startsWith("#") ? (
        <span key={i} className="text-sky-600 font-medium">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    )

  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="relative shrink-0">
          {/* IG story ring gradient */}
          <div className="h-9 w-9 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
            {draft.account?.avatar_url ? (
              <img
                src={draft.account.avatar_url}
                alt={draft.account.name}
                className="h-full w-full rounded-full object-cover border-2 border-white"
              />
            ) : (
              <div className="h-full w-full rounded-full bg-gradient-to-br from-pink-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                {(draft.account?.name ?? "U")[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-none">
            {draft.account?.username
              ? draft.account.username.replace(/^@/, "")
              : draft.account?.name ?? "your_account"}
          </p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-gray-600 shrink-0" />
      </div>

      {/* Image */}
      <div className="aspect-square w-full bg-gray-100">
        {firstImage ? (
          <img
            src={firstImage}
            alt="Post"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-200">
            <div className="text-4xl mb-2">🖼</div>
            <p className="text-xs text-gray-400">No image uploaded</p>
          </div>
        )}
      </div>

      {/* Action Row */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Heart className="h-6 w-6 text-gray-800 cursor-pointer hover:text-red-500 transition-colors" />
            <MessageCircle className="h-6 w-6 text-gray-800 cursor-pointer" />
            <Send className="h-6 w-6 text-gray-800 cursor-pointer" />
          </div>
          <Bookmark className="h-6 w-6 text-gray-800 cursor-pointer" />
        </div>
      </div>

      {/* Likes */}
      <div className="px-3 pb-1">
        <p className="text-sm font-semibold text-gray-900">128 likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-sm text-gray-900 leading-snug">
          <span className="font-semibold mr-1">
            {draft.account?.username
              ? draft.account.username.replace(/^@/, "")
              : draft.account?.name ?? "your_account"}
          </span>
          {fullText ? (
            renderCaption(fullText)
          ) : (
            <span className="text-gray-400 italic">Your caption will appear here…</span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-1.5">Just now</p>
      </div>
    </div>
  )
}
