/**
 * GeofenceDrawable - Drawable class for geofences on the map
 * 
 * Handles rendering of circles, polygons, and other geofence shapes.
 */
import { BaseDrawable } from './BaseDrawable';

// Geofence types
export const GEOFENCE_TYPES = {
  CIRCLE: 'circle',
  POLYGON: 'polygon',
  RECTANGLE: 'rectangle',
};

// Default geofence styles
const DEFAULT_GEOFENCE_STYLE = {
  strokeColor: '#2563eb',
  strokeOpacity: 0.8,
  strokeWeight: 2,
  fillColor: '#2563eb',
  fillOpacity: 0.2,
  clickable: true,
  editable: false,
  draggable: false,
};

export class GeofenceDrawable extends BaseDrawable {
  constructor(options = {}) {
    super(options);
    
    // Geofence-specific properties
    this.name = options.name || '';
    this.geofenceType = options.geofenceType || GEOFENCE_TYPES.POLYGON;
    this.coordinates = options.coordinates || [];
    this.radius = options.radius || 100; // For circles
    this.color = options.color || '#2563eb';
    this.fillOpacity = options.fillOpacity ?? 0.2;
    this.strokeOpacity = options.strokeOpacity ?? 0.8;
    this.strokeWeight = options.strokeWeight ?? 2;
    this.editable = options.editable || false;
    this.draggable = options.draggable || false;
  }

  getType() {
    return 'geofence';
  }

  /**
   * Get the center position of the geofence
   * For circles, this is the center
   * For polygons, this calculates the centroid
   * @returns {{ lat: number, lng: number }}
   */
  getPosition() {
    if (this.geofenceType === GEOFENCE_TYPES.CIRCLE && this.coordinates.length > 0) {
      return this.coordinates[0];
    }
    
    // Calculate centroid for polygon
    if (this.coordinates.length === 0) {
      return { lat: 0, lng: 0 };
    }
    
    const centroid = this.coordinates.reduce(
      (acc, coord) => ({
        lat: acc.lat + coord.lat,
        lng: acc.lng + coord.lng
      }),
      { lat: 0, lng: 0 }
    );
    
    return {
      lat: centroid.lat / this.coordinates.length,
      lng: centroid.lng / this.coordinates.length
    };
  }

  /**
   * Get the style configuration for this geofence
   * @returns {object} Style options
   */
  getStyle() {
    return {
      ...super.getStyle(),
      strokeColor: this.color,
      strokeOpacity: this.strokeOpacity,
      strokeWeight: this.strokeWeight,
      fillColor: this.color,
      fillOpacity: this.fillOpacity,
      clickable: true,
      editable: this.editable,
      draggable: this.draggable,
    };
  }

  /**
   * Get coordinates for the geofence path
   * @returns {Array<{ lat: number, lng: number }>}
   */
  getPath() {
    return this.coordinates.map(c => ({ lat: c.lat, lng: c.lng }));
  }

  /**
   * Get the bounds of this geofence
   * @returns {{ north: number, south: number, east: number, west: number }}
   */
  getBounds() {
    if (this.coordinates.length === 0) {
      return null;
    }
    
    if (this.geofenceType === GEOFENCE_TYPES.CIRCLE) {
      // Approximate bounds for circle
      const center = this.coordinates[0];
      const radiusDegrees = this.radius / 111000; // Approximate conversion
      return {
        north: center.lat + radiusDegrees,
        south: center.lat - radiusDegrees,
        east: center.lng + radiusDegrees,
        west: center.lng - radiusDegrees,
      };
    }
    
    // Calculate bounds for polygon
    const lats = this.coordinates.map(c => c.lat);
    const lngs = this.coordinates.map(c => c.lng);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }

  /**
   * Check if a point is inside this geofence
   * @param {{ lat: number, lng: number }} point
   * @returns {boolean}
   */
  containsPoint(point) {
    if (this.geofenceType === GEOFENCE_TYPES.CIRCLE) {
      const center = this.coordinates[0];
      const distance = this.calculateDistance(center, point);
      return distance <= this.radius;
    }
    
    // Point in polygon algorithm
    return this.pointInPolygon(point);
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
   * Point in polygon test using ray casting algorithm
   * @param {{ lat: number, lng: number }} point
   * @returns {boolean}
   */
  pointInPolygon(point) {
    let inside = false;
    const n = this.coordinates.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = this.coordinates[i].lng;
      const yi = this.coordinates[i].lat;
      const xj = this.coordinates[j].lng;
      const yj = this.coordinates[j].lat;
      
      if (((yi > point.lat) !== (yj > point.lat)) &&
          (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  getCssClasses() {
    const classes = ['geofence'];
    classes.push(`geofence-${this.geofenceType}`);
    if (this.editable) classes.push('geofence-editable');
    return classes.join(' ');
  }

  /**
   * Create a GeofenceDrawable from raw geofence data
   * @param {object} geofenceData - Raw geofence data from API
   * @param {object} options - Additional options
   * @returns {GeofenceDrawable}
   */
  static fromGeofenceData(geofenceData, options = {}) {
    const coordinates = geofenceData.coordinate || geofenceData.coordinates || [];
    
    return new GeofenceDrawable({
      id: geofenceData.id,
      name: geofenceData.nome || geofenceData.name || '',
      geofenceType: geofenceData.tipo || GEOFENCE_TYPES.POLYGON,
      coordinates: coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
      radius: geofenceData.raggio_metri || geofenceData.radius || 100,
      color: geofenceData.colore || geofenceData.color || '#2563eb',
      fillOpacity: geofenceData.fill_opacity ?? 0.2,
      strokeOpacity: geofenceData.stroke_opacity ?? 0.8,
      strokeWeight: geofenceData.stroke_weight ?? 2,
      visible: geofenceData.visible !== false,
      data: geofenceData,
      onClick: options.onClick,
      onHover: options.onHover
    });
  }

  toJSON() {
    return {
      ...super.toJSON(),
      name: this.name,
      geofenceType: this.geofenceType,
      coordinates: this.coordinates,
      radius: this.radius,
      color: this.color,
      fillOpacity: this.fillOpacity,
      strokeOpacity: this.strokeOpacity,
      strokeWeight: this.strokeWeight
    };
  }
}

export default GeofenceDrawable;
