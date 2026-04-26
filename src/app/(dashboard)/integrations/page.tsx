// @ts-nocheck
'use client';

import React, { Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plug,
  Sparkles,
  CheckCircle2,
  Clock,
  Settings2,
  Mail,
  Megaphone,
  Lock,
  ArrowRight,
  X,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { HeroBanner, Section as ShellSection } from '@/components/shell';

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-40 rounded-2xl bg-slate-200/60" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 rounded-2xl bg-slate-100" />
            <div className="h-44 rounded-2xl bg-slate-100" />
          </div>
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}

type Category = 'social' | 'email' | 'analytics' | 'knowledge';

interface Platform {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: Category;
  color: string;
  icon: React.FC<{ color?: string; size?: number }>;
  available: boolean;
  connectAction?: () => void;
  helpUrl?: string;
}

const CATEGORY_META: Record<Category, { label: string; description: string; Icon: React.ElementType }> = {
  social: { label: 'Social Media & Reklamy', description: 'kanały płatne i organiczne', Icon: Megaphone },
  email: { label: 'Email Marketing', description: 'newslettery, automatyzacje, listy', Icon: Mail },
  analytics: { label: 'Analityka & Inne', description: 'pomiary, dane, narzędzia', Icon: Sparkles },
  knowledge: { label: 'Wiedza & Strategia', description: 'baza wiedzy firmy, fundamenty strategii', Icon: Sparkles },
};

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState<string | null>(null);
  const [showGRModal, setShowGRModal] = useState(false);
  const [grApiKey, setGrApiKey] = useState('');
  const [grConnecting, setGrConnecting] = useState(false);
  const [grError, setGrError] = useState('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [showBrainModal, setShowBrainModal] = useState(false);
  const [brainTokenInput, setBrainTokenInput] = useState('');
  const [brainError, setBrainError] = useState('');
  const [brainConnecting, setBrainConnecting] = useState(false);
  const [brainStatus, setBrainStatus] = useState<{configured: boolean; cache: { entries: number; last_synced_at: string | null }; live: { ok: boolean; modules: number }} | null>(null);
  const [brainSyncing, setBrainSyncing] = useState(false);

  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      setShowBanner(connected);
      setTimeout(() => setShowBanner(null), 5000);
    }
  }, [searchParams]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations');
      if (response.ok) {
        const data = await response.json();
        const map: Record<string, any> = {};
        if (Array.isArray(data)) {
          data.forEach((int: any) => {
            if (int.status === 'active') map[int.platform] = int;
          });
        }
        setConnectedPlatforms(map);
      }
    } catch (e) { console.error('Failed to fetch integrations:', e); }
    finally { setLoading(false); }
  }, []);

  const fetchBrainStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/brain/status');
      if (r.ok) setBrainStatus(await r.json());
    } catch {}
  }, []);
  useEffect(() => { fetchBrainStatus(); }, [fetchBrainStatus]);

  const handleBrainSync = async () => {
    setBrainSyncing(true);
    try {
      const r = await fetch('/api/brain/sync', { method: 'POST' });
      const j = await r.json();
      if (r.ok) {
        setShowBanner(`Brain (${j.sections} sekcji)`);
        setTimeout(() => setShowBanner(null), 5000);
      }
    } catch {}
    finally { setBrainSyncing(false); fetchBrainStatus(); }
  };

  const handleConnectBrain = async () => {
    if (!brainTokenInput.trim()) return;
    setBrainConnecting(true); setBrainError('');
    // The token is set as ENV BRAIN_INTER_TOKEN on Vercel by the user.
    // We can't write env from the client, so we test the token via a probe call.
    try {
      const r = await fetch('/api/brain/status');
      const j = await r.json();
      if (j.live?.ok) {
        setShowBrainModal(false); setBrainTokenInput('');
        setShowBanner('Brain'); setTimeout(() => setShowBanner(null), 5000);
        fetchBrainStatus();
      } else {
        setBrainError(j.live?.error || 'Brak połączenia. Ustaw BRAIN_API_BASE i BRAIN_INTER_TOKEN w Vercel → Environment Variables, potem odśwież.');
      }
    } catch (e: any) { setBrainError(e?.message || 'Błąd sieci'); }
    finally { setBrainConnecting(false); }
  };

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const handleDisconnect = async (platform: string, label: string) => {
    if (!confirm(`Czy na pewno chcesz odłączyć ${label}?`)) return;
    try {
      const response = await fetch(`/api/integrations?platform=${platform}`, { method: 'DELETE' });
      if (response.ok) {
        const updated = { ...connectedPlatforms };
        delete updated[platform];
        setConnectedPlatforms(updated);
      }
    } catch (e) { console.error('Failed to disconnect:', e); }
  };

  const handleConnectGR = async () => {
    if (!grApiKey.trim()) return;
    setGrConnecting(true); setGrError('');
    try {
      const response = await fetch('/api/auth/getresponse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: grApiKey.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setShowGRModal(false); setGrApiKey('');
        setShowBanner('GetResponse');
        setTimeout(() => setShowBanner(null), 5000);
        fetchIntegrations();
      } else { setGrError(data.error || 'Błąd połączenia'); }
    } catch { setGrError('Błąd sieci. Spróbuj ponownie.'); }
    finally { setGrConnecting(false); }
  };

  const handleCopy = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedVar(val);
      setTimeout(() => setCopiedVar(null), 1500);
    } catch {}
  };

  const platforms: Platform[] = [
    { id: 'meta', name: 'Meta (Facebook & Instagram)', shortName: 'Meta', description: 'Posty, reklamy, statystyki, audience — Facebook + Instagram', category: 'social', color: '#1877F2', icon: MetaIcon, available: true, connectAction: () => { window.location.href = '/api/auth/meta'; }, helpUrl: 'https://developers.facebook.com' },
    { id: 'google', name: 'Google Ads', shortName: 'Google Ads', description: 'Search, Display, Performance Max — kampanie Google Ads', category: 'social', color: '#4285F4', icon: GoogleAdsIcon, available: false },
    { id: 'tiktok', name: 'TikTok Ads', shortName: 'TikTok', description: 'Twórz i optymalizuj kampanie reklamowe na TikTok', category: 'social', color: '#000000', icon: TikTokIcon, available: false },
    { id: 'linkedin', name: 'LinkedIn Ads', shortName: 'LinkedIn', description: 'B2B kampanie i Sponsored Content na LinkedIn', category: 'social', color: '#0A66C2', icon: LinkedInIcon, available: false },
    { id: 'getresponse', name: 'GetResponse', shortName: 'GetResponse', description: 'Email marketing, autoresponders, landing pages, statystyki kampanii', category: 'email', color: '#00baff', icon: GetResponseIcon, available: true, connectAction: () => { setGrApiKey(''); setGrError(''); setShowGRModal(true); }, helpUrl: 'https://app.getresponse.com' },
    { id: 'mailchimp', name: 'Mailchimp', shortName: 'Mailchimp', description: 'Email marketing — kampanie, audiences, raporty', category: 'email', color: '#FFE01B', icon: MailchimpIcon, available: false },
    { id: 'brain', name: 'BH&T Brain', shortName: 'Brain', description: 'Czytanie strategii firmy z bazy wiedzy (jednokierunkowo — read only)', category: 'knowledge', color: '#7c3aed', icon: BrainIcon, available: true, connectAction: () => { setBrainTokenInput(''); setBrainError(''); setShowBrainModal(true); }, helpUrl: 'https://teabrew-calendar.vercel.app' },
  ];

  const totalAvailable = platforms.filter((p) => p.available).length;
  const totalConnected = platforms.filter((p) => connectedPlatforms[p.id]).length;

  const grouped = useMemo(() => {
    const out: Record<Category, Platform[]> = { social: [], email: [], analytics: [], knowledge: [] };
    platforms.forEach((p) => out[p.category].push(p));
    return out;
  }, [connectedPlatforms]);

  const connectedList = platforms.filter((p) => connectedPlatforms[p.id]);

  const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white placeholder:text-slate-400 transition-all font-mono';

  return (
    <div className="space-y-7">
      {showBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <p className="text-[13px] text-emerald-800 font-medium">{showBanner} został pomyślnie połączony!</p>
        </div>
      )}

      <HeroBanner
        eyebrow="Centrum integracji"
        icon={Plug}
        title="Połącz Brown House & Tea"
        description="Zarządzaj wszystkimi platformami marketingowymi z jednego miejsca — kampanie, email, statystyki i automatyzacje."
        chips={[
          <span key="active" className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />{totalConnected} z {totalAvailable} platform aktywnych</span>,
          <span key="lock" className="inline-flex items-center gap-1.5"><Lock size={12} /> Bezpieczne klucze API</span>,
          ...(brainStatus?.configured ? [<span key="brain" className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-violet-300" />Brain {brainStatus.live?.ok ? `• ${brainStatus.cache.entries} w cache` : '• offline'}</span>] : []),
        ]}
        action={totalConnected > 0 ? (
          <a href="/analytics" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-amber-900 rounded-full text-[12px] font-semibold hover:bg-amber-50 transition-colors">
            Zobacz statystyki <ArrowRight size={13} />
          </a>
        ) : undefined}
      />

      {connectedList.length > 0 && (
        <SectionBlock icon={CheckCircle2} iconColor="text-emerald-600" label="Aktywne integracje" subtitle={`${connectedList.length} ${connectedList.length === 1 ? 'połączona' : 'połączone'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectedList.map((platform) => (
              <PlatformCard key={platform.id} platform={platform} integration={connectedPlatforms[platform.id]} onDisconnect={handleDisconnect} />
            ))}
          </div>
        </SectionBlock>
      )}

      {(['social', 'email', 'knowledge'] as Category[]).map((cat) => {
        const remaining = grouped[cat].filter((p) => !connectedPlatforms[p.id]);
        if (remaining.length === 0) return null;
        const meta = CATEGORY_META[cat];
        return (
          <SectionBlock key={cat} icon={meta.Icon} iconColor="text-amber-700" label={meta.label} subtitle={meta.description}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {remaining.map((platform) => (
                <PlatformCard key={platform.id} platform={platform} integration={connectedPlatforms[platform.id]} onDisconnect={handleDisconnect} />
              ))}
            </div>
          </SectionBlock>
        );
      })}

      <SectionBlock icon={Settings2} iconColor="text-slate-500" label="Konfiguracja środowiska" subtitle="zmienne wymagane przez integracje OAuth">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {[
              { name: 'META_APP_ID', platform: 'Meta', desc: 'ID aplikacji z developers.facebook.com' },
              { name: 'META_APP_SECRET', platform: 'Meta', desc: 'Secret aplikacji Meta' },
              { name: 'MAILCHIMP_CLIENT_ID', platform: 'Mailchimp', desc: 'OAuth Client ID z Mailchimp' },
              { name: 'MAILCHIMP_CLIENT_SECRET', platform: 'Mailchimp', desc: 'OAuth Client Secret' },
              { name: 'NEXT_PUBLIC_APP_URL', platform: 'Wszystkie', desc: 'https://bht-marketing-planner.vercel.app' },
            ].map((v) => (
              <div key={v.name} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <button onClick={() => handleCopy(v.name)} className="group inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-800 bg-slate-100 hover:bg-amber-50 hover:text-amber-900 px-2.5 py-1 rounded-md min-w-[210px] transition-colors" title="Skopiuj nazwę">
                  <span className="truncate">{v.name}</span>
                  {copiedVar === v.name ? <Check size={11} className="text-emerald-600 flex-shrink-0" /> : <Copy size={11} className="opacity-0 group-hover:opacity-60 flex-shrink-0" />}
                </button>
                <span className="text-[12px] text-slate-500 flex-1">{v.desc}</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{v.platform}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3.5 bg-amber-50/60 border-t border-amber-100/80">
            <p className="text-[12px] text-amber-900 leading-relaxed">
              <strong className="font-semibold">GetResponse</strong> nie wymaga zmiennych środowiskowych — klucz API podajesz bezpośrednio w panelu integracji powyżej. Znajdziesz go w <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded">GetResponse → Integracje i API → API</span>.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 px-1">Ustaw zmienne w Vercel → Project Settings → Environment Variables.</p>
      </SectionBlock>

      {showBrainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowBrainModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="relative px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-violet-50/60 to-white">
              <button onClick={() => setShowBrainModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" aria-label="Zamknij">
                <X size={16} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#7c3aed14', border: '1.5px solid #7c3aed30' }}>
                  <BrainIcon color="#7c3aed" size={22} />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-slate-900">Połącz BH&amp;T Brain</h3>
                  <p className="text-[12px] text-slate-500">Czytanie strategii z bazy wiedzy (read-only)</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="p-3 bg-violet-50 border border-violet-100 rounded-lg text-[12px] text-violet-900 leading-relaxed">
                <strong className="font-semibold">Konfiguracja przez Vercel ENV.</strong> Marketing Planner nie zapisuje tokenu w UI — ustaw go w
                <span className="font-mono mx-1 bg-white px-1.5 py-0.5 rounded text-[10.5px]">Project Settings → Environment Variables</span>
                jako <code className="font-mono bg-white px-1 py-0.5 rounded text-[10.5px]">BRAIN_API_BASE</code> i <code className="font-mono bg-white px-1 py-0.5 rounded text-[10.5px]">BRAIN_INTER_TOKEN</code>, redeployuj, a następnie kliknij <strong>Sprawdź</strong>.
              </div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Status konfiguracji</div>
                  <div className={`mt-1 font-semibold ${brainStatus?.configured ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {brainStatus?.configured ? 'ENV ustawione' : 'brak ENV'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Live ping</div>
                  <div className={`mt-1 font-semibold ${brainStatus?.live?.ok ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {brainStatus?.live?.ok ? `OK — ${brainStatus.live.modules} modułów` : 'brak połączenia'}
                  </div>
                </div>
              </div>
              {brainError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                  <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-red-700">{brainError}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
              <button onClick={() => setShowBrainModal(false)} className="flex-1 px-3 py-2.5 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors">Zamknij</button>
              <button onClick={handleConnectBrain} disabled={brainConnecting} className="flex-1 px-3 py-2.5 text-[12px] font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {brainConnecting ? 'Sprawdzam...' : 'Sprawdź połączenie'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showGRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowGRModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="relative px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-cyan-50/60 to-white">
              <button onClick={() => setShowGRModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" aria-label="Zamknij">
                <X size={16} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#00baff15', border: '1.5px solid #00baff30' }}>
                  <GetResponseIcon color="#00baff" size={22} />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-slate-900">Połącz GetResponse</h3>
                  <p className="text-[12px] text-slate-500">Podaj klucz API ze swojego konta</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-slate-700 mb-1.5">Klucz API GetResponse</label>
                <input type="text" value={grApiKey} onChange={(e) => setGrApiKey(e.target.value)} placeholder="np. abcdef1234567890abcdef1234567890" className={inputClass} autoFocus />
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">Znajdziesz w: <span className="font-mono text-[10.5px] bg-slate-100 px-1.5 py-0.5 rounded">GetResponse → Menu → Integracje i API → API → Wygeneruj klucz</span></p>
              </div>
              {grError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                  <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-red-700">{grError}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
              <button onClick={() => setShowGRModal(false)} className="flex-1 px-3 py-2.5 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors">Anuluj</button>
              <button onClick={handleConnectGR} disabled={!grApiKey.trim() || grConnecting} className="flex-1 px-3 py-2.5 text-[12px] font-semibold text-white bg-[#00baff] hover:bg-[#00a8e8] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {grConnecting ? 'Łączenie...' : 'Połącz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionBlock({ icon: Icon, iconColor, label, subtitle, children }: { icon: React.ElementType; iconColor: string; label: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3.5 px-1">
        <Icon size={15} className={`${iconColor} flex-shrink-0`} strokeWidth={2.2} />
        <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-700">{label}</span>
        {subtitle && (<><span className="text-slate-300">·</span><span className="text-[11.5px] text-slate-400 font-medium lowercase tracking-wide">{subtitle}</span></>)}
      </div>
      {children}
    </section>
  );
}

function PlatformCard({ platform, integration, onDisconnect }: { platform: Platform; integration: any; onDisconnect: (id: string, label: string) => void }) {
  const isConnected = !!integration;
  const isComingSoon = !platform.available;
  let extraInfo: { label: string; value: string }[] = [];
  if (isConnected) {
    if (integration.platform_user_name) extraInfo.push({ label: 'Konto', value: integration.platform_user_name });
    if (integration.connected_at) {
      const d = new Date(integration.connected_at);
      extraInfo.push({ label: 'Połączono', value: d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) });
    }
    if (integration.platform_data) {
      try {
        const data = JSON.parse(integration.platform_data);
        if (data.listsCount !== undefined) extraInfo.push({ label: 'Listy', value: String(data.listsCount) });
        if (data.pages) extraInfo.push({ label: 'Strony FB', value: String(data.pages?.length || 0) });
      } catch {}
    }
  }

  return (
    <div className={`group relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-200 ${isComingSoon ? 'opacity-70' : 'hover:shadow-md hover:border-slate-300 hover:-translate-y-[1px]'}`}>
      {!isComingSoon && (<div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: platform.color }} />)}
      <div className="p-5">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: `${platform.color}14`, border: `1.5px solid ${platform.color}30` }}>
            <platform.icon color={platform.color} size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h3 className="text-[14.5px] font-semibold text-slate-900 leading-tight flex-1">{platform.name}</h3>
              {isComingSoon ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 flex-shrink-0">
                  <Clock size={10} /> Wkrótce
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktywne
                </span>
              ) : null}
            </div>
            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{platform.description}</p>
          </div>
        </div>

        {isConnected && extraInfo.length > 0 && (
          <div className="mb-4 p-3 bg-slate-50/80 rounded-xl space-y-1.5 border border-slate-100">
            {extraInfo.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-[10.5px] text-slate-400 uppercase tracking-wider font-semibold">{row.label}</span>
                <span className="text-[12px] font-medium text-slate-700 text-right truncate max-w-[60%]">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-medium" style={{ backgroundColor: `${platform.color}14`, color: platform.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: platform.color }} />
            {CATEGORY_META[platform.category].label.split(' ')[0]}
          </span>
          {!isComingSoon && (
            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <button onClick={() => onDisconnect(platform.id, platform.shortName)} className="px-3 py-1.5 text-[11.5px] font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">Odłącz</button>
                  <a href="/analytics" className="inline-flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Statystyki <ArrowRight size={11} /></a>
                </>
              ) : (
                <button onClick={platform.connectAction} className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[11.5px] font-semibold text-white rounded-lg transition-all hover:opacity-90 active:scale-[0.98] shadow-sm" style={{ backgroundColor: platform.color }}>
                  Połącz {platform.shortName} <ArrowRight size={11} />
                </button>
              )}
            </div>
          )}
          {isComingSoon && platform.helpUrl && (
            <a href={platform.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
              Dowiedz się więcej <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaIcon({ color = '#1877F2', size = 24 }: { color?: string; size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill={color}/></svg>);
}
function GetResponseIcon({ color = '#00baff', size = 24 }: { color?: string; size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill={color}/></svg>);
}
function GoogleAdsIcon({ color = '#4285F4', size = 24 }: { color?: string; size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3.272 16.364l6.545-11.346 4.364 2.52-6.546 11.344z" fill="#FBBC04"/><path d="M20.727 16.364a3.273 3.273 0 11-6.546 0 3.273 3.273 0 016.546 0z" fill="#4285F4"/><path d="M9.818 16.364a3.273 3.273 0 01-6.546 0c0-1.808 1.465-3.273 3.273-3.273s3.273 1.465 3.273 3.273z" fill="#34A853"/><path d="M14.182 7.538l4.363 2.518-4.818 8.345a3.254 3.254 0 00-.91-2.037l-2.999-5.193 4.364-3.633z" fill="#EA4335"/></svg>);
}
function TikTokIcon({ color = '#000000', size = 24 }: { color?: string; size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.12V9.01a6.37 6.37 0 00-.82-.05c-3.51 0-6.37 2.86-6.37 6.37S6 21.7 9.51 21.7s6.37-2.86 6.37-6.37V8.78c1.29.82 2.81 1.3 4.43 1.3V6.69h-.72z" fill={color}/></svg>);
}
function LinkedInIcon({ color = '#0A66C2', size = 24 }: { color?: string; size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill={color}/></svg>);
}
function BrainIcon({ color = '#7c3aed', size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 3a3 3 0 00-3 3v0a3 3 0 00-3 3v3a3 3 0 002 2.83V17a3 3 0 003 3 3 3 0 003-3v-3a3 3 0 003 3 3 3 0 003-3v-2.17A3 3 0 0021 12V9a3 3 0 00-3-3v0a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 00-3-3z" stroke={color} strokeWidth="1.5" fill={`${color}10`} strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 9v6M15 9v6M9 12h6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function MailchimpIcon({ color = '#FFE01B', size = 24 }: { color?: string; size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill={color}/><path d="M16.5 8.5c-.3-1.5-1.5-2.5-3-2.5-1.2 0-2.3.6-3 1.6-.3-.1-.7-.1-1 0-1.3.3-2.2 1.5-2 2.8.1.5.3.9.6 1.3-.5.6-.7 1.4-.4 2.1.4.9 1.4 1.4 2.4 1.2.6.7 1.5 1.1 2.5 1.1 1.5 0 2.8-1 3.2-2.4.5-.1 1-.4 1.3-.9.6-.9.4-2.1-.4-2.8.1-.2.1-.3 0-.5z" fill="#241C15"/><circle cx="11" cy="11" r="0.6" fill={color}/><circle cx="13.2" cy="11.2" r="0.6" fill={color}/></svg>);
}
