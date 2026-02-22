/**
 * MarkerDrawable - Drawable class for generic markers on the map
 * 
 * Can be used for waypoints, POIs, custom markers, etc.
 */
import { BaseDrawable } from './BaseDrawable';

// Marker types
export const MARKER_TYPES = {
  DEFAULT: 'default',
  WAYPOINT: 'waypoint',
  POI: 'poi',
  START: 'start',
  END: 'end',
  STOP: 'stop',
  CUSTOM: 'custom',
};

// Default marker colors
const MARKER_COLORS = {
  default: '#3b82f6',
  waypoint: '#f59e0b',
  poi: '#8b5cf6',
  start: '#22c55e',
  end: '#ef4444',
  stop: '#6b7280',
  custom: '#ec4899',
};

export class MarkerDrawable extends BaseDrawable {
  constructor(options = {}) {
    super(options);
    
    // Marker-specific properties
    this.label = options.label || '';
    this.title = options.title || '';
    this.markerType = options.markerType || MARKER_TYPES.DEFAULT;
    this.color = options.color || MARKER_COLORS[this.markerType] || MARKER_COLORS.default;
    this.size = options.size || 32;
    this.draggable = options.draggable || false;
    this.animation = options.animation || null; // 'bounce', 'drop', null
    this.customIcon = options.customIcon || null;
    this.customIconUrl = options.customIconUrl || null;
  }

  getType() {
    return 'marker';
  }

  /**
   * Generate SVG icon for this marker
   * @param {object} mapProvider - Map provider for size calculations
   * @returns {object|null} Icon configuration
   */
  getIcon(mapProvider) {
    if (!mapProvider?.isReady()) return null;

    // Use custom icon if provided
    if (this.customIconUrl) {
      return mapProvider.createIconFromUrl(this.customIconUrl, this.size, this.size);
    }

    // Generate SVG based on marker type
    const svg = this.generateSvgIcon();
    return mapProvider.createIcon(svg, this.size, this.size, this.size / 2, this.size);
  }

  /**
   * Generate SVG icon string based on marker type
   * @returns {string} SVG string
   */
  generateSvgIcon() {
    const size = this.size;
    const color = this.color;
    
    switch (this.markerType) {
      case MARKER_TYPES.WAYPOINT:
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="4" fill="white"/>
            ${this.label ? `<text x="12" y="14" text-anchor="middle" font-size="8" fill="white" font-weight="bold">${this.label}</text>` : ''}
          </svg>
        `;
      
      case MARKER_TYPES.START:
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
            <path d="M8 7v10l8-5z" fill="white"/>
          </svg>
        `;
      
      case MARKER_TYPES.END:
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
            <rect x="8" y="8" width="8" height="8" fill="white"/>
          </svg>
        `;
      
      case MARKER_TYPES.STOP:
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="12" y="16" text-anchor="middle" font-size="12" fill="white" font-weight="bold">${this.label || 'S'}</text>
          </svg>
        `;
      
      case MARKER_TYPES.POI:
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="white" stroke-width="1"/>
            <circle cx="12" cy="9" r="3" fill="white"/>
          </svg>
        `;
      
      default:
        return `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="white" stroke-width="1"/>
            <circle cx="12" cy="9" r="3" fill="white"/>
          </svg>
        `;
    }
  }

  getStyle() {
    return {
      ...super.getStyle(),
      draggable: this.draggable,
      animation: this.animation,
      title: this.title
    };
  }

  getCssClasses() {
    const classes = ['marker'];
    classes.push(`marker-${this.markerType}`);
    if (this.draggable) classes.push('marker-draggable');
    return classes.join(' ');
  }

  /**
   * Create a MarkerDrawable with default settings
   * @param {{ lat: number, lng: number }} position
   * @param {object} options
   * @returns {MarkerDrawable}
   */
  static create(position, options = {}) {
    return new MarkerDrawable({
      position,
      ...options
    });
  }

  /**
   * Create a waypoint marker
   * @param {{ lat: number, lng: number }} position
   * @param {string|number} label
   * @param {object} options
   * @returns {MarkerDrawable}
   */
  static createWaypoint(position, label, options = {}) {
    return new MarkerDrawable({
      position,
      label: String(label),
      markerType: MARKER_TYPES.WAYPOINT,
      ...options
    });
  }

  /**
   * Create a start marker
   * @param {{ lat: number, lng: number }} position
   * @param {object} options
   * @returns {MarkerDrawable}
   */
  static createStart(position, options = {}) {
    return new MarkerDrawable({
      position,
      markerType: MARKER_TYPES.START,
      title: 'Start',
      ...options
    });
  }

  /**
   * Create an end marker
   * @param {{ lat: number, lng: number }} position
   * @param {object} options
   * @returns {MarkerDrawable}
   */
  static createEnd(position, options = {}) {
    return new MarkerDrawable({
      position,
      markerType: MARKER_TYPES.END,
      title: 'End',
      ...options
    });
  }

  toJSON() {
    return {
      ...super.toJSON(),
      label: this.label,
      title: this.title,
      markerType: this.markerType,
      color: this.color,
      size: this.size,
      draggable: this.draggable
    };
  }
}

export default MarkerDrawable;
