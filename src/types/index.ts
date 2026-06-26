export type UserRole = "admin"
export type DefaultServiceTier = "starter" | "standard" | "pro"
export type ServiceTier = DefaultServiceTier | (string & {})
export type QuestionType = "text" | "textarea" | "select" | "checkbox" | "file" | "industry"

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: UserRole
  created_at: string
  job_title?: string
  phone?: string
  bio?: string
  status?: "active" | "inactive"
}

export interface IntakeQuestion {
  id: string
  service_tier: ServiceTier
  label: string
  type: QuestionType
  options?: string[]
  required: boolean
  sort_order: number
  active: boolean
}

export interface IntakeResponse {
  id: string
  project_id: string
  question_id: string
  answer: string
  file_urls?: string[]
  question?: IntakeQuestion
}

export interface PortfolioItem {
  id: string
  title: string
  description?: string
  service_tier?: ServiceTier
  tags?: string[]
  image_url: string
  live_url?: string
  visible: boolean
  sort_order: number
  created_at: string
}

export interface Service {
  id: string
  tier: ServiceTier
  name: string
  tagline: string
  description: string
  price_label: string
  features: string[]
  active: boolean
}

// ── Builder Content Management Types ────────────────────────────────────────

export type ContentStatus = "draft" | "approved" | "archived"

export type SectionType =
  | "hero"
  | "about"
  | "services"
  | "testimonials"
  | "pricing"
  | "faq"
  | "team"
  | "gallery"
  | "cta"
  | "footer"
  | "contact"

export interface SectionTemplate {
  id: string
  name: string
  section_type: SectionType
  description: string
  html: string
  css: string
  preview_url: string | null
  tags: string[]
  sort_order: number
  status: ContentStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ColorPaletteColors {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  muted: string
}

export interface ReferenceSite {
  id: string
  name: string
  description: string
  industry: string
  html: string
  css: string
  thumbnail_url: string | null
  sort_order: number
  status: ContentStatus
  created_by: string | null
  created_at: string
  updated_at: string
  source?: "reference" | "gallery"
  style?: string
}

export interface ColorPalette {
  id: string
  name: string
  colors: ColorPaletteColors
  industry: string
  sort_order: number
  status: ContentStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── Page Builder Types ───────────────────────────────────────────────────────

export type CustomPageStatus = "draft" | "published"

export interface CustomPage {
  id: string
  tenant_id?: string | null
  slug: string
  title: string
  html: string
  css: string
  template: string
  status: CustomPageStatus
  is_homepage: boolean
  created_at: string
  updated_at?: string
}

export type BlogPostStatus = "draft" | "published"

export interface BlogPost {
  id: string
  tenant_id?: string | null
  slug: string
  title: string
  excerpt: string
  content_html: string
  content_json?: unknown
  cover_image_url?: string | null
  author_name?: string | null
  status: BlogPostStatus
  published_at?: string | null
  created_at: string
  updated_at?: string
}

// ── Gallery Template Types ──────────────────────────────────────────────────

export type TemplateCategory =
  | "landing" | "portfolio" | "business" | "coming-soon"
  | "blog" | "saas" | "ecommerce" | "event" | "personal" | "other"

export type TemplateStyle =
  | "modern" | "minimal" | "bold" | "warm"
  | "elegant" | "playful" | "corporate" | "dark"

export interface GalleryTemplate {
  id: string
  name: string
  slug: string
  description: string
  category: TemplateCategory
  industry: string
  style: TemplateStyle
  html: string
  css: string
  preview_url: string | null
  tags: string[]
  sort_order: number
  status: ContentStatus
  featured: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type GalleryTemplateMeta = Omit<GalleryTemplate, "html" | "css">
