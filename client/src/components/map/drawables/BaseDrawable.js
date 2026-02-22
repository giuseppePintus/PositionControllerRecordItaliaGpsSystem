/**
 * BaseDrawable - Abstract base class for all drawable objects on the map
 * 
 * This is the polymorphic base class that defines the interface for all
 * drawable objects (vehicles, markers, geofences, polylines, etc.)
 */
export class BaseDrawable {
  constructor(options = {}) {
    this.id = options.id || `drawable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.position = options.position || { lat: 0, lng: 0 };
    this.visible = options.visible !== false;
    this.zIndex = options.zIndex || 1;
    this.data = options.data || {};
    this.onClick = options.onClick || null;
    this.onHover = options.onHover || null;
  }

  /**
   * Get the type of drawable
   * @returns {string} The type identifier
   */
  getType() {
    return 'base';
  }

  /**
   * Get the position for this drawable
   * @returns {{ lat: number, lng: number }}
   */
  getPosition() {
    return this.position;
  }

  /**
   * Set the position for this drawable
   * @param {{ lat: number, lng: number }} position
   */
  setPosition(position) {
    this.position = position;
  }

  /**
   * Get the icon configuration for this drawable
   * Must be overridden by subclasses
   * @param {object} mapProvider - The map provider instance for size calculations
   * @returns {object|null} Icon configuration or null
   */
  getIcon(mapProvider) {
    return null;
  }

  /**
   * Get the style/options for this drawable
   * @returns {object} Style configuration
   */
  getStyle() {
    return {
      visible: this.visible,
      zIndex: this.zIndex
    };
  }

  /**
   * Get CSS class names for styling
   * @returns {string} CSS class names
   */
  getCssClasses() {
    return '';
  }

  /**
   * Check if this drawable is visible
   * @returns {boolean}
   */
  isVisible() {
    return this.visible;
  }

  /**
   * Set visibility
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.visible = visible;
  }

  /**
   * Get additional data associated with this drawable
   * @returns {object}
   */
  getData() {
    return this.data;
  }

  /**
   * Handle click event
   * @param {object} event
   */
  handleClick(event) {
    if (this.onClick) {
      this.onClick(this, event);
    }
  }

  /**
   * Handle hover event
   * @param {object} event
   */
  handleHover(event) {
    if (this.onHover) {
      this.onHover(this, event);
    }
  }

  /**
   * Reference to the Google Maps marker/overlay instance
   * Used for cleanup when removing from map
   * @type {object|null}
   */
  _mapInstance = null;

  /**
   * Set the Google Maps instance reference for this drawable
   * @param {object} instance - The Google Maps marker/overlay instance
   */
  setMapInstance(instance) {
    this._mapInstance = instance;
  }

  /**
   * Get the Google Maps instance reference
   * @returns {object|null}
   */
  getMapInstance() {
    return this._mapInstance;
  }

  /**
   * Clear this drawable from the map
   * Override in subclasses for specific cleanup logic
   * @param {object} map - The Google Maps map instance
   */
  clearFromMap(map) {
    if (this._mapInstance) {
      // Standard cleanup for Google Maps markers
      if (typeof this._mapInstance.setMap === 'function') {
        this._mapInstance.setMap(null);
      }
      this._mapInstance = null;
    }
  }

  /**
   * Serialize this drawable to a plain object
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      type: this.getType(),
      position: this.position,
      visible: this.visible,
      zIndex: this.zIndex,
      data: this.data
    };
  }

  /**
   * Create a drawable from a plain object
   * @param {object} json
   * @returns {BaseDrawable}
   */
  static fromJSON(json) {
    return new BaseDrawable(json);
  }
}

export default BaseDrawable;
