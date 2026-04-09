import { logAction, getConfig, updateLastRun } from "./base";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

interface ShopifyOrder {
  id: number;
  email: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  customer: { id: number; email: string; orders_count: number; first_name: string };
  line_items: { title: string }[];
}

interface AbandonedCheckout {
  id: number;
  email: string;
  created_at: string;
  total_price: string;
  completed_at: string | null;
  line_items: { title: string }[];
}

async function shopifyGet<T>(path: string): Promise<T> {
  if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) throw new Error("Shopify credentials missing");
  const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/2024-01/${path}`, {
    headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Shopify ${path}: ${res.status}`);
  return res.json();
}

export async function runEmailAgent(): Promise<{ actions: string[] }> {
  const config = await getConfig("email-crm");
  if (!config || !config.enabled) {
    return { actions: ["Agent email-crm disabled"] };
  }

  const actions: string[] = [];

  try {
    // 1. Detect abandoned checkouts (last 24h)
    const abandonedData = await shopifyGet<{ checkouts: AbandonedCheckout[] }>(
      "checkouts.json?status=open&created_at_min=" + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() + "&limit=50"
    ).catch(() => ({ checkouts: [] }));

    const abandonedCount = abandonedData.checkouts.length;
    if (abandonedCount > 0) {
      const totalAbandoned = abandonedData.checkouts.reduce((s, c) => s + parseFloat(c.total_price), 0);
      const msg = `${abandonedCount} paniers abandonnés détectés (${totalAbandoned.toFixed(2)}€ de CA potentiel)`;
      actions.push(msg);

      // Log each abandoned cart
      for (const checkout of abandonedData.checkouts.slice(0, 10)) {
        const products = checkout.line_items.map((i) => i.title).join(", ");
        await logAction("email-crm", "abandoned_cart", {
          email: checkout.email,
          amount: checkout.total_price,
          products,
          created_at: checkout.created_at,
        }, "warning");
      }

      actions.push(`→ Recommandation : envoyer séquence relance panier (Email 1: 1h après, Email 2: 24h, Email 3: 48h avec -10%)`);
    }

    // 2. Detect first-time buyers who need welcome sequence
    const recentOrders = await shopifyGet<{ orders: ShopifyOrder[] }>(
      "orders.json?status=any&created_at_min=" + new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() + "&limit=50"
    ).catch(() => ({ orders: [] }));

    const firstTimeBuyers = recentOrders.orders.filter(
      (o) => o.customer && o.customer.orders_count === 1
    );

    if (firstTimeBuyers.length > 0) {
      const msg = `${firstTimeBuyers.length} nouveau(x) client(s) en 48h — séquence bienvenue à envoyer`;
      actions.push(msg);
      await logAction("email-crm", "new_customers", {
        count: firstTimeBuyers.length,
        emails: firstTimeBuyers.map((o) => o.email).slice(0, 5),
      }, "success");
      actions.push(`→ Recommandation : envoyer séquence bienvenue (Email 1: merci + story Uburn, Email 2: J+3 tips utilisation, Email 3: J+7 demande avis)`);
    }

    // 3. Detect repeat buyers (orders_count >= 2) → VIP treatment
    const repeatBuyers = recentOrders.orders.filter(
      (o) => o.customer && o.customer.orders_count >= 2
    );

    if (repeatBuyers.length > 0) {
      const msg = `${repeatBuyers.length} client(s) repeat en 48h — opportunité fidélisation`;
      actions.push(msg);
      await logAction("email-crm", "repeat_customers", {
        count: repeatBuyers.length,
      }, "success");
      actions.push(`→ Recommandation : envoyer offre VIP (-15%) + demande de parrainage`);
    }

    // 4. Detect customers who haven't reordered in 30+ days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const oldOrders = await shopifyGet<{ orders: ShopifyOrder[] }>(
      `orders.json?status=any&created_at_max=${thirtyDaysAgo}&created_at_min=${new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()}&limit=50`
    ).catch(() => ({ orders: [] }));

    // Find customers from 30-60 days ago who haven't ordered since
    const winbackCandidates = new Map<string, { email: string; name: string; lastOrder: string; amount: string }>();
    for (const order of oldOrders.orders) {
      if (order.customer && !winbackCandidates.has(order.email)) {
        winbackCandidates.set(order.email, {
          email: order.email,
          name: order.customer.first_name,
          lastOrder: order.created_at,
          amount: order.total_price,
        });
      }
    }

    if (winbackCandidates.size > 0) {
      const msg = `${winbackCandidates.size} client(s) inactif(s) depuis 30+ jours — campagne win-back`;
      actions.push(msg);
      await logAction("email-crm", "winback_candidates", {
        count: winbackCandidates.size,
      }, "success");
      actions.push(`→ Recommandation : envoyer séquence win-back (Email 1: "Tu nous manques" + -10%, Email 2: J+5 témoignages clients)`);
    }

    // 5. Summary
    if (actions.length === 0) {
      actions.push("Aucune action email requise — tout est à jour");
      await logAction("email-crm", "check_ok", {}, "success");
    }

    await updateLastRun("email-crm");
  } catch (err) {
    const msg = `Agent error: ${err}`;
    actions.push(msg);
    await logAction("email-crm", "agent_error", { error: String(err) }, "error");
  }

  return { actions };
}
