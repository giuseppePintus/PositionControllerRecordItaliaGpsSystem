/**
 * OpenStreetMapProvider - OpenStreetMap implementation using Leaflet
 * 
 * Supports standard OSM tiles and various third-party tile providers.
 */
import { BaseMapProvider } from './BaseMapProvider';

// Tile provider URLs
export const OSM_TILE_PROVIDERS = {
  STANDARD: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: 'Standard'
  },
  HOT: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">HOT</a>',
    name: 'Humanitarian'
  },
  TOPO: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a>',
    name: 'Topographic'
  },
  CARTO_LIGHT: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: 'Light'
  },
  CARTO_DARK: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: 'Dark'
  }
};

// Leaflet CSS URL
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Global state for Leaflet loading
let leafletLoadPromise = null;
let leafletLoaded = false;

/**
 * Load Leaflet library
 * @returns {Promise<typeof L>}
 */
function loadLeaflet() {
  if (leafletLoaded && window.L) {
    return Promise.resolve(window.L);
  }
  
  if (leafletLoadPromise) {
    return leafletLoadPromise;
  }
  
  leafletLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.L) {
      leafletLoaded = true;
      resolve(window.L);
      return;
    }
    
    // Load CSS first
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_URL;
    document.head.appendChild(link);
    
    // Load JS
    const script = document.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.async = true;
    
    script.onload = () => {
      leafletLoaded = true;
      resolve(window.L);
    };
    
    script.onerror = () => {
      leafletLoadPromise = null;
      reject(new Error('Failed to load Leaflet'));
    };
    
    document.head.appendChild(script);
  });
  
  return leafletLoadPromise;
}

export class OpenStreetMapProvider extends BaseMapProvider {
  constructor(options = {}) {
    super({
      id: 'osm',
      name: 'OpenStreetMap',
      ...options
    });
    
    this.tileProvider = options.tileProvider || OSM_TILE_PROVIDERS.STANDARD;
    this.tileLayer = null;
    this.nativeObjects = new Map();
    this.layerGroups = {
      markers: null,
      polylines: null,
      polygons: null,
      circles: null
    };
  }

  getType() {
    return 'osm';
  }

  async initialize(container) {
    try {
      const L = await loadLeaflet();
      
      this.containerRef = container;
      
      // Create map
      this.mapInstance = L.map(container, {
        center: [this.center.lat, this.center.lng],
        zoom: this.zoom,
        zoomControl: true,
        attributionControl: true
      });
      
      // Add tile layer
      this.tileLayer = L.tileLayer(this.tileProvider.url, {
        attribution: this.tileProvider.attribution,
        maxZoom: 19
      }).addTo(this.mapInstance);
      
      // Create layer groups
      this.layerGroups.markers = L.layerGroup().addTo(this.mapInstance);
      this.layerGroups.polylines = L.layerGroup().addTo(this.mapInstance);
      this.layerGroups.polygons = L.layerGroup().addTo(this.mapInstance);
      this.layerGroups.circles = L.layerGroup().addTo(this.mapInstance);
      
      // Add event listeners
      this.mapInstance.on('zoomend', () => {
        this.zoom = this.mapInstance.getZoom();
        if (this.onZoomChange) {
          this.onZoomChange(this.zoom);
        }
      });
      
      this.mapInstance.on('moveend', () => {
        const center = this.mapInstance.getCenter();
        this.center = { lat: center.lat, lng: center.lng };
        if (this.onCenterChange) {
          this.onCenterChange(this.center);
        }
      });
      
      this.mapInstance.on('click', (e) => {
        if (this.onClick) {
          this.onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });
      
      this.isInitialized = true;
      
      if (this.onLoad) {
        this.onLoad(this);
      }
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  destroy() {
    if (this.mapInstance) {
      this.mapInstance.remove();
    }
    this.nativeObjects.clear();
    super.destroy();
  }

  setCenter(center, animate = true) {
    super.setCenter(center, animate);
    if (this.mapInstance) {
      if (animate) {
        this.mapInstance.panTo([center.lat, center.lng]);
      } else {
        this.mapInstance.setView([center.lat, center.lng], this.zoom, { animate: false });
      }
    }
  }

  setZoom(zoom) {
    super.setZoom(zoom);
    if (this.mapInstance) {
      this.mapInstance.setZoom(zoom);
    }
  }

  panTo(position) {
    if (this.mapInstance) {
      this.mapInstance.panTo([position.lat, position.lng]);
    }
  }

  fitBounds(bounds, padding = 50) {
    if (!this.mapInstance || !window.L) return;
    
    const leafletBounds = window.L.latLngBounds(
      [bounds.south, bounds.west],
      [bounds.north, bounds.east]
    );
    
    this.mapInstance.fitBounds(leafletBounds, { padding: [padding, padding] });
  }

  getBounds() {
    if (!this.mapInstance) return null;
    
    const bounds = this.mapInstance.getBounds();
    
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };
  }

  createIcon(svg, width, height, anchorX, anchorY) {
    if (!window.L) return null;
    
    return window.L.divIcon({
      html: svg,
      iconSize: [width, height],
      iconAnchor: [anchorX, anchorY],
      className: 'custom-marker-icon'
    });
  }

  createIconFromUrl(url, width, height) {
    if (!window.L) return null;
    
    return window.L.icon({
      iconUrl: url,
      iconSize: [width, height],
      iconAnchor: [width / 2, height]
    });
  }

  addMarker(drawable) {
    if (!this.mapInstance || !window.L) return null;
    
    const position = drawable.getPosition();
    const icon = drawable.getIcon(this);
    const style = drawable.getStyle();
    
    const marker = window.L.marker([position.lat, position.lng], {
      icon,
      draggable: style.draggable,
      title: style.title,
      zIndexOffset: style.zIndex || 0
    });
    
    marker.on('click', (e) => {
      drawable.handleClick(e);
    });
    
    this.layerGroups.markers.addLayer(marker);
    this.nativeObjects.set(drawable.id, marker);
    
    return marker;
  }

  removeMarker(marker) {
    if (marker && this.layerGroups.markers) {
      this.layerGroups.markers.removeLayer(marker);
    }
  }

  addPolyline(drawable) {
    if (!this.mapInstance || !window.L) return null;
    
    const style = drawable.getStyle();
    
    const polyline = window.L.polyline(
      drawable.getPath().map(p => [p.lat, p.lng]),
      {
        color: style.strokeColor,
        opacity: style.strokeOpacity,
        weight: style.strokeWeight
      }
    );
    
    polyline.on('click', (e) => {
      drawable.handleClick(e);
    });
    
    this.layerGroups.polylines.addLayer(polyline);
    this.nativeObjects.set(drawable.id, polyline);
    
    return polyline;
  }

  removePolyline(polyline) {
    if (polyline && this.layerGroups.polylines) {
      this.layerGroups.polylines.removeLayer(polyline);
    }
  }

  addPolygon(drawable) {
    if (!this.mapInstance || !window.L) return null;
    
    const style = drawable.getStyle();
    
    const polygon = window.L.polygon(
      drawable.getPath().map(p => [p.lat, p.lng]),
      {
        color: style.strokeColor,
        opacity: style.strokeOpacity,
        weight: style.strokeWeight,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity
      }
    );
    
    polygon.on('click', (e) => {
      drawable.handleClick(e);
    });
    
    this.layerGroups.polygons.addLayer(polygon);
    this.nativeObjects.set(drawable.id, polygon);
    
    return polygon;
  }

  removePolygon(polygon) {
    if (polygon && this.layerGroups.polygons) {
      this.layerGroups.polygons.removeLayer(polygon);
    }
  }

  addCircle(drawable) {
    if (!this.mapInstance || !window.L) return null;
    
    const style = drawable.getStyle();
    const coords = drawable.coordinates;
    
    if (!coords || coords.length === 0) return null;
    
    const circle = window.L.circle([coords[0].lat, coords[0].lng], {
      radius: drawable.radius,
      color: style.strokeColor,
      opacity: style.strokeOpacity,
      weight: style.strokeWeight,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity
    });
    
    circle.on('click', (e) => {
      drawable.handleClick(e);
    });
    
    this.layerGroups.circles.addLayer(circle);
    this.nativeObjects.set(drawable.id, circle);
    
    return circle;
  }

  removeCircle(circle) {
    if (circle && this.layerGroups.circles) {
      this.layerGroups.circles.removeLayer(circle);
    }
  }

  showInfoWindow(position, content, options = {}) {
    if (!this.mapInstance || !window.L) return null;
    
    const popup = window.L.popup({
      maxWidth: options.maxWidth || 350,
      offset: options.offset || [0, -10]
    })
      .setLatLng([position.lat, position.lng])
      .setContent(content)
      .openOn(this.mapInstance);
    
    return popup;
  }

  closeInfoWindow(popup) {
    if (popup) {
      popup.remove();
    }
  }

  setMapType(mapType) {
    const provider = OSM_TILE_PROVIDERS[mapType.toUpperCase()];
    if (provider && this.mapInstance && window.L) {
      if (this.tileLayer) {
        this.mapInstance.removeLayer(this.tileLayer);
      }
      this.tileProvider = provider;
      this.tileLayer = window.L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: 19
      }).addTo(this.mapInstance);
    }
  }

  getAvailableMapTypes() {
    return Object.entries(OSM_TILE_PROVIDERS).map(([key, value]) => ({
      id: key.toLowerCase(),
      name: value.name,
      icon: '🗺️'
    }));
  }

  /**
   * Get native object by drawable ID
   * @param {string} drawableId
   * @returns {object|undefined}
   */
  getNativeObject(drawableId) {
    return this.nativeObjects.get(drawableId);
  }

  /**
   * Remove native object by drawable ID
   * @param {string} drawableId
   */
  removeNativeObject(drawableId) {
    const obj = this.nativeObjects.get(drawableId);
    if (obj) {
      // Try to remove from all layer groups
      Object.values(this.layerGroups).forEach(group => {
        if (group?.hasLayer(obj)) {
          group.removeLayer(obj);
        }
      });
    }
    this.nativeObjects.delete(drawableId);
  }
}

export default OpenStreetMapProvider;
