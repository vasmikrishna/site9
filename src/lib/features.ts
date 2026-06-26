export const FEATURES = {
  pageBuilder: true,
  blog: true,
} as const

export type FeatureKey = keyof typeof FEATURES
