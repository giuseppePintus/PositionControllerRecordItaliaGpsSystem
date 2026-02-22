/**
 * Vehicle Controller API Routes
 * 
 * These routes provide access to VehicleController functionality
 * including coupled pairs, hidden vehicles, and filtered positions.
 */
import express from 'express';
import { vehicleController } from '../database/VehicleController.js';
import databaseService from '../database/DatabaseService.js';

const router = express.Router();

// ==================== POSITIONS ====================

/**
 * GET /api/v2/positions - Get all positions with optional filtering
 * Query params: showMovingOnly, showStoppedOnly, showWithTemperature, excludeHidden, applyCoupling, searchTerm
 */
router.get('/positions', (req, res) => {
  try {
    const options = {
      showMovingOnly: req.query.showMovingOnly === 'true',
      showStoppedOnly: req.query.showStoppedOnly === 'true',
      showWithTemperature: req.query.showWithTemperature === 'true',
      excludeHidden: req.query.excludeHidden !== 'false', // default true
      applyCoupling: req.query.applyCoupling !== 'false', // default true
      searchTerm: req.query.searchTerm || ''
    };
    
    const positions = vehicleController.getFilteredPositions(options);
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/positions/map - Get positions ready for map display
 * Query params: same as /positions
 */
router.get('/positions/map', (req, res) => {
  try {
    const options = {
      showMovingOnly: req.query.showMovingOnly === 'true',
      showStoppedOnly: req.query.showStoppedOnly === 'true',
      showWithTemperature: req.query.showWithTemperature === 'true',
      searchTerm: req.query.searchTerm || ''
    };
    
    const positions = vehicleController.getPositionsForMap(options);
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/positions/statistics - Get vehicle statistics
 */
router.get('/positions/statistics', (req, res) => {
  try {
    const stats = vehicleController.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/positions/plates - Get list of all plates
 */
router.get('/positions/plates', (req, res) => {
  try {
    const plates = vehicleController.getAllPlates();
    res.json(plates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/positions/:plate - Get position by plate
 */
router.get('/positions/:plate', (req, res) => {
  try {
    const position = vehicleController.getVehicleByPlate(req.params.plate);
    if (!position) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== COUPLED PAIRS ====================

/**
 * GET /api/v2/coupled-pairs - Get all coupled pairs
 */
router.get('/coupled-pairs', (req, res) => {
  try {
    const pairs = vehicleController.getCoupledPairs();
    res.json(pairs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/coupled-pairs - Add a coupled pair
 * Body: { truckPlate, trailerPlate }
 */
router.post('/coupled-pairs', (req, res) => {
  try {
    const { truckPlate, trailerPlate } = req.body;
    
    if (!truckPlate || !trailerPlate) {
      return res.status(400).json({ error: 'Both truckPlate and trailerPlate are required' });
    }
    
    const result = vehicleController.addCoupledPair(truckPlate, trailerPlate);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v2/coupled-pairs - Replace all coupled pairs
 * Body: [{ truckPlate, trailerPlate }, ...]
 */
router.put('/coupled-pairs', (req, res) => {
  try {
    const pairs = req.body;
    
    if (!Array.isArray(pairs)) {
      return res.status(400).json({ error: 'Body must be an array of pairs' });
    }
    
    const result = vehicleController.updateCoupledPairs(pairs);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v2/coupled-pairs - Remove a coupled pair
 * Body: { truckPlate, trailerPlate }
 */
router.delete('/coupled-pairs', (req, res) => {
  try {
    const { truckPlate, trailerPlate } = req.body;
    
    if (!truckPlate || !trailerPlate) {
      return res.status(400).json({ error: 'Both truckPlate and trailerPlate are required' });
    }
    
    const success = vehicleController.removeCoupledPair(truckPlate, trailerPlate);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HIDDEN VEHICLES ====================

/**
 * GET /api/v2/hidden-vehicles - Get list of hidden vehicle plates
 */
router.get('/hidden-vehicles', (req, res) => {
  try {
    const hidden = vehicleController.getHiddenVehicles();
    res.json(hidden);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/hidden-vehicles/toggle - Toggle vehicle visibility
 * Body: { plate }
 */
router.post('/hidden-vehicles/toggle', (req, res) => {
  try {
    const { plate } = req.body;
    
    if (!plate) {
      return res.status(400).json({ error: 'Plate is required' });
    }
    
    const result = vehicleController.toggleVehicleVisibility(plate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v2/hidden-vehicles - Set all hidden vehicles
 * Body: ['PLATE1', 'PLATE2', ...]
 */
router.put('/hidden-vehicles', (req, res) => {
  try {
    const plates = req.body;
    
    if (!Array.isArray(plates)) {
      return res.status(400).json({ error: 'Body must be an array of plates' });
    }
    
    const result = vehicleController.setHiddenVehicles(plates);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v2/hidden-vehicles - Show all vehicles (clear hidden list)
 */
router.delete('/hidden-vehicles', (req, res) => {
  try {
    const result = vehicleController.showAllVehicles();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GEOFENCES ====================

/**
 * GET /api/v2/geofences - Get all geofences
 */
router.get('/geofences', (req, res) => {
  try {
    const activeOnly = req.query.activeOnly !== 'false';
    const geofences = databaseService.getGeofences(activeOnly);
    
    // Parse coordinates JSON
    const formatted = geofences.map(g => ({
      ...g,
      coordinate: typeof g.coordinate === 'string' ? JSON.parse(g.coordinate) : g.coordinate
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/geofences - Create geofence
 */
router.post('/geofences', (req, res) => {
  try {
    const geofence = vehicleController.createGeofence(req.body);
    res.status(201).json(geofence);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v2/geofences/:id - Update geofence
 */
router.put('/geofences/:id', (req, res) => {
  try {
    const geofence = vehicleController.updateGeofence(parseInt(req.params.id), req.body);
    res.json(geofence);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v2/geofences/:id - Delete geofence
 */
router.delete('/geofences/:id', (req, res) => {
  try {
    const success = vehicleController.deleteGeofence(parseInt(req.params.id));
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REFRESH ====================

/**
 * POST /api/v2/refresh - Refresh all data from database
 */
router.post('/refresh', (req, res) => {
  try {
    const stats = vehicleController.refresh();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
