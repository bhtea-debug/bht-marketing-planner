// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shell';
import { Sparkles as SparklesIcon } from 'lucide-react';
import {
  Megaphone,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MousePointerClick,
  Eye,
  Target,
  Sparkles,
  Plus,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Loader2,
  X,
} from 'lucide-react';

const SEVERITY_STYLE: Record<string, any> = {
  critical: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', icon: XCircle, iconColor: 'text-rose-600' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', icon: AlertTriangle, iconColor: 'text-amber-600' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: Info, iconColor: 'text-blue-600' },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', icon: CheckCircle2, iconColor: 'text-emerald-600' },
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PAUSED: 'bg-slate-200 text-slate-700',
  DELETED: 'bg-rose-100 text-rose-700',
  ARCHIVED: 'bg-slate-100 text-slate-500',
};

const OBJECTIVES = [
  { value: 'OUTCOME_TRAFFIC', label: 'Ruch (Traffic)' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Zaangażowanie' },
  { value: 'OUTCOME_LEADS', label: 'Pozyskiwanie leadów' },
  { value: 'OUTCOME_SALES', label: 'Sprzedaż' },
  { value: 'OUTCOME_AWARENESS', label: 'Świadomość marki' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'Promocja aplikacji' },
];

const OPTIMIZATION_GOALS = [
  { value: 'LINK_CLICKS', label: 'Kliknięcia w link' },
  { value: 'IMPRESSIONS', label: 'Wyświetlenia' },
  { value: 'REACH', label: 'Zasięg' },
  { value: 'POST_ENGAGEMENT', label: 'Zaangażowanie postów' },
  { value: 'OFFSITE_CONVERSIONS', label: 'Konwersje (pixel)' },
  { value: 'LEAD_GENERATION', label: 'Generowanie leadów' },
];

const CTA_TYPES = [
  { value: 'SHOP_NOW', label: 'Kup teraz' },
  { value: 'LEARN_MORE', label: 'Dowiedz się więcej' },
  { value: 'SIGN_UP', label: 'Zarejestruj się' },
  { value: 'SUBSCRIBE', label: 'Subskrybuj' },
  { value: 'CONTACT_US', label: 'Skontaktuj się' },
  { value: 'GET_OFFER', label: 'Odbierz ofertę' },
];

function fmt(n: number, opts: { currency?: boolean; pct?: boolean } = {}) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  if (opts.currency) return `zł ${n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (opts.pct) return `${n.toFixed(2)}%`;
  return n.toLocaleString('pl-PL');
}

export default function AdsManagerPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [accountAvgs, setAccountAvgs] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError] = useState<string>('');

  // Load accounts on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/meta/ads/accounts');
        const j = await r.json();
        if (j.error) {
          setError(j.error);
          return;
        }
        const list = j.data || [];
        setAccounts(list);
        if (list.length && !selectedAccount) setSelectedAccount(list[0].id);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, []);

  // Load campaigns and recommendations when account or period changes
  useEffect(() => {
    if (!selectedAccount) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [cRes, rRes] = await Promise.all([
          fetch(`/api/meta/ads/campaigns?accountId=${selectedAccount}&period=${period}`),
          fetch(`/api/meta/ads/recommendations?accountId=${selectedAccount}&period=${period}`),
        ]);
        const cJson = await cRes.json();
        const rJson = await rRes.json();
        if (cJson.error) setError(cJson.error);
        else {
          setCampaigns(cJson.data?.campaigns || []);
          setTotals(cJson.data?.totals || {});
        }
        if (!rJson.error) {
          setRecommendations(rJson.data?.recommendations || []);
          setAccountAvgs(rJson.data?.accountAverages || {});
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedAccount, period]);

  async function toggleStatus(c: any) {
    setActioningId(c.id);
    const newStatus = c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const r = await fetch(`/api/meta/ads/campaign/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const j = await r.json();
      if (j.error) alert('Błąd: ' + j.error);
      else {
        setCampaigns((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: newStatus } : x)));
      }
    } finally {
      setActioningId(null);
    }
  }

  async function updateBudget(c: any) {
    const val = prompt('Nowy dzienny budżet (zł):', String(c.dailyBudget || 0));
    if (!val) return;
    setActioningId(c.id);
    try {
      const r = await fetch(`/api/meta/ads/campaign/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyBudget: Number(val) }),
      });
      const j = await r.json();
      if (j.error) alert('Błąd: ' + j.error);
      else {
        setCampaigns((prev) => prev.map((x) => (x.id === c.id ? { ...x, dailyBudget: Number(val) } : x)));
      }
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
      {/* Header */}
      <PageHeader
        eyebrow="Reklamy"
        icon={SparklesIcon}
        title="Ads Manager"
        description="Zarządzaj wszystkimi kampaniami Meta Ads w jednym miejscu."
        actions={(
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 text-white text-[12.5px] font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={14} /> Nowa kampania
          </button>
        )}
      />

      {/* Account + period selectors */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Konto reklamowe:</span>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-900 bg-white"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Okres:</span>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
            {(['7', '30', '90'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p ? 'bg-white text-amber-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                {p} dni
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
          <strong>Błąd:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mr-2" /> Ładowanie danych z Meta…
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <SummaryCard icon={DollarSign} label="Wydatki" value={fmt(totals.spend, { currency: true })} color="from-rose-500 to-rose-600" />
            <SummaryCard icon={Eye} label="Wyświetlenia" value={fmt(totals.impressions)} color="from-blue-500 to-blue-600" />
            <SummaryCard icon={MousePointerClick} label="Kliknięcia" value={fmt(totals.clicks)} color="from-purple-500 to-purple-600" />
            <SummaryCard icon={Target} label="CTR" value={fmt(totals.ctr, { pct: true })} color="from-amber-500 to-amber-600" />
            <SummaryCard icon={TrendingUp} label="ROAS" value={totals.roas ? `${totals.roas}x` : '—'} color="from-emerald-500 to-emerald-600" />
          </div>

          {/* AI Recommendations */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-amber-600" size={20} />
              <h2 className="text-xl font-bold text-slate-900">Rekomendacje AI</h2>
              <span className="text-xs text-slate-500">({recommendations.length})</span>
            </div>
            {recommendations.length === 0 ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm">
                <CheckCircle2 className="inline mr-2" size={18} />
                Świetnie! Nie znaleziono żadnych pilnych problemów na tym koncie. Wszystkie kampanie działają w normie.
              </div>
            ) : (
              <div className="grid gap-3">
                {recommendations.map((r, idx) => {
                  const s = SEVERITY_STYLE[r.severity];
                  const Icon = s.icon;
                  return (
                    <div key={idx} className={`p-4 rounded-xl border ${s.bg} ${s.border}`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`flex-shrink-0 mt-0.5 ${s.iconColor}`} size={20} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${s.text}`}>{r.title}</h3>
                            {r.campaignName && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-slate-700">
                                {r.campaignName}
                              </span>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${s.text} opacity-90`}>{r.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Campaigns table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Megaphone size={20} className="text-amber-700" /> Kampanie ({campaigns.length})
              </h2>
            </div>
            {campaigns.length === 0 ? (
              <div className="p-12 text-center text-slate-400">Brak kampanii w wybranym okresie.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Nazwa</th>
                      <th className="text-left px-4 py-3 font-semibold">Cel</th>
                      <th className="text-right px-4 py-3 font-semibold">Budżet/dzień</th>
                      <th className="text-right px-4 py-3 font-semibold">Wydatki</th>
                      <th className="text-right px-4 py-3 font-semibold">Wyśw.</th>
                      <th className="text-right px-4 py-3 font-semibold">Klik.</th>
                      <th className="text-right px-4 py-3 font-semibold">CTR</th>
                      <th className="text-right px-4 py-3 font-semibold">CPC</th>
                      <th className="text-right px-4 py-3 font-semibold">Konw.</th>
                      <th className="text-right px-4 py-3 font-semibold">ROAS</th>
                      <th className="text-right px-4 py-3 font-semibold">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[c.status] || STATUS_STYLE.PAUSED}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 max-w-xs truncate" title={c.name}>{c.name}</div>
                          <div className="text-xs text-slate-400">{c.id}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{c.objective?.replace('OUTCOME_', '')}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => updateBudget(c)}
                            disabled={actioningId === c.id}
                            className="text-slate-700 hover:text-amber-700 hover:underline"
                          >
                            {c.dailyBudget ? fmt(c.dailyBudget, { currency: true }) : '—'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(c.spend, { currency: true })}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(c.impressions)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(c.clicks)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(c.ctr, { pct: true })}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{fmt(c.cpc, { currency: true })}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{c.conversions || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {c.roas > 0 ? (
                            <span className={`font-semibold ${c.roas >= 2 ? 'text-emerald-600' : c.roas >= 1 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {c.roas}x
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => toggleStatus(c)}
                            disabled={actioningId === c.id}
                            className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                            title={c.status === 'ACTIVE' ? 'Wstrzymaj' : 'Uruchom'}
                          >
                            {actioningId === c.id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : c.status === 'ACTIVE' ? (
                              <Pause size={16} className="text-amber-700" />
                            ) : (
                              <Play size={16} className="text-emerald-600" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showWizard && (
        <CampaignWizard
          accountId={selectedAccount}
          accounts={accounts}
          onClose={() => setShowWizard(false)}
          onCreated={() => {
            setShowWizard(false);
            // Refresh
            setSelectedAccount((s) => s + '');
            setTimeout(() => setSelectedAccount(selectedAccount), 100);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className={`rounded-xl p-5 text-white shadow-md bg-gradient-to-br ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-white/80 uppercase tracking-wider">{label}</span>
        <Icon size={18} className="text-white/70" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function CampaignWizard({ accountId, accounts, onClose, onCreated }: any) {
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [pages, setPages] = useState<any[]>([]);

  // Step 1 — Campaign
  const [campaign, setCampaign] = useState({
    name: '',
    objective: 'OUTCOME_TRAFFIC',
    dailyBudget: '50',
    accountId: accountId,
  });

  // Step 2 — Ad Set
  const [adset, setAdset] = useState({
    name: '',
    optimizationGoal: 'LINK_CLICKS',
    dailyBudget: '',
    countries: 'PL',
    ageMin: '18',
    ageMax: '65',
  });

  // Step 3 — Ad creative
  const [ad, setAd] = useState({
    name: '',
    pageId: '',
    message: '',
    link: 'https://brownhouseandtea.pl',
    imageUrl: '',
    callToActionType: 'SHOP_NOW',
  });

  const [createdIds, setCreatedIds] = useState<any>({});

  useEffect(() => {
    setCampaign((c) => ({ ...c, accountId }));
  }, [accountId]);

  // Fetch pages from integration
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/integrations');
        const j = await r.json();
        const meta = Array.isArray(j) ? j.find((i: any) => i.platform === 'meta') : null;
        if (meta?.platform_data) {
          const pd = typeof meta.platform_data === 'string' ? JSON.parse(meta.platform_data) : meta.platform_data;
          setPages(pd.pages || []);
          if (pd.pages?.length) setAd((a) => ({ ...a, pageId: pd.pages[0].id }));
        }
      } catch {}
    })();
  }, []);

  async function createAll() {
    setCreating(true);
    setError('');
    try {
      // Step 1: campaign
      const cRes = await fetch('/api/meta/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: campaign.accountId,
          name: campaign.name,
          objective: campaign.objective,
          dailyBudget: campaign.dailyBudget,
          status: 'PAUSED',
        }),
      });
      const cJson = await cRes.json();
      if (cJson.error) throw new Error(cJson.error);
      const campaignId = cJson.data.id;

      // Step 2: adset
      const asRes = await fetch('/api/meta/ads/adsets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: campaign.accountId,
          campaignId,
          name: adset.name || `${campaign.name} – Ad Set`,
          dailyBudget: adset.dailyBudget || campaign.dailyBudget,
          optimizationGoal: adset.optimizationGoal,
          targeting: {
            geo_locations: { countries: adset.countries.split(',').map((c) => c.trim()) },
            age_min: Number(adset.ageMin),
            age_max: Number(adset.ageMax),
          },
        }),
      });
      const asJson = await asRes.json();
      if (asJson.error) throw new Error(asJson.error);
      const adsetId = asJson.data.id;

      // Step 3: ad
      const adRes = await fetch('/api/meta/ads/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: campaign.accountId,
          adsetId,
          name: ad.name || `${campaign.name} – Ad`,
          pageId: ad.pageId,
          message: ad.message,
          link: ad.link,
          imageUrl: ad.imageUrl || undefined,
          callToActionType: ad.callToActionType,
        }),
      });
      const adJson = await adRes.json();
      if (adJson.error) throw new Error(adJson.error);

      setCreatedIds({ campaignId, adsetId, adId: adJson.data.adId });
      setStep(4);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">
            Nowa kampania {step < 4 && <span className="text-sm font-normal text-slate-400 ml-2">Krok {step} z 3</span>}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-sm">{error}</div>}

          {step === 1 && (
            <>
              <Field label="Nazwa kampanii">
                <input value={campaign.name} onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                  placeholder="np. BHT - Wiosenna promocja" className="input" />
              </Field>
              <Field label="Cel kampanii">
                <select value={campaign.objective} onChange={(e) => setCampaign({ ...campaign, objective: e.target.value })} className="input">
                  {OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Dzienny budżet (zł)">
                <input type="number" value={campaign.dailyBudget} onChange={(e) => setCampaign({ ...campaign, dailyBudget: e.target.value })} className="input" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Nazwa Ad Setu (opcjonalnie)">
                <input value={adset.name} onChange={(e) => setAdset({ ...adset, name: e.target.value })} placeholder="auto" className="input" />
              </Field>
              <Field label="Optymalizacja">
                <select value={adset.optimizationGoal} onChange={(e) => setAdset({ ...adset, optimizationGoal: e.target.value })} className="input">
                  {OPTIMIZATION_GOALS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Dzienny budżet (zł)">
                <input type="number" value={adset.dailyBudget} onChange={(e) => setAdset({ ...adset, dailyBudget: e.target.value })} placeholder={`domyślnie ${campaign.dailyBudget} zł`} className="input" />
              </Field>
              <Field label="Kraje (kody, oddzielone przecinkiem)">
                <input value={adset.countries} onChange={(e) => setAdset({ ...adset, countries: e.target.value })} className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Wiek od">
                  <input type="number" value={adset.ageMin} onChange={(e) => setAdset({ ...adset, ageMin: e.target.value })} className="input" />
                </Field>
                <Field label="Wiek do">
                  <input type="number" value={adset.ageMax} onChange={(e) => setAdset({ ...adset, ageMax: e.target.value })} className="input" />
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="Strona Facebooka">
                <select value={ad.pageId} onChange={(e) => setAd({ ...ad, pageId: e.target.value })} className="input">
                  {pages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Nazwa reklamy (opcjonalnie)">
                <input value={ad.name} onChange={(e) => setAd({ ...ad, name: e.target.value })} placeholder="auto" className="input" />
              </Field>
              <Field label="Tekst reklamy (post message)">
                <textarea rows={4} value={ad.message} onChange={(e) => setAd({ ...ad, message: e.target.value })}
                  placeholder="Odkryj nowe mieszanki herbat Brown House & Tea — 20% rabatu na pierwsze zamówienie." className="input resize-none" />
              </Field>
              <Field label="Link docelowy">
                <input type="url" value={ad.link} onChange={(e) => setAd({ ...ad, link: e.target.value })} className="input" />
              </Field>
              <Field label="URL obrazka (opcjonalnie)">
                <input type="url" value={ad.imageUrl} onChange={(e) => setAd({ ...ad, imageUrl: e.target.value })} placeholder="https://..." className="input" />
              </Field>
              <Field label="Call to Action">
                <select value={ad.callToActionType} onChange={(e) => setAd({ ...ad, callToActionType: e.target.value })} className="input">
                  {CTA_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
            </>
          )}

          {step === 4 && (
            <div className="text-center py-6">
              <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Kampania utworzona!</h3>
              <p className="text-slate-600 mb-6">Kampania, ad set i reklama zostały utworzone w statusie PAUSED. Sprawdź je w tabeli i uruchom, gdy będą gotowe.</p>
              <div className="text-xs text-slate-400 space-y-1 mb-6">
                <div>Campaign: {createdIds.campaignId}</div>
                <div>Ad Set: {createdIds.adsetId}</div>
                <div>Ad: {createdIds.adId}</div>
              </div>
              <button onClick={onCreated} className="px-6 py-2.5 rounded-lg bg-amber-700 text-white font-semibold hover:bg-amber-800">
                OK, odśwież listę
              </button>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between sticky bottom-0 bg-white">
            <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-4 py-2 text-slate-600 disabled:opacity-30">
              Wstecz
            </button>
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="px-5 py-2 rounded-lg bg-amber-700 text-white font-semibold hover:bg-amber-800">
                Dalej
              </button>
            ) : (
              <button onClick={createAll} disabled={creating} className="px-5 py-2 rounded-lg bg-amber-700 text-white font-semibold hover:bg-amber-800 disabled:opacity-50 inline-flex items-center gap-2">
                {creating && <Loader2 size={16} className="animate-spin" />}
                Utwórz kampanię
              </button>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid rgb(226, 232, 240);
          border-radius: 8px;
          font-size: 14px;
          color: rgb(15, 23, 42);
          background: white;
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgb(180, 83, 9);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
