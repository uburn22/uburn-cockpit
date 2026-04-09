// ─── Shared ──────────────────────────────────────────
export interface DateRange {
  from: Date;
  to: Date;
}

// ─── Shopify ─────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  price: number;
  margin: number;
}

export interface Order {
  id: string;
  date: string; // ISO date
  productId: string;
  productName: string;
  revenue: number;
  quantity: number;
  customerId: string;
  isRepeat: boolean;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
  aov: number;
}

export interface ShopifyData {
  orders: Order[];
  dailyRevenue: DailyRevenue[];
  totalRevenue: number;
  totalOrders: number;
  aov: number;
  conversionRate: number;
  ordersToday: number;
  productSplit: { name: string; revenue: number; orders: number }[];
}

// ─── Meta Ads ────────────────────────────────────────
export interface AdCreative {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
}

export interface DailyAdMetrics {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpo: number;
  hookRate: number;
  frequency: number;
}

export interface CreativeMetrics {
  creative: AdCreative;
  totals: DailyAdMetrics;
  daily: DailyAdMetrics[];
}

export interface MetaAdsData {
  creatives: CreativeMetrics[];
  dailySpend: { date: string; spend: number }[];
  blendedRoas: number;
  averageCpo: number;
  totalSpend: number;
  averageCtr: number;
  funnel: {
    impressions: number;
    hookRate: number;
    clicks: number;
    ctr: number;
    atc: number;
    atcRate: number;
    checkouts: number;
    checkoutRate: number;
    purchases: number;
    conversionRate: number;
  };
}

// ─── GA4 ─────────────────────────────────────────────
export interface TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  percentage: number;
}

export interface DailySessions {
  date: string;
  sessions: number;
  newUsers: number;
  returningUsers: number;
}

export interface GA4Data {
  totalSessions: number;
  newVsReturning: { new: number; returning: number };
  sources: TrafficSource[];
  daily: DailySessions[];
}

// ─── Audience ────────────────────────────────────────
export interface CohortRow {
  cohortWeek: string; // "2026-W10"
  totalCustomers: number;
  retention: number[]; // % for each subsequent week
}

export interface AudienceData {
  repeatRate: number;
  ltv30: number;
  ltv60: number;
  ltv90: number;
  cac: number;
  newVsReturning: { new: number; returning: number };
  cohorts: CohortRow[];
  cacTrend: { date: string; cac: number }[];
}

// ─── Signals ─────────────────────────────────────────
export type AlertSeverity = "critical" | "warning" | "success";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  action: string;
}

export interface SignalsData {
  alerts: Alert[];
  priorityActions: { rank: number; action: string; reason: string }[];
}

// ─── Sendcloud ───────────────────────────────────────
export interface Parcel {
  id: number;
  trackingNumber: string;
  orderNumber: string;
  status: string;
  carrier: string;
  createdAt: string;
  updatedAt: string;
  weight: number;
  country: string;
}

export interface DailyShipments {
  date: string;
  shipped: number;
  delivered: number;
}

export interface SendcloudData {
  parcels: Parcel[];
  totalShipped: number;
  totalDelivered: number;
  deliveryRate: number;
  avgDeliveryDays: number;
  dailyShipments: DailyShipments[];
  carrierSplit: { name: string; count: number }[];
}
