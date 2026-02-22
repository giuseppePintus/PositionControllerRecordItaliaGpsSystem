/**
 * GoogleMapDelegate.jsx - Google Maps Implementation
 * 
 * Following OFFICIAL @react-google-maps/api pattern exactly.
 * Uses React.memo and conditional rendering as per documentation.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  GoogleMap, 
  useJsApiLoader, 
  Marker, 
  InfoWindow, 
  Circle, 
  Polygon, 
  Polyline, 
  TrafficLayer, 
  MarkerClusterer 
} from '@react-google-maps/api';
import { GEOFENCE_TYPES } from '../drawables/GeofenceDrawable';
import { getClusterOptions } from '../drawables/ClusterDrawable';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const libraries = ['drawing', 'places', 'geometry'];

// Container style - MUST have explicit dimensions
const containerStyle = {
  width: '100%',
  height: '100%'
};

// Default center (Italy)
const defaultCenter = {
  lat: 41.9028,
  lng: 12.4964
};

// Map type configurations
export const GOOGLE_MAP_TYPES = {
  roadmap: { id: 'roadmap', name: 'Roadmap', icon: '🗺️' },
  satellite: { id: 'satellite', name: 'Satellite', icon: '🛰️' },
  hybrid: { id: 'hybrid', name: 'Hybrid', icon: '🌍' },
  terrain: { id: 'terrain', name: 'Terrain', icon: '⛰️' }
};

function GoogleMapDelegate({
  controller,
  height = '100%',
  mapType = 'roadmap',
  onMapReady,
  onVehicleClick,
  hideMapTypeControl = true
}) {
  // ============================================
  // GOOGLE MAPS LOADER - Official Pattern
  // ============================================
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // ============================================
  // STATE
  // ============================================
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [clusteringEnabled, setClusteringEnabled] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showTraffic, setShowTraffic] = useState(false);
  const [geofences, setGeofences] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [center, setCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(6);

  // Refs
  const wasReadyRef = useRef(false);

  // Get provider from controller
  const mapProvider = controller?.getProvider?.();

  // ============================================
  // SYNC FROM CONTROLLER
  // ============================================
  const syncFromController = useCallback(() => {
    if (!controller || !mapProvider?.isReady()) return;
    
    const controllerState = controller.getState() || {};
    const { vehicles: vehicleDrawables, geofences: geofenceDrawables, routes: routeDrawables } = 
      controller.getAllDrawables() || { vehicles: [], geofences: [], routes: [] };
    
    // Sync clustering
    const newClusteringEnabled = controllerState.enableClustering || false;
    setClusteringEnabled(newClusteringEnabled);
    
    // Sync traffic
    setShowTraffic(controllerState.showTraffic || false);
    
    // Transform drawables → markers
    const newMarkers = (vehicleDrawables || []).map(drawable => {
      const position = drawable.getPosition();
      const icon = drawable.getIcon(mapProvider);
      const style = drawable.getStyle();
      
      return {
        id: drawable.id,
        lat: position?.lat || 0,
        lng: position?.lng || 0,
        visible: !newClusteringEnabled,
        icon: icon,
        zIndex: style?.zIndex || 1,
        data: drawable.data,
        drawable: drawable
      };
    });
    
    setMarkers(newMarkers);
    setGeofences(geofenceDrawables || []);
    setRoutes(routeDrawables || []);
  }, [controller, mapProvider]);

  // ============================================
  // CALLBACKS - Official Pattern
  // ============================================
  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
    controller?.setMapInstance(mapInstance);
    
    // Notify ready
    if (mapProvider && !wasReadyRef.current) {
      mapProvider.setReady(true);
      wasReadyRef.current = true;
      onMapReady?.();
      
      // Initial sync
      setTimeout(() => {
        syncFromController();
        controller?.refresh();
      }, 300);
    }
  }, [controller, mapProvider, onMapReady, syncFromController]);

  const onUnmount = useCallback(() => {
    setMap(null);
    controller?.setMapInstance(null);
  }, [controller]);

  // ============================================
  // SUBSCRIBE TO CONTROLLER
  // ============================================
  useEffect(() => {
    if (!controller) return;
    
    const handleUpdate = (event) => {
      syncFromController();
      
      if (event.type === 'fitBounds' && map && event.data) {
        const bounds = new window.google.maps.LatLngBounds(
          event.data.sw,
          event.data.ne
        );
        map.fitBounds(bounds);
      }
      
      if (event.type === 'view' && map) {
        const state = controller.getState();
        if (state.center) {
          setCenter(state.center);
          map.panTo(state.center);
        }
        if (state.zoom) {
          setZoom(state.zoom);
          map.setZoom(state.zoom);
        }
      }
    };
    
    const unsubscribeUpdate = controller.onUpdate(handleUpdate);
    const unsubscribeVehicleSelect = controller.onVehicleSelect((id, vehicle) => {
      setSelectedVehicle(vehicle?.data || null);
    });
    
    return () => {
      unsubscribeUpdate();
      unsubscribeVehicleSelect();
    };
  }, [controller, map, syncFromController]);

  // Periodic sync
  useEffect(() => {
    if (!isLoaded || !map) return;
    
    const interval = setInterval(syncFromController, 5000);
    return () => clearInterval(interval);
  }, [isLoaded, map, syncFromController]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleMarkerClick = useCallback((marker) => {
    controller?.selectVehicle(marker.id);
    setSelectedVehicle(marker.data);
    onVehicleClick?.(marker.data);
  }, [controller, onVehicleClick]);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const visibleMarkers = markers.filter(m => m.visible && m.icon);
  const clusterableMarkers = markers.filter(m => m.icon);

  // ============================================
  // RENDER - Official Pattern with ternary
  // ============================================
  return isLoaded ? (
    <div style={{ height, width: '100%', minHeight: '400px' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: !hideMapTypeControl,
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeId: mapType
        }}
      >
        {/* Traffic Layer */}
        {showTraffic && <TrafficLayer />}
        
        {/* Geofences */}
        {geofences.map(drawable => {
          const style = drawable.getStyle();
          
          if (drawable.type === GEOFENCE_TYPES.CIRCLE) {
            return (
              <Circle
                key={drawable.id}
                center={drawable.getCenter()}
                radius={drawable.radius}
                options={{
                  strokeColor: style.strokeColor,
                  strokeOpacity: style.strokeOpacity,
                  strokeWeight: style.strokeWeight,
                  fillColor: style.fillColor,
                  fillOpacity: style.fillOpacity
                }}
              />
            );
          }
          
          return (
            <Polygon
              key={drawable.id}
              paths={drawable.getPath()}
              options={{
                strokeColor: style.strokeColor,
                strokeOpacity: style.strokeOpacity,
                strokeWeight: style.strokeWeight,
                fillColor: style.fillColor,
                fillOpacity: style.fillOpacity
              }}
            />
          );
        })}
        
        {/* Routes */}
        {routes.map(drawable => {
          const style = drawable.getStyle();
          return (
            <Polyline
              key={drawable.id}
              path={drawable.getPath()}
              options={{
                strokeColor: style.strokeColor,
                strokeOpacity: style.strokeOpacity,
                strokeWeight: style.strokeWeight
              }}
            />
          );
        })}
        
        {/* Individual Markers - Only when clustering DISABLED */}
        {!clusteringEnabled && visibleMarkers.map(marker => (
          <Marker
            key={`individual-${marker.id}`}
            position={{ lat: marker.lat, lng: marker.lng }}
            icon={marker.icon}
            zIndex={marker.zIndex}
            onClick={() => handleMarkerClick(marker)}
          />
        ))}
        
        {/* Clustered Markers - Only when clustering ENABLED */}
        {clusteringEnabled && clusterableMarkers.length > 0 && (
          <MarkerClusterer options={getClusterOptions()}>
            {(clusterer) => (
              <>
                {clusterableMarkers.map(marker => (
                  <Marker
                    key={`clustered-${marker.id}`}
                    position={{ lat: marker.lat, lng: marker.lng }}
                    icon={marker.icon}
                    zIndex={marker.zIndex}
                    clusterer={clusterer}
                    onClick={() => handleMarkerClick(marker)}
                  />
                ))}
              </>
            )}
          </MarkerClusterer>
        )}
        
        {/* Info Window */}
        {selectedVehicle && (() => {
          const position = {
            lat: selectedVehicle.posizione?.latitude || selectedVehicle.position?.lat,
            lng: selectedVehicle.posizione?.longitude || selectedVehicle.position?.lng
          };
          
          if (!position.lat || !position.lng) return null;
          
          const speed = selectedVehicle.posizione?.speed || selectedVehicle.speed || 0;
          const isMoving = speed > 3;
          const plate = (selectedVehicle.plate || selectedVehicle.targa || selectedVehicle.targa_camion || '').replace(/\*+$/, '');

          return (
            <InfoWindow
              position={position}
              onCloseClick={() => {
                setSelectedVehicle(null);
                controller?.clearSelection();
              }}
            >
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg mb-2">
                  {selectedVehicle.isCoupled ? '🔗 ' : '🚛 '}
                  {selectedVehicle.nickname || plate}
                </h3>
                
                {selectedVehicle.isCoupled && selectedVehicle.coupledWith && (
                  <p className="text-sm text-purple-600 mb-1">
                    Accoppiato con: {selectedVehicle.coupledWith}
                  </p>
                )}
                
                <div className="text-sm space-y-1">
                  <p>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isMoving ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {isMoving ? 'In movimento' : 'Fermo'} - {Math.round(speed)} km/h
                  </p>
                  {selectedVehicle.address && (
                    <p className="text-xs text-gray-600">{selectedVehicle.address}</p>
                  )}
                  {selectedVehicle.lastSync && (
                    <p className="text-xs text-gray-500">
                      {new Date(selectedVehicle.lastSync).toLocaleString('it-IT')}
                    </p>
                  )}
                </div>
              </div>
            </InfoWindow>
          );
        })()}
      </GoogleMap>
    </div>
  ) : (
    <div className="flex items-center justify-center bg-gray-800" style={{ height, minHeight: '400px' }}>
      <div className="text-white flex items-center gap-2">
        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
        Caricamento Google Maps...
      </div>
    </div>
  );
}

export default React.memo(GoogleMapDelegate);
