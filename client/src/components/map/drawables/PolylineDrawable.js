/**
 * PolylineDrawable - Drawable class for polylines/routes on the map
 * 
 * Handles rendering of route paths, traces, and custom polylines.
 */
import { BaseDrawable } from './BaseDrawable';

// Polyline types
export const POLYLINE_TYPES = {
  ROUTE: 'route',
  TRACE: 'trace',
  PATH: 'path',
  CUSTOM: 'custom',
};

// Default polyline styles
const POLYLINE_STYLES = {
  route: {
    strokeColor: '#3b82f6',
    strokeOpacity: 1,
    strokeWeight: 4,
  },
  trace: {
    strokeColor: '#22c55e',
    strokeOpacity: 0.8,
    strokeWeight: 3,
  },
  path: {
    strokeColor: '#6b7280',
    strokeOpacity: 0.6,
    strokeWeight: 2,
  },
  custom: {
    strokeColor: '#ec4899',
    strokeOpacity: 1,
    strokeWeight: 3,
  },
};

export class PolylineDrawable extends BaseDrawable {
  constructor(options = {}) {
    super(options);
    
    // Polyline-specific properties
    this.path = options.path || []; // Array of { lat, lng }
    this.polylineType = options.polylineType || POLYLINE_TYPES.ROUTE;
    this.strokeColor = options.strokeColor || POLYLINE_STYLES[this.polylineType]?.strokeColor || '#3b82f6';
    this.strokeOpacity = options.strokeOpacity ?? POLYLINE_STYLES[this.polylineType]?.strokeOpacity ?? 1;
    this.strokeWeight = options.strokeWeight ?? POLYLINE_STYLES[this.polylineType]?.strokeWeight ?? 4;
    this.geodesic = options.geodesic !== false;
    this.editable = options.editable || false;
    this.draggable = options.draggable || false;
    this.icons = options.icons || null; // For arrows, dashes, etc.
  }

  getType() {
    return 'polyline';
  }

  /**
   * Get the center position (midpoint of the path)
   * @returns {{ lat: number, lng: number }}
   */
  getPosition() {
    if (this.path.length === 0) {
      return { lat: 0, lng: 0 };
    }
    
    const midIndex = Math.floor(this.path.length / 2);
    return this.path[midIndex];
  }

  /**
   * Get the path coordinates
   * @returns {Array<{ lat: number, lng: number }>}
   */
  getPath() {
    return this.path;
  }

  /**
   * Set the path coordinates
   * @param {Array<{ lat: number, lng: number }>} path
   */
  setPath(path) {
    this.path = path;
  }

  /**
   * Add a point to the path
   * @param {{ lat: number, lng: number }} point
   */
  addPoint(point) {
    this.path.push(point);
  }

  /**
   * Get the style configuration for this polyline
   * @returns {object}
   */
  getStyle() {
    return {
      ...super.getStyle(),
      strokeColor: this.strokeColor,
      strokeOpacity: this.strokeOpacity,
      strokeWeight: this.strokeWeight,
      geodesic: this.geodesic,
      editable: this.editable,
      draggable: this.draggable,
      icons: this.icons,
    };
  }

  /**
   * Get the bounds of this polyline
   * @returns {{ north: number, south: number, east: number, west: number }|null}
   */
  getBounds() {
    if (this.path.length === 0) return null;
    
    const lats = this.path.map(p => p.lat);
    const lngs = this.path.map(p => p.lng);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }

  /**
   * Calculate the total distance of this polyline in meters
   * @returns {number} Distance in meters
   */
  getDistance() {
    if (this.path.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < this.path.length; i++) {
      totalDistance += this.calculateDistance(this.path[i - 1], this.path[i]);
    }
    
    return totalDistance;
  }

  /**
   * Calculate distance between two points in meters
   * @param {{ lat: number, lng: number }} p1
   * @param {{ lat: number, lng: number }} p2
   * @returns {number} Distance in meters
   */
  calculateDistance(p1, p2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get a point along the path at a specific percentage
   * @param {number} percentage - 0 to 1
   * @returns {{ lat: number, lng: number }|null}
   */
  getPointAtPercentage(percentage) {
    if (this.path.length === 0) return null;
    if (percentage <= 0) return this.path[0];
    if (percentage >= 1) return this.path[this.path.length - 1];
    
    const totalDistance = this.getDistance();
    const targetDistance = totalDistance * percentage;
    
    let accumulatedDistance = 0;
    for (let i = 1; i < this.path.length; i++) {
      const segmentDistance = this.calculateDistance(this.path[i - 1], this.path[i]);
      if (accumulatedDistance + segmentDistance >= targetDistance) {
        // Interpolate within this segment
        const ratio = (targetDistance - accumulatedDistance) / segmentDistance;
        return {
          lat: this.path[i - 1].lat + (this.path[i].lat - this.path[i - 1].lat) * ratio,
          lng: this.path[i - 1].lng + (this.path[i].lng - this.path[i - 1].lng) * ratio,
        };
      }
      accumulatedDistance += segmentDistance;
    }
    
    return this.path[this.path.length - 1];
  }

  getCssClasses() {
    const classes = ['polyline'];
    classes.push(`polyline-${this.polylineType}`);
    if (this.editable) classes.push('polyline-editable');
    return classes.join(' ');
  }

  /**
   * Create a PolylineDrawable from encoded polyline string
   * @param {string} encoded - Google encoded polyline string
   * @param {object} options
   * @returns {PolylineDrawable}
   */
  static fromEncodedPolyline(encoded, options = {}) {
    const path = PolylineDrawable.decodePolyline(encoded);
    return new PolylineDrawable({
      path,
      ...options
    });
  }

  /**
   * Decode Google encoded polyline string
   * @param {string} encoded
   * @returns {Array<{ lat: number, lng: number }>}
   */
  static decodePolyline(encoded) {
    if (!encoded) return [];
    
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return poly;
  }

  /**
   * Create a route polyline
   * @param {Array<{ lat: number, lng: number }>} path
   * @param {object} options
   * @returns {PolylineDrawable}
   */
  static createRoute(path, options = {}) {
    return new PolylineDrawable({
      path,
      polylineType: POLYLINE_TYPES.ROUTE,
      ...options
    });
  }

  /**
   * Create a trace polyline (for vehicle history)
   * @param {Array<{ lat: number, lng: number }>} path
   * @param {object} options
   * @returns {PolylineDrawable}
   */
  static createTrace(path, options = {}) {
    return new PolylineDrawable({
      path,
      polylineType: POLYLINE_TYPES.TRACE,
      ...options
    });
  }

  toJSON() {
    return {
      ...super.toJSON(),
      path: this.path,
      polylineType: this.polylineType,
      strokeColor: this.strokeColor,
      strokeOpacity: this.strokeOpacity,
      strokeWeight: this.strokeWeight,
      geodesic: this.geodesic
    };
  }
}

export default PolylineDrawable;
