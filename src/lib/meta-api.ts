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

// Sum action values from Meta insights `actions` array (e.g. conversions)
export function sumActions(actions: any[] | undefined, types: string[]): number {
  if (!actions) return 0;
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((acc, a) => acc + Number(a.value || 0), 0);
}

// Compute ROAS from action_values for purchase events
export function purchaseValue(actionValues: any[] | undefined): number {
  return sumActions(actionValues, [
    'purchase',
    'omni_purchase',
    'offsite_conversion.fb_pixel_purchase',
  ]);
}
