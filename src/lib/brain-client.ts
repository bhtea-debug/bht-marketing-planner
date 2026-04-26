// @ts-nocheck
/**
 * BH&T Brain (nudge-brain) — READ-ONLY API client.
 *
 * Architectural rule: Marketing app reads Brain. It NEVER writes to Brain.
 * Brain exposes Bearer-protected /api/inter/* endpoints; we use those.
 *
 * ENV required:
 *   BRAIN_API_BASE         e.g. https://teabrew-calendar.vercel.app
 *   BRAIN_INTER_TOKEN      Bearer token (matches INTER_APP_TOKEN in Brain)
 */

const BASE = (process.env.BRAIN_API_BASE || '').replace(/\/$/, '');
const TOKEN = process.env.BRAIN_INTER_TOKEN || '';

function ensureConfigured() {
  if (!BASE) throw new Error('BRAIN_API_BASE is not set');
  if (!TOKEN) throw new Error('BRAIN_INTER_TOKEN is not set');
}

async function brainGet<T = any>(path: string): Promise<T> {
  ensureConfigured();
  const url = `${BASE}${path.startsWith('/') ? path : '/' + path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brain GET ${path} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export type BrainModule = {
  id: number | string;
  slug: string;
  title: string;
  description: string | null;
  order: number | null;
  icon: string | null;
};

export type BrainSectionMeta = {
  id: number | string;
  slug: string;
  title: string;
  status: string | null;
  contentLength: number;
  updatedAt: string | null;
};

export type BrainSection = BrainSectionMeta & {
  content: string;
  visibility: string | null;
  category: string | null;
  module_slug: string;
  module_title: string;
};

export const BrainClient = {
  async listModules(): Promise<BrainModule[]> {
    const j = await brainGet<{ ok: boolean; modules: BrainModule[] }>('/api/inter/list-modules');
    return j?.modules || [];
  },

  async listSections(moduleSlug: string): Promise<BrainSectionMeta[]> {
    const j = await brainGet<{ ok: boolean; sections: BrainSectionMeta[] }>(
      `/api/inter/list-sections?moduleSlug=${encodeURIComponent(moduleSlug)}`
    );
    return j?.sections || [];
  },

  async getSection(moduleSlug: string, slug: string): Promise<BrainSection | null> {
    const j = await brainGet<{ ok: boolean; found: boolean; section?: BrainSection }>(
      `/api/inter/section-by-slug?moduleSlug=${encodeURIComponent(moduleSlug)}&slug=${encodeURIComponent(slug)}`
    );
    if (!j?.found || !j.section) return null;
    return j.section;
  },

  /**
   * Healthcheck — does the configured token work? Returns boolean + counts.
   */
  async ping(): Promise<{ ok: boolean; modules: number; error?: string }> {
    try {
      const m = await this.listModules();
      return { ok: true, modules: m.length };
    } catch (e: any) {
      return { ok: false, modules: 0, error: e.message };
    }
  },
};

export default BrainClient;
