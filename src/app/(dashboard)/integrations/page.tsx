// @ts-nocheck
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/button';

interface Integration {
  platform: string;
  connected: boolean;
  accountName?: string;
  lastSynced?: string;
  metadata?: {
    pages?: string[];
    instagramAccounts?: string[];
    subscriberCount?: number;
  };
}

interface EnvironmentVar {
  name: string;
  status: 'configured' | 'missing';
  description: string;
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse p-8"><div className="h-8 w-48 bg-slate-200 rounded mb-4" /><div className="h-64 bg-slate-100 rounded-xl" /></div>}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [environmentVars, setEnvironmentVars] = useState<EnvironmentVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectedBanner, setShowConnectedBanner] = useState(false);
  const [connectedPlatform, setConnectedPlatform] = useState<string>('');

  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      setShowConnectedBanner(true);
      setConnectedPlatform(connected);
      setTimeout(() => setShowConnectedBanner(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await fetch('/api/integrations');
        if (response.ok) {
          const data = await response.json();
          setIntegrations(data.integrations || []);
          setEnvironmentVars(data.environmentVars || []);
        }
      } catch (error) {
        console.error('Failed to fetch integrations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, []);

  const handleDisconnect = async (platform: string) => {
    if (confirm(`Czy na pewno chcesz odłączyć ${platform}?`)) {
      try {
        const response = await fetch(`/api/integrations?platform=${platform}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setIntegrations(
            integrations.map((int) =>
              int.platform === platform ? { ...int, connected: false } : int
            )
          );
        }
      } catch (error) {
        console.error('Failed to disconnect:', error);
      }
    }
  };

  const getPlatformConfig = (platform: string) => {
    const configs: Record<string, any> = {
      meta: {
        name: 'Meta (Facebook & Instagram)',
        description: 'Połącz swoje konta Facebook i Instagram do automatyzacji kampanii',
        color: '#1877F2',
        icon: MetaIcon,
        connectUrl: '/api/auth/meta',
        status: 'available',
      },
      mailchimp: {
        name: 'Mailchimp',
        description: 'Synchronizuj listy kontaktów i zarządzaj kampaniami email',
        color: '#FFE01B',
        textColor: '#241C15',
        icon: MailchimpIcon,
        connectUrl: '/api/auth/mailchimp',
        status: 'available',
      },
      googleads: {
        name: 'Google Ads',
        description: 'Zarządzaj kampaniami Google Ads bezpośrednio z panelu',
        color: '#4285F4',
        icon: GoogleAdsIcon,
        status: 'coming-soon',
      },
      tiktok: {
        name: 'TikTok Ads',
        description: 'Twórz i optymalizuj kampanie na TikTok',
        color: '#000000',
        icon: TikTokIcon,
        status: 'coming-soon',
      },
    };
    return configs[platform];
  };

  const getIntegrationStatus = (platform: string) => {
    const integration = integrations.find(
      (int) => int.platform.toLowerCase() === platform.toLowerCase()
    );
    return integration;
  };

  const platformOrder = ['meta', 'mailchimp', 'googleads', 'tiktok'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Integracje</h1>
          <p className="text-lg text-slate-600">
            Połącz platformy marketingowe z Brown House & Tea
          </p>
        </div>

        {/* Connected Banner */}
        {showConnectedBanner && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
            <p className="text-green-800">
              ✓ {connectedPlatform} został pomyślnie połączony!
            </p>
          </div>
        )}

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {platformOrder.map((platform) => {
            const config = getPlatformConfig(platform);
            const status = getIntegrationStatus(platform);
            const isComingSoon = config.status === 'coming-soon';
            const isConnected = status?.connected;

            return (
              <div
                key={platform}
                className={`bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden ${
                  isComingSoon ? 'opacity-50' : ''
                }`}
              >
                <div className="p-6">
                  {/* Platform Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor:
                            config.color + '15',
                          border: `2px solid ${config.color}`,
                        }}
                      >
                        <config.icon
                          color={config.color}
                          size={24}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {config.name}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {config.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4 flex items-center gap-2">
                    {isComingSoon ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        Wkrótce
                      </span>
                    ) : isConnected ? (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-sm font-medium text-green-700">
                          Połączono
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-slate-600">
                        Nie połączono
                      </span>
                    )}
                  </div>

                  {/* Connected Account Info */}
                  {isConnected && status && (
                    <div className="mb-6 space-y-2 pb-4 border-b border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">
                          Konto
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {status.accountName || 'Połączono'}
                        </p>
                      </div>

                      {status.lastSynced && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">
                            Ostatnia synchronizacja
                          </p>
                          <p className="text-sm text-slate-700">
                            {new Date(status.lastSynced).toLocaleDateString(
                              'pl-PL'
                            )}
                          </p>
                        </div>
                      )}

                      {status.metadata?.pages && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">
                            Strony
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {status.metadata.pages.map((page, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
                              >
                                {page}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {status.metadata?.instagramAccounts && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">
                            Konta Instagram
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {status.metadata.instagramAccounts.map(
                              (account, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
                                >
                                  {account}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {status.metadata?.subscriberCount !== undefined && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">
                            Subskrybenci
                          </p>
                          <p className="text-sm font-medium text-slate-900">
                            {status.metadata.subscriberCount.toLocaleString('pl-PL')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isComingSoon && (
                    <div className="flex gap-3">
                      {isConnected ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 text-slate-700 hover:text-slate-900"
                          >
                            Zarządzaj
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 text-red-600 hover:bg-red-50"
                            onClick={() => handleDisconnect(platform)}
                          >
                            Odłącz
                          </Button>
                        </>
                      ) : (
                        <a href={config.connectUrl} className="flex-1">
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full bg-amber-700 hover:bg-amber-800 text-white"
                          >
                            Połącz
                          </Button>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* API Keys Section */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Klucze API</h2>
            <p className="text-slate-600">
              Aby aktywować integracje, musisz skonfigurować zmienne środowiskowe w projekcie.
              Przejdź do panelu Vercel i dodaj poniższe zmienne w sekcji Environment Variables.
            </p>
          </div>

          {/* Environment Variables Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">
                    Zmienna
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">
                    Platforma
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">
                    Opis
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: 'META_APP_ID',
                    platform: 'Meta',
                    description: 'ID aplikacji Meta',
                  },
                  {
                    name: 'META_APP_SECRET',
                    platform: 'Meta',
                    description: 'Sekret aplikacji Meta',
                  },
                  {
                    name: 'MAILCHIMP_CLIENT_ID',
                    platform: 'Mailchimp',
                    description: 'ID klienta Mailchimp',
                  },
                  {
                    name: 'MAILCHIMP_CLIENT_SECRET',
                    platform: 'Mailchimp',
                    description: 'Sekret klienta Mailchimp',
                  },
                  {
                    name: 'NEXT_PUBLIC_APP_URL',
                    platform: 'Wszystkie',
                    description: 'URL publiczny aplikacji',
                  },
                ].map((envVar) => (
                  <tr
                    key={envVar.name}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <code className="bg-slate-100 text-slate-900 px-2 py-1 rounded text-xs font-mono">
                        {envVar.name}
                      </code>
                    </td>
                    <td className="py-4 px-4 text-slate-700">{envVar.platform}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        ⚠️ Nie skonfigurowano
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{envVar.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Setup Instructions */}
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900">
              <strong>Porada:</strong> Po dodaniu zmiennych środowiskowych w Vercel,
              redeploy aplikacji aby zmiany weszły w życie. Zmienne pojawiły się po
              odświeżeniu strony.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* SVG Icons */

function MetaIcon({ color = '#1877F2', size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15h-2v-6h2v6m-1-6.9c-.6 0-1.1-.5-1.1-1.1s.5-1.1 1.1-1.1 1.1.5 1.1 1.1-.5 1.1-1.1 1.1m8 6.9h-1.9v-3c0-.8-.3-1.3-.9-1.3-.5 0-.8.3-1 .6-.04.1-.1.2-.1.4v3.3h-1.9v-6h1.9v.8c.3-.4.8-1.1 2-1.1 1.5 0 2.6 1 2.6 3.1v3.2"
        fill={color}
      />
    </svg>
  );
}

function MailchimpIcon({ color = '#FFE01B', size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5m-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11m3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5"
        fill={color}
      />
    </svg>
  );
}

function GoogleAdsIcon({ color = '#4285F4', size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15h-2v-6h2v6m4 0h-2v-3.5c0-.83-.67-1.5-1.5-1.5S9 11.67 9 12.5v3.5H7v-6h2v.8c.4-.6 1.1-1.3 2.5-1.3 2.1 0 3.5 1.3 3.5 4.2V17"
        fill={color}
      />
    </svg>
  );
}

function TikTokIcon({ color = '#000000', size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.68v12.7a2.85 2.85 0 1 1-5.92-2.81c.44.46 1.04.75 1.69.82V9.5a6.5 6.5 0 1 0 2.06 12.44 6.52 6.52 0 0 0 6.5-6.46V12.6c.99.73 2.3 1.16 3.72 1.16v-3.66a4.85 4.85 0 0 1-.71-.05z"
        fill={color}
      />
    </svg>
  );
}
