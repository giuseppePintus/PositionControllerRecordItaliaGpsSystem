/**
 * RouteDrawable - Specialized drawable for route templates and trips
 * 
 * Extends PolylineDrawable with route-specific features:
 * - Template data (name, color, schedule)
 * - Stops with markers
 * - Trip association
 * - Direction arrows
 */
import { PolylineDrawable, POLYLINE_TYPES } from './PolylineDrawable';

// Route configuration
export const ROUTE_CONFIG = {
  DEFAULT_COLOR: '#3B82F6',
  DEFAULT_STROKE_WEIGHT: 4,
  DEFAULT_STROKE_OPACITY: 0.9,
  STOP_MARKER_SIZE: 24,
  DIRECTION_ARROW_SPACING: 100, // pixels
};

// Route colors palette (matches template colors)
export const ROUTE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
];

// Stop types
export const STOP_TYPES = {
  START: 'start',
  WAYPOINT: 'waypoint',
  END: 'end',
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
};

/**
 * RouteDrawable class for rendering route templates and trips
 */
export class RouteDrawable extends PolylineDrawable {
  constructor(options = {}) {
    // Set route-specific defaults before calling parent
    super({
      polylineType: POLYLINE_TYPES.ROUTE,
      strokeColor: options.color || options.strokeColor || ROUTE_CONFIG.DEFAULT_COLOR,
      strokeWeight: options.strokeWeight || ROUTE_CONFIG.DEFAULT_STROKE_WEIGHT,
      strokeOpacity: options.strokeOpacity || ROUTE_CONFIG.DEFAULT_STROKE_OPACITY,
      ...options,
    });

    // Route-specific properties
    this.name = options.name || '';
    this.color = options.color || ROUTE_CONFIG.DEFAULT_COLOR;
    this.templateId = options.templateId || null;
    this.tripId = options.tripId || null;
    
    // Stops array: [{ id, name, lat, lng, type, address, order }]
    this.stops = options.stops || [];
    
    // Schedule info
    this.schedule = options.schedule || null; // { days: [], startTime, endTime }
    
    // Display options
    this.showStops = options.showStops !== false;
    this.showDirectionArrows = options.showDirectionArrows || false;
    this.showLabels = options.showLabels || false;
    
    // State
    this.isActive = options.isActive || false;
    this.isHighlighted = options.highlighted || false;
  }

  getType() {
    return 'route';
  }

  /**
   * Create RouteDrawable from a template object
   * @param {object} template - Route template from API
   * @returns {RouteDrawable}
   */
  static fromTemplate(template) {
    const stops = (template.tappe || template.stops || []).map((stop, index) => ({
      id: stop.id || `stop-${index}`,
      name: stop.nome || stop.name || `Tappa ${index + 1}`,
      lat: stop.lat || stop.latitude,
      lng: stop.lng || stop.longitude,
      address: stop.indirizzo || stop.address || '',
      type: index === 0 ? STOP_TYPES.START : 
            index === (template.tappe || template.stops || []).length - 1 ? STOP_TYPES.END : 
            STOP_TYPES.WAYPOINT,
      order: stop.ordine || stop.order || index,
    }));

    // Build path from stops
    const path = stops.map(stop => ({
      lat: stop.lat,
      lng: stop.lng,
    }));

    return new RouteDrawable({
      id: `template-${template.id}`,
      templateId: template.id,
      name: template.nome || template.name || '',
      color: template.colore || template.color || ROUTE_CONFIG.DEFAULT_COLOR,
      path,
      stops,
      schedule: template.orario ? {
        days: template.giorni || [],
        startTime: template.orario?.inizio,
        endTime: template.orario?.fine,
      } : null,
      data: template, // Store original data
    });
  }

  /**
   * Create RouteDrawable from a trip object
   * @param {object} trip - Trip from API
   * @returns {RouteDrawable}
   */
  static fromTrip(trip) {
    const template = trip.template || {};
    const stops = (trip.tappe || template.tappe || []).map((stop, index) => ({
      id: stop.id || `stop-${index}`,
      name: stop.nome || stop.name || `Tappa ${index + 1}`,
      lat: stop.lat || stop.latitude,
      lng: stop.lng || stop.longitude,
      address: stop.indirizzo || stop.address || '',
      type: index === 0 ? STOP_TYPES.START : 
            index === (trip.tappe || template.tappe || []).length - 1 ? STOP_TYPES.END : 
            STOP_TYPES.WAYPOINT,
      order: stop.ordine || stop.order || index,
      completed: stop.completato || stop.completed || false,
      completedAt: stop.completatoAt || stop.completedAt || null,
    }));

    const path = stops.map(stop => ({
      lat: stop.lat,
      lng: stop.lng,
    }));

    return new RouteDrawable({
      id: `trip-${trip.id}`,
      tripId: trip.id,
      templateId: template.id,
      name: template.nome || trip.nome || '',
      color: template.colore || trip.colore || ROUTE_CONFIG.DEFAULT_COLOR,
      path,
      stops,
      isActive: trip.stato === 'in_corso' || trip.status === 'active',
      data: trip,
    });
  }

  /**
   * Get stops for rendering markers
   * @returns {Array}
   */
  getStops() {
    return this.stops;
  }

  /**
   * Get a specific stop by index or id
   * @param {number|string} indexOrId
   * @returns {object|null}
   */
  getStop(indexOrId) {
    if (typeof indexOrId === 'number') {
      return this.stops[indexOrId] || null;
    }
    return this.stops.find(s => s.id === indexOrId) || null;
  }

  /**
   * Get start position (first stop)
   * @returns {{ lat: number, lng: number }|null}
   */
  getStartPosition() {
    const firstStop = this.stops[0];
    return firstStop ? { lat: firstStop.lat, lng: firstStop.lng } : null;
  }

  /**
   * Get end position (last stop)
   * @returns {{ lat: number, lng: number }|null}
   */
  getEndPosition() {
    const lastStop = this.stops[this.stops.length - 1];
    return lastStop ? { lat: lastStop.lat, lng: lastStop.lng } : null;
  }

  /**
   * Get style configuration for the route polyline
   * @returns {object}
   */
  getStyle() {
    return {
      strokeColor: this.isHighlighted ? this._lightenColor(this.color, 20) : this.color,
      strokeOpacity: this.isHighlighted ? 1 : this.strokeOpacity,
      strokeWeight: this.isHighlighted ? this.strokeWeight + 2 : this.strokeWeight,
      zIndex: this.isHighlighted ? 100 : (this.isActive ? 50 : 10),
    };
  }

  /**
   * Get stop marker icon based on stop type
   * @param {object} stop
   * @param {object} mapProvider
   * @returns {object|null}
   */
  getStopIcon(stop, mapProvider) {
    if (!mapProvider?.isReady?.()) return null;

    const size = ROUTE_CONFIG.STOP_MARKER_SIZE;
    const color = this.color;
    
    let svg;
    switch (stop.type) {
      case STOP_TYPES.START:
        svg = this._createStartMarkerSvg(size, color);
        break;
      case STOP_TYPES.END:
        svg = this._createEndMarkerSvg(size, color);
        break;
      default:
        svg = this._createWaypointMarkerSvg(size, color, stop.order);
    }

    return mapProvider.createIcon(svg, size, size, size / 2, size / 2);
  }

  /**
   * Get bounds for fitting map to route
   * @returns {{ sw: { lat, lng }, ne: { lat, lng } }|null}
   */
  getBounds() {
    if (this.path.length === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    this.path.forEach(point => {
      minLat = Math.min(minLat, point.lat);
      maxLat = Math.max(maxLat, point.lat);
      minLng = Math.min(minLng, point.lng);
      maxLng = Math.max(maxLng, point.lng);
    });

    return {
      sw: { lat: minLat, lng: minLng },
      ne: { lat: maxLat, lng: maxLng },
    };
  }

  /**
   * Set highlight state
   * @param {boolean} highlighted
   */
  setHighlighted(highlighted) {
    this.isHighlighted = highlighted;
  }

  // ==================== PRIVATE SVG GENERATORS ====================

  _createStartMarkerSvg(size, color) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <polygon points="10,8 16,12 10,16" fill="white"/>
      </svg>
    `;
  }

  _createEndMarkerSvg(size, color) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <rect x="8" y="8" width="8" height="8" fill="white"/>
      </svg>
    `;
  }

  _createWaypointMarkerSvg(size, color, order) {
    const number = order !== undefined ? order : '';
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${number}</text>
      </svg>
    `;
  }

  _lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }
}

/**
 * Helper function to create route drawable from raw data
 * @param {object} data - Route data (template or trip)
 * @param {string} type - 'template' or 'trip'
 * @returns {RouteDrawable}
 */
export function createRouteDrawable(data, type = 'template') {
  if (type === 'trip') {
    return RouteDrawable.fromTrip(data);
  }
  return RouteDrawable.fromTemplate(data);
}
