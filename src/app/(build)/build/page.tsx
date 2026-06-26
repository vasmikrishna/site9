import { getOwnerContext } from "@/lib/build-owner"
import { subdomainHost, type BusinessDetails } from "@/lib/onboarding"
import { getSubscriptionStatus } from "@/lib/subscription"
import { createClient } from "@/lib/supabase/server"
import { BuildPageClient } from "./build-client"

export default async function BuildPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const owner = await getOwnerContext()
  if (!owner) return null

  const sp = await searchParams
  const saved = ((owner.tenant.settings as any)?.business ?? {}) as BusinessDetails
  const initial: BusinessDetails = { ...saved, name: saved.name || owner.tenant.name }
  const onboardingComplete = !!(owner.tenant as any).onboarding_complete
  const subscription = await getSubscriptionStatus(owner.tenant.id)

  let savedDraftHtml: string | undefined
  if (onboardingComplete && !sp.template) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("custom_pages")
      .select("html, css")
      .eq("tenant_id", owner.tenant.id)
      .eq("is_homepage", true)
      .maybeSingle()

    if (data?.html) {
      savedDraftHtml = data.css
        ? `<style>${data.css}</style>${data.html}`
        : data.html
    }
  }

  return (
    <BuildPageClient
      initialDetails={initial}
      ownerName={owner.session.name}
      host={subdomainHost(owner.tenant.slug)}
      onboardingComplete={onboardingComplete}
      templateSlug={sp.template}
      subscribed={subscription.active}
      savedHtml={savedDraftHtml}
    />
  )
}
