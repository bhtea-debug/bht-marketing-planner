// @ts-nocheck
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const META_API = 'https://graph.facebook.com/v21.0';

export async function getMetaToken() {
  const rows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.platform, 'meta'))
    .limit(1);
  if (!rows.length) return { error: 'not_connected', status: 401 };
  const row = rows[0];
  if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
    return { error: 'token_expired', status: 401 };
  }
  let platformData: any = {};
  try {
    platformData = JSON.parse(row.platform_data || '{}');
  } catch {}
  return { token: row.access_token, platformData };
}

export async function metaGet(path: string, token: string, params: Record<string, any> = {}) {
  const qs = new URLSearchParams({ access_token: token, ...params }).toString();
  const url = `${META_API}/${path}?${qs}`;
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Meta API ${r.status}: ${text}`);
  }
  return r.json();
}

export async function metaPost(
  path: string,
  token: string,
  body: Record<string, any>
) {
  const url = `${META_API}/${path}`;
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  form.append('access_token', token);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const json = await r.json();
  if (!r.ok || json.error) {
    throw new Error(`Meta API ${r.status}: ${JSON.stringify(json.error || json)}`);
  }
  return json;
}

export async function metaDelete(path: string, token: string) {
  const r = await fetch(`${META_API}/${path}?access_token=${token}`, {
    method: 'DELETE',
  });
  return r.json();
}

// Convert UI period ('7'|'30'|'90') to date_preset
export function periodToDatePreset(p: string | null) {
  return p === '7' ? 'last_7d' : p === '90' ? 'last_90d' : 'last_30d';
}

// Sum action values from Meta insights `actions` array (e.g. conversions).
// IMPORTANT: when multiple types in `types` represent the SAME underlying event
// (e.g. purchase vs omni_purchase vs offsite_conversion.fb_pixel_purchase),
// summing all of them double-counts. Use `pickBestActions` for de-duplicated
// purchase / lead counting.
export function sumActions(actions: any[] | undefined, types: string[]): number {
  if (!actions) return 0;
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((acc, a) => acc + Number(a.value || 0), 0);
}

// Pick the value from the FIRST matching action_type in `types` order — used
// when several types represent the same event and you want the most reliable
// (de-duplicated) figure rather than the sum.
function pickFirst(actions: any[] | undefined, types: string[]): number {
  if (!actions) return 0;
  for (const t of types) {
    const hit = actions.find((a) => a.action_type === t);
    if (hit && Number(hit.value || 0) > 0) return Number(hit.value);
  }
  return 0;
}

// Pick a ROAS RATIO directly from Meta's purchase_roas / *_roas fields,
// which Meta computes itself — avoids any unit ambiguity (cents vs major)
// in action_values. Returns 0 if no usable value.
export function pickRoas(roasArr: any[] | undefined): number {
  if (!roasArr || !roasArr.length) return 0;
  // Prefer omni (deduplicated), then website purchase, then plain purchase
  const order = [
    'omni_purchase',
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
  ];
  for (const t of order) {
    const hit = roasArr.find((a) => a.action_type === t);
    if (hit && Number(hit.value || 0) > 0) return Number(hit.value);
  }
  // Fallback: take the largest entry
  const max = roasArr.reduce(
    (m, a) => Math.max(m, Number(a.value || 0)),
    0
  );
  return max;
}

// Number of purchases — picks the most reliable single source (omni_purchase
// is Meta's deduplicated total across pixel + app + offline). Avoids
// double-counting that happens when summing multiple purchase action types.
export function purchaseCount(actions: any[] | undefined): number {
  return pickFirst(actions, [
    'omni_purchase',
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
  ]);
}

// Revenue from purchases — INTENTIONALLY ignores the raw value reported by
// Meta's Pixel because the BHT WooCommerce Pixel ships purchase events with
// inflated `value` (verified against four active campaigns: dividing the raw
// figure does not yield a clean integer factor — ratios fall between 28× and
// 34× of the realistic value implied by AOV ≈ 120 PLN).
//
// Instead we estimate revenue as `purchases × META_AVG_ORDER_VALUE`. This is
// transparent, user-controlled and stable: change the env var, fix all reports.
// Until the Pixel is repaired this is the most defensible figure we can show.
//
// To revert to raw Meta values, set META_USE_RAW_REVENUE=1.
const AVG_ORDER_VALUE = Number(process.env.META_AVG_ORDER_VALUE || 120);
const USE_RAW_REVENUE = process.env.META_USE_RAW_REVENUE === '1';

export function purchaseValue(actionValues: any[] | undefined, purchases?: number): number {
  if (USE_RAW_REVENUE) {
    return pickFirst(actionValues, [
      'omni_purchase',
      'purchase',
      'offsite_conversion.fb_pixel_purchase',
    ]);
  }
  if (typeof purchases === 'number' && purchases > 0) {
    return purchases * AVG_ORDER_VALUE;
  }
  return 0;
}

// Total conversions (purchase OR lead OR registration) — de-duplicated.
export function totalConversions(actions: any[] | undefined): number {
  const purchases = purchaseCount(actions);
  const leads = pickFirst(actions, ['lead', 'offsite_conversion.fb_pixel_lead']);
  const regs = pickFirst(actions, [
    'complete_registration',
    'offsite_conversion.fb_pixel_complete_registration',
  ]);
  return purchases + leads + regs;
}
