/**
 * LeafletMapDelegate.jsx - OpenStreetMap Implementation
 * 
 * Renders map using react-leaflet
 * Supports: markers, clustering, polylines, polygons, circles
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GEOFENCE_TYPES } from '../drawables/GeofenceDrawable';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Tile layer configurations
export const OSM_TILE_PROVIDERS = {
  standard: {
    id: 'standard',
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  hot: {
    id: 'hot',
    name: 'Humanitarian',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap, Tiles: HOT'
  },
  topo: {
    id: 'topo',
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap, SRTM | OpenTopoMap'
  },
  cartoLight: {
    id: 'cartoLight',
    name: 'Carto Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap, &copy; CARTO'
  },
  cartoDark: {
    id: 'cartoDark',
    name: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap, &copy; CARTO'
  }
};

// Map event handler component
function MapEventHandler({ onReady, onMove, controller }) {
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      onReady?.(map);
    }
  }, [map, onReady]);
  
  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      onMove?.({ lat: center.lat, lng: center.lng }, zoom);
    }
  });
  
  // Subscribe to controller updates
  useEffect(() => {
    if (!controller) return;
    
    const handleUpdate = (event) => {
      if (event.type === 'fitBounds' && event.data) {
        const { sw, ne } = event.data;
        map.fitBounds([[sw.lat, sw.lng], [ne.lat, ne.lng]]);
      }
      
      if (event.type === 'view') {
        const state = controller.getState();
        if (state.center) {
          map.setView([state.center.lat, state.center.lng], state.zoom);
        }
      }
    };
    
    const unsubscribe = controller.onUpdate(handleUpdate);
    return () => unsubscribe();
  }, [controller, map]);
  
  return null;
}

// Create Leaflet icon from SVG or URL
function createLeafletIcon(iconConfig, size = [32, 32]) {
  if (!iconConfig) return null;
  
  // If it's already a Leaflet icon
  if (iconConfig instanceof L.Icon || iconConfig instanceof L.DivIcon) {
    return iconConfig;
  }
  
  // If it's a Leaflet divIcon config (from OpenStreetMapProvider.createIcon)
  if (iconConfig.options && iconConfig.options.html) {
    return iconConfig;
  }
  
  // If it's a Google Maps style icon (has url property)
  if (iconConfig.url) {
    return L.icon({
      iconUrl: iconConfig.url,
      iconSize: [iconConfig.scaledSize?.width || size[0], iconConfig.scaledSize?.height || size[1]],
      iconAnchor: [iconConfig.anchor?.x || size[0]/2, iconConfig.anchor?.y || size[1]/2],
      popupAnchor: [0, -size[1]/2]
    });
  }
  
  // If it's a data URL (SVG)
  if (typeof iconConfig === 'string' && iconConfig.startsWith('data:')) {
    return L.icon({
      iconUrl: iconConfig,
      iconSize: size,
      iconAnchor: [size[0]/2, size[1]/2],
      popupAnchor: [0, -size[1]/2]
    });
  }
  
  return null;
}

// Create Leaflet DivIcon from raw SVG string
function createLeafletDivIcon(svg, width, height, anchorX, anchorY) {
  return L.divIcon({
    html: svg,
    iconSize: [width, height],
    iconAnchor: [anchorX, anchorY],
    className: 'custom-marker-icon'
  });
}

// Custom cluster icon creator for Leaflet
function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  
  // Determine size and color based on count
  let size, bgColor, borderColor;
  if (count < 10) {
    size = 40;
    bgColor = '#3b82f6';
    borderColor = '#1e40af';
  } else if (count < 50) {
    size = 50;
    bgColor = '#8b5cf6';
    borderColor = '#5b21b6';
  } else {
    size = 60;
    bgColor = '#ec4899';
    borderColor = '#9d174d';
  }
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${bgColor}" stroke="${borderColor}" stroke-width="3"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 * 0.6}" fill="${bgColor}" opacity="0.6"/>
      <text x="${size/2}" y="${size/2 + 5}" text-anchor="middle" font-size="${size * 0.35}" font-weight="bold" fill="white">${count}</text>
    </svg>
  `;
  
  return L.divIcon({
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    className: 'custom-cluster-icon'
  });
}

export default function LeafletMapDelegate({
  controller,
  height = '100%',
  tileProvider = 'standard',
  onMapReady,
  onVehicleClick
}) {
  const [map, setMap] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [, forceRender] = useState(0);
  const wasReadyRef = useRef(false);

  // Get provider from controller
  const mapProvider = controller?.getProvider?.();
  
  // Get state from controller
  const controllerState = controller?.getState() || {};
  const { 
    enableClustering = false,
    renderVersion = 0,
    clusterVersion = 0
  } = controllerState;

  // Get drawables from controller
  const { vehicles: vehicleDrawables, geofences: geofenceDrawables, routes: routeDrawables } = 
    controller?.getAllDrawables() || { vehicles: [], geofences: [], routes: [] };

  // Get tile layer config
  const tileConfig = OSM_TILE_PROVIDERS[tileProvider] || OSM_TILE_PROVIDERS.standard;

  // Initial center and zoom
  const center = controllerState.center || { lat: 41.9028, lng: 12.4964 };
  const zoom = controllerState.zoom || 6;

  // Handle map ready
  const handleMapReady = useCallback((mapInstance) => {
    setMap(mapInstance);
    
    if (controller && mapProvider && !wasReadyRef.current) {
      mapProvider.setReady(true);
      wasReadyRef.current = true;
      onMapReady?.();
      
      // Trigger refresh
      setTimeout(() => {
        controller.refresh();
      }, 300);
    }
  }, [controller, mapProvider, onMapReady]);

  // Handle vehicle select
  useEffect(() => {
    if (!controller) return;
    
    const unsubscribe = controller.onVehicleSelect((id, vehicle) => {
      setSelectedVehicle(vehicle?.data || null);
    });
    
    return () => unsubscribe();
  }, [controller]);

  // Subscribe to controller updates and force re-render
  useEffect(() => {
    if (!controller) return;
    
    const unsubscribe = controller.onUpdate(() => {
      // Force component re-render when controller updates
      forceRender(n => n + 1);
    });
    
    return () => unsubscribe();
  }, [controller]);

  // Force re-render every 5 seconds
  useEffect(() => {
    if (!map) return;
    
    const interval = setInterval(() => {
      forceRender(n => n + 1);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [map]);

  // Create vehicle markers
  const vehicleMarkers = useMemo(() => {
    if (!vehicleDrawables?.length) return [];
    
    return vehicleDrawables.map(drawable => {
      const position = drawable.getPosition();
      if (!position) return null;
      
      // Get icon directly from drawable SVG (provider-independent)
      let icon = null;
      try {
        // Use getSvg() directly - doesn't depend on provider being ready
        if (drawable.getSvg) {
          const { svg, width, height, anchorX, anchorY } = drawable.getSvg();
          icon = createLeafletDivIcon(svg, width, height, anchorX, anchorY);
        } else if (mapProvider?.isReady?.()) {
          // Fallback to provider-based icon
          const providerIcon = drawable.getIcon(mapProvider);
          icon = createLeafletIcon(providerIcon, [32, 32]);
        }
      } catch (e) {
        console.warn('Failed to create icon for', drawable.id, e);
      }
      
      // If still no icon, use default Leaflet marker
      if (!icon) {
        icon = new L.Icon.Default();
      }
      
      return {
        id: drawable.id,
        position: [position.lat, position.lng],
        icon,
        data: drawable.data,
        drawable
      };
    }).filter(Boolean);
  }, [vehicleDrawables, mapProvider, renderVersion]);

  // Render markers (with or without clustering)
  const renderMarkers = () => {
    if (!vehicleMarkers.length) return null;
    
    const markerElements = vehicleMarkers
      .filter(marker => marker.icon) // Ensure icon exists
      .map(marker => (
        <Marker
          key={`marker-${marker.id}-v${renderVersion}`}
          position={marker.position}
          icon={marker.icon}
          eventHandlers={{
            click: () => {
              controller?.selectVehicle(marker.id);
              setSelectedVehicle(marker.data);
              onVehicleClick?.(marker.data);
            }
          }}
        >
          {selectedVehicle && selectedVehicle.idServizio === marker.id && (
            <Popup
              position={marker.position}
              onClose={() => {
                setSelectedVehicle(null);
                controller?.clearSelection();
              }}
            >
              <VehiclePopupContent vehicle={selectedVehicle} />
            </Popup>
          )}
        </Marker>
      ));
    
    if (enableClustering) {
      return (
        <MarkerClusterGroup
          key={`cluster-v${clusterVersion}`}
          chunkedLoading
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          maxClusterRadius={80}
          iconCreateFunction={createClusterIcon}
        >
          {markerElements}
        </MarkerClusterGroup>
      );
    }
    
    return markerElements;
  };

  // Render geofences
  const renderGeofences = () => {
    if (!geofenceDrawables) return null;
    
    return geofenceDrawables.map(drawable => {
      const style = drawable.getStyle();
      const pathOptions = {
        color: style.strokeColor,
        weight: style.strokeWeight,
        opacity: style.strokeOpacity,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity
      };
      
      if (drawable.type === GEOFENCE_TYPES.CIRCLE) {
        const center = drawable.getCenter();
        return (
          <Circle
            key={drawable.id}
            center={[center.lat, center.lng]}
            radius={drawable.radius}
            pathOptions={pathOptions}
          />
        );
      }
      
      const path = drawable.getPath();
      return (
        <Polygon
          key={drawable.id}
          positions={path.map(p => [p.lat, p.lng])}
          pathOptions={pathOptions}
        />
      );
    });
  };

  // Render routes
  const renderRoutes = () => {
    if (!routeDrawables) return null;
    
    return routeDrawables.map(drawable => {
      const style = drawable.getStyle();
      const path = drawable.getPath();
      
      return (
        <Polyline
          key={drawable.id}
          positions={path.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: style.strokeColor,
            weight: style.strokeWeight,
            opacity: style.strokeOpacity
          }}
        />
      );
    });
  };

  return (
    <div style={{ height, width: '100%' }} className="relative">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url={tileConfig.url}
          attribution={tileConfig.attribution}
        />
        
        <MapEventHandler 
          onReady={handleMapReady}
          controller={controller}
        />
        
        {renderGeofences()}
        {renderRoutes()}
        {renderMarkers()}
      </MapContainer>
    </div>
  );
}

// Vehicle popup content component
function VehiclePopupContent({ vehicle }) {
  if (!vehicle) return null;
  
  const speed = vehicle.posizione?.speed || vehicle.speed || 0;
  const isMoving = speed > 3;
  const plate = (vehicle.plate || vehicle.targa || vehicle.targa_camion || '').replace(/\*+$/, '');

  return (
    <div className="p-2 min-w-[200px]">
      <h3 className="font-bold text-lg mb-2">
        {vehicle.isCoupled ? '🔗 ' : '🚛 '}
        {vehicle.nickname || plate}
      </h3>
      
      {vehicle.isCoupled && vehicle.coupledWith && (
        <p className="text-sm text-purple-600 mb-1">
          Accoppiato con: {vehicle.coupledWith}
        </p>
      )}
      
      <div className="text-sm space-y-1">
        <p>
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isMoving ? 'bg-green-500' : 'bg-red-500'}`}></span>
          {isMoving ? 'In movimento' : 'Fermo'} - {Math.round(speed)} km/h
        </p>
        {vehicle.address && (
          <p className="text-xs text-gray-600">{vehicle.address}</p>
        )}
        {vehicle.lastSync && (
          <p className="text-xs text-gray-500">
            {new Date(vehicle.lastSync).toLocaleString('it-IT')}
          </p>
        )}
      </div>
    </div>
  );
}
