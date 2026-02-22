/**
 * MapView.jsx - Multi-Provider Map View
 * 
 * This is a THIN COORDINATOR that delegates rendering to provider-specific components.
 * Supports: Google Maps, OpenStreetMap (Leaflet), Mapbox
 * 
 * Props:
 * - controller: MapController instance (REQUIRED)
 * - provider: 'google' | 'osm' | 'mapbox' (default: 'google')
 * - mapType: Provider-specific map type (e.g., 'roadmap', 'satellite', 'standard', 'streets')
 * - height: CSS height
 * - onVehicleClick: Callback when vehicle is clicked
 * - hideMapTypeControl: Hide native map type selector
 */
import React, { Suspense, lazy, useMemo } from 'react';

// Lazy load delegates to reduce initial bundle size
const GoogleMapDelegate = lazy(() => import('./map/delegates/GoogleMapDelegate'));
const LeafletMapDelegate = lazy(() => import('./map/delegates/LeafletMapDelegate'));
const MapboxMapDelegate = lazy(() => import('./map/delegates/MapboxMapDelegate'));

// Loading fallback component
function MapLoadingFallback({ provider }) {
  const providerNames = {
    google: 'Google Maps',
    osm: 'OpenStreetMap',
    mapbox: 'Mapbox'
  };
  
  return (
    <div className="flex items-center justify-center h-full bg-gray-800">
      <div className="text-white flex items-center gap-2">
        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
        Caricamento {providerNames[provider] || 'mappa'}...
      </div>
    </div>
  );
}

/**
 * MapView - Multi-Provider Coordinator
 */
export default function MapView({
  controller,
  provider = 'google',
  mapType,
  height = '100%',
  onVehicleClick,
  onMapReady,
  hideMapTypeControl = true
}) {
  // Determine the delegate component based on provider
  const DelegateComponent = useMemo(() => {
    switch (provider) {
      case 'osm':
        return LeafletMapDelegate;
      case 'mapbox':
        return MapboxMapDelegate;
      case 'google':
      default:
        return GoogleMapDelegate;
    }
  }, [provider]);

  // Map mapType prop to provider-specific prop name
  const delegateProps = useMemo(() => {
    const baseProps = {
      controller,
      height,
      onVehicleClick,
      onMapReady,
      hideMapTypeControl
    };

    switch (provider) {
      case 'osm':
        return {
          ...baseProps,
          tileProvider: mapType || 'standard'
        };
      case 'mapbox':
        return {
          ...baseProps,
          mapStyle: mapType || 'streets'
        };
      case 'google':
      default:
        return {
          ...baseProps,
          mapType: mapType || 'roadmap'
        };
    }
  }, [provider, mapType, controller, height, onVehicleClick, onMapReady, hideMapTypeControl]);

  return (
    <div style={{ height, width: '100%' }} className="relative">
      <Suspense fallback={<MapLoadingFallback provider={provider} />}>
        {/* Key forces remount when provider changes */}
        <DelegateComponent key={provider} {...delegateProps} />
      </Suspense>
    </div>
  );
}
