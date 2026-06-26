"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, GripVertical, Eye, EyeOff, Trash2 } from "lucide-react"
import type { IntakeQuestion, Service, ServiceTier } from "@/types"

const TYPES = ["text", "textarea", "select", "checkbox", "file", "industry"] as const

const TYPE_LABELS: Record<string, string> = {
  text: "Short text",
  textarea: "Long text",
  select: "Dropdown (custom options)",
  checkbox: "Checkbox",
  file: "File upload",
  industry: "Industry (built-in list)",
}
const DEFAULT_SERVICES: Service[] = [
  { id: "starter", tier: "starter", name: "Starter", tagline: "Your first step online", description: "Clean starter website", price_label: "Custom pricing", features: [], active: true },
  { id: "standard", tier: "standard", name: "Standard", tagline: "A site that works harder", description: "Advanced website", price_label: "Custom pricing", features: [], active: true },
  { id: "pro", tier: "pro", name: "Pro", tagline: "From idea to full product", description: "Full web app", price_label: "Custom pricing", features: [], active: true },
]
const LOCAL_SERVICES_KEY = "site9_custom_services"

function slugifyService(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function readLocalServices() {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_SERVICES_KEY) ?? "[]") as Service[]
  } catch {
    return []
  }
}

function writeLocalServices(services: Service[]) {
  window.localStorage.setItem(LOCAL_SERVICES_KEY, JSON.stringify(services))
}

export default function IntakeConfigPage() {
  const supabase = createClient()
  const [activeTier, setActiveTier] = useState<ServiceTier>("starter")
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES)
  const [questions, setQuestions] = useState<IntakeQuestion[]>([])
  const [adding, setAdding] = useState(false)
  const [addingService, setAddingService] = useState(false)
  const [form, setForm] = useState<{ label: string; type: IntakeQuestion["type"]; options: string; required: boolean }>({ label: "", type: "text", options: "", required: true })
  const [serviceForm, setServiceForm] = useState({ name: "", tier: "", tagline: "", description: "" })
  const [serviceError, setServiceError] = useState("")
  const [loading, setLoading] = useState(true)

  const loadServices = useCallback(async () => {
    const { data } = await supabase.from("services").select("*").order("name")
    const fetched = (data ?? []) as unknown as Service[]
    const local = readLocalServices()
    const merged = [
      ...DEFAULT_SERVICES.filter(defaultService => !fetched.some(service => service.tier === defaultService.tier)),
      ...fetched,
      ...local.filter(localService => !fetched.some(service => service.tier === localService.tier) && !DEFAULT_SERVICES.some(service => service.tier === localService.tier)),
    ].sort((a, b) => a.name.localeCompare(b.name))
    setServices(merged)
  }, [supabase])

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from("intake_questions").select("*").eq("service_tier", activeTier).order("sort_order")
    setQuestions((data ?? []) as unknown as IntakeQuestion[])
    setLoading(false)
  }, [activeTier, supabase])

  useEffect(() => {
    // The form needs to refetch when the selected tier changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadServices()
    void loadQuestions()
  }, [loadQuestions, loadServices])

  async function addQuestion() {
    if (!form.label) return
    const options = form.type === "select" ? form.options.split(",").map(o => o.trim()).filter(Boolean) : null
    const { data } = await supabase.from("intake_questions").insert({
      service_tier: activeTier, label: form.label, type: form.type,
      options: options ?? undefined, required: form.required,
      sort_order: questions.length + 1, active: true
    }).select().single()
    if (data) { setQuestions(prev => [...prev, data as unknown as IntakeQuestion]); setForm({ label: "", type: "text", options: "", required: true }); setAdding(false) }
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("intake_questions").update({ active: !active }).eq("id", id)
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, active: !active } : q))
  }

  async function deleteQuestion(id: string) {
    await supabase.from("intake_questions").delete().eq("id", id)
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  async function addService() {
    const name = serviceForm.name.trim()
    const tier = slugifyService(serviceForm.tier || name)
    if (!name || !tier) return

    setServiceError("")
    const servicePayload = {
      tier,
      name,
      tagline: serviceForm.tagline.trim() || "Custom project type",
      description: serviceForm.description.trim() || "Custom service configured by admin.",
      price_label: "Custom pricing",
      features: [],
      active: true,
    } as never
    const { data, error } = await supabase.from("services").insert(servicePayload).select().single()

    if (error) {
      const service: Service = {
        id: `local-service-${tier}`,
        tier,
        name,
        tagline: serviceForm.tagline.trim() || "Custom project type",
        description: serviceForm.description.trim() || "Custom service configured by admin.",
        price_label: "Custom pricing",
        features: [],
        active: true,
      }
      const localServices = [
        ...readLocalServices().filter(item => item.tier !== service.tier),
        service,
      ]
      writeLocalServices(localServices)
      setServices(prev => [...prev.filter(item => item.tier !== service.tier), service].sort((a, b) => a.name.localeCompare(b.name)))
      setActiveTier(service.tier)
      setServiceForm({ name: "", tier: "", tagline: "", description: "" })
      setAddingService(false)
      setServiceError("")
      return
    }

    if (data) {
      const service = data as unknown as Service
      setServices(prev => [...prev, service])
      setActiveTier(service.tier)
      setServiceForm({ name: "", tier: "", tagline: "", description: "" })
      setAddingService(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intake question configuration</h1>
        <p className="text-muted-foreground mt-1">Configure services and intake questions</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">Project types / services</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Starter, Standard, and Pro stay as defaults. Add more service types for custom project workflows.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddingService(true)}><Plus className="h-3 w-3" /> Add service</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {services.map(service => (
              <button key={service.tier} onClick={() => setActiveTier(service.tier)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors ${activeTier === service.tier ? "bg-foreground text-background" : "border border-border hover:bg-accent"}`}>
                {service.name}
              </button>
            ))}
          </div>
          {addingService && (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5"><Label>Service name *</Label><Input value={serviceForm.name} onChange={e => setServiceForm(p => ({ ...p, name: e.target.value, tier: p.tier || slugifyService(e.target.value) }))} placeholder="e.g. Branding, E-commerce, SEO" /></div>
                <div className="space-y-1.5"><Label>Key / slug *</Label><Input value={serviceForm.tier} onChange={e => setServiceForm(p => ({ ...p, tier: slugifyService(e.target.value) }))} placeholder="e.g. ecommerce" /></div>
              </div>
              <div className="space-y-1.5"><Label>Tagline</Label><Input value={serviceForm.tagline} onChange={e => setServiceForm(p => ({ ...p, tagline: e.target.value }))} placeholder="Short label shown for this service" /></div>
              <div className="space-y-1.5"><Label>Description</Label><Input value={serviceForm.description} onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))} placeholder="What this service covers" /></div>
              {serviceError && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{serviceError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={addService} disabled={!serviceForm.name.trim()}>Add service</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingService(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base capitalize">{activeTier} tier questions</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3 w-3" /> Add question</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
          ) : questions.map((q, idx) => (
            <div key={q.id} className={`flex items-center gap-3 border border-border rounded-lg px-3 py-2.5 ${!q.active ? "opacity-50" : ""}`}>
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground w-5">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{q.label}</p>
                <div className="flex gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-xs">{TYPE_LABELS[q.type] ?? q.type}</Badge>
                  {q.required && <Badge variant="default" className="text-xs">Required</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(q.id, q.active)} className="text-muted-foreground hover:text-foreground p-1">
                  {q.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => deleteQuestion(q.id)} className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {adding && (
            <div className="border border-dashed border-border rounded-lg p-4 space-y-3 mt-2">
              <div className="space-y-1.5"><Label>Question label *</Label><Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. What does your business do?" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as IntakeQuestion["type"] }))}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background">
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Required</Label>
                  <select value={form.required ? "yes" : "no"} onChange={e => setForm(p => ({ ...p, required: e.target.value === "yes" }))}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
              {form.type === "select" && (
                <div className="space-y-1.5"><Label>Options (comma-separated)</Label><Input value={form.options} onChange={e => setForm(p => ({ ...p, options: e.target.value }))} placeholder="Option 1, Option 2, Option 3" /></div>
              )}
              {form.type === "industry" && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 border border-border">
                  Uses the built-in list of 35+ Australian industries (Accounting, Construction, Hospitality, Retail, etc). No options needed — the client sees a searchable dropdown.
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={addQuestion} disabled={!form.label}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {!loading && !questions.length && !adding && (
            <p className="text-sm text-muted-foreground text-center py-6">No questions for this tier yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
