// @ts-nocheck
// WooCommerce REST API helper.
// Credentials are pulled from env vars and the integration is silent — the
// planner uses Woo data in the BACKGROUND for AI reasoning, not for any
// user-facing dashboard. Set in Vercel:
//   WOO_URL=https://brownhouseandtea.pl
//   WOO_KEY=ck_xxx
//   WOO_SECRET=cs_xxx
//
// All helpers fail soft (return [] / null) so a missing or misconfigured
// connection never breaks the rest of the app.

const WOO_URL = (process.env.WOO_URL || '').replace(/\/$/, '');
const WOO_KEY = process.env.WOO_KEY || '';
const WOO_SECRET = process.env.WOO_SECRET || '';

export function wooConfigured(): boolean {
  return Boolean(WOO_URL && WOO_KEY && WOO_SECRET);
}

function authHeader() {
  const token = Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

export async function wooGet<T = any>(
  path: string,
  params: Record<string, any> = {}
): Promise<T | null> {
  if (!wooConfigured()) return null;
  const qs = new URLSearchParams(
    Object.entries(params).reduce((acc: any, [k, v]) => {
      if (v !== undefined && v !== null) acc[k] = String(v);
      return acc;
    }, {})
  ).toString();
  const url = `${WOO_URL}/wp-json/wc/v3/${path}${qs ? `?${qs}` : ''}`;
  try {
    const r = await fetch(url, {
      headers: { ...authHeader(), Accept: 'application/json' },
      // 60s edge cache so multiple AI calls in the same request don't hammer Woo
      next: { revalidate: 60 },
    } as any);
    if (!r.ok) {
      console.warn(`[woo] ${r.status} ${path}`);
      return null;
    }
    return (await r.json()) as T;
  } catch (e) {
    console.warn('[woo] fetch failed', path, e);
    return null;
  }
}

// ----- High-level analytics --------------------------------------------------

export type WooProductSnapshot = {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number | null;
  stockStatus: string;
  totalSales: number;
  categories: string[];
  onSale: boolean;
  permalink: string;
};

export async function getWooProducts(): Promise<WooProductSnapshot[]> {
  if (!wooConfigured()) return [];
  const all: WooProductSnapshot[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch: any[] | null = await wooGet('products', {
      per_page: 100,
      page,
      status: 'publish',
    });
    if (!batch || !batch.length) break;
    for (const p of batch) {
      all.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: Number(p.price || 0),
        stock: p.stock_quantity ?? null,
        stockStatus: p.stock_status,
        totalSales: Number(p.total_sales || 0),
        categories: (p.categories || []).map((c: any) => c.name),
        onSale: Boolean(p.on_sale),
        permalink: p.permalink,
      });
    }
    if (batch.length < 100) break;
  }
  return all;
}

export type WooOrderSnapshot = {
  id: number;
  date: string;
  total: number;
  status: string;
  itemCount: number;
  items: { productId: number; name: string; quantity: number; total: number }[];
};

// Pull recent orders (default last 30d). Used by the AI to reason about
// real-time sales velocity, AOV and top movers.
export async function getRecentWooOrders(days = 30): Promise<WooOrderSnapshot[]> {
  if (!wooConfigured()) return [];
  const after = new Date(Date.now() - days * 86400_000).toISOString();
  const all: WooOrderSnapshot[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch: any[] | null = await wooGet('orders', {
      per_page: 100,
      page,
      after,
      status: 'completed,processing',
      orderby: 'date',
      order: 'desc',
    });
    if (!batch || !batch.length) break;
    for (const o of batch) {
      all.push({
        id: o.id,
        date: o.date_created,
        total: Number(o.total || 0),
        status: o.status,
        itemCount: (o.line_items || []).reduce(
          (n: number, li: any) => n + Number(li.quantity || 0),
          0
        ),
        items: (o.line_items || []).map((li: any) => ({
          productId: li.product_id,
          name: li.name,
          quantity: Number(li.quantity || 0),
          total: Number(li.total || 0),
        })),
      });
    }
    if (batch.length < 100) break;
  }
  return all;
}

export type WooSalesContext = {
  configured: boolean;
  windowDays: number;
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
  topProducts: { id: number; name: string; quantity: number; revenue: number }[];
  slowProducts: { id: number; name: string; totalSales: number; stock: number | null }[];
  lowStock: { id: number; name: string; stock: number | null; stockStatus: string }[];
  onSale: { id: number; name: string; price: number }[];
  totalCatalogSize: number;
  categoriesActive: string[];
};

// One-shot context the AI uses silently when reasoning about new campaigns.
// Designed to be cheap and self-contained — never throws.
export async function buildWooSalesContext(days = 30): Promise<WooSalesContext> {
  if (!wooConfigured()) {
    return {
      configured: false,
      windowDays: days,
      orderCount: 0,
      revenue: 0,
      averageOrderValue: 0,
      topProducts: [],
      slowProducts: [],
      lowStock: [],
      onSale: [],
      totalCatalogSize: 0,
      categoriesActive: [],
    };
  }

  const [orders, products] = await Promise.all([
    getRecentWooOrders(days),
    getWooProducts(),
  ]);

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const aov = orders.length ? revenue / orders.length : 0;

  // Aggregate per-product sales in window
  const perProduct: Record<number, { name: string; quantity: number; revenue: number }> = {};
  for (const o of orders) {
    for (const li of o.items) {
      if (!perProduct[li.productId])
        perProduct[li.productId] = { name: li.name, quantity: 0, revenue: 0 };
      perProduct[li.productId].quantity += li.quantity;
      perProduct[li.productId].revenue += li.total;
    }
  }
  const topProducts = Object.entries(perProduct)
    .map(([id, v]) => ({ id: Number(id), ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Slow movers: published products with low lifetime sales but in stock
  const slowProducts = products
    .filter((p) => (p.stock ?? 0) > 0 && p.totalSales < 5)
    .sort((a, b) => a.totalSales - b.totalSales)
    .slice(0, 10)
    .map((p) => ({ id: p.id, name: p.name, totalSales: p.totalSales, stock: p.stock }));

  const lowStock = products
    .filter((p) => p.stockStatus !== 'outofstock' && p.stock !== null && p.stock < 5)
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock, stockStatus: p.stockStatus }))
    .slice(0, 15);

  const onSale = products
    .filter((p) => p.onSale)
    .map((p) => ({ id: p.id, name: p.name, price: p.price }))
    .slice(0, 20);

  const categoriesActive = Array.from(
    new Set(products.flatMap((p) => p.categories))
  );

  return {
    configured: true,
    windowDays: days,
    orderCount: orders.length,
    revenue: Math.round(revenue * 100) / 100,
    averageOrderValue: Math.round(aov * 100) / 100,
    topProducts,
    slowProducts,
    lowStock,
    onSale,
    totalCatalogSize: products.length,
    categoriesActive,
  };
}
