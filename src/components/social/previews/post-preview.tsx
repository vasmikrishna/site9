"use client"

import { InstagramPreview } from "./instagram-preview"
import { FacebookPreview } from "./facebook-preview"
import { XPreview } from "./x-preview"
import { LinkedInPreview } from "./linkedin-preview"

export interface PreviewDraft {
  caption: string
  hashtags: string[]
  media_urls: string[]
  account?: {
    name: string
    username: string
    avatar_url: string | null
  }
}

export type PreviewPlatform = "instagram" | "facebook" | "x" | "linkedin"

interface PostPreviewProps {
  platform: PreviewPlatform
  draft: PreviewDraft
}

export function PostPreview({ platform, draft }: PostPreviewProps) {
  switch (platform) {
    case "instagram":
      return <InstagramPreview draft={draft} />
    case "facebook":
      return <FacebookPreview draft={draft} />
    case "x":
      return <XPreview draft={draft} />
    case "linkedin":
      return <LinkedInPreview draft={draft} />
    default:
      return <InstagramPreview draft={draft} />
  }
}
