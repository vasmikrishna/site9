import { MarketingHeader } from "@/components/public/marketing-header"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main>{children}</main>
    </>
  )
}
