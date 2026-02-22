/**
 * Map Providers Index - Export all map provider classes
 */
export { BaseMapProvider } from './BaseMapProvider';
export { GoogleMapsProvider, GOOGLE_MAP_TYPES } from './GoogleMapsProvider';
export { OpenStreetMapProvider, OSM_TILE_PROVIDERS } from './OpenStreetMapProvider';

// Provider types enum
export const MAP_PROVIDER_TYPES = {
  GOOGLE: 'google',
  OPENSTREETMAP: 'osm',
};

/**
 * Factory function to create a map provider
 * @param {string} type - Provider type
 * @param {object} options - Provider options
 * @returns {BaseMapProvider}
 */
export function createMapProvider(type, options = {}) {
  switch (type) {
    case MAP_PROVIDER_TYPES.GOOGLE:
      return new (require('./GoogleMapsProvider').GoogleMapsProvider)(options);
    case MAP_PROVIDER_TYPES.OPENSTREETMAP:
      return new (require('./OpenStreetMapProvider').OpenStreetMapProvider)(options);
    default:
      throw new Error(`Unknown map provider type: ${type}`);
  }
}

/**
 * Get all available map providers
 * @returns {Array<{ id: string, name: string, description: string }>}
 */
export function getAvailableProviders() {
  return [
    {
      id: MAP_PROVIDER_TYPES.GOOGLE,
      name: 'Google Maps',
      description: 'Full-featured maps with satellite, terrain, and traffic support',
      icon: '🌎',
      requiresApiKey: true
    },
    {
      id: MAP_PROVIDER_TYPES.OPENSTREETMAP,
      name: 'OpenStreetMap',
      description: 'Free and open-source map data',
      icon: '🗺️',
      requiresApiKey: false
    }
  ];
}
