import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { createClient } from "@supabase/supabase-js"
import { FEATURES } from "@/lib/features"

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required")
}
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET)
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "site9.in"

const domainCache = new Map<string, { slug: string; id: string; ts: number } | null>()
const CACHE_TTL = 60_000

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
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

const tenantSlugByIdCache = new Map<string, { slug: string; ts: number }>()

/** Resolve a tenant's slug by id (for active-site → tenant header override). */
async function getSlugForTenantId(id: string): Promise<string | null> {
  const cached = tenantSlugByIdCache.get(id)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.slug
  const sb = getSupabase()
  if (!sb) return null
  try {
    const { data } = await sb.from("tenants").select("slug").eq("id", id).maybeSingle()
    if (data?.slug) {
      tenantSlugByIdCache.set(id, { slug: data.slug, ts: Date.now() })
      return data.slug
    }
  } catch { /* ignore */ }
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

// Auth/management routes that only ever live on the apex (site9.in). Tenant
// hosts (subdomains + custom domains) are public-only.
const MANAGEMENT_PREFIXES = ["/login", "/register", "/admin", "/dashboard", "/account", "/build", "/start", "/superadmin"]

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const session = await getSessionFromRequest(req)
  let tenantSlug = await extractTenantSlug(req)

  // Owner/admin context runs on the apex but operates on the user's ACTIVE
  // site. Override the tenant header so all tenant-scoped server code
  // (getCurrentTenant) targets that site, not the apex's default tenant.
  if (
    session?.tenant_id &&
    session.id !== "admin" &&
    (path.startsWith("/admin") || path.startsWith("/api/admin") || path.startsWith("/api/billing"))
  ) {
    const activeSlug = await getSlugForTenantId(session.tenant_id)
    if (activeSlug) tenantSlug = activeSlug
  }

  // ── Tenant hosts are public-only: bounce auth/management to the apex ──────
  const cleanHost = (req.headers.get("host") ?? "").split(":")[0].toLowerCase()
  const isTenantHost =
    (cleanHost.endsWith(`.${BASE_DOMAIN}`) && cleanHost !== `www.${BASE_DOMAIN}`) ||
    (!cleanHost.endsWith(BASE_DOMAIN) &&
      cleanHost !== "localhost" &&
      cleanHost !== "127.0.0.1" &&
      !cleanHost.endsWith(".localhost"))
  const isManagementPath = MANAGEMENT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
  if (isTenantHost && isManagementPath) {
    return NextResponse.redirect(new URL(`https://${BASE_DOMAIN}${path}${req.nextUrl.search}`))
  }

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

  const isProtected =
    path.startsWith("/admin") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/account") ||
    path.startsWith("/build")

  if (!session && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (session && (path === "/login" || path === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return res
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/superadmin/:path*",
    "/dashboard/:path*",
    "/account/:path*",
    "/build/:path*",
    "/start",
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
