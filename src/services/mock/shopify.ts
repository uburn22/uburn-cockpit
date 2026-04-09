import { format, subDays, differenceInDays } from "date-fns";
import { createRng, seedFromDate, randomInRange, randomInt } from "./seed";
import type {
  Order,
  DailyRevenue,
  ShopifyData,
  DateRange,
} from "../types";
import { PRODUCTS } from "@/lib/constants";

const PRODUCT_LIST = [
  { id: "classic-90g", ...PRODUCTS.CLASSIC },
  { id: "rapid-270g", ...PRODUCTS.RAPID },
];

// Generate realistic customer IDs — ~15% repeat rate
function generateCustomerId(rng: () => number, day: number): string {
  // Repeat customers come from a small pool
  if (rng() < 0.15) {
    return `cust_repeat_${randomInt(rng, 1, 20)}`;
  }
  return `cust_${day}_${randomInt(rng, 1000, 9999)}`;
}

export function getMockShopifyData(range: DateRange): ShopifyData {
  const days = differenceInDays(range.to, range.from) + 1;
  const rng = createRng(seedFromDate(format(range.from, "yyyy-MM-dd")));

  const orders: Order[] = [];
  const dailyRevenue: DailyRevenue[] = [];
  const seenCustomers = new Set<string>();

  for (let d = 0; d < days; d++) {
    const date = format(subDays(range.to, days - 1 - d), "yyyy-MM-dd");
    // Orders per day: base ~3, slight upward trend, some variance
    const baseOrders = 3 + d * 0.03;
    const dayOrders = Math.max(
      1,
      Math.round(baseOrders + randomInRange(rng, -1.5, 2.5))
    );

    let dayRevenue = 0;

    for (let o = 0; o < dayOrders; o++) {
      // 60% Classic, 40% Rapid
      const product = rng() < 0.6 ? PRODUCT_LIST[0] : PRODUCT_LIST[1];
      const quantity = rng() < 0.1 ? 2 : 1; // 10% buy 2
      const revenue = product.price * quantity;
      const customerId = generateCustomerId(rng, d);
      const isRepeat = seenCustomers.has(customerId);
      seenCustomers.add(customerId);

      orders.push({
        id: `order_${date}_${o}`,
        date,
        productId: product.id,
        productName: product.name,
        revenue,
        quantity,
        customerId,
        isRepeat,
      });

      dayRevenue += revenue;
    }

    dailyRevenue.push({
      date,
      revenue: Math.round(dayRevenue * 100) / 100,
      orders: dayOrders,
      aov:
        dayOrders > 0
          ? Math.round((dayRevenue / dayOrders) * 100) / 100
          : 0,
    });
  }

  const totalRevenue = orders.reduce((s, o) => s + o.revenue, 0);
  const totalOrders = orders.length;
  const todayOrders = dailyRevenue[dailyRevenue.length - 1]?.orders ?? 0;

  // Product split
  const classicOrders = orders.filter((o) => o.productId === "classic-90g");
  const rapidOrders = orders.filter((o) => o.productId === "rapid-270g");

  // Simulated sessions for conversion rate (orders / sessions)
  const estimatedSessions = totalOrders / 0.02; // ~2% CR

  return {
    orders,
    dailyRevenue,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders,
    aov:
      totalOrders > 0
        ? Math.round((totalRevenue / totalOrders) * 100) / 100
        : 0,
    conversionRate: totalOrders / estimatedSessions,
    ordersToday: todayOrders,
    productSplit: [
      {
        name: PRODUCTS.CLASSIC.name,
        revenue: Math.round(
          classicOrders.reduce((s, o) => s + o.revenue, 0) * 100
        ) / 100,
        orders: classicOrders.length,
      },
      {
        name: PRODUCTS.RAPID.name,
        revenue: Math.round(
          rapidOrders.reduce((s, o) => s + o.revenue, 0) * 100
        ) / 100,
        orders: rapidOrders.length,
      },
    ],
  };
}
