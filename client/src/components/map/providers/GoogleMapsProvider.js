/**
 * GoogleMapsProvider - Google Maps implementation of the map provider
 * 
 * Supports roadmap, satellite, hybrid, and terrain map types.
 */
import { BaseMapProvider } from './BaseMapProvider';

// Map type constants
export const GOOGLE_MAP_TYPES = {
  ROADMAP: 'roadmap',
  SATELLITE: 'satellite',
  HYBRID: 'hybrid',
  TERRAIN: 'terrain',
};

// Default libraries to load
const GOOGLE_MAPS_LIBRARIES = ['drawing', 'places', 'geometry'];

// Global state for Google Maps loading
let googleMapsLoadPromise = null;
let googleMapsLoaded = false;

/**
 * Load Google Maps script
 * @param {string} apiKey
 * @returns {Promise<typeof google>}
 */
function loadGoogleMapsScript(apiKey) {
  if (googleMapsLoaded && window.google?.maps) {
    return Promise.resolve(window.google);
  }
  
  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }
  
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps) {
      googleMapsLoaded = true;
      resolve(window.google);
      return;
    }
    
    // Create callback
    const callbackName = `googleMapsCallback_${Date.now()}`;
    window[callbackName] = () => {
      googleMapsLoaded = true;
      delete window[callbackName];
      resolve(window.google);
    };
    
    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${GOOGLE_MAPS_LIBRARIES.join(',')}&callback=${callbackName}&language=it&region=IT`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[callbackName];
      googleMapsLoadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    
    document.head.appendChild(script);
  });
  
  return googleMapsLoadPromise;
}

export class GoogleMapsProvider extends BaseMapProvider {
  constructor(options = {}) {
    super({
      id: 'google',
      name: 'Google Maps',
      ...options
    });
    
    this.mapType = options.mapType || GOOGLE_MAP_TYPES.ROADMAP;
    this.trafficLayer = null;
    this.drawingManager = null;
    this.infoWindows = new Map();
    this.nativeObjects = new Map(); // Track native objects by drawable ID
    
    // Map styles
    this.styles = options.styles || [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ];
  }

  getType() {
    return 'google';
  }

  /**
   * Get map options with proper control positions
   * @returns {object}
   */
  getMapOptions() {
    if (!window.google?.maps) {
      return {
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: true,
        mapTypeControl: true,
        fullscreenControl: true,
        mapTypeId: this.mapType,
        styles: this.styles
      };
    }
    
    return {
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: true,
      mapTypeControl: true,
      fullscreenControl: true,
      mapTypeId: this.mapType,
      styles: this.styles,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: window.google.maps.ControlPosition.TOP_RIGHT,
        mapTypeIds: Object.values(GOOGLE_MAP_TYPES)
      },
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER
      },
      streetViewControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER
      },
      fullscreenControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      }
    };
  }

  async initialize(container) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key is required');
    }
    
    try {
      await loadGoogleMapsScript(this.apiKey);
      
      this.containerRef = container;
      this.mapInstance = new window.google.maps.Map(container, {
        center: this.center,
        zoom: this.zoom,
        ...this.getMapOptions()
      });
      
      // Add event listeners
      this.mapInstance.addListener('zoom_changed', () => {
        this.zoom = this.mapInstance.getZoom();
        if (this.onZoomChange) {
          this.onZoomChange(this.zoom);
        }
      });
      
      this.mapInstance.addListener('center_changed', () => {
        const center = this.mapInstance.getCenter();
        this.center = { lat: center.lat(), lng: center.lng() };
        if (this.onCenterChange) {
          this.onCenterChange(this.center);
        }
      });
      
      this.mapInstance.addListener('click', (e) => {
        if (this.onClick) {
          this.onClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
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
    // Clear all native objects
    this.nativeObjects.forEach((obj) => {
      if (obj.setMap) obj.setMap(null);
    });
    this.nativeObjects.clear();
    
    // Clear info windows
    this.infoWindows.forEach((iw) => iw.close());
    this.infoWindows.clear();
    
    // Clear traffic layer
    if (this.trafficLayer) {
      this.trafficLayer.setMap(null);
      this.trafficLayer = null;
    }
    
    // Clear drawing manager
    if (this.drawingManager) {
      this.drawingManager.setMap(null);
      this.drawingManager = null;
    }
    
    super.destroy();
  }

  setCenter(center, animate = true) {
    super.setCenter(center, animate);
    if (this.mapInstance) {
      if (animate) {
        this.mapInstance.panTo(center);
      } else {
        this.mapInstance.setCenter(center);
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
      this.mapInstance.panTo(position);
    }
  }

  fitBounds(bounds, padding = 50) {
    if (!this.mapInstance || !window.google?.maps) return;
    
    const googleBounds = new window.google.maps.LatLngBounds(
      { lat: bounds.south, lng: bounds.west },
      { lat: bounds.north, lng: bounds.east }
    );
    
    this.mapInstance.fitBounds(googleBounds, padding);
  }

  getBounds() {
    if (!this.mapInstance) return null;
    
    const bounds = this.mapInstance.getBounds();
    if (!bounds) return null;
    
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    return {
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng()
    };
  }

  createIcon(svg, width, height, anchorX, anchorY) {
    if (!window.google?.maps) return null;
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(width, height),
      anchor: new window.google.maps.Point(anchorX, anchorY)
    };
  }

  createIconFromUrl(url, width, height) {
    if (!window.google?.maps) return null;
    
    return {
      url,
      scaledSize: new window.google.maps.Size(width, height),
      anchor: new window.google.maps.Point(width / 2, height)
    };
  }

  addMarker(drawable) {
    if (!this.mapInstance || !window.google?.maps) return null;
    
    const position = drawable.getPosition();
    const icon = drawable.getIcon(this);
    const style = drawable.getStyle();
    
    const marker = new window.google.maps.Marker({
      position,
      map: this.mapInstance,
      icon,
      zIndex: style.zIndex,
      draggable: style.draggable,
      title: style.title,
      animation: style.animation === 'bounce' ? window.google.maps.Animation.BOUNCE :
                 style.animation === 'drop' ? window.google.maps.Animation.DROP : null
    });
    
    // Add click handler
    marker.addListener('click', (e) => {
      drawable.handleClick(e);
    });
    
    // Track native object
    this.nativeObjects.set(drawable.id, marker);
    
    return marker;
  }

  removeMarker(marker) {
    if (marker) {
      marker.setMap(null);
    }
  }

  updateMarker(drawable) {
    const marker = this.nativeObjects.get(drawable.id);
    if (!marker) return null;
    
    marker.setPosition(drawable.getPosition());
    marker.setIcon(drawable.getIcon(this));
    marker.setZIndex(drawable.getStyle().zIndex);
    
    return marker;
  }

  addPolyline(drawable) {
    if (!this.mapInstance || !window.google?.maps) return null;
    
    const style = drawable.getStyle();
    
    const polyline = new window.google.maps.Polyline({
      path: drawable.getPath(),
      map: this.mapInstance,
      strokeColor: style.strokeColor,
      strokeOpacity: style.strokeOpacity,
      strokeWeight: style.strokeWeight,
      geodesic: style.geodesic,
      editable: style.editable,
      draggable: style.draggable,
      zIndex: style.zIndex,
      icons: style.icons
    });
    
    polyline.addListener('click', (e) => {
      drawable.handleClick(e);
    });
    
    this.nativeObjects.set(drawable.id, polyline);
    return polyline;
  }

  removePolyline(polyline) {
    if (polyline) {
      polyline.setMap(null);
    }
  }

  addPolygon(drawable) {
    if (!this.mapInstance || !window.google?.maps) return null;
    
    const style = drawable.getStyle();
    
    const polygon = new window.google.maps.Polygon({
      paths: drawable.getPath(),
      map: this.mapInstance,
      strokeColor: style.strokeColor,
      strokeOpacity: style.strokeOpacity,
      strokeWeight: style.strokeWeight,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
      editable: style.editable,
      draggable: style.draggable,
      zIndex: style.zIndex,
      clickable: true
    });
    
    polygon.addListener('click', (e) => {
      drawable.handleClick(e);
    });
    
    this.nativeObjects.set(drawable.id, polygon);
    return polygon;
  }

  removePolygon(polygon) {
    if (polygon) {
      polygon.setMap(null);
    }
  }

  addCircle(drawable) {
    if (!this.mapInstance || !window.google?.maps) return null;
    
    const style = drawable.getStyle();
    const coords = drawable.coordinates;
    
    if (!coords || coords.length === 0) return null;
    
    const circle = new window.google.maps.Circle({
      center: coords[0],
      radius: drawable.radius,
      map: this.mapInstance,
      strokeColor: style.strokeColor,
      strokeOpacity: style.strokeOpacity,
      strokeWeight: style.strokeWeight,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
      editable: style.editable,
      draggable: style.draggable,
      zIndex: style.zIndex,
      clickable: true
    });
    
    circle.addListener('click', (e) => {
      drawable.handleClick(e);
    });
    
    this.nativeObjects.set(drawable.id, circle);
    return circle;
  }

  removeCircle(circle) {
    if (circle) {
      circle.setMap(null);
    }
  }

  showInfoWindow(position, content, options = {}) {
    if (!this.mapInstance || !window.google?.maps) return null;
    
    const infoWindow = new window.google.maps.InfoWindow({
      position,
      content,
      maxWidth: options.maxWidth || 350,
      pixelOffset: options.pixelOffset || new window.google.maps.Size(0, -30)
    });
    
    infoWindow.open(this.mapInstance);
    
    const id = `iw-${Date.now()}`;
    this.infoWindows.set(id, infoWindow);
    
    return { id, infoWindow };
  }

  closeInfoWindow(infoWindowRef) {
    if (infoWindowRef?.infoWindow) {
      infoWindowRef.infoWindow.close();
      this.infoWindows.delete(infoWindowRef.id);
    }
  }

  setTrafficLayer(enabled) {
    if (!this.mapInstance || !window.google?.maps) return;
    
    if (enabled) {
      if (!this.trafficLayer) {
        this.trafficLayer = new window.google.maps.TrafficLayer();
      }
      this.trafficLayer.setMap(this.mapInstance);
    } else if (this.trafficLayer) {
      this.trafficLayer.setMap(null);
    }
  }

  setMapType(mapType) {
    if (this.mapInstance && Object.values(GOOGLE_MAP_TYPES).includes(mapType)) {
      this.mapType = mapType;
      this.mapInstance.setMapTypeId(mapType);
    }
  }

  getAvailableMapTypes() {
    return [
      { id: GOOGLE_MAP_TYPES.ROADMAP, name: 'Mappa', icon: '🗺️' },
      { id: GOOGLE_MAP_TYPES.SATELLITE, name: 'Satellite', icon: '🛰️' },
      { id: GOOGLE_MAP_TYPES.HYBRID, name: 'Ibrida', icon: '🌍' },
      { id: GOOGLE_MAP_TYPES.TERRAIN, name: 'Terreno', icon: '⛰️' }
    ];
  }

  enableDrawingMode(mode, options = {}, onComplete) {
    if (!this.mapInstance || !window.google?.maps) return;
    
    const drawingModes = {
      polygon: window.google.maps.drawing.OverlayType.POLYGON,
      circle: window.google.maps.drawing.OverlayType.CIRCLE,
      polyline: window.google.maps.drawing.OverlayType.POLYLINE,
      marker: window.google.maps.drawing.OverlayType.MARKER
    };
    
    if (!drawingModes[mode]) return;
    
    if (this.drawingManager) {
      this.drawingManager.setMap(null);
    }
    
    this.drawingManager = new window.google.maps.drawing.DrawingManager({
      drawingMode: drawingModes[mode],
      drawingControl: true,
      drawingControlOptions: {
        position: window.google.maps.ControlPosition.TOP_LEFT,
        drawingModes: [drawingModes[mode]]
      },
      polygonOptions: {
        fillColor: options.fillColor || '#2563eb',
        fillOpacity: options.fillOpacity || 0.3,
        strokeWeight: options.strokeWeight || 2,
        strokeColor: options.strokeColor || '#2563eb',
        clickable: true,
        editable: true
      },
      circleOptions: {
        fillColor: options.fillColor || '#2563eb',
        fillOpacity: options.fillOpacity || 0.3,
        strokeWeight: options.strokeWeight || 2,
        strokeColor: options.strokeColor || '#2563eb',
        clickable: true,
        editable: true
      },
      polylineOptions: {
        strokeColor: options.strokeColor || '#2563eb',
        strokeWeight: options.strokeWeight || 3,
        editable: true
      }
    });
    
    this.drawingManager.setMap(this.mapInstance);
    
    // Add completion listeners
    if (mode === 'polygon') {
      window.google.maps.event.addListener(this.drawingManager, 'polygoncomplete', (polygon) => {
        if (onComplete) {
          const path = polygon.getPath();
          const coordinates = [];
          for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            coordinates.push({ lat: point.lat(), lng: point.lng() });
          }
          onComplete({ type: 'polygon', coordinates });
        }
        polygon.setMap(null);
      });
    } else if (mode === 'circle') {
      window.google.maps.event.addListener(this.drawingManager, 'circlecomplete', (circle) => {
        if (onComplete) {
          const center = circle.getCenter();
          onComplete({
            type: 'circle',
            coordinates: [{ lat: center.lat(), lng: center.lng() }],
            radius: Math.round(circle.getRadius())
          });
        }
        circle.setMap(null);
      });
    }
  }

  disableDrawingMode() {
    if (this.drawingManager) {
      this.drawingManager.setMap(null);
      this.drawingManager = null;
    }
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
    if (obj?.setMap) {
      obj.setMap(null);
    }
    this.nativeObjects.delete(drawableId);
  }
}

export default GoogleMapsProvider;
