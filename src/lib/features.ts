export const FEATURES = {
  pageBuilder: true,
  blog: true,
  ecommerce: false,
  bookings: false,
  social: false,
  surveys: false,
  portfolio: false,
  // Agency/CRM modules — off for the self-serve Site9 website builder.
  projects: false,
  clients: false,
  employees: false,
  payments: false,
} as const

export type FeatureKey = keyof typeof FEATURES
