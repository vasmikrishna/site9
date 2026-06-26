import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { createClient } from "@supabase/supabase-js"
import { FEATURES } from "@/lib/features"

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required")
}
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET)
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "site9.in"

const tenantCache = new Map<string, { id: string; ts: number }>()
const domainCache = new Map<string, { slug: string; id: string; ts: number } | null>()
const CACHE_TTL = 60_000

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function getTenantIdForSlug(slug: string): Promise<string | null> {
  const cached = tenantCache.get(slug)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.id

  const sb = getSupabase()
  if (!sb) return null

  try {
    const { data } = await sb.from("tenants").select("id").eq("slug", slug).eq("status", "active").maybeSingle()
    if (data?.id) {
      tenantCache.set(slug, { id: data.id, ts: Date.now() })
      return data.id
    }
  } catch { /* ignore */ }
  return null
}

async function getTenantByCustomDomain(domain: string): Promise<{ slug: string; id: string } | null> {
  const cached = domainCache.get(domain)
  if (cached !== undefined && (cached === null || Date.now() - cached.ts < CACHE_TTL)) {
    return cached
  }

  const sb = getSupabase()
  if (!sb) return null

  try {
    const { data } = await sb
      .from("tenants")
      .select("id, slug")
      .eq("custom_domain", domain)
      .eq("domain_verified", true)
      .eq("status", "active")
      .maybeSingle()
    if (data?.id) {
      const entry = { slug: data.slug, id: data.id, ts: Date.now() }
      domainCache.set(domain, entry)
      return entry
    }
  } catch { /* ignore */ }
  domainCache.set(domain, null)
  return null
}

async function getSessionFromRequest(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SECRET)
    return payload as any
  } catch {
    return null
  }
}

async function extractTenantSlug(req: NextRequest): Promise<string> {
  const host = req.headers.get("host") ?? "localhost"
  const cleanHost = host.split(":")[0]

  if (cleanHost.endsWith(`.${BASE_DOMAIN}`)) {
    return cleanHost.slice(0, cleanHost.length - BASE_DOMAIN.length - 1)
  }

  if (cleanHost.endsWith(".localhost") && cleanHost !== "localhost") {
    return cleanHost.slice(0, cleanHost.lastIndexOf(".localhost"))
  }

  if (cleanHost !== "localhost" && cleanHost !== "127.0.0.1" && cleanHost !== BASE_DOMAIN) {
    const tenant = await getTenantByCustomDomain(cleanHost)
    if (tenant) return tenant.slug
  }

  const devTenant = req.cookies.get("dev_tenant")?.value
  if (devTenant) return devTenant

  return process.env.TENANT_SLUG ?? "site9"
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const session = await getSessionFromRequest(req)
  const tenantSlug = await extractTenantSlug(req)

  const res = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(req.headers.entries()),
        "x-tenant-slug": tenantSlug,
      }),
    },
  })
  res.headers.set("x-tenant-slug", tenantSlug)

  if (!FEATURES.pageBuilder && (path.startsWith("/admin/pages") || path.startsWith("/p/"))) {
    return NextResponse.redirect(new URL(path.startsWith("/admin") ? "/admin/dashboard" : "/", req.url))
  }
  if (!FEATURES.blog && (path.startsWith("/admin/blog") || path.startsWith("/blog"))) {
    return NextResponse.redirect(new URL(path.startsWith("/admin") ? "/admin/dashboard" : "/", req.url))
  }

  if (path.startsWith("/superadmin")) {
    const SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL
    if (!session || session.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  const isProtected = path.startsWith("/admin")

  if (session && isProtected && session.tenant_id && session.id !== "admin") {
    const currentTenantId = await getTenantIdForSlug(tenantSlug)
    if (currentTenantId && session.tenant_id !== currentTenantId) {
      const redirect = NextResponse.redirect(new URL("/login", req.url))
      const cookieDomain =
        process.env.NODE_ENV === "production" ? `.${BASE_DOMAIN}` : undefined
      redirect.cookies.set("session", "", {
        httpOnly: true,
        maxAge: 0,
        path: "/",
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      })
      return redirect
    }
  }

  if (!session && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (session && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url))
  }

  if (session && path.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url))
  }

  return res
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/superadmin/:path*",
    "/login",
    "/register",
    "/api/:path*",
    "/p/:path*",
    "/sitemap.xml",
    "/robots.txt",
    "/about",
    "/services",
    "/work/:path*",
    "/contact",
    "/pricing",
    "/open-source",
    "/templates/:path*",
  ],
}
