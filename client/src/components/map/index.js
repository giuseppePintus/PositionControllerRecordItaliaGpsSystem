/**
 * Map Components Index - Export all map-related components and utilities
 * 
 * New Architecture:
 * - MapView: Pure view component that renders what the controller provides
 * - MapController: Manages state, drawables, and map interactions
 * - Drawables: Polymorphic classes for vehicles, geofences, routes, markers
 * - Providers: Google Maps provider with icon creation support
 * 
 * Usage:
 * ```jsx
 * import MapView from './components/MapView';
 * import { useMapController } from './hooks/useMapController';
 * import { VehicleDrawable, RouteDrawable } from './components/map/drawables';
 * 
 * function MyComponent({ vehicles }) {
 *   const { controller } = useMapController();
 *   
 *   useEffect(() => {
 *     controller.updateVehicles(vehicles);
 *   }, [vehicles]);
 *   
 *   return <MapView controller={controller} />;
 * }
 * ```
 */

// UI Components
export { MapSelector } from './MapSelector';
export { VehicleInfoWindow } from './VehicleInfoWindow';

// Drawable classes
export {
  BaseDrawable,
  VehicleDrawable,
  GeofenceDrawable,
  MarkerDrawable,
  PolylineDrawable,
  RouteDrawable,
  ClusterDrawable,
  VEHICLE_TYPES,
  VEHICLE_COLORS,
  ICON_CONFIG,
  GEOFENCE_TYPES,
  MARKER_TYPES,
  POLYLINE_TYPES,
  ROUTE_CONFIG,
  ROUTE_COLORS,
  STOP_TYPES,
  CLUSTER_CONFIG,
  CLUSTER_COLORS,
  determineVehicleType,
  createDrawable,
  createRouteDrawable,
  getClusterOptions
} from './drawables';

// Map providers
export {
  BaseMapProvider,
  GoogleMapsProvider,
  OpenStreetMapProvider,
  GOOGLE_MAP_TYPES,
  OSM_TILE_PROVIDERS,
  MAP_PROVIDER_TYPES,
  createMapProvider,
  getAvailableProviders
} from './providers';
