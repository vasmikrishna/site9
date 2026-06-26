import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const supabaseConfigured = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default async function AdminDashboard() {
  let pageCount = 0
  let blogPostCount = 0
  let enquiryCount = 0

  if (supabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = createClient()
    const [{ count: pages }, { count: posts }, { count: enquiries }] = await Promise.all([
      supabase.from("custom_pages").select("*", { count: "exact", head: true }),
      supabase.from("blog_posts").select("*", { count: "exact", head: true }),
      supabase.from("enquiries").select("*", { count: "exact", head: true }),
    ])
    pageCount = pages ?? 0
    blogPostCount = posts ?? 0
    enquiryCount = enquiries ?? 0
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of all activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{pageCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{blogPostCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Blog posts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold">{enquiryCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Enquiries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button asChild variant="outline" className="justify-between">
          <Link href="/admin/pages">Manage pages <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href="/admin/blog">Manage blog <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button asChild variant="outline" className="justify-between">
          <Link href="/admin/enquiries">View enquiries <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  )
}
