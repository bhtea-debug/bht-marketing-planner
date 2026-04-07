// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { integrations, push_logs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureAssetsAndPushLogs } from '@/lib/ensure-tables';

const GR_API = 'https://api.getresponse.com/v3';

async function grAuth() {
  const rows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.platform, 'getresponse'))
    .limit(1);
  if (!rows.length) return { error: 'getresponse_not_connected' };
  const apiKey = rows[0].access_token;
  let platformData: any = {};
  try { platformData = JSON.parse(rows[0].platform_data || '{}'); } catch {}
  return { apiKey, platformData };
}

async function grFetch(path: string, apiKey: string, init: RequestInit = {}) {
  const r = await fetch(`${GR_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'X-Auth-Token': `api-key ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  if (!r.ok) {
    throw new Error(`GR ${r.status}: ${json?.message || text.slice(0, 300)}`);
  }
  return json;
}

// POST /api/push/getresponse
// Body: { tile: { subject, headline, body?, link_url, list_id?, from_field_id? }, source_ref? }
// Creates a newsletter draft in GetResponse.
export async function POST(req: NextRequest) {
  let payload: any = null;
  try {
    await ensureAssetsAndPushLogs();
    payload = await req.json();
    const tile = payload.tile;
    if (!tile?.subject) {
      return NextResponse.json(
        { error: 'tile.subject required' },
        { status: 400 }
      );
    }

    const auth = await grAuth();
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error, hint: 'Connect GetResponse in /integrations' },
        { status: 401 }
      );
    }
    const apiKey = auth.apiKey;
    const platformData = auth.platformData || {};

    // Resolve campaign (list)
    let listId = tile.list_id || platformData.defaultListId;
    if (!listId) {
      const lists = await grFetch('/campaigns?perPage=20', apiKey);
      if (!Array.isArray(lists) || !lists.length) {
        throw new Error('No GR campaigns/lists found in account');
      }
      listId = lists[0].campaignId;
    }

    // Resolve from field
    let fromFieldId = tile.from_field_id || platformData.defaultFromFieldId;
    if (!fromFieldId) {
      const froms = await grFetch('/from-fields', apiKey);
      if (!Array.isArray(froms) || !froms.length) {
        throw new Error('No GR from-fields found in account');
      }
      fromFieldId = froms[0].fromFieldId;
    }

    // Build minimal HTML body
    const html = tile.body_html || `
      <html><body style="font-family:Georgia,serif;background:#f5f1ea;color:#2a2a2a;padding:32px;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;padding:32px;border-radius:8px;">
          <h1 style="font-size:22px;margin:0 0 16px 0;color:#3d2817;">${escapeHtml(tile.headline || tile.subject)}</h1>
          <p style="font-size:15px;line-height:1.6;">${escapeHtml(tile.body || '')}</p>
          ${tile.link_url ? `<p style="margin-top:24px;"><a href="${tile.link_url}" style="display:inline-block;background:#8b6f4e;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-size:14px;">${escapeHtml(tile.cta_label || 'Sprawdź ofertę')}</a></p>` : ''}
          <hr style="margin:32px 0;border:none;border-top:1px solid #e8e0d4;"/>
          <p style="font-size:11px;color:#888;">Brown House &amp; Tea · premium loose-leaf tea</p>
        </div>
      </body></html>
    `.trim();

    const newsletterPayload: any = {
      name: tile.internal_name || tile.subject.slice(0, 60),
      subject: tile.subject,
      type: 'broadcast',
      campaign: { campaignId: listId },
      fromField: { fromFieldId },
      content: {
        html,
        plain: stripHtml(html),
      },
      sendSettings: {
        selectedCampaigns: [listId],
      },
    };

    const newsletter = await grFetch('/newsletters', apiKey, {
      method: 'POST',
      body: JSON.stringify(newsletterPayload),
    });

    const newsletterId = newsletter?.newsletterId || newsletter?.href || null;
    const manageUrl = 'https://app.getresponse.com/newsletters';

    const logIns = await db
      .insert(push_logs)
      .values({
        platform: 'getresponse',
        source_type: payload.source_type || 'month_plan_tile',
        source_ref: payload.source_ref || null,
        payload: JSON.stringify(payload),
        response: JSON.stringify(newsletter),
        external_id: newsletterId,
        external_url: manageUrl,
        status: 'success',
      })
      .returning();

    return NextResponse.json({
      data: {
        newsletter_id: newsletterId,
        manage_url: manageUrl,
        log_id: logIns[0]?.id || null,
      },
    });
  } catch (e: any) {
    console.error('[push/getresponse] error:', e);
    try {
      await db.insert(push_logs).values({
        platform: 'getresponse',
        source_type: payload?.source_type || 'month_plan_tile',
        source_ref: payload?.source_ref || null,
        payload: payload ? JSON.stringify(payload) : null,
        status: 'failed',
        error: e.message?.slice(0, 2000),
      });
    } catch {}
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
