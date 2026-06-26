export interface PortfolioProject {
  slug: string
  title: string
  shortDescription: string
  longDescription: string
  category: string
  emoji: string
  bg: string
  cover?: string
  live_url?: string
  metrics?: Array<{ label: string; value: string }>
  description: string[]
  tags: string[]
}

export const PORTFOLIO_SEED: PortfolioProject[] = []

export function getProjectBySlug(slug: string): PortfolioProject | undefined {
  return PORTFOLIO_SEED.find(p => p.slug === slug)
}
