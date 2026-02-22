/**
 * MapboxMapDelegate.jsx - Mapbox GL Implementation
 * 
 * Renders map using react-map-gl (Mapbox GL JS wrapper)
 * Supports: markers, clustering, polylines, polygons, circles
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl, ScaleControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GEOFENCE_TYPES } from '../drawables/GeofenceDrawable';

// Mapbox access token - should be set in environment
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// Mapbox style configurations
export const MAPBOX_STYLES = {
  streets: {
    id: 'streets',
    name: 'Streets',
    url: 'mapbox://styles/mapbox/streets-v12',
    icon: '🗺️'
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-v9',
    icon: '🛰️'
  },
  satelliteStreets: {
    id: 'satelliteStreets',
    name: 'Satellite Streets',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
    icon: '🌍'
  },
  outdoors: {
    id: 'outdoors',
    name: 'Outdoors',
    url: 'mapbox://styles/mapbox/outdoors-v12',
    icon: '⛰️'
  },
  light: {
    id: 'light',
    name: 'Light',
    url: 'mapbox://styles/mapbox/light-v11',
    icon: '☀️'
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    url: 'mapbox://styles/mapbox/dark-v11',
    icon: '🌙'
  },
  navigation: {
    id: 'navigation',
    name: 'Navigation',
    url: 'mapbox://styles/mapbox/navigation-day-v1',
    icon: '🧭'
  }
};

export default function MapboxMapDelegate({
  controller,
  height = '100%',
  mapStyle = 'streets',
  onMapReady,
  onVehicleClick
}) {
  const mapRef = useRef(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);
  const [, forceRender] = useState(0);
  const [viewState, setViewState] = useState(null);
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

  // Get style config
  const styleConfig = MAPBOX_STYLES[mapStyle] || MAPBOX_STYLES.streets;

  // Initial view state
  const initialViewState = useMemo(() => ({
    longitude: controllerState.center?.lng || 12.4964,
    latitude: controllerState.center?.lat || 41.9028,
    zoom: controllerState.zoom || 6
  }), []);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    if (controller && mapProvider && !wasReadyRef.current) {
      mapProvider.setReady(true);
      wasReadyRef.current = true;
      onMapReady?.();
      
      setTimeout(() => {
        controller.refresh();
      }, 300);
    }
  }, [controller, mapProvider, onMapReady]);

  // Subscribe to controller updates
  useEffect(() => {
    if (!controller) return;
    
    const handleUpdate = (event) => {
      forceRender(n => n + 1);
      
      if (event.type === 'fitBounds' && mapRef.current && event.data) {
        const { sw, ne } = event.data;
        mapRef.current.fitBounds(
          [[sw.lng, sw.lat], [ne.lng, ne.lat]],
          { padding: 50 }
        );
      }
      
      if (event.type === 'view') {
        const state = controller.getState();
        if (state.center && mapRef.current) {
          mapRef.current.flyTo({
            center: [state.center.lng, state.center.lat],
            zoom: state.zoom
          });
        }
      }
    };
    
    const unsubscribeUpdate = controller.onUpdate(handleUpdate);
    const unsubscribeVehicleSelect = controller.onVehicleSelect((id, vehicle) => {
      setSelectedVehicle(vehicle?.data || null);
      if (vehicle?.data) {
        const pos = vehicle.getPosition?.() || {
          lat: vehicle.data.posizione?.latitude,
          lng: vehicle.data.posizione?.longitude
        };
        if (pos.lat && pos.lng) {
          setPopupInfo({ ...vehicle.data, position: pos });
        }
      } else {
        setPopupInfo(null);
      }
    });
    
    return () => {
      unsubscribeUpdate();
      unsubscribeVehicleSelect();
    };
  }, [controller]);

  // Force re-render every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      forceRender(n => n + 1);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Check for access token
  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-800 text-white p-4">
        <div className="text-yellow-500 text-xl mb-4">⚠️ Mapbox Token Required</div>
        <p className="text-center text-gray-300 mb-4">
          To use Mapbox, please add your access token to the environment:
        </p>
        <code className="bg-gray-900 px-4 py-2 rounded text-sm">
          VITE_MAPBOX_ACCESS_TOKEN=your_token_here
        </code>
        <p className="text-center text-gray-400 mt-4 text-sm">
          Get your free token at <a href="https://mapbox.com" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">mapbox.com</a>
        </p>
      </div>
    );
  }

  // Convert vehicle drawables to GeoJSON for clustering
  const vehicleGeoJSON = useMemo(() => {
    if (!vehicleDrawables?.length) return null;
    
    return {
      type: 'FeatureCollection',
      features: vehicleDrawables.map(drawable => {
        const position = drawable.getPosition();
        if (!position) return null;
        
        return {
          type: 'Feature',
          id: drawable.id,
          geometry: {
            type: 'Point',
            coordinates: [position.lng, position.lat]
          },
          properties: {
            id: drawable.id,
            data: JSON.stringify(drawable.data)
          }
        };
      }).filter(Boolean)
    };
  }, [vehicleDrawables, renderVersion]);

  // Render markers (without clustering for now - can add supercluster later)
  const renderMarkers = () => {
    if (!vehicleDrawables?.length) return null;
    
    return vehicleDrawables.map(drawable => {
      const position = drawable.getPosition();
      if (!position) return null;
      
      const data = drawable.data;
      const speed = data?.posizione?.speed || data?.speed || 0;
      const isMoving = speed > 3;
      
      return (
        <Marker
          key={`marker-${drawable.id}-v${renderVersion}`}
          longitude={position.lng}
          latitude={position.lat}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            controller?.selectVehicle(drawable.id);
            setSelectedVehicle(data);
            setPopupInfo({ ...data, position });
            onVehicleClick?.(data);
          }}
        >
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer transform hover:scale-110 transition-transform ${
              isMoving ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{
              border: '2px solid white',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}
          >
            🚛
          </div>
        </Marker>
      );
    });
  };

  // Convert geofences to GeoJSON layers
  const geofenceLayers = useMemo(() => {
    if (!geofenceDrawables?.length) return { circles: [], polygons: [] };
    
    const circles = [];
    const polygons = [];
    
    geofenceDrawables.forEach(drawable => {
      const style = drawable.getStyle();
      
      if (drawable.type === GEOFENCE_TYPES.CIRCLE) {
        const center = drawable.getCenter();
        // Create circle as polygon approximation (Mapbox doesn't have native circles)
        const steps = 64;
        const coordinates = [];
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * 2 * Math.PI;
          const dx = Math.cos(angle) * drawable.radius / 111320; // meters to degrees (approx)
          const dy = Math.sin(angle) * drawable.radius / (111320 * Math.cos(center.lat * Math.PI / 180));
          coordinates.push([center.lng + dy, center.lat + dx]);
        }
        
        circles.push({
          id: drawable.id,
          coordinates: [coordinates],
          style
        });
      } else {
        const path = drawable.getPath();
        polygons.push({
          id: drawable.id,
          coordinates: [path.map(p => [p.lng, p.lat])],
          style
        });
      }
    });
    
    return { circles, polygons };
  }, [geofenceDrawables]);

  // Render geofences
  const renderGeofences = () => {
    const allGeofences = [...geofenceLayers.circles, ...geofenceLayers.polygons];
    
    return allGeofences.map(geofence => (
      <Source
        key={geofence.id}
        type="geojson"
        data={{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: geofence.coordinates
          }
        }}
      >
        <Layer
          type="fill"
          paint={{
            'fill-color': geofence.style.fillColor,
            'fill-opacity': geofence.style.fillOpacity
          }}
        />
        <Layer
          type="line"
          paint={{
            'line-color': geofence.style.strokeColor,
            'line-width': geofence.style.strokeWeight,
            'line-opacity': geofence.style.strokeOpacity
          }}
        />
      </Source>
    ));
  };

  // Render routes as polylines
  const renderRoutes = () => {
    if (!routeDrawables?.length) return null;
    
    return routeDrawables.map(drawable => {
      const style = drawable.getStyle();
      const path = drawable.getPath();
      
      if (!path?.length) return null;
      
      return (
        <Source
          key={drawable.id}
          type="geojson"
          data={{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: path.map(p => [p.lng, p.lat])
            }
          }}
        >
          <Layer
            type="line"
            paint={{
              'line-color': style.strokeColor,
              'line-width': style.strokeWeight,
              'line-opacity': style.strokeOpacity
            }}
          />
        </Source>
      );
    });
  };

  // Render popup
  const renderPopup = () => {
    if (!popupInfo) return null;
    
    const speed = popupInfo.posizione?.speed || popupInfo.speed || 0;
    const isMoving = speed > 3;
    const plate = (popupInfo.plate || popupInfo.targa || popupInfo.targa_camion || '').replace(/\*+$/, '');

    return (
      <Popup
        longitude={popupInfo.position.lng}
        latitude={popupInfo.position.lat}
        anchor="bottom"
        onClose={() => {
          setPopupInfo(null);
          setSelectedVehicle(null);
          controller?.clearSelection();
        }}
        closeButton={true}
        closeOnClick={false}
      >
        <div className="p-2 min-w-[200px]">
          <h3 className="font-bold text-lg mb-2">
            {popupInfo.isCoupled ? '🔗 ' : '🚛 '}
            {popupInfo.nickname || plate}
          </h3>
          
          {popupInfo.isCoupled && popupInfo.coupledWith && (
            <p className="text-sm text-purple-600 mb-1">
              Accoppiato con: {popupInfo.coupledWith}
            </p>
          )}
          
          <div className="text-sm space-y-1">
            <p>
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isMoving ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {isMoving ? 'In movimento' : 'Fermo'} - {Math.round(speed)} km/h
            </p>
            {popupInfo.address && (
              <p className="text-xs text-gray-600">{popupInfo.address}</p>
            )}
            {popupInfo.lastSync && (
              <p className="text-xs text-gray-500">
                {new Date(popupInfo.lastSync).toLocaleString('it-IT')}
              </p>
            )}
          </div>
        </div>
      </Popup>
    );
  };

  return (
    <div style={{ height, width: '100%' }} className="relative">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={styleConfig.url}
        onLoad={handleMapLoad}
        onMove={evt => setViewState(evt.viewState)}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" />
        
        {renderGeofences()}
        {renderRoutes()}
        {renderMarkers()}
        {renderPopup()}
      </Map>
    </div>
  );
}
