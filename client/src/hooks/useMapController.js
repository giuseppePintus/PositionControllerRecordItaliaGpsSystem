/**
 * useMapController - React hook for integrating MapController with React components
 * 
 * This hook manages the MapController instance and provides reactive state
 * for use in React components.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { createMapController } from '../controllers/MapController';

/**
 * Hook for using MapController in React components
 * @param {object} options - Configuration options
 * @returns {object} Controller instance and state
 */
export function useMapController(options = {}) {
  const {
    initialProvider = 'roadmap',
    onVehicleSelect,
    autoRefresh = false,
    // New options for coupling and hiding
    enableCoupling = false,
    coupledPairs = [],
    hiddenVehicles = []
  } = options;

  // Controller instance (persists across renders)
  const controllerRef = useRef(null);
  
  // Reactive state
  const [state, setState] = useState({
    provider: initialProvider,
    center: { lat: 41.9028, lng: 12.4964 },
    zoom: 6,
    selectedVehicleId: null,
    followMode: false,
    showGeofences: true,
    filters: {
      showMoving: true,
      showStopped: true,
      showWithTemperature: false,
      searchTerm: '',
      hiddenVehicles: new Set()
    },
    vehicleCount: 0,
    geofenceCount: 0,
    // Display options
    enableClustering: false,
    showTraffic: false,
    // Version tracking
    renderVersion: 0,
    clusterVersion: 0
  });

  // Initialize controller
  if (!controllerRef.current) {
    controllerRef.current = createMapController();
    controllerRef.current.setProvider(initialProvider);
  }

  const controller = controllerRef.current;

  // Set up update callback
  useEffect(() => {
    const unsubscribeUpdate = controller.onUpdate((update) => {
      setState(controller.getState());
    });

    const unsubscribeVehicleSelect = controller.onVehicleSelect((id, vehicle) => {
      onVehicleSelect?.(id, vehicle);
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeVehicleSelect();
    };
  }, [controller, onVehicleSelect]);

  // Sync coupling settings with controller
  useEffect(() => {
    controller.setCoupling(enableCoupling, coupledPairs);
  }, [controller, enableCoupling, coupledPairs]);

  // Sync hidden vehicles with controller
  useEffect(() => {
    // Clear existing hidden vehicles and set new ones
    const currentHidden = controller.getHiddenVehicles();
    currentHidden.forEach(plate => controller.showVehicle(plate));
    hiddenVehicles.forEach(plate => controller.hideVehicle(plate));
  }, [controller, hiddenVehicles]);

  // ==================== VEHICLE OPERATIONS ====================

  /**
   * Update vehicles from position data
   */
  const updateVehicles = useCallback((positions) => {
    controller.updateVehicles(positions);
  }, [controller]);

  /**
   * Get all vehicles (drawable objects)
   */
  const getVehicles = useCallback(() => {
    return controller.getFilteredVehicles();
  }, [controller]);

  /**
   * Focus on a vehicle
   */
  const focusOnVehicle = useCallback((vehicleId, zoom = 15) => {
    controller.focusOnVehicle(vehicleId, zoom);
  }, [controller]);

  /**
   * Focus on a vehicle by plate
   */
  const focusOnPlate = useCallback((plate, zoom = 15) => {
    controller.focusOnPlate(plate, zoom);
  }, [controller]);

  /**
   * Select a vehicle
   */
  const selectVehicle = useCallback((vehicleId) => {
    controller.selectVehicle(vehicleId);
  }, [controller]);

  /**
   * Clear vehicle selection
   */
  const clearSelection = useCallback(() => {
    controller.clearSelection();
  }, [controller]);

  /**
   * Get selected vehicle
   */
  const getSelectedVehicle = useCallback(() => {
    return controller.getSelectedVehicle();
  }, [controller]);

  // ==================== GEOFENCE OPERATIONS ====================

  /**
   * Update geofences
   */
  const updateGeofences = useCallback((geofences) => {
    controller.updateGeofences(geofences);
  }, [controller]);

  /**
   * Get all geofences
   */
  const getGeofences = useCallback(() => {
    return controller.getGeofences();
  }, [controller]);

  /**
   * Toggle geofences visibility
   */
  const toggleGeofences = useCallback(() => {
    return controller.toggleGeofences();
  }, [controller]);

  // ==================== VIEW OPERATIONS ====================

  /**
   * Set map center
   */
  const setCenter = useCallback((center) => {
    controller.setCenter(center);
  }, [controller]);

  /**
   * Set zoom level
   */
  const setZoom = useCallback((zoom) => {
    controller.setZoom(zoom);
  }, [controller]);

  /**
   * Zoom in
   */
  const zoomIn = useCallback(() => {
    controller.zoomIn();
  }, [controller]);

  /**
   * Zoom out
   */
  const zoomOut = useCallback(() => {
    controller.zoomOut();
  }, [controller]);

  /**
   * Fit all vehicles
   */
  const fitAllVehicles = useCallback(() => {
    controller.fitAllVehicles();
  }, [controller]);

  // ==================== PROVIDER OPERATIONS ====================

  /**
   * Set map provider/type
   */
  const setProvider = useCallback((provider) => {
    controller.setProvider(provider);
  }, [controller]);

  /**
   * Cycle to next provider
   */
  const cycleProvider = useCallback(() => {
    return controller.cycleProvider();
  }, [controller]);

  // ==================== FILTER OPERATIONS ====================

  /**
   * Set filters
   */
  const setFilters = useCallback((filters) => {
    controller.setFilters(filters);
  }, [controller]);

  /**
   * Toggle moving filter
   */
  const toggleShowMoving = useCallback(() => {
    return controller.toggleShowMoving();
  }, [controller]);

  /**
   * Toggle stopped filter
   */
  const toggleShowStopped = useCallback(() => {
    return controller.toggleShowStopped();
  }, [controller]);

  /**
   * Toggle temperature filter
   */
  const toggleShowTemperature = useCallback(() => {
    return controller.toggleShowTemperature();
  }, [controller]);

  /**
   * Set search term
   */
  const setSearchTerm = useCallback((term) => {
    controller.setSearchTerm(term);
  }, [controller]);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    controller.clearFilters();
  }, [controller]);

  // ==================== COUPLING OPERATIONS ====================

  /**
   * Set coupling state
   */
  const setCoupling = useCallback((enabled, pairs = []) => {
    controller.setCoupling(enabled, pairs);
  }, [controller]);

  /**
   * Add a coupled pair
   */
  const addCoupledPair = useCallback((truckPlate, trailerPlate) => {
    controller.addCoupledPair(truckPlate, trailerPlate);
  }, [controller]);

  /**
   * Remove a coupled pair
   */
  const removeCoupledPair = useCallback((truckPlate, trailerPlate) => {
    controller.removeCoupledPair(truckPlate, trailerPlate);
  }, [controller]);

  /**
   * Hide a vehicle
   */
  const hideVehicle = useCallback((plate) => {
    controller.hideVehicle(plate);
  }, [controller]);

  /**
   * Show a hidden vehicle
   */
  const showVehicle = useCallback((plate) => {
    controller.showVehicle(plate);
  }, [controller]);

  /**
   * Get hidden vehicles
   */
  const getHiddenVehicles = useCallback(() => {
    return controller.getHiddenVehicles();
  }, [controller]);

  // ==================== FOLLOW MODE ====================

  /**
   * Follow a vehicle
   */
  const followVehicle = useCallback((vehicleId) => {
    controller.followVehicle(vehicleId);
  }, [controller]);

  /**
   * Stop following
   */
  const stopFollowing = useCallback(() => {
    controller.stopFollowing();
  }, [controller]);

  // ==================== DISPLAY OPTIONS ====================

  /**
   * Set clustering state
   */
  const setClustering = useCallback((enabled) => {
    controller.setClustering(enabled);
  }, [controller]);

  /**
   * Toggle clustering
   */
  const toggleClustering = useCallback(() => {
    return controller.toggleClustering();
  }, [controller]);

  /**
   * Check if clustering is enabled
   */
  const isClustering = useCallback(() => {
    return controller.isClustering();
  }, [controller]);

  /**
   * Set traffic layer
   */
  const setTraffic = useCallback((enabled) => {
    controller.setTraffic(enabled);
  }, [controller]);

  /**
   * Toggle traffic layer
   */
  const toggleTraffic = useCallback(() => {
    return controller.toggleTraffic();
  }, [controller]);

  /**
   * Check if traffic is showing
   */
  const isShowingTraffic = useCallback(() => {
    return controller.isShowingTraffic();
  }, [controller]);

  /**
   * Force full refresh of all map objects
   */
  const refresh = useCallback(() => {
    controller.refresh();
  }, [controller]);

  // ==================== ROUTE OPERATIONS ====================

  /**
   * Add a route
   */
  const addRoute = useCallback((id, path, options) => {
    controller.addRoute(id, path, options);
  }, [controller]);

  /**
   * Remove a route
   */
  const removeRoute = useCallback((id) => {
    controller.removeRoute(id);
  }, [controller]);

  /**
   * Clear all routes
   */
  const clearRoutes = useCallback(() => {
    controller.clearRoutes();
  }, [controller]);

  /**
   * Toggle routes visibility
   */
  const toggleRoutes = useCallback(() => {
    return controller.toggleRoutes();
  }, [controller]);

  // ==================== MARKER OPERATIONS ====================

  /**
   * Add a marker
   */
  const addMarker = useCallback((id, position, options) => {
    controller.addMarker(id, position, options);
  }, [controller]);

  /**
   * Remove a marker
   */
  const removeMarker = useCallback((id) => {
    controller.removeMarker(id);
  }, [controller]);

  /**
   * Clear all markers
   */
  const clearMarkers = useCallback(() => {
    controller.clearMarkers();
  }, [controller]);

  // ==================== UTILITY ====================

  /**
   * Get all drawables for the map
   */
  const getAllDrawables = useCallback(() => {
    return controller.getAllDrawables();
  }, [controller]);

  /**
   * Reset controller
   */
  const reset = useCallback(() => {
    controller.reset();
  }, [controller]);

  return {
    // Controller instance (for direct access if needed)
    controller,
    
    // Current state
    state,
    
    // Vehicle operations
    updateVehicles,
    getVehicles,
    focusOnVehicle,
    focusOnPlate,
    selectVehicle,
    clearSelection,
    getSelectedVehicle,
    
    // Geofence operations
    updateGeofences,
    getGeofences,
    toggleGeofences,
    
    // View operations
    setCenter,
    setZoom,
    zoomIn,
    zoomOut,
    fitAllVehicles,
    
    // Provider operations
    setProvider,
    cycleProvider,
    
    // Filter operations
    setFilters,
    toggleShowMoving,
    toggleShowStopped,
    toggleShowTemperature,
    setSearchTerm,
    clearFilters,
    
    // Coupling operations
    setCoupling,
    addCoupledPair,
    removeCoupledPair,
    hideVehicle,
    showVehicle,
    getHiddenVehicles,
    
    // Follow mode
    followVehicle,
    stopFollowing,
    
    // Display options
    setClustering,
    toggleClustering,
    isClustering,
    setTraffic,
    toggleTraffic,
    isShowingTraffic,
    refresh,
    
    // Route operations
    addRoute,
    removeRoute,
    clearRoutes,
    toggleRoutes,
    
    // Marker operations
    addMarker,
    removeMarker,
    clearMarkers,
    
    // Utility
    getAllDrawables,
    reset
  };
}

export default useMapController;
