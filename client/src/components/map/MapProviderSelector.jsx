/**
 * MapProviderSelector.jsx - Visual Map Provider Selector
 * 
 * Displays a card-based UI for selecting between Google Maps, OpenStreetMap, and Mapbox
 * with preview images and current selection indicator.
 */
import React, { useState } from 'react';
import { useMapPreferencesStore } from '../../store';
import { MAP_PROVIDERS, isProviderConfigured } from './delegates';
import { Check, X, Settings, ChevronDown, ChevronUp, Map, Satellite, Mountain, Globe, Sun, Moon, Navigation2 } from 'lucide-react';
import clsx from 'clsx';

// Map type icons
const MAP_TYPE_ICONS = {
  // Google
  roadmap: Map,
  satellite: Satellite,
  hybrid: Globe,
  terrain: Mountain,
  // OSM
  standard: Map,
  hot: Globe,
  topo: Mountain,
  cartoLight: Sun,
  cartoDark: Moon,
  // Mapbox
  streets: Map,
  satelliteStreets: Globe,
  outdoors: Mountain,
  light: Sun,
  dark: Moon,
  navigation: Navigation2
};

// Provider preview SVGs (inline for reliability)
const ProviderPreview = ({ provider }) => {
  const previewStyles = {
    google: (
      <div className="w-full h-full bg-gradient-to-br from-green-100 via-yellow-50 to-blue-100 relative overflow-hidden">
        {/* Roads */}
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-white/80 transform -translate-y-1/2"></div>
        <div className="absolute left-1/3 top-0 bottom-0 w-2 bg-white/80"></div>
        {/* Water */}
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-blue-300/50 rounded-tl-full"></div>
        {/* Parks */}
        <div className="absolute top-2 left-2 w-8 h-8 bg-green-400/50 rounded"></div>
        {/* Marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full">
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-red-500 mx-auto -mt-1"></div>
        </div>
        {/* Label */}
        <div className="absolute bottom-1 right-1 text-[6px] font-bold text-gray-500">Google</div>
      </div>
    ),
    osm: (
      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
        {/* Grid pattern for OSM style */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(8)].map((_, i) => (
            <div key={`h-${i}`} className="absolute left-0 right-0 h-px bg-gray-400" style={{ top: `${(i + 1) * 12.5}%` }}></div>
          ))}
          {[...Array(8)].map((_, i) => (
            <div key={`v-${i}`} className="absolute top-0 bottom-0 w-px bg-gray-400" style={{ left: `${(i + 1) * 12.5}%` }}></div>
          ))}
        </div>
        {/* Roads */}
        <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-yellow-200/80 border-y border-yellow-400/50 transform -translate-y-1/2"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-1.5 bg-yellow-200/80 border-x border-yellow-400/50"></div>
        {/* Buildings */}
        <div className="absolute top-3 left-3 w-6 h-6 bg-gray-300 border border-gray-400"></div>
        <div className="absolute bottom-3 right-3 w-8 h-5 bg-gray-300 border border-gray-400"></div>
        {/* Marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full">
          <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow"></div>
        </div>
        {/* Label */}
        <div className="absolute bottom-1 right-1 text-[6px] font-bold text-gray-500">OSM</div>
      </div>
    ),
    mapbox: (
      <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 relative overflow-hidden">
        {/* Stylized roads */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-400/60 transform -translate-y-1/2"></div>
        <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-slate-400/60"></div>
        <div className="absolute right-1/4 top-0 bottom-0 w-0.5 bg-slate-500/40"></div>
        {/* Water */}
        <div className="absolute bottom-0 left-0 w-2/5 h-1/4 bg-blue-800/40"></div>
        {/* Building shapes */}
        <div className="absolute top-2 right-2 w-4 h-6 bg-slate-500/50 rounded-sm"></div>
        <div className="absolute top-4 right-8 w-3 h-4 bg-slate-500/50 rounded-sm"></div>
        {/* Glowing marker */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 animate-pulse"></div>
        </div>
        {/* Label */}
        <div className="absolute bottom-1 right-1 text-[6px] font-bold text-slate-400">Mapbox</div>
      </div>
    )
  };
  
  return previewStyles[provider] || previewStyles.google;
};

/**
 * MapProviderSelector Component
 * 
 * Props:
 * - onClose: Callback when modal is closed
 * - showMapTypes: Whether to show map type selection (default: true)
 * - compact: Compact mode for inline display (default: false)
 */
export default function MapProviderSelector({ 
  onClose, 
  showMapTypes = true,
  compact = false
}) {
  const { 
    provider: currentProvider, 
    mapTypes,
    setProvider, 
    setMapType,
    enableClustering,
    showTraffic,
    toggleClustering,
    toggleTraffic
  } = useMapPreferencesStore();
  
  const [expandedProvider, setExpandedProvider] = useState(null);

  const handleProviderSelect = (providerId) => {
    if (!isProviderConfigured(providerId)) {
      // Show warning that provider is not configured
      console.warn(`Provider ${providerId} is not configured`);
      return;
    }
    console.log('Selecting provider:', providerId);
    setProvider(providerId);
    // Close modal after selection
    if (onClose) {
      onClose();
    }
  };

  const handleMapTypeSelect = (providerId, mapType) => {
    setMapType(providerId, mapType);
  };

  const getMapTypeOptions = (providerId) => {
    const provider = MAP_PROVIDERS[providerId];
    if (!provider?.mapTypes) return [];
    return Object.values(provider.mapTypes);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {Object.values(MAP_PROVIDERS).map(provider => {
          const isConfigured = isProviderConfigured(provider.id);
          const isSelected = currentProvider === provider.id;
          
          return (
            <button
              key={provider.id}
              onClick={() => handleProviderSelect(provider.id)}
              disabled={!isConfigured}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                isSelected 
                  ? "bg-primary-600 text-white" 
                  : isConfigured 
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
              )}
              title={!isConfigured ? `${provider.name} non configurato` : provider.name}
            >
              <span className="mr-1">{provider.icon}</span>
              {provider.name.split(' ')[0]}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-2xl w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Seleziona Provider Mappa</h2>
          <p className="text-primary-100 text-sm">Scegli il tuo provider preferito</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Provider Cards */}
      <div className="p-6 space-y-4">
        {Object.values(MAP_PROVIDERS).map(provider => {
          const isConfigured = isProviderConfigured(provider.id);
          const isSelected = currentProvider === provider.id;
          const isExpanded = expandedProvider === provider.id;
          const currentMapType = mapTypes[provider.id];
          const mapTypeOptions = getMapTypeOptions(provider.id);
          
          return (
            <div 
              key={provider.id}
              className={clsx(
                "rounded-xl border-2 transition-all overflow-hidden",
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
                  "p-4 flex items-center gap-4",
                  isConfigured && "cursor-pointer"
                )}
                onClick={() => isConfigured && handleProviderSelect(provider.id)}
              >
                {/* Preview */}
                <div className="w-20 h-16 rounded-lg overflow-hidden shadow-inner border border-gray-200 flex-shrink-0">
                  <ProviderPreview provider={provider.id} />
                </div>
                
                {/* Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{provider.icon}</span>
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
                  <p className="text-sm text-gray-500 mt-1">{provider.description}</p>
                  {isConfigured && isSelected && currentMapType && (
                    <p className="text-xs text-primary-600 mt-1">
                      Stile: {mapTypeOptions.find(t => t.id === currentMapType)?.name || currentMapType}
                    </p>
                  )}
                </div>
                
                {/* Expand button for map types */}
                {showMapTypes && isConfigured && mapTypeOptions.length > 1 && (
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
              {showMapTypes && isExpanded && mapTypeOptions.length > 1 && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Stile mappa:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {mapTypeOptions.map(mapType => {
                      const Icon = MAP_TYPE_ICONS[mapType.id] || Map;
                      const isTypeSelected = currentMapType === mapType.id;
                      
                      return (
                        <button
                          key={mapType.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMapTypeSelect(provider.id, mapType.id);
                          }}
                          className={clsx(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                            isTypeSelected
                              ? "bg-primary-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <Icon size={16} />
                          <span className="truncate">{mapType.name}</span>
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

      {/* Options */}
      <div className="px-6 pb-6 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-3 font-medium">Opzioni mappa:</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={toggleClustering}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              enableClustering
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {enableClustering ? <Check size={16} /> : <span className="w-4" />}
            Clustering
          </button>
          
          <button
            onClick={toggleTraffic}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              showTraffic
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {showTraffic ? <Check size={16} /> : <span className="w-4" />}
            Traffico
          </button>
        </div>
      </div>

      {/* Footer */}
      {onClose && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * MapProviderButton - Compact button to open provider selector
 */
export function MapProviderButton({ onClick, className }) {
  const { provider } = useMapPreferencesStore();
  const providerConfig = MAP_PROVIDERS[provider];
  
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors",
        className
      )}
      title="Cambia provider mappa"
    >
      <span className="text-lg">{providerConfig?.icon || '🗺️'}</span>
      <span className="text-sm font-medium text-gray-700 hidden sm:inline">
        {providerConfig?.name || 'Mappa'}
      </span>
      <Settings size={14} className="text-gray-400" />
    </button>
  );
}
