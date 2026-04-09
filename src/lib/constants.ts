// Uburn business thresholds & targets

export const PRODUCTS = {
  CLASSIC: { name: "Classic 90g", price: 34.7, margin: 25.49, marginPct: 0.73 },
  RAPID: { name: "Rapid 270g", price: 54.7, margin: 36.67, marginPct: 0.67 },
} as const;

export const TARGETS = {
  ordersPerDay: 100,
  monthlyRevenue: 35000,
  cpaTarget: 18,
  cpaMax: 25,
  roasTarget: 3,
  ltv: 55,
} as const;

export const FUNNEL_THRESHOLDS = {
  hookRate: { target: 0.25, alert: 0.15 },
  ctr: { target: 0.015, alert: 0.008 },
  bounceRate: { target: 0.6, alert: 0.7 },
  atcRate: { target: 0.08, alert: 0.04 },
  checkoutRate: { target: 0.5, alert: 0.3 },
  conversionRate: { target: 0.02, alert: 0.01 },
  frequency: { target: 3, alert: 3.5 },
} as const;

export const ALERT_RULES = {
  creativeFatigueFrequency: 3,
  budgetBurnedThreshold: 20,
  lowRoasThreshold: 2,
  lowRoasConsecutiveDays: 3,
  cpaAboveTarget: 25,
  scalingOpportunityRoas: 3,
  scalingOpportunityDays: 3,
  ctrDropThreshold: 0.008,
} as const;

export const COLORS = {
  primary: "#7C3AED",
  primaryLight: "#8B5CF6",
  primaryDark: "#6D28D9",
  primaryMuted: "rgba(124, 58, 237, 0.12)",
  background: "#FFFFFF",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  green: "#22C55E",
  red: "#EF4444",
  orange: "#F59E0B",
} as const;

export const META_ACCOUNT_ID = "act_818944730982350";

export const CREATIVES = [
  "UGC Top Performer",
  "Video Coconut",
  "Femmes Healthy v2",
  "Meilleur Ube",
  "Routine UBE",
] as const;
