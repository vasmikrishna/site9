import Link from "next/link"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Check } from "lucide-react"

export const metadata: Metadata = {
  title: "Pricing | Site9",
  description: "Simple, honest pricing. Get your business online for just ₹9/month. No setup fees, cancel anytime.",
  alternates: { canonical: "/pricing" },
}

const PRICING = [
  {
    name: "Starter",
    price: "₹9",
    period: "/month",
    tagline: "Get your business online",
    features: ["1 website", "Free yourbusiness.site9.in subdomain", "Mobile responsive", "Business profile", "WhatsApp button", "Contact form"],
    available: true,
  },
  {
    name: "Business",
    price: "₹99",
    period: "/month",
    tagline: "Stand out and get found",
    features: ["Everything in Starter", "Image gallery", "Google Maps", "SEO ready", "AI content generation", "Analytics", "No Site9 badge"],
    available: false,
  },
  {
    name: "Pro",
    price: "₹999",
    period: "/month",
    tagline: "Your own brand and domain",
    features: ["Everything in Business", "Custom domain (yourbusiness.com)", "Multi-page website", "Premium templates", "Priority support"],
    available: false,
  },
]

export default function PricingPage() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Simple, honest pricing</h1>
          <p className="text-muted-foreground mt-3 text-lg">Get online for just ₹9/month. No setup fees, cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {PRICING.map((plan) => (
            <Card key={plan.name} className={plan.available ? "border-foreground shadow-lg" : ""}>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                  {plan.available
                    ? <Badge variant="brand" className="text-xs">Available now</Badge>
                    : <Badge variant="outline" className="text-xs">Coming soon</Badge>}
                </div>
                <p className="text-muted-foreground text-sm">{plan.tagline}</p>
                <div>
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <div className="space-y-2">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      {feat}
                    </div>
                  ))}
                </div>
                {plan.available ? (
                  <Button asChild variant="brand" size="sm" className="w-full" data-testid={`plan-${plan.name.toLowerCase()}-cta`}>
                    <Link href="/start">Create your website <ArrowRight className="h-3 w-3" /></Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled data-testid={`plan-${plan.name.toLowerCase()}-cta`}>
                    Coming soon
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
