/**
 * MapController - Client-side controller for map state management
 * 
 * This class manages map state, drawable objects, and provides
 * methods that map buttons/UI can call to update the map display.
 * Works with the MapView component from the polymorphic map architecture.
 */

// Import drawables from the map architecture
import { 
  VehicleDrawable, 
  GeofenceDrawable, 
  MarkerDrawable, 
  PolylineDrawable,
  RouteDrawable 
} from '../components/map/drawables';

// Import GEOFENCE_TYPES for geofence processing
import { GEOFENCE_TYPES } from '../components/map/drawables/GeofenceDrawable';

/**
 * SimpleMapProvider - Lightweight provider for creating icons
 * Implements the interface that drawable classes expect
 */
class SimpleMapProvider {
  constructor(mapType = 'roadmap') {
    this._ready = false;
    this._mapType = mapType;
    
    // Light mode styles for roadmap
    this._styles = [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ];
  }
  
  setReady(ready) {
    this._ready = ready;
  }
  
  isReady() {
    return this._ready && !!window.google?.maps;
  }
  
  setMapType(mapType) {
    this._mapType = mapType;
  }
  
  /**
   * Create an icon for Google Maps marker
   * @param {string} svg - SVG markup
   * @param {number} width
   * @param {number} height
   * @param {number} anchorX
   * @param {number} anchorY
   * @returns {object|null}
   */
  createIcon(svg, width, height, anchorX, anchorY) {
    if (!this.isReady()) return null;
    
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(width, height),
      anchor: new window.google.maps.Point(anchorX, anchorY)
    };
  }
  
  /**
   * Get Google Maps options
   * @param {boolean} hideMapTypeControl
   * @returns {object}
   */
  getMapOptions(hideMapTypeControl = false) {
    return {
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: !hideMapTypeControl,
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeId: this._mapType,
      styles: this._mapType === 'roadmap' ? this._styles : []
    };
  }
}

/**
 * MapController class for managing map state and interactions
 */
class MapController {
  constructor() {
    // Map provider instance
    this._mapProvider = new SimpleMapProvider();
    this._currentProvider = 'roadmap'; // 'roadmap', 'satellite', 'terrain', 'hybrid'
    this._mapInstance = null;
    
    // Drawable collections
    this._vehicles = new Map(); // id -> VehicleDrawable
    this._geofences = new Map(); // id -> GeofenceDrawable
    this._markers = new Map(); // id -> MarkerDrawable
    this._routes = new Map(); // id -> RouteDrawable
    
    // Raw data cache (for re-rendering)
    this._rawVehicleData = [];
    this._rawGeofenceData = [];
    
    // View state
    this._center = { lat: 41.9028, lng: 12.4964 }; // Default: Rome
    this._zoom = 6;
    this._selectedVehicleId = null;
    this._showGeofences = true;
    this._showRoutes = true;
    this._followMode = false;
    this._followedVehicleId = null;
    
    // Display options (managed by controller)
    this._enableClustering = false;
    this._showTraffic = false;
    
    // Render versioning - incremented on any change that requires re-render
    this._renderVersion = 0;
    this._clusterVersion = 0; // Specifically for clustering changes
    
    // Coupling state
    this._enableCoupling = false;
    this._coupledPairs = []; // Array of { truckPlate, trailerPlate }
    
    // Filter state
    this._filters = {
      showMoving: true,
      showStopped: true,
      showWithTemperature: false,
      searchTerm: '',
      hiddenVehicles: new Set() // Set of plate strings to hide
    };
    
    // Event callbacks - use arrays to support multiple listeners
    this._updateListeners = [];
    this._vehicleSelectListeners = [];
    this._onProviderChange = null;
  }
  
  // ==================== RENDER VERSION TRACKING ====================
  
  /**
   * Get current render version - view should re-render when this changes
   * @returns {number}
   */
  getRenderVersion() {
    return this._renderVersion;
  }
  
  /**
   * Get cluster version - used to force cluster component remount
   * @returns {number}
   */
  getClusterVersion() {
    return this._clusterVersion;
  }
  
  /**
   * Increment render version to force re-render
   * @private
   */
  _incrementRenderVersion() {
    this._renderVersion++;
  }
  
  /**
   * Increment cluster version to force cluster remount
   * @private
   */
  _incrementClusterVersion() {
    this._clusterVersion++;
    this._renderVersion++;
  }

  // ==================== MAP PROVIDER MANAGEMENT ====================

  /**
   * Get the map provider instance
   * @returns {SimpleMapProvider}
   */
  getProvider() {
    return this._mapProvider;
  }
  
  /**
   * Get current map type string
   * @returns {string}
   */
  getMapType() {
    return this._currentProvider;
  }

  /**
   * Set map provider (changes map type)
   * @param {string} provider - 'google', 'osm', 'mapbox', 'satellite', 'terrain', 'hybrid', 'roadmap'
   */
  setProvider(provider) {
    const validProviders = ['google', 'osm', 'mapbox', 'satellite', 'terrain', 'hybrid', 'roadmap'];
    if (validProviders.includes(provider)) {
      this._currentProvider = provider;
      this._mapProvider.setMapType(provider);
      this._onProviderChange?.(provider);
      this._triggerUpdate('provider');
    }
  }

  /**
   * Cycle to next provider
   * @returns {string} New provider name
   */
  cycleProvider() {
    const providers = ['roadmap', 'satellite', 'terrain', 'hybrid'];
    const currentIndex = providers.indexOf(this._currentProvider);
    const nextIndex = (currentIndex + 1) % providers.length;
    this.setProvider(providers[nextIndex]);
    return providers[nextIndex];
  }

  /**
   * Set the map instance reference
   * @param {object} map
   */
  setMapInstance(map) {
    this._mapInstance = map;
  }

  // ==================== DISPLAY OPTIONS ====================

  /**
   * Set clustering state - clears and rebuilds vehicles when changed
   * @param {boolean} enabled
   */
  setClustering(enabled) {
    const changed = this._enableClustering !== enabled;
    this._enableClustering = enabled;
    
    if (changed) {
      // Increment cluster version to force view to remount cluster component
      this._incrementClusterVersion();
      // Force rebuild vehicles to apply clustering change
      this._rebuildVehicles();
      this._triggerUpdate('clustering');
    }
  }

  /**
   * Get clustering state
   * @returns {boolean}
   */
  isClustering() {
    return this._enableClustering;
  }

  /**
   * Toggle clustering
   * @returns {boolean} New state
   */
  toggleClustering() {
    this.setClustering(!this._enableClustering);
    return this._enableClustering;
  }

  /**
   * Set traffic layer state
   * @param {boolean} enabled
   */
  setTraffic(enabled) {
    this._showTraffic = enabled;
    this._triggerUpdate('traffic');
  }

  /**
   * Get traffic layer state
   * @returns {boolean}
   */
  isShowingTraffic() {
    return this._showTraffic;
  }

  /**
   * Toggle traffic layer
   * @returns {boolean} New state
   */
  toggleTraffic() {
    this._showTraffic = !this._showTraffic;
    this._triggerUpdate('traffic');
    return this._showTraffic;
  }

  /**
   * Force rebuild all vehicles from cached data
   * Use when display options change (clustering, filters, etc.)
   * @private
   */
  _rebuildVehicles() {
    if (this._rawVehicleData.length > 0) {
      // Clear existing vehicles
      this._vehicles.clear();
      // Rebuild from raw data (this will call updateVehicles logic again)
      this.updateVehicles(this._rawVehicleData);
    }
  }

  /**
   * Force rebuild all geofences from cached data
   * @private
   */
  _rebuildGeofences() {
    if (this._rawGeofenceData.length > 0) {
      this._geofences.clear();
      this.updateGeofences(this._rawGeofenceData);
    }
  }

  /**
   * Force full refresh of all map objects
   */
  refresh() {
    // Clear all drawables from the map first
    this.clearMap();
    
    // Increment render version
    this._incrementRenderVersion();
    
    // Rebuild from cached data
    if (this._rawVehicleData.length > 0) {
      this.updateVehicles(this._rawVehicleData);
    }
    if (this._rawGeofenceData.length > 0) {
      this.updateGeofences(this._rawGeofenceData);
    }
    
    this._triggerUpdate('refresh');
  }

  /**
   * Clear all objects from the map
   * Calls clearFromMap on each drawable before clearing collections
   */
  clearMap() {
    // Clear each vehicle from map
    for (const drawable of this._vehicles.values()) {
      if (typeof drawable.clearFromMap === 'function') {
        drawable.clearFromMap(this._mapInstance);
      }
    }
    this._vehicles.clear();
    
    // Clear each geofence from map
    for (const drawable of this._geofences.values()) {
      if (typeof drawable.clearFromMap === 'function') {
        drawable.clearFromMap(this._mapInstance);
      }
    }
    this._geofences.clear();
    
    // Clear each route from map
    for (const drawable of this._routes.values()) {
      if (typeof drawable.clearFromMap === 'function') {
        drawable.clearFromMap(this._mapInstance);
      }
    }
    this._routes.clear();
    
    // Clear each marker from map
    for (const drawable of this._markers.values()) {
      if (typeof drawable.clearFromMap === 'function') {
        drawable.clearFromMap(this._mapInstance);
      }
    }
    this._markers.clear();
  }

  // ==================== VEHICLE DRAWABLE MANAGEMENT ====================

  /**
   * Normalize plate string for comparison
   * @private
   */
  _normalizePlate(plate) {
    return (plate || '').toUpperCase().replace(/\*+$/, '');
  }

  /**
   * Update vehicles on the map from position data
   * Uses VehicleDrawable.fromVehicleData for proper drawable creation
   * Handles coupling logic and deduplication
   * @param {Array} positions - Array of raw vehicle/position objects from API
   * @returns {Map} Updated vehicles map
   */
  updateVehicles(positions) {
    // Cache raw data for re-rendering
    this._rawVehicleData = positions || [];
    
    if (!positions || positions.length === 0) {
      this._vehicles.clear();
      this._triggerUpdate('vehicles');
      return this._vehicles;
    }

    // Step 1: Deduplicate by plate/key, keeping most recent
    const vehiclesByKey = new Map();
    
    for (const v of positions) {
      const plate = this._normalizePlate(v.targa || v.targa_camion);
      const key = plate || `id_${v.idServizio || v.id}`;
      if (!key) continue;
      
      const existing = vehiclesByKey.get(key);
      if (existing) {
        const existingTime = existing.posizione?.fixGps ? new Date(existing.posizione.fixGps).getTime() : 0;
        const newTime = v.posizione?.fixGps ? new Date(v.posizione.fixGps).getTime() : 0;
        if (newTime > existingTime) {
          vehiclesByKey.set(key, v);
        }
      } else {
        vehiclesByKey.set(key, v);
      }
    }
    
    let processedList = Array.from(vehiclesByKey.values());
    
    // Step 2: Apply coupling if enabled
    if (this._enableCoupling && this._coupledPairs.length > 0) {
      const coupledPlates = new Set();
      const coupledVehicles = [];
      
      for (const pair of this._coupledPairs) {
        const truckPlate = this._normalizePlate(pair.truckPlate);
        const trailerPlate = this._normalizePlate(pair.trailerPlate);
        
        const truck = vehiclesByKey.get(truckPlate);
        const trailer = vehiclesByKey.get(trailerPlate);
        
        if (truck && trailer) {
          const truckTime = truck.posizione?.fixGps ? new Date(truck.posizione.fixGps).getTime() : 0;
          const trailerTime = trailer.posizione?.fixGps ? new Date(trailer.posizione.fixGps).getTime() : 0;
          const mainVehicle = trailerTime > truckTime ? trailer : truck;
          
          // Create coupled vehicle data
          coupledVehicles.push({
            ...mainVehicle,
            _coupled: true,
            _truckPlate: truckPlate,
            _trailerPlate: trailerPlate,
            _truckData: truck,
            _trailerData: trailer
          });
          
          coupledPlates.add(truckPlate);
          coupledPlates.add(trailerPlate);
        }
      }
      
      processedList = [
        ...coupledVehicles,
        ...processedList.filter(v => !coupledPlates.has(this._normalizePlate(v.targa || v.targa_camion)))
      ];
    }
    
    // Step 3: Create VehicleDrawable instances using the factory method
    const newVehicles = new Map();
    
    for (const vehicleData of processedList) {
      const plate = this._normalizePlate(vehicleData.targa || vehicleData.targa_camion);
      
      // Skip hidden vehicles
      if (this._filters.hiddenVehicles.has(plate)) continue;
      
      const id = vehicleData.idServizio || vehicleData.id || plate;
      const isSelected = this._selectedVehicleId === id;
      
      // Use the factory method from VehicleDrawable
      const drawable = VehicleDrawable.fromVehicleData(vehicleData, {
        isSelected,
        onClick: () => this.selectVehicle(id)
      });
      
      if (drawable) {
        newVehicles.set(id, drawable);
      }
    }
    
    this._vehicles = newVehicles;
    this._incrementRenderVersion();
    this._triggerUpdate('vehicles');
    return this._vehicles;
  }

  /**
   * Set coupling state
   * @param {boolean} enabled
   * @param {Array} pairs - Array of { truckPlate, trailerPlate }
   */
  setCoupling(enabled, pairs = []) {
    const changed = this._enableCoupling !== enabled || 
                    JSON.stringify(this._coupledPairs) !== JSON.stringify(pairs);
    
    this._enableCoupling = enabled;
    this._coupledPairs = pairs;
    
    // Regenerate vehicles with updated coupling state
    if (changed && this._rawVehicleData.length > 0) {
      this.updateVehicles(this._rawVehicleData);
    }
  }

  /**
   * Add a coupled pair
   * @param {string} truckPlate
   * @param {string} trailerPlate
   */
  addCoupledPair(truckPlate, trailerPlate) {
    this._coupledPairs.push({ truckPlate, trailerPlate });
    // Regenerate vehicles with updated coupling
    if (this._rawVehicleData.length > 0) {
      this.updateVehicles(this._rawVehicleData);
    }
  }

  /**
   * Remove a coupled pair
   * @param {string} truckPlate
   * @param {string} trailerPlate
   */
  removeCoupledPair(truckPlate, trailerPlate) {
    this._coupledPairs = this._coupledPairs.filter(
      p => !(p.truckPlate === truckPlate && p.trailerPlate === trailerPlate)
    );
    // Regenerate vehicles with updated coupling
    if (this._rawVehicleData.length > 0) {
      this.updateVehicles(this._rawVehicleData);
    }
  }

  /**
   * Hide a vehicle by plate
   * @param {string} plate
   */
  hideVehicle(plate) {
    this._filters.hiddenVehicles.add(this._normalizePlate(plate));
    this._rebuildVehicles();
    this._triggerUpdate('filters');
  }

  /**
   * Show a hidden vehicle
   * @param {string} plate
   */
  showVehicle(plate) {
    this._filters.hiddenVehicles.delete(this._normalizePlate(plate));
    this._rebuildVehicles();
    this._triggerUpdate('filters');
  }

  /**
   * Get hidden vehicles
   * @returns {Array<string>}
   */
  getHiddenVehicles() {
    return Array.from(this._filters.hiddenVehicles);
  }

  /**
   * Get all vehicle drawables
   * @returns {Array<VehicleDrawable>}
   */
  getVehicles() {
    return Array.from(this._vehicles.values());
  }

  /**
   * Get filtered vehicle drawables
   * @returns {Array<VehicleDrawable>}
   */
  getFilteredVehicles() {
    let vehicles = this.getVehicles();

    // Filter out hidden vehicles
    if (this._filters.hiddenVehicles.size > 0) {
      vehicles = vehicles.filter(v => {
        const plate = this._normalizePlate(v.data.plate || v.plate);
        return !this._filters.hiddenVehicles.has(plate);
      });
    }

    if (!this._filters.showMoving) {
      vehicles = vehicles.filter(v => v.data.speed <= 3);
    }

    if (!this._filters.showStopped) {
      vehicles = vehicles.filter(v => v.data.speed > 3);
    }

    if (this._filters.showWithTemperature) {
      vehicles = vehicles.filter(v => v.data.hasTemperature);
    }

    if (this._filters.searchTerm) {
      const term = this._filters.searchTerm.toLowerCase();
      vehicles = vehicles.filter(v =>
        v.data.plate?.toLowerCase().includes(term) ||
        v.data.nickname?.toLowerCase().includes(term) ||
        v.data.address?.toLowerCase().includes(term)
      );
    }

    return vehicles;
  }

  /**
   * Get a single vehicle by ID
   * @param {string|number} id
   * @returns {VehicleDrawable|null}
   */
  getVehicleById(id) {
    return this._vehicles.get(id) || null;
  }

  /**
   * Get vehicle by plate
   * @param {string} plate
   * @returns {VehicleDrawable|null}
   */
  getVehicleByPlate(plate) {
    const normalizedPlate = (plate || '').toUpperCase().replace(/\*+$/, '');
    for (const vehicle of this._vehicles.values()) {
      if (vehicle.data.plate?.toUpperCase().replace(/\*+$/, '') === normalizedPlate) {
        return vehicle;
      }
    }
    return null;
  }

  // ==================== GEOFENCE DRAWABLE MANAGEMENT ====================

  /**
   * Update geofences on the map
   * @param {Array} geofences - Array of geofence data from API
   * @returns {Map}
   */
  updateGeofences(geofences) {
    // Cache raw data for re-rendering
    this._rawGeofenceData = geofences || [];
    
    if (!geofences || geofences.length === 0) {
      this._geofences.clear();
      this._triggerUpdate('geofences');
      return this._geofences;
    }
    
    const newGeofences = new Map();
    
    for (const gf of geofences) {
      let coordinates = gf.coordinate;
      if (typeof coordinates === 'string') {
        try {
          coordinates = JSON.parse(coordinates);
        } catch (e) {
          continue;
        }
      }
      
      if (!coordinates || coordinates.length === 0) continue;
      
      const drawable = new GeofenceDrawable({
        id: `geo-${gf.id}`,
        name: gf.nome,
        description: gf.descrizione,
        type: gf.tipo === 'circle' ? GEOFENCE_TYPES.CIRCLE : GEOFENCE_TYPES.POLYGON,
        color: gf.colore || '#3b82f6',
        coordinates,
        radius: gf.raggio_metri || 100,
        data: gf
      });
      
      newGeofences.set(gf.id, drawable);
    }
    
    this._geofences = newGeofences;
    this._triggerUpdate('geofences');
    return this._geofences;
  }

  /**
   * Get all geofence drawables
   * @returns {Array<GeofenceDrawable>}
   */
  getGeofences() {
    if (!this._showGeofences) return [];
    return Array.from(this._geofences.values());
  }

  /**
   * Toggle geofences visibility
   * @returns {boolean} New visibility state
   */
  toggleGeofences() {
    this._showGeofences = !this._showGeofences;
    this._triggerUpdate('geofences');
    return this._showGeofences;
  }

  /**
   * Set geofences visibility
   * @param {boolean} visible
   */
  setGeofencesVisible(visible) {
    this._showGeofences = visible;
    this._triggerUpdate('geofences');
  }

  // ==================== VIEW MANAGEMENT ====================

  /**
   * Set map center
   * @param {object} center - { lat, lng }
   */
  setCenter(center) {
    this._center = center;
    this._triggerUpdate('view');
  }

  /**
   * Get current center
   * @returns {object}
   */
  getCenter() {
    return this._center;
  }

  /**
   * Set zoom level
   * @param {number} zoom
   */
  setZoom(zoom) {
    this._zoom = Math.max(1, Math.min(20, zoom));
    this._triggerUpdate('view');
  }

  /**
   * Get current zoom
   * @returns {number}
   */
  getZoom() {
    return this._zoom;
  }

  /**
   * Zoom in
   */
  zoomIn() {
    this.setZoom(this._zoom + 1);
  }

  /**
   * Zoom out
   */
  zoomOut() {
    this.setZoom(this._zoom - 1);
  }

  /**
   * Focus on a specific vehicle
   * @param {string|number} vehicleId
   * @param {number} zoom - Optional zoom level
   */
  focusOnVehicle(vehicleId, zoom = 15) {
    const vehicle = this._vehicles.get(vehicleId);
    if (vehicle) {
      this.setCenter(vehicle.getPosition());
      this.setZoom(zoom);
      this.selectVehicle(vehicleId);
    }
  }

  /**
   * Focus on vehicle by plate
   * @param {string} plate
   * @param {number} zoom
   */
  focusOnPlate(plate, zoom = 15) {
    const vehicle = this.getVehicleByPlate(plate);
    if (vehicle) {
      this.focusOnVehicle(vehicle.data.id, zoom);
    }
  }

  /**
   * Fit all vehicles in view
   */
  fitAllVehicles() {
    const vehicles = this.getFilteredVehicles();
    if (vehicles.length === 0) return;
    
    const bounds = this._calculateBounds(vehicles.map(v => v.getPosition()));
    // The actual fitBounds will be implemented by the map provider
    this._triggerUpdate('fitBounds', bounds);
  }

  /**
   * Calculate bounds for a set of positions
   * @private
   */
  _calculateBounds(positions) {
    if (positions.length === 0) return null;
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;
    
    for (const pos of positions) {
      if (pos.lat < minLat) minLat = pos.lat;
      if (pos.lat > maxLat) maxLat = pos.lat;
      if (pos.lng < minLng) minLng = pos.lng;
      if (pos.lng > maxLng) maxLng = pos.lng;
    }
    
    return {
      sw: { lat: minLat, lng: minLng },
      ne: { lat: maxLat, lng: maxLng }
    };
  }

  // ==================== SELECTION & FOLLOW MODE ====================

  /**
   * Select a vehicle
   * @param {string|number} vehicleId
   */
  selectVehicle(vehicleId) {
    this._selectedVehicleId = vehicleId;
    const vehicle = this._vehicles.get(vehicleId);
    this._vehicleSelectListeners.forEach(listener => {
      try {
        listener(vehicleId, vehicle);
      } catch (e) {
        console.error('Error in vehicle select listener:', e);
      }
    });
    this._triggerUpdate('selection');
  }

  /**
   * Clear vehicle selection
   */
  clearSelection() {
    this._selectedVehicleId = null;
    this._vehicleSelectListeners.forEach(listener => {
      try {
        listener(null, null);
      } catch (e) {
        console.error('Error in vehicle select listener:', e);
      }
    });
    this._triggerUpdate('selection');
  }

  /**
   * Get selected vehicle
   * @returns {VehicleDrawable|null}
   */
  getSelectedVehicle() {
    if (!this._selectedVehicleId) return null;
    return this._vehicles.get(this._selectedVehicleId);
  }

  /**
   * Enable follow mode for a vehicle
   * @param {string|number} vehicleId
   */
  followVehicle(vehicleId) {
    this._followMode = true;
    this._followedVehicleId = vehicleId;
    this.focusOnVehicle(vehicleId);
    this._triggerUpdate('follow');
  }

  /**
   * Disable follow mode
   */
  stopFollowing() {
    this._followMode = false;
    this._followedVehicleId = null;
    this._triggerUpdate('follow');
  }

  /**
   * Check if follow mode is active
   * @returns {boolean}
   */
  isFollowing() {
    return this._followMode;
  }

  // ==================== FILTER MANAGEMENT ====================

  /**
   * Set filter state
   * @param {object} filters
   */
  setFilters(filters) {
    this._filters = { ...this._filters, ...filters };
    this._triggerUpdate('filters');
  }

  /**
   * Get current filters
   * @returns {object}
   */
  getFilters() {
    return { ...this._filters };
  }

  /**
   * Toggle moving vehicles filter
   * @returns {boolean}
   */
  toggleShowMoving() {
    this._filters.showMoving = !this._filters.showMoving;
    this._triggerUpdate('filters');
    return this._filters.showMoving;
  }

  /**
   * Toggle stopped vehicles filter
   * @returns {boolean}
   */
  toggleShowStopped() {
    this._filters.showStopped = !this._filters.showStopped;
    this._triggerUpdate('filters');
    return this._filters.showStopped;
  }

  /**
   * Toggle temperature filter
   * @returns {boolean}
   */
  toggleShowTemperature() {
    this._filters.showWithTemperature = !this._filters.showWithTemperature;
    this._triggerUpdate('filters');
    return this._filters.showWithTemperature;
  }

  /**
   * Set search term
   * @param {string} term
   */
  setSearchTerm(term) {
    this._filters.searchTerm = term;
    this._triggerUpdate('filters');
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this._filters = {
      showMoving: true,
      showStopped: true,
      showWithTemperature: false,
      searchTerm: '',
      hiddenVehicles: new Set()
    };
    this._triggerUpdate('filters');
  }

  // ==================== ROUTE MANAGEMENT ====================

  /**
   * Update routes from an array of route templates or trips
   * @param {Array} routes - Array of route objects (templates or trips)
   * @param {string} type - 'template' or 'trip'
   */
  updateRoutes(routes, type = 'template') {
    this._routes.clear();
    
    routes.forEach(route => {
      const drawable = type === 'trip' 
        ? RouteDrawable.fromTrip(route)
        : RouteDrawable.fromTemplate(route);
      
      this._routes.set(drawable.id, drawable);
    });
    
    this._triggerUpdate('routes');
  }

  /**
   * Add a single route from template data
   * @param {object} template - Route template object
   * @returns {RouteDrawable}
   */
  addRouteFromTemplate(template) {
    const drawable = RouteDrawable.fromTemplate(template);
    this._routes.set(drawable.id, drawable);
    this._triggerUpdate('routes');
    return drawable;
  }

  /**
   * Add a single route from trip data
   * @param {object} trip - Trip object
   * @returns {RouteDrawable}
   */
  addRouteFromTrip(trip) {
    const drawable = RouteDrawable.fromTrip(trip);
    this._routes.set(drawable.id, drawable);
    this._triggerUpdate('routes');
    return drawable;
  }

  /**
   * Add a route with raw path data (backward compatibility)
   * @param {string} id
   * @param {Array} path - Array of { lat, lng }
   * @param {object} options
   */
  addRoute(id, path, options = {}) {
    const drawable = new RouteDrawable({
      id,
      path,
      color: options.color || '#0066FF',
      strokeWeight: options.weight || options.strokeWeight || 3,
      strokeOpacity: options.opacity || options.strokeOpacity || 0.8,
      name: options.name || '',
      ...options
    });
    this._routes.set(id, drawable);
    this._triggerUpdate('routes');
    return drawable;
  }

  /**
   * Remove a route
   * @param {string} id
   */
  removeRoute(id) {
    this._routes.delete(id);
    this._triggerUpdate('routes');
  }

  /**
   * Get a specific route by ID
   * @param {string} id
   * @returns {RouteDrawable|null}
   */
  getRoute(id) {
    return this._routes.get(id) || null;
  }

  /**
   * Get all routes
   * @returns {Array<RouteDrawable>}
   */
  getRoutes() {
    if (!this._showRoutes) return [];
    return Array.from(this._routes.values());
  }

  /**
   * Highlight a specific route
   * @param {string} id
   */
  highlightRoute(id) {
    this._routes.forEach((route, routeId) => {
      route.setHighlighted(routeId === id);
    });
    this._triggerUpdate('routes');
  }

  /**
   * Clear route highlighting
   */
  clearRouteHighlight() {
    this._routes.forEach(route => {
      route.setHighlighted(false);
    });
    this._triggerUpdate('routes');
  }

  /**
   * Fit map to show a specific route
   * @param {string} id
   */
  fitToRoute(id) {
    const route = this._routes.get(id);
    if (route) {
      const bounds = route.getBounds();
      if (bounds) {
        this._triggerUpdate('fitBounds', bounds);
      }
    }
  }

  /**
   * Clear all routes
   */
  clearRoutes() {
    this._routes.clear();
    this._triggerUpdate('routes');
  }

  /**
   * Toggle routes visibility
   * @returns {boolean}
   */
  toggleRoutes() {
    this._showRoutes = !this._showRoutes;
    this._triggerUpdate('routes');
    return this._showRoutes;
  }

  // ==================== MARKER MANAGEMENT ====================

  /**
   * Add a custom marker
   * @param {string} id
   * @param {object} position - { lat, lng }
   * @param {object} options
   */
  addMarker(id, position, options = {}) {
    const drawable = new MarkerDrawable({
      id,
      position,
      title: options.title || '',
      icon: options.icon,
      ...options
    });
    this._markers.set(id, drawable);
    this._triggerUpdate('markers');
  }

  /**
   * Remove a marker
   * @param {string} id
   */
  removeMarker(id) {
    this._markers.delete(id);
    this._triggerUpdate('markers');
  }

  /**
   * Get all custom markers
   * @returns {Array<MarkerDrawable>}
   */
  getMarkers() {
    return Array.from(this._markers.values());
  }

  /**
   * Clear all markers
   */
  clearMarkers() {
    this._markers.clear();
    this._triggerUpdate('markers');
  }

  // ==================== EVENT CALLBACKS ====================

  /**
   * Add update listener (called when map state changes)
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onUpdate(callback) {
    if (callback) {
      this._updateListeners.push(callback);
      // Return unsubscribe function
      return () => {
        const index = this._updateListeners.indexOf(callback);
        if (index > -1) {
          this._updateListeners.splice(index, 1);
        }
      };
    }
    return () => {};
  }

  /**
   * Add vehicle select listener
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onVehicleSelect(callback) {
    if (callback) {
      this._vehicleSelectListeners.push(callback);
      return () => {
        const index = this._vehicleSelectListeners.indexOf(callback);
        if (index > -1) {
          this._vehicleSelectListeners.splice(index, 1);
        }
      };
    }
    return () => {};
  }

  /**
   * Set provider change callback
   * @param {Function} callback
   */
  onProviderChange(callback) {
    this._onProviderChange = callback;
  }

  /**
   * Trigger update callback
   * @private
   */
  _triggerUpdate(type, data = null) {
    const event = {
      type,
      data,
      state: this.getState()
    };
    
    // Notify all listeners
    this._updateListeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in update listener:', e);
      }
    });
    
    // Handle follow mode updates
    if (type === 'vehicles' && this._followMode && this._followedVehicleId) {
      const vehicle = this._vehicles.get(this._followedVehicleId);
      if (vehicle) {
        this.setCenter(vehicle.getPosition());
      }
    }
  }

  // ==================== STATE MANAGEMENT ====================

  /**
   * Get complete map state (for serialization or debugging)
   * @returns {object}
   */
  getState() {
    return {
      provider: this._currentProvider,
      center: this._center,
      zoom: this._zoom,
      selectedVehicleId: this._selectedVehicleId,
      followMode: this._followMode,
      followedVehicleId: this._followedVehicleId,
      showGeofences: this._showGeofences,
      showRoutes: this._showRoutes,
      filters: { ...this._filters },
      vehicleCount: this._vehicles.size,
      geofenceCount: this._geofences.size,
      markerCount: this._markers.size,
      routeCount: this._routes.size,
      // Display options
      enableClustering: this._enableClustering,
      showTraffic: this._showTraffic,
      // Version tracking for view updates
      renderVersion: this._renderVersion,
      clusterVersion: this._clusterVersion
    };
  }

  /**
   * Restore state from saved data
   * @param {object} state
   */
  restoreState(state) {
    if (state.provider) this._currentProvider = state.provider;
    if (state.center) this._center = state.center;
    if (state.zoom) this._zoom = state.zoom;
    if (state.showGeofences !== undefined) this._showGeofences = state.showGeofences;
    if (state.showRoutes !== undefined) this._showRoutes = state.showRoutes;
    if (state.enableClustering !== undefined) this._enableClustering = state.enableClustering;
    if (state.showTraffic !== undefined) this._showTraffic = state.showTraffic;
    if (state.filters) this._filters = { ...this._filters, ...state.filters };
    this._triggerUpdate('restore');
  }

  /**
   * Reset controller to initial state
   */
  reset() {
    this._vehicles.clear();
    this._geofences.clear();
    this._markers.clear();
    this._routes.clear();
    this._selectedVehicleId = null;
    this._followMode = false;
    this._followedVehicleId = null;
    this._enableCoupling = false;
    this._coupledPairs = [];
    this._filters = {
      showMoving: true,
      showStopped: true,
      showWithTemperature: false,
      searchTerm: '',
      hiddenVehicles: new Set()
    };
    this._triggerUpdate('reset');
  }

  /**
   * Get all drawables as arrays for the MapView component
   * @returns {object}
   */
  getAllDrawables() {
    return {
      vehicles: this.getFilteredVehicles(),
      geofences: this.getGeofences(),
      markers: this.getMarkers(),
      routes: this.getRoutes()
    };
  }
}

// Factory function to create a new controller instance
export function createMapController() {
  return new MapController();
}

// Export the class
export { MapController };
export default MapController;
