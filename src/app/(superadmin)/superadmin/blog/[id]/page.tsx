export const dynamic = "force-dynamic"
import { createClient } from "@/lib/supabase/server"
import { BlogForm } from "@/app/(admin)/admin/blog/blog-form"

export default async function SuperAdminEditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Cover-image uploads need the owning site; look it up for this post.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data: post } = await supabase.from("blog_posts").select("tenant_id").eq("id", id).single()
  const tenantId = post?.tenant_id ?? ""

  return (
    <BlogForm
      mode="edit"
      id={id}
      apiBase="/api/superadmin/blog"
      listHref="/superadmin/blog"
      uploadUrl={`/api/superadmin/blog/upload?tenant_id=${tenantId}`}
    />
  )
}
