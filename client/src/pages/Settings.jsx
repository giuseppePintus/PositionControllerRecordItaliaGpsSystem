import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi, monitoringApi, testConnection } from '../api';
import { useNotificationStore, useMapPreferencesStore } from '../store';
import { MAP_PROVIDERS, isProviderConfigured } from '../components/map/delegates';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Send, 
  Activity, 
  Play, 
  Pause, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Smartphone,
  Key,
  Map,
  Layers,
  Car,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Settings() {
  const [telegramChatId, setTelegramChatId] = useState('');
  const { pushEnabled, setPushEnabled } = useNotificationStore();
  
  // Map preferences
  const { 
    provider: mapProvider, 
    mapTypes,
    setProvider: setMapProvider, 
    setMapType,
    enableClustering,
    showTraffic,
    setEnableClustering,
    setShowTraffic
  } = useMapPreferencesStore();
  
  const [expandedProvider, setExpandedProvider] = useState(null);

  // Fetch monitoring status
  const { data: monitoringStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['monitoring-status'],
    queryFn: monitoringApi.getStatus,
    refetchInterval: 5000,
  });

  // Test connection
  const { data: connectionStatus, refetch: testConn } = useQuery({
    queryKey: ['test-connection'],
    queryFn: testConnection,
    refetchOnWindowFocus: false,
  });

  // Mutations
  const startMonitoringMutation = useMutation({
    mutationFn: monitoringApi.start,
    onSuccess: () => {
      refetchStatus();
      toast.success('Monitoraggio avviato');
    },
  });

  const stopMonitoringMutation = useMutation({
    mutationFn: monitoringApi.stop,
    onSuccess: () => {
      refetchStatus();
      toast.success('Monitoraggio fermato');
    },
  });

  const forceCheckMutation = useMutation({
    mutationFn: monitoringApi.forceCheck,
    onSuccess: () => {
      toast.success('Controllo completato');
    },
  });

  // Request push notification permission
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Il browser non supporta le notifiche');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      toast.error('Service Worker non supportato');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        
        // Get VAPID key
        const vapidKey = await authApi.getVapidKey();
        
        if (!vapidKey) {
          toast.error('Chiavi VAPID non configurate sul server');
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });

        await authApi.subscribePush(subscription);
        setPushEnabled(true);
        toast.success('Notifiche push attivate!');
      } else {
        toast.error('Permesso notifiche negato');
      }
    } catch (error) {
      console.error('Errore push:', error);
      toast.error('Errore attivazione notifiche');
    }
  };

  // Test push notification
  const testPush = async () => {
    try {
      await authApi.testPush();
      toast.success('Notifica di test inviata');
    } catch (error) {
      toast.error('Errore invio notifica');
    }
  };

  // Test Telegram
  const testTelegram = async () => {
    if (!telegramChatId) {
      toast.error('Inserisci il Chat ID');
      return;
    }
    try {
      await authApi.testTelegram(telegramChatId);
      toast.success('Messaggio Telegram inviato');
    } catch (error) {
      toast.error('Errore invio Telegram');
    }
  };

  // Utility function for VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <div className="p-4 lg:p-6 pb-20 lg:pb-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Impostazioni</h1>
        <p className="text-gray-500">Configura il sistema e le notifiche</p>
      </div>

      <div className="space-y-6">
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Stato Connessione API
          </h2>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connectionStatus?.connected ? (
                <CheckCircle className="text-green-500" size={24} />
              ) : (
                <XCircle className="text-red-500" size={24} />
              )}
              <div>
                <p className="font-medium">
                  {connectionStatus?.connected ? 'Connesso' : 'Non connesso'}
                </p>
                <p className="text-sm text-gray-500">API Record Italia</p>
              </div>
            </div>
            <button
              onClick={() => testConn()}
              className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Monitoring Control */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} />
            Monitoraggio Automatico
          </h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">
                Stato: {monitoringStatus?.running ? (
                  <span className="text-green-600">Attivo</span>
                ) : (
                  <span className="text-red-600">Fermo</span>
                )}
              </p>
              <p className="text-sm text-gray-500">
                Intervallo: ogni {monitoringStatus?.interval || 5} minuti
              </p>
            </div>
            <div className="flex gap-2">
              {monitoringStatus?.running ? (
                <button
                  onClick={() => stopMonitoringMutation.mutate()}
                  disabled={stopMonitoringMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Pause size={18} />
                  Ferma
                </button>
              ) : (
                <button
                  onClick={() => startMonitoringMutation.mutate()}
                  disabled={startMonitoringMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                >
                  <Play size={18} />
                  Avvia
                </button>
              )}
              <button
                onClick={() => forceCheckMutation.mutate()}
                disabled={forceCheckMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
              >
                <RefreshCw size={18} className={forceCheckMutation.isPending ? 'animate-spin' : ''} />
                Controlla ora
              </button>
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell size={20} />
            Notifiche Push Browser
          </h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">
                Stato: {pushEnabled ? (
                  <span className="text-green-600">Attive</span>
                ) : (
                  <span className="text-gray-500">Non attive</span>
                )}
              </p>
              <p className="text-sm text-gray-500">
                Ricevi notifiche direttamente nel browser
              </p>
            </div>
            <div className="flex gap-2">
              {!pushEnabled && (
                <button
                  onClick={requestPushPermission}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Bell size={18} />
                  Attiva
                </button>
              )}
              {pushEnabled && (
                <button
                  onClick={testPush}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Send size={18} />
                  Test
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Telegram */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Smartphone size={20} />
            Notifiche Telegram
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-primary-50 rounded-lg">
              <h3 className="font-medium text-primary-800 mb-2">Come configurare Telegram:</h3>
              <ol className="text-sm text-primary-700 space-y-1 list-decimal list-inside">
                <li>Cerca <strong>@BotFather</strong> su Telegram</li>
                <li>Crea un nuovo bot con <code>/newbot</code></li>
                <li>Copia il token e inseriscilo nel file <code>.env</code></li>
                <li>Avvia una chat con il tuo bot</li>
                <li>Invia <code>/start</code> per ottenere il tuo Chat ID</li>
              </ol>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Chat ID Telegram</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Es: 123456789"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={testTelegram}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Send size={18} />
                  Test
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Map Provider Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Map size={20} />
            Provider Mappa
          </h2>

          <div className="space-y-3">
            {Object.values(MAP_PROVIDERS).map(provider => {
              const isConfigured = isProviderConfigured(provider.id);
              const isSelected = mapProvider === provider.id;
              const isExpanded = expandedProvider === provider.id;
              const currentMapType = mapTypes[provider.id];
              const mapTypeOptions = provider.mapTypes ? Object.values(provider.mapTypes) : [];
              
              return (
                <div 
                  key={provider.id}
                  className={clsx(
                    "rounded-lg border-2 transition-all overflow-hidden",
                    isSelected 
                      ? "border-primary-500 bg-primary-50/50" 
                      : isConfigured 
                        ? "border-gray-200 hover:border-gray-300 bg-white"
                        : "border-gray-200 bg-gray-50 opacity-60"
                  )}
                >
                  {/* Provider Header */}
                  <div 
                    className={clsx(
                      "p-4 flex items-center justify-between",
                      isConfigured && "cursor-pointer"
                    )}
                    onClick={() => {
                      if (isConfigured) {
                        setMapProvider(provider.id);
                        toast.success(`Provider cambiato: ${provider.name}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                          {isSelected && (
                            <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check size={12} /> Attivo
                            </span>
                          )}
                          {!isConfigured && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                              Non configurato
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{provider.description}</p>
                      </div>
                    </div>
                    
                    {/* Expand button for map types */}
                    {isConfigured && mapTypeOptions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedProvider(isExpanded ? null : provider.id);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    )}
                  </div>
                  
                  {/* Map Type Options */}
                  {isExpanded && mapTypeOptions.length > 1 && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2 font-medium">Stile mappa predefinito:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {mapTypeOptions.map(type => {
                          const isTypeSelected = currentMapType === type.id;
                          
                          return (
                            <button
                              key={type.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setMapType(provider.id, type.id);
                              }}
                              className={clsx(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                                isTypeSelected
                                  ? "bg-primary-500 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              )}
                            >
                              <span>{type.icon || '🗺️'}</span>
                              <span className="truncate">{type.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Map Options */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-3 font-medium">Opzioni mappa globali:</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setEnableClustering(!enableClustering)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  enableClustering
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <Layers size={16} />
                Clustering veicoli
                {enableClustering && <Check size={14} />}
              </button>
              
              <button
                onClick={() => setShowTraffic(!showTraffic)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  showTraffic
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <Car size={16} />
                Traffico (solo Google)
                {showTraffic && <Check size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Informazioni Sistema</h2>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="text-gray-500">Versione</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-gray-500">Database</p>
              <p className="font-medium">SQLite</p>
            </div>
            <div>
              <p className="text-gray-500">API</p>
              <p className="font-medium">Record Italia GPS</p>
            </div>
            <div>
              <p className="text-gray-500">Mappa</p>
              <p className="font-medium">OpenStreetMap (gratuita)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
