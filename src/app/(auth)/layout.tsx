import { getSiteSettings } from "@/lib/site-settings"
import { SiteHeader, type HeaderAuth } from "@/components/site/header"
import { getSession } from "@/lib/session"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()

  // Session is shared across *.site9.in, so a signed-in visitor still gets the
  // account-aware header here. Super-admin is treated as logged-out for the
  // public chrome, matching the (public) layout.
  const session = await getSession()
  const auth: HeaderAuth | null =
    session && session.id !== "admin"
      ? { name: session.name, email: session.email, role: session.role }
      : null

  const cssVars = `
    :root {
      --site-primary: ${settings.theme_primary};
      --site-secondary: ${settings.theme_secondary};
      --site-accent: ${settings.theme_accent};
      --site-bg: ${settings.theme_bg};
      --site-text: ${settings.theme_text};
    }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      <SiteHeader settings={settings} auth={auth} />
      <main>{children}</main>
    </>
  )
}
