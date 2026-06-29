export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { BlogModeration } from "./blog-moderation"

export default async function SuperAdminBlogPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data: tenants } = await supabase.from("tenants").select("id,name,slug").order("name")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Blogs</h1>
        <p className="text-muted-foreground mt-1">Pick a site to create and manage its blog posts</p>
      </div>
      <BlogModeration tenants={tenants ?? []} />
    </div>
  )
}
