/**
 * Drawables Index - Export all drawable classes
 */
export { BaseDrawable } from './BaseDrawable';
export { VehicleDrawable, VEHICLE_TYPES, VEHICLE_COLORS, ICON_CONFIG, determineVehicleType } from './VehicleDrawable';
export { GeofenceDrawable, GEOFENCE_TYPES } from './GeofenceDrawable';
export { MarkerDrawable, MARKER_TYPES } from './MarkerDrawable';
export { PolylineDrawable, POLYLINE_TYPES } from './PolylineDrawable';
export { 
  RouteDrawable, 
  ROUTE_CONFIG, 
  ROUTE_COLORS, 
  STOP_TYPES,
  createRouteDrawable 
} from './RouteDrawable';
export { 
  ClusterDrawable, 
  CLUSTER_CONFIG, 
  CLUSTER_COLORS, 
  CLUSTER_SIZES,
  getClusterOptions,
  getClusterStyles,
  generateClusterSvg 
} from './ClusterDrawable';

/**
 * Factory function to create drawable from type
 * @param {string} type - Drawable type
 * @param {object} options - Drawable options
 * @returns {BaseDrawable|null}
 */
export function createDrawable(type, options) {
  const { VehicleDrawable } = require('./VehicleDrawable');
  const { GeofenceDrawable } = require('./GeofenceDrawable');
  const { MarkerDrawable } = require('./MarkerDrawable');
  const { PolylineDrawable } = require('./PolylineDrawable');
  const { RouteDrawable } = require('./RouteDrawable');
  const { ClusterDrawable } = require('./ClusterDrawable');
  const { BaseDrawable } = require('./BaseDrawable');
  
  switch (type) {
    case 'vehicle':
      return new VehicleDrawable(options);
    case 'geofence':
      return new GeofenceDrawable(options);
    case 'marker':
      return new MarkerDrawable(options);
    case 'polyline':
      return new PolylineDrawable(options);
    case 'route':
      return new RouteDrawable(options);
    case 'cluster':
      return new ClusterDrawable(options);
    default:
      return new BaseDrawable(options);
  }
}
