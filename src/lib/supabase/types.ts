import type { IntakeQuestion, IntakeResponse, PortfolioItem, Service, User, CustomPage, GalleryTemplate } from "@/types"

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type BaseRow = { id: string; [key: string]: unknown }

type Table<Row extends BaseRow = BaseRow> = {
  Row: Row
  Insert: { [Key in keyof Row]?: Row[Key] | null }
  Update: { [Key in keyof Row]?: Row[Key] | null }
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      users: Table<User & BaseRow>
      services: Table<Service & BaseRow>
      intake_questions: Table<IntakeQuestion & BaseRow>
      intake_responses: Table<IntakeResponse & BaseRow>
      portfolio_items: Table<PortfolioItem & BaseRow>
      custom_pages: Table<CustomPage & BaseRow>
      page_templates_gallery: Table<GalleryTemplate & BaseRow>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
