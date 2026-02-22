/**
 * BaseMapProvider - Abstract base class for all map providers
 * 
 * This is the polymorphic base class that defines the interface for all
 * map providers (Google Maps, OpenStreetMap, Satellite, etc.)
 */
export class BaseMapProvider {
  constructor(options = {}) {
    this.id = options.id || 'base';
    this.name = options.name || 'Base Map';
    this.apiKey = options.apiKey || '';
    this.mapInstance = null;
    this.containerRef = null;
    this.isInitialized = false;
    this.options = options;
    
    // Default center and zoom
    this.center = options.center || { lat: 41.9028, lng: 12.4964 }; // Rome
    this.zoom = options.zoom || 6;
    
    // Event handlers
    this.onLoad = options.onLoad || null;
    this.onError = options.onError || null;
    this.onClick = options.onClick || null;
    this.onZoomChange = options.onZoomChange || null;
    this.onCenterChange = options.onCenterChange || null;
  }

  /**
   * Get the provider type identifier
   * @returns {string}
   */
  getType() {
    return 'base';
  }

  /**
   * Get the display name of this provider
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Check if the map provider is ready to use
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.mapInstance !== null;
  }

  /**
   * Initialize the map provider
   * Must be overridden by subclasses
   * @param {HTMLElement} container - Container element
   * @returns {Promise<void>}
   */
  async initialize(container) {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Destroy and cleanup the map
   */
  destroy() {
    this.mapInstance = null;
    this.containerRef = null;
    this.isInitialized = false;
  }

  /**
   * Get the current map center
   * @returns {{ lat: number, lng: number }}
   */
  getCenter() {
    return this.center;
  }

  /**
   * Set the map center
   * @param {{ lat: number, lng: number }} center
   * @param {boolean} animate - Whether to animate the transition
   */
  setCenter(center, animate = true) {
    this.center = center;
  }

  /**
   * Get the current zoom level
   * @returns {number}
   */
  getZoom() {
    return this.zoom;
  }

  /**
   * Set the zoom level
   * @param {number} zoom
   */
  setZoom(zoom) {
    this.zoom = zoom;
  }

  /**
   * Pan to a specific location
   * @param {{ lat: number, lng: number }} position
   */
  panTo(position) {
    this.setCenter(position, true);
  }

  /**
   * Fit the map to show all given bounds
   * @param {{ north: number, south: number, east: number, west: number }} bounds
   * @param {number} padding - Padding in pixels
   */
  fitBounds(bounds, padding = 50) {
    throw new Error('fitBounds() must be implemented by subclass');
  }

  /**
   * Get the current map bounds
   * @returns {{ north: number, south: number, east: number, west: number }|null}
   */
  getBounds() {
    throw new Error('getBounds() must be implemented by subclass');
  }

  /**
   * Create an icon configuration from SVG
   * @param {string} svg - SVG string
   * @param {number} width - Icon width
   * @param {number} height - Icon height
   * @param {number} anchorX - Anchor point X
   * @param {number} anchorY - Anchor point Y
   * @returns {object} Icon configuration
   */
  createIcon(svg, width, height, anchorX, anchorY) {
    throw new Error('createIcon() must be implemented by subclass');
  }

  /**
   * Create an icon from a URL
   * @param {string} url - Image URL
   * @param {number} width - Icon width
   * @param {number} height - Icon height
   * @returns {object} Icon configuration
   */
  createIconFromUrl(url, width, height) {
    throw new Error('createIconFromUrl() must be implemented by subclass');
  }

  /**
   * Add a marker to the map
   * @param {import('../drawables/MarkerDrawable').MarkerDrawable} drawable
   * @returns {object} Native marker object
   */
  addMarker(drawable) {
    throw new Error('addMarker() must be implemented by subclass');
  }

  /**
   * Remove a marker from the map
   * @param {object} marker - Native marker object
   */
  removeMarker(marker) {
    throw new Error('removeMarker() must be implemented by subclass');
  }

  /**
   * Add a polyline to the map
   * @param {import('../drawables/PolylineDrawable').PolylineDrawable} drawable
   * @returns {object} Native polyline object
   */
  addPolyline(drawable) {
    throw new Error('addPolyline() must be implemented by subclass');
  }

  /**
   * Remove a polyline from the map
   * @param {object} polyline - Native polyline object
   */
  removePolyline(polyline) {
    throw new Error('removePolyline() must be implemented by subclass');
  }

  /**
   * Add a polygon to the map
   * @param {import('../drawables/GeofenceDrawable').GeofenceDrawable} drawable
   * @returns {object} Native polygon object
   */
  addPolygon(drawable) {
    throw new Error('addPolygon() must be implemented by subclass');
  }

  /**
   * Remove a polygon from the map
   * @param {object} polygon - Native polygon object
   */
  removePolygon(polygon) {
    throw new Error('removePolygon() must be implemented by subclass');
  }

  /**
   * Add a circle to the map
   * @param {import('../drawables/GeofenceDrawable').GeofenceDrawable} drawable
   * @returns {object} Native circle object
   */
  addCircle(drawable) {
    throw new Error('addCircle() must be implemented by subclass');
  }

  /**
   * Remove a circle from the map
   * @param {object} circle - Native circle object
   */
  removeCircle(circle) {
    throw new Error('removeCircle() must be implemented by subclass');
  }

  /**
   * Show an info window at a position
   * @param {{ lat: number, lng: number }} position
   * @param {string|HTMLElement} content
   * @returns {object} Native info window object
   */
  showInfoWindow(position, content) {
    throw new Error('showInfoWindow() must be implemented by subclass');
  }

  /**
   * Close an info window
   * @param {object} infoWindow - Native info window object
   */
  closeInfoWindow(infoWindow) {
    throw new Error('closeInfoWindow() must be implemented by subclass');
  }

  /**
   * Enable/disable traffic layer
   * @param {boolean} enabled
   */
  setTrafficLayer(enabled) {
    // Override in subclass if supported
  }

  /**
   * Set the map type
   * @param {string} mapType - Map type identifier
   */
  setMapType(mapType) {
    // Override in subclass
  }

  /**
   * Get available map types for this provider
   * @returns {Array<{ id: string, name: string }>}
   */
  getAvailableMapTypes() {
    return [{ id: 'roadmap', name: 'Road Map' }];
  }

  /**
   * Enable drawing mode
   * @param {string} mode - Drawing mode ('polygon', 'circle', 'polyline', 'marker')
   * @param {object} options - Drawing options
   * @param {Function} onComplete - Callback when drawing is complete
   */
  enableDrawingMode(mode, options, onComplete) {
    // Override in subclass if supported
  }

  /**
   * Disable drawing mode
   */
  disableDrawingMode() {
    // Override in subclass if supported
  }

  /**
   * Get the native map instance
   * @returns {object|null}
   */
  getNativeMap() {
    return this.mapInstance;
  }

  /**
   * Serialize provider configuration
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.getType(),
      name: this.name,
      center: this.center,
      zoom: this.zoom
    };
  }
}

export default BaseMapProvider;
