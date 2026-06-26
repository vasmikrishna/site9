export const FEATURES = {
  pageBuilder: true,
  blog: true,
  ecommerce: false,
  bookings: false,
  social: false,
  surveys: false,
  portfolio: false,
} as const

export type FeatureKey = keyof typeof FEATURES
