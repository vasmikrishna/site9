import { SocialClient } from "./social-client"

export default function AdminSocialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Social</h1>
        <p className="text-muted-foreground mt-1">
          Connect accounts, schedule posts, and let AI draft content
        </p>
      </div>
      <SocialClient />
    </div>
  )
}
