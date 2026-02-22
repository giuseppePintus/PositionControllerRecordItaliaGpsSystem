/**
 * VehicleController - Controller class for vehicle data management
 * 
 * This class provides a clean interface for managing vehicle data,
 * filtering, coupling, and visibility operations.
 * It coordinates between the database and the client-side state.
 */
import databaseService from './DatabaseService.js';

class VehicleController {
  constructor() {
    if (VehicleController.instance) {
      return VehicleController.instance;
    }
    
    this.db = databaseService;
    this._cache = {
      positions: [],
      coupledPairs: [],
      hiddenVehicles: [],
      lastUpdate: null
    };
    
    VehicleController.instance = this;
  }

  /**
   * Get the singleton instance
   * @returns {VehicleController}
   */
  static getInstance() {
    if (!VehicleController.instance) {
      VehicleController.instance = new VehicleController();
    }
    return VehicleController.instance;
  }

  // ==================== POSITION MANAGEMENT ====================

  /**
   * Get all vehicle positions (formatted for frontend)
   * @param {boolean} refresh - Force refresh from database
   * @returns {Array}
   */
  getAllPositions(refresh = false) {
    if (refresh || !this._cache.lastUpdate || 
        Date.now() - this._cache.lastUpdate > 5000) {
      this._cache.positions = this.db.getAllPositionsFormatted();
      this._cache.lastUpdate = Date.now();
    }
    return this._cache.positions;
  }

  /**
   * Get positions with applied filters
   * @param {object} options - Filter options
   * @returns {Array}
   */
  getFilteredPositions(options = {}) {
    const {
      showMovingOnly = false,
      showStoppedOnly = false,
      showWithTemperature = false,
      excludeHidden = true,
      applyCoupling = true,
      searchTerm = ''
    } = options;

    let positions = this.getAllPositions(true);

    // Apply filters
    if (showMovingOnly) {
      positions = positions.filter(p => (p.posizione?.speed || 0) > 3);
    } else if (showStoppedOnly) {
      positions = positions.filter(p => (p.posizione?.speed || 0) <= 3);
    }

    if (showWithTemperature) {
      positions = positions.filter(p => p._hasTemperature);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      positions = positions.filter(p => 
        (p.targa?.toLowerCase() || '').includes(term) ||
        (p.nickname?.toLowerCase() || '').includes(term) ||
        (p.posizione?.address?.F?.toLowerCase() || '').includes(term)
      );
    }

    // Apply hidden vehicles filter
    if (excludeHidden) {
      const hiddenSet = new Set(this.getHiddenVehicles());
      positions = positions.filter(p => !hiddenSet.has(this._normalizePlate(p.targa)));
    }

    // Apply coupling
    if (applyCoupling) {
      positions = this._applyCouplingToPositions(positions);
    }

    return positions;
  }

  /**
   * Get positions ready for map display (most common use case)
   * @param {object} filterOptions
   * @returns {Array}
   */
  getPositionsForMap(filterOptions = {}) {
    const positions = this.getFilteredPositions({
      ...filterOptions,
      excludeHidden: true,
      applyCoupling: true
    });

    // Filter out positions without valid coordinates
    return positions.filter(p => 
      p.posizione?.latitude && p.posizione?.longitude
    );
  }

  /**
   * Get list of all plate numbers
   * @returns {Array<string>}
   */
  getAllPlates() {
    const positions = this.getAllPositions();
    return positions.map(p => p.targa).filter(Boolean).sort();
  }

  /**
   * Get a single vehicle position by plate
   * @param {string} plate
   * @returns {object|null}
   */
  getVehicleByPlate(plate) {
    const pos = this.db.getPositionByPlate(plate);
    return pos ? this.db.constructor.formatPositionForFrontend(pos) : null;
  }

  /**
   * Get statistics about vehicles
   * @returns {object}
   */
  getStatistics() {
    const positions = this.getAllPositions(true);
    
    const movingCount = positions.filter(p => (p.posizione?.speed || 0) > 3).length;
    const stoppedCount = positions.filter(p => (p.posizione?.speed || 0) <= 3).length;
    const withTempCount = positions.filter(p => p._hasTemperature).length;
    const frigoOnCount = positions.filter(p => p._frigoOn).length;
    
    return {
      total: positions.length,
      moving: movingCount,
      stopped: stoppedCount,
      withTemperature: withTempCount,
      frigoOn: frigoOnCount,
      lastSync: this.db.getSyncStatus()
    };
  }

  // ==================== COUPLING MANAGEMENT ====================

  /**
   * Get all coupled pairs
   * @returns {Array}
   */
  getCoupledPairs() {
    return this.db.getCoupledPairs();
  }

  /**
   * Add a new coupled pair
   * @param {string} truckPlate
   * @param {string} trailerPlate
   * @returns {object}
   */
  addCoupledPair(truckPlate, trailerPlate) {
    return this.db.saveCoupledPair(truckPlate, trailerPlate);
  }

  /**
   * Remove a coupled pair
   * @param {string} truckPlate
   * @param {string} trailerPlate
   * @returns {boolean}
   */
  removeCoupledPair(truckPlate, trailerPlate) {
    return this.db.removeCoupledPair(truckPlate, trailerPlate);
  }

  /**
   * Update all coupled pairs (replaces existing)
   * @param {Array} pairs
   * @returns {object}
   */
  updateCoupledPairs(pairs) {
    return this.db.saveCoupledPairs(pairs);
  }

  /**
   * Apply coupling logic to positions
   * @private
   * @param {Array} positions
   * @returns {Array}
   */
  _applyCouplingToPositions(positions) {
    const coupledPairs = this.getCoupledPairs();
    
    if (!coupledPairs || coupledPairs.length === 0) {
      return positions;
    }

    // Create maps for quick lookup
    const positionMap = new Map();
    positions.forEach(p => {
      positionMap.set(this._normalizePlate(p.targa), p);
    });

    const trailersToHide = new Set();
    const coupledTrucks = new Map();

    // Process coupling pairs
    for (const pair of coupledPairs) {
      const truckPlate = this._normalizePlate(pair.truckPlate);
      const trailerPlate = this._normalizePlate(pair.trailerPlate);
      
      if (positionMap.has(truckPlate) && positionMap.has(trailerPlate)) {
        trailersToHide.add(trailerPlate);
        
        const trailer = positionMap.get(trailerPlate);
        coupledTrucks.set(truckPlate, {
          trailerPlate: trailerPlate,
          trailerNickname: trailer.nickname,
          trailerTemperature1: trailer._temperature1,
          trailerTemperature2: trailer._temperature2,
          trailerFrigoOn: trailer._frigoOn,
          trailerHasTemperature: trailer._hasTemperature
        });
      }
    }

    // Apply coupling to result set
    return positions
      .filter(p => !trailersToHide.has(this._normalizePlate(p.targa)))
      .map(p => {
        const plate = this._normalizePlate(p.targa);
        const coupledTrailer = coupledTrucks.get(plate);
        
        if (coupledTrailer) {
          return {
            ...p,
            _isCoupled: true,
            _coupledWith: coupledTrailer
          };
        }
        return p;
      });
  }

  // ==================== VISIBILITY MANAGEMENT ====================

  /**
   * Get list of hidden vehicle plates
   * @returns {Array<string>}
   */
  getHiddenVehicles() {
    return this.db.getHiddenVehicles();
  }

  /**
   * Toggle vehicle visibility
   * @param {string} plate
   * @returns {object}
   */
  toggleVehicleVisibility(plate) {
    return this.db.toggleVehicleVisibility(plate);
  }

  /**
   * Set all hidden vehicles
   * @param {Array<string>} plates
   * @returns {object}
   */
  setHiddenVehicles(plates) {
    return this.db.setHiddenVehicles(plates);
  }

  /**
   * Show all vehicles (clear hidden list)
   * @returns {object}
   */
  showAllVehicles() {
    return this.db.setHiddenVehicles([]);
  }

  /**
   * Check if a vehicle is hidden
   * @param {string} plate
   * @returns {boolean}
   */
  isVehicleHidden(plate) {
    const hidden = this.getHiddenVehicles();
    return hidden.includes(this._normalizePlate(plate));
  }

  // ==================== GEOFENCE MANAGEMENT ====================

  /**
   * Get all geofences
   * @returns {Array}
   */
  getGeofences() {
    return this.db.getGeofences();
  }

  /**
   * Create a geofence
   * @param {object} data
   * @returns {object}
   */
  createGeofence(data) {
    return this.db.createGeofence(data);
  }

  /**
   * Update a geofence
   * @param {number} id
   * @param {object} data
   * @returns {object}
   */
  updateGeofence(id, data) {
    return this.db.updateGeofence(id, data);
  }

  /**
   * Delete a geofence
   * @param {number} id
   * @returns {boolean}
   */
  deleteGeofence(id) {
    return this.db.deleteGeofence(id);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Normalize a plate number
   * @private
   * @param {string} plate
   * @returns {string}
   */
  _normalizePlate(plate) {
    return (plate || '').toUpperCase().replace(/\*+$/, '').trim();
  }

  /**
   * Clear the internal cache
   */
  clearCache() {
    this._cache = {
      positions: [],
      coupledPairs: [],
      hiddenVehicles: [],
      lastUpdate: null
    };
  }

  /**
   * Refresh data from database
   * @returns {object} Updated statistics
   */
  refresh() {
    this.clearCache();
    return this.getStatistics();
  }
}

// Export singleton instance
export const vehicleController = VehicleController.getInstance();
export default vehicleController;
