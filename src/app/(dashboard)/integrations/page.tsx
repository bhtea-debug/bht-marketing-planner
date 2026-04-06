// @ts-nocheck
'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/button';

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse p-8"><div className="h-8 w-48 bg-slate-200 rounded mb-4" /><div className="h-64 bg-slate-100 rounded-xl" /></div>}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState<string | null>(null);

  // GetResponse API key modal
  const [showGRModal, setShowGRModal] = useState(false);
  const [grApiKey, setGrApiKey] = useState('');
  const [grConnecting, setGrConnecting] = useState(false);
  const [grError, setGrError] = useState('');

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
            if (int.status === 'active') {
              map[int.platform] = int;
            }
          });
        }
        setConnectedPlatforms(map);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Czy na pewno chcesz odłączyć ${platform}?`)) return;
    try {
      const response = await fetch(`/api/integrations?platform=${platform}`, { method: 'DELETE' });
      if (response.ok) {
        const updated = { ...connectedPlatforms };
        delete updated[platform];
        setConnectedPlatforms(updated);
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleConnectGR = async () => {
    if (!grApiKey.trim()) return;
    setGrConnecting(true);
    setGrError('');
    try {
      const response = await fetch('/api/auth/getresponse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: grApiKey.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setShowGRModal(false);
        setGrApiKey('');
        setShowBanner('GetResponse');
        setTimeout(() => setShowBanner(null), 5000);
        fetchIntegrations();
      } else {
        setGrError(data.error || 'Błąd połączenia');
      }
    } catch (error) {
      setGrError('Błąd sieci. Spróbuj ponownie.');
    } finally {
      setGrConnecting(false);
    }
  };

  const platforms = [
    {
      id: 'meta',
      name: 'Meta (Facebook & Instagram)',
      description: 'Połącz konta Facebook i Instagram — posty, reklamy, statystyki, audience',
      color: '#1877F2',
      icon: MetaIcon,
      connectAction: () => { window.location.href = '/api/auth/meta'; },
      available: true,
    },
    {
      id: 'getresponse',
      name: 'GetResponse',
      description: 'Email marketing, autoresponders, landing pages, statystyki kampanii',
      color: '#00baff',
      icon: GetResponseIcon,
      connectAction: () => { setGrApiKey(''); setGrError(''); setShowGRModal(true); },
      available: true,
    },
    {
      id: 'google',
      name: 'Google Ads',
      description: 'Zarządzaj kampaniami Google Ads bezpośrednio z panelu',
      color: '#4285F4',
      icon: GoogleAdsIcon,
      available: false,
    },
    {
      id: 'tiktok',
      name: 'TikTok Ads',
      description: 'Twórz i optymalizuj kampanie reklamowe na TikTok',
      color: '#000000',
      icon: TikTokIcon,
      available: false,
    },
  ];

  const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 bg-white placeholder:text-slate-400 transition-all font-mono";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Integracje</h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Połącz platformy marketingowe z Brown House & Tea
        </p>
      </div>

      {/* Success Banner */}
      {showBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          <p className="text-[13px] text-emerald-800 font-medium">
            {showBanner} został pomyślnie połączony!
          </p>
        </div>
      )}

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {platforms.map((platform) => {
          const isConnected = !!connectedPlatforms[platform.id];
          const integration = connectedPlatforms[platform.id];
          const isComingSoon = !platform.available;

          return (
            <div
              key={platform.id}
              className={`bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-200 ${
                isComingSoon ? 'opacity-50' : 'hover:shadow-md hover:border-slate-300/80'
              }`}
            >
              <div className="p-5">
                {/* Platform header */}
                <div className="flex items-start gap-3.5 mb-4">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${platform.color}12`, border: `1.5px solid ${platform.color}30` }}
                  >
                    <platform.icon color={platform.color} size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-slate-900">{platform.name}</h3>
                    <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{platform.description}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="mb-4">
                  {isComingSoon ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                      Wkrótce
                    </span>
                  ) : isConnected ? (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-emerald-100" />
                      <span className="text-[12px] font-semibold text-emerald-700">Połączono</span>
                    </div>
                  ) : (
                    <span className="text-[12px] font-medium text-slate-400">Nie połączono</span>
                  )}
                </div>

                {/* Connected info */}
                {isConnected && integration && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg space-y-2">
                    {integration.platform_user_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Konto</span>
                        <span className="text-[12px] font-semibold text-slate-800">{integration.platform_user_name}</span>
                      </div>
                    )}
                    {integration.connected_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Połączono</span>
                        <span className="text-[12px] text-slate-600">
                          {new Date(integration.connected_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {integration.platform_data && (() => {
                      try {
                        const data = JSON.parse(integration.platform_data);
                        if (data.listsCount !== undefined) {
                          return (
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Listy</span>
                              <span className="text-[12px] text-slate-600">{data.listsCount}</span>
                            </div>
                          );
                        }
                        if (data.pages) {
                          return (
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Strony FB</span>
                              <span className="text-[12px] text-slate-600">{data.pages?.length || 0}</span>
                            </div>
                          );
                        }
                      } catch(e) {}
                      return null;
                    })()}
                  </div>
                )}

                {/* Actions */}
                {!isComingSoon && (
                  <div className="flex gap-2.5">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => handleDisconnect(platform.id)}
                          className="flex-1 px-3 py-2 text-[12px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          Odłącz
                        </button>
                        <a href="/analytics" className="flex-1">
                          <button className="w-full px-3 py-2 text-[12px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                            Statystyki →
                          </button>
                        </a>
                      </>
                    ) : (
                      <button
                        onClick={platform.connectAction}
                        className="flex-1 px-3 py-2.5 text-[12px] font-semibold text-white rounded-lg transition-all hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: platform.color }}
                      >
                        Połącz {platform.name.split(' ')[0]}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* API Keys Info */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
        <h2 className="text-[15px] font-semibold text-slate-900 mb-1">Konfiguracja</h2>
        <p className="text-[12px] text-slate-500 mb-4">Zmienne środowiskowe wymagane do integracji (ustaw w Vercel → Settings → Environment Variables)</p>

        <div className="space-y-2">
          {[
            { name: 'META_APP_ID', platform: 'Meta', desc: 'ID aplikacji z developers.facebook.com' },
            { name: 'META_APP_SECRET', platform: 'Meta', desc: 'Secret aplikacji Meta' },
            { name: 'NEXT_PUBLIC_APP_URL', platform: 'Wszystkie', desc: 'https://bht-marketing-planner.vercel.app' },
          ].map((v) => (
            <div key={v.name} className="flex items-center gap-4 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
              <code className="text-[11px] font-mono font-semibold text-slate-800 bg-slate-200/60 px-2 py-0.5 rounded min-w-[200px]">{v.name}</code>
              <span className="text-[11px] text-slate-500 flex-1">{v.desc}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">{v.platform}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-sky-50 border border-sky-100 rounded-lg">
          <p className="text-[12px] text-sky-800">
            <strong>GetResponse</strong> nie wymaga zmiennych środowiskowych — klucz API podajesz bezpośrednio w panelu integracji powyżej.
            Znajdziesz go w GetResponse → Integracje i API → API.
          </p>
        </div>
      </div>

      {/* GetResponse API Key Modal */}
      {showGRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowGRModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00baff15', border: '1.5px solid #00baff30' }}>
                <GetResponseIcon color="#00baff" size={20} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-slate-900">Połącz GetResponse</h3>
                <p className="text-[12px] text-slate-500">Podaj klucz API ze swojego konta</p>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700 mb-1.5">Klucz API GetResponse</label>
              <input
                type="text"
                value={grApiKey}
                onChange={(e) => setGrApiKey(e.target.value)}
                placeholder="np. abcdef1234567890abcdef1234567890"
                className={inputClass}
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Znajdziesz w: GetResponse → Menu → Integracje i API → API → Wygeneruj klucz
              </p>
            </div>

            {grError && (
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-[12px] text-red-700">{grError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowGRModal(false)}
                className="flex-1 px-3 py-2.5 text-[12px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleConnectGR}
                disabled={!grApiKey.trim() || grConnecting}
                className="flex-1 px-3 py-2.5 text-[12px] font-semibold text-white bg-[#00baff] hover:bg-[#00a8e8] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {grConnecting ? 'Łączenie...' : 'Połącz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* SVG Icons */

function MetaIcon({ color = '#1877F2', size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill={color}/>
    </svg>
  );
}

function GetResponseIcon({ color = '#00baff', size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill={color}/>
    </svg>
  );
}

function GoogleAdsIcon({ color = '#4285F4', size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3.272 16.364l6.545-11.346 4.364 2.52-6.546 11.344z" fill="#FBBC04"/>
      <path d="M20.727 16.364a3.273 3.273 0 11-6.546 0 3.273 3.273 0 016.546 0z" fill="#4285F4"/>
      <path d="M9.818 16.364a3.273 3.273 0 01-6.546 0c0-1.808 1.465-3.273 3.273-3.273s3.273 1.465 3.273 3.273z" fill="#34A853"/>
      <path d="M14.182 7.538l4.363 2.518-4.818 8.345a3.254 3.254 0 00-.91-2.037l-2.999-5.193 4.364-3.633z" fill="#EA4335"/>
    </svg>
  );
}

function TikTokIcon({ color = '#000000', size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .56.04.82.12V9.01a6.37 6.37 0 00-.82-.05c-3.51 0-6.37 2.86-6.37 6.37S6 21.7 9.51 21.7s6.37-2.86 6.37-6.37V8.78c1.29.82 2.81 1.3 4.43 1.3V6.69h-.72z" fill={color}/>
    </svg>
  );
}
