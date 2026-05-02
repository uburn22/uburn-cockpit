import { format } from "date-fns";
import type {
  Order,
  DailyRevenue,
  ShopifyData,
  DateRange,
} from "../types";
import { PRODUCTS } from "@/lib/constants";

const STORE = process.env.SHOPIFY_STORE!;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;
const API_VERSION = "2025-04";
const ENDPOINT = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

interface GqlResponse<T> {
  data: T;
  errors?: { message: string }[];
}

async function shopifyGql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }

  const json: GqlResponse<T> = await res.json();
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL: ${json.errors.map((e) => e.message).join(", ")}`);
  }
  return json.data;
}

// ─── Queries ────────────────────────────────────────────

const ORDERS_QUERY = `
  query OrdersInRange($query: String!, $cursor: String) {
    orders(first: 100, query: $query, after: $cursor, sortKey: CREATED_AT) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          createdAt
          totalPriceSet {
            shopMoney {
              amount
            }
          }
          lineItems(first: 5) {
            edges {
              node {
                title
                quantity
                variant {
                  id
                }
                product {
                  id
                }
              }
            }
          }
          customer {
            id
            numberOfOrders
          }
        }
      }
    }
  }
`;

interface GqlOrderNode {
  id: string;
  name: string;
  createdAt: string;
  totalPriceSet: { shopMoney: { amount: string } };
  lineItems: {
    edges: {
      node: {
        title: string;
        quantity: number;
        variant: { id: string } | null;
        product: { id: string } | null;
      };
    }[];
  };
  customer: { id: string; numberOfOrders: number } | null;
}

interface OrdersResponse {
  orders: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: { node: GqlOrderNode }[];
  };
}

// ─── Fetch all orders in range with pagination ──────────

async function fetchAllOrders(range: DateRange): Promise<GqlOrderNode[]> {
  const since = format(range.from, "yyyy-MM-dd");
  const until = format(range.to, "yyyy-MM-dd");
  const queryFilter = `created_at:>='${since}' created_at:<='${until}' financial_status:paid`;

  const allOrders: GqlOrderNode[] = [];
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext) {
    const result: OrdersResponse = await shopifyGql<OrdersResponse>(ORDERS_QUERY, {
      query: queryFilter,
      cursor,
    });

    for (const edge of result.orders.edges) {
      allOrders.push(edge.node);
    }

    hasNext = result.orders.pageInfo.hasNextPage;
    cursor = result.orders.pageInfo.endCursor;

    // Safety: max 10 pages (1000 orders)
    if (allOrders.length > 1000) break;
  }

  return allOrders;
}

// ─── Transform to ShopifyData ───────────────────────────

function classifyProduct(title: string): { id: string; name: string } {
  const lower = title.toLowerCase();
  if (lower.includes("rapid") || lower.includes("270")) {
    return { id: "rapid-270g", name: PRODUCTS.RAPID.name };
  }
  return { id: "classic-90g", name: PRODUCTS.CLASSIC.name };
}

export async function getRealShopifyData(range: DateRange): Promise<ShopifyData> {
  const rawOrders = await fetchAllOrders(range);

  const seenCustomers = new Set<string>();
  const orders: Order[] = [];
  const dailyMap = new Map<string, { revenue: number; orders: number }>();

  for (const raw of rawOrders) {
    const date = format(new Date(raw.createdAt), "yyyy-MM-dd");
    const revenue = parseFloat(raw.totalPriceSet.shopMoney.amount);
    const customerId = raw.customer?.id || `unknown_${raw.id}`;
    const isRepeat = raw.customer ? raw.customer.numberOfOrders > 1 : seenCustomers.has(customerId);
    seenCustomers.add(customerId);

    // First line item determines product (most orders are single-product)
    const firstItem = raw.lineItems.edges[0]?.node;
    const product = firstItem ? classifyProduct(firstItem.title) : { id: "unknown", name: "Unknown" };
    const quantity = firstItem?.quantity || 1;

    orders.push({
      id: raw.id,
      date,
      productId: product.id,
      productName: product.name,
      revenue,
      quantity,
      customerId,
      isRepeat,
    });

    const existing = dailyMap.get(date) || { revenue: 0, orders: 0 };
    existing.revenue += revenue;
    existing.orders += 1;
    dailyMap.set(date, existing);
  }

  // Build daily revenue array sorted by date
  const dailyRevenue: DailyRevenue[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      revenue: Math.round(d.revenue * 100) / 100,
      orders: d.orders,
      aov: d.orders > 0 ? Math.round((d.revenue / d.orders) * 100) / 100 : 0,
    }));

  const totalRevenue = orders.reduce((s, o) => s + o.revenue, 0);
  const totalOrders = orders.length;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const ordersToday = dailyMap.get(todayStr)?.orders || 0;

  // Product split
  const classicOrders = orders.filter((o) => o.productId === "classic-90g");
  const rapidOrders = orders.filter((o) => o.productId === "rapid-270g");

  // Estimate sessions from GA4 or fallback to ~2% CR
  const estimatedSessions = totalOrders > 0 ? totalOrders / 0.02 : 1;

  return {
    orders,
    dailyRevenue,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders,
    aov: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
    conversionRate: totalOrders / estimatedSessions,
    ordersToday,
    productSplit: [
      {
        name: PRODUCTS.CLASSIC.name,
        revenue: Math.round(classicOrders.reduce((s, o) => s + o.revenue, 0) * 100) / 100,
        orders: classicOrders.length,
      },
      {
        name: PRODUCTS.RAPID.name,
        revenue: Math.round(rapidOrders.reduce((s, o) => s + o.revenue, 0) * 100) / 100,
        orders: rapidOrders.length,
      },
    ],
  };
}
