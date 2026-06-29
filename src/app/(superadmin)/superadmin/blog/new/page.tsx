export const dynamic = "force-dynamic"
import { redirect } from "next/navigation"
import { BlogForm } from "@/app/(admin)/admin/blog/blog-form"

export default async function SuperAdminNewBlogPostPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>
}) {
  const { tenant } = await searchParams
  // A post must belong to a site — bounce back to the picker if none was chosen.
  if (!tenant) redirect("/superadmin/blog")

  return (
    <BlogForm
      mode="create"
      apiBase="/api/superadmin/blog"
      tenantId={tenant}
      listHref="/superadmin/blog"
      uploadUrl={`/api/superadmin/blog/upload?tenant_id=${tenant}`}
    />
  )
}
