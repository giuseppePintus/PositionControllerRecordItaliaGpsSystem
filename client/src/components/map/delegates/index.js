/**
 * Map Delegates Index
 * 
 * Export all map provider delegates
 */
import GoogleMapDelegate, { GOOGLE_MAP_TYPES } from './GoogleMapDelegate';
import LeafletMapDelegate, { OSM_TILE_PROVIDERS } from './LeafletMapDelegate';
import MapboxMapDelegate, { MAPBOX_STYLES } from './MapboxMapDelegate';

// Re-export delegates and their configs
export { GoogleMapDelegate, GOOGLE_MAP_TYPES };
export { LeafletMapDelegate, OSM_TILE_PROVIDERS };
export { MapboxMapDelegate, MAPBOX_STYLES };

// Provider configurations
export const MAP_PROVIDERS = {
  google: {
    id: 'google',
    name: 'Google Maps',
    description: 'Full-featured maps with traffic and street view',
    icon: '🗺️',
    preview: '/map-previews/google.png',
    requiresApiKey: true,
    envVar: 'VITE_GOOGLE_MAPS_API_KEY',
    mapTypes: GOOGLE_MAP_TYPES,
    defaultMapType: 'roadmap'
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    description: 'Free and open-source community maps',
    icon: '🌍',
    preview: '/map-previews/osm.png',
    requiresApiKey: false,
    mapTypes: OSM_TILE_PROVIDERS,
    defaultMapType: 'standard'
  },
  mapbox: {
    id: 'mapbox',
    name: 'Mapbox',
    description: 'Beautiful custom map styles',
    icon: '🎨',
    preview: '/map-previews/mapbox.png',
    requiresApiKey: true,
    envVar: 'VITE_MAPBOX_ACCESS_TOKEN',
    mapTypes: MAPBOX_STYLES,
    defaultMapType: 'streets'
  }
};

// Helper to get component for provider
export function getMapDelegateComponent(providerId) {
  switch (providerId) {
    case 'google':
      return GoogleMapDelegate;
    case 'osm':
      return LeafletMapDelegate;
    case 'mapbox':
      return MapboxMapDelegate;
    default:
      return GoogleMapDelegate;
  }
}

// Helper to check if provider is configured
export function isProviderConfigured(providerId) {
  const provider = MAP_PROVIDERS[providerId];
  if (!provider) return false;
  if (!provider.requiresApiKey) return true;
  
  const envVar = provider.envVar;
  const value = import.meta.env[envVar];
  return Boolean(value && value.trim());
}

// Get all configured providers
export function getConfiguredProviders() {
  return Object.values(MAP_PROVIDERS).filter(p => isProviderConfigured(p.id));
}
