/**
 * DatabaseService - Singleton class for all database operations
 * 
 * This class encapsulates all database connections and queries,
 * providing a clean interface for data access throughout the application.
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DatabaseService {
  constructor() {
    if (DatabaseService.instance) {
      return DatabaseService.instance;
    }
    
    this.dbPath = path.join(__dirname, '..', 'data', 'gps_system.db');
    this.db = null;
    this.isInitialized = false;
    
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    DatabaseService.instance = this;
  }

  /**
   * Get the singleton instance
   * @returns {DatabaseService}
   */
  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Connect to the database
   * @returns {Database}
   */
  connect() {
    if (!this.db) {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      console.log('Database connected:', this.dbPath);
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  /**
   * Get the raw database instance
   * @returns {Database}
   */
  getDb() {
    if (!this.db) {
      this.connect();
    }
    return this.db;
  }

  /**
   * Execute a query that returns rows
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Array}
   */
  query(sql, params = []) {
    const db = this.getDb();
    return db.prepare(sql).all(...params);
  }

  /**
   * Execute a query that returns a single row
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {object|null}
   */
  queryOne(sql, params = []) {
    const db = this.getDb();
    return db.prepare(sql).get(...params);
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL statement
   * @param {Array} params - Statement parameters
   * @returns {object} Result with changes and lastInsertRowid
   */
  execute(sql, params = []) {
    const db = this.getDb();
    return db.prepare(sql).run(...params);
  }

  /**
   * Execute multiple statements in a transaction
   * @param {Function} callback - Function that executes statements
   * @returns {any} Result of the callback
   */
  transaction(callback) {
    const db = this.getDb();
    const tx = db.transaction(callback);
    return tx();
  }

  // ==================== VEHICLE POSITIONS ====================

  /**
   * Get all vehicle positions
   * @returns {Array}
   */
  getAllPositions() {
    return this.query(`
      SELECT * FROM vehicle_positions 
      ORDER BY last_sync DESC
    `);
  }

  /**
   * Get positions for vehicles that are moving (speed > threshold)
   * @param {number} speedThreshold - Minimum speed to consider moving (default 3 km/h)
   * @returns {Array}
   */
  getMovingVehicles(speedThreshold = 3) {
    return this.query(`
      SELECT * FROM vehicle_positions 
      WHERE speed > ?
      ORDER BY speed DESC
    `, [speedThreshold]);
  }

  /**
   * Get positions for stopped vehicles
   * @param {number} speedThreshold - Maximum speed to consider stopped (default 3 km/h)
   * @returns {Array}
   */
  getStoppedVehicles(speedThreshold = 3) {
    return this.query(`
      SELECT * FROM vehicle_positions 
      WHERE speed <= ? AND latitude IS NOT NULL
      ORDER BY last_sync DESC
    `, [speedThreshold]);
  }

  /**
   * Get position by plate number
   * @param {string} plate - Vehicle plate (normalized)
   * @returns {object|null}
   */
  getPositionByPlate(plate) {
    const normalizedPlate = (plate || '').toUpperCase().replace(/\*+$/, '');
    return this.queryOne(`
      SELECT * FROM vehicle_positions 
      WHERE targa = ?
      LIMIT 1
    `, [normalizedPlate]);
  }

  /**
   * Get position by service ID
   * @param {number} idServizio
   * @returns {object|null}
   */
  getPositionByIdServizio(idServizio) {
    return this.queryOne(`
      SELECT * FROM vehicle_positions 
      WHERE id_servizio = ?
      LIMIT 1
    `, [idServizio]);
  }

  /**
   * Get multiple positions by plate numbers
   * @param {Array<string>} plates - Array of plate numbers
   * @returns {Array}
   */
  getPositionsByPlates(plates) {
    if (!plates || plates.length === 0) return [];
    
    const normalizedPlates = plates.map(p => (p || '').toUpperCase().replace(/\*+$/, ''));
    const placeholders = normalizedPlates.map(() => '?').join(',');
    
    return this.query(`
      SELECT * FROM vehicle_positions 
      WHERE targa IN (${placeholders})
      ORDER BY last_sync DESC
    `, normalizedPlates);
  }

  /**
   * Save or update a vehicle position
   * @param {object} positionData - Position data
   * @returns {object} Result
   */
  savePosition(positionData) {
    const {
      idServizio,
      targa,
      nickname,
      fleetId,
      fleetName,
      latitude,
      longitude,
      speed = 0,
      heading = 0,
      altitude,
      fixGps,
      address,
      kmTotali = 0,
      brand,
      modello,
      tipologia,
      sondeCount = 0,
      temperature1,
      temperature2,
      frigoOn = 0,
      doorOpen = 0,
      inputs = {},
      analogs = {},
      rawData = {}
    } = positionData;

    const normalizedTarga = (targa || '').toUpperCase().replace(/\*+$/, '');

    if (!idServizio) {
      return { success: false, error: 'Missing idServizio' };
    }

    try {
      this.execute(`
        INSERT INTO vehicle_positions (
          id_servizio, targa, nickname, fleet_id, fleet_name,
          latitude, longitude, speed, heading, altitude, fix_gps,
          address, km_totali, brand, modello, tipologia,
          sonde_count, temperature1, temperature2, frigo_on, door_open,
          inputs_json, analogs_json, raw_data, last_sync
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id_servizio) DO UPDATE SET
          targa = excluded.targa,
          nickname = excluded.nickname,
          fleet_id = excluded.fleet_id,
          fleet_name = excluded.fleet_name,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          speed = excluded.speed,
          heading = excluded.heading,
          altitude = excluded.altitude,
          fix_gps = excluded.fix_gps,
          address = excluded.address,
          km_totali = excluded.km_totali,
          brand = excluded.brand,
          modello = excluded.modello,
          tipologia = excluded.tipologia,
          sonde_count = excluded.sonde_count,
          temperature1 = excluded.temperature1,
          temperature2 = excluded.temperature2,
          frigo_on = excluded.frigo_on,
          door_open = excluded.door_open,
          inputs_json = excluded.inputs_json,
          analogs_json = excluded.analogs_json,
          raw_data = excluded.raw_data,
          last_sync = CURRENT_TIMESTAMP
      `, [
        idServizio, normalizedTarga, nickname, fleetId, fleetName,
        latitude, longitude, speed, heading, altitude, fixGps,
        address, kmTotali, brand, modello, tipologia,
        sondeCount, temperature1, temperature2,
        frigoOn ? 1 : 0, doorOpen ? 1 : 0,
        JSON.stringify(inputs), JSON.stringify(analogs), JSON.stringify(rawData)
      ]);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save multiple positions in a transaction
   * @param {Array} positions - Array of position data
   * @returns {object} Result with counts
   */
  saveMultiplePositions(positions) {
    const results = { saved: 0, errors: 0 };
    
    this.transaction(() => {
      for (const pos of positions) {
        const result = this.savePosition(pos);
        if (result.success) {
          results.saved++;
        } else {
          results.errors++;
        }
      }
    });

    return results;
  }

  /**
   * Get sync status
   * @returns {object}
   */
  getSyncStatus() {
    const count = this.queryOne('SELECT COUNT(*) as count FROM vehicle_positions');
    const latest = this.queryOne('SELECT last_sync FROM vehicle_positions ORDER BY last_sync DESC LIMIT 1');
    
    return {
      totalVehicles: count?.count || 0,
      lastSync: latest?.last_sync || null
    };
  }

  // ==================== GEOFENCES ====================

  /**
   * Get all geofences
   * @param {boolean} activeOnly - Only return active geofences
   * @returns {Array}
   */
  getGeofences(activeOnly = true) {
    const whereClause = activeOnly ? 'WHERE attivo = 1' : '';
    return this.query(`SELECT * FROM geofences ${whereClause} ORDER BY nome`);
  }

  /**
   * Get geofence by ID
   * @param {number} id
   * @returns {object|null}
   */
  getGeofenceById(id) {
    return this.queryOne('SELECT * FROM geofences WHERE id = ?', [id]);
  }

  /**
   * Create a geofence
   * @param {object} data
   * @returns {object}
   */
  createGeofence(data) {
    const { nome, descrizione, tipo, colore, coordinate, raggio_metri } = data;
    const result = this.execute(`
      INSERT INTO geofences (nome, descrizione, tipo, colore, coordinate, raggio_metri)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [nome, descrizione, tipo || 'polygon', colore || '#FF0000', 
        JSON.stringify(coordinate), raggio_metri || 0]);
    
    return { id: result.lastInsertRowid, ...data };
  }

  /**
   * Update a geofence
   * @param {number} id
   * @param {object} data
   * @returns {object}
   */
  updateGeofence(id, data) {
    const { nome, descrizione, tipo, colore, coordinate, raggio_metri, attivo } = data;
    this.execute(`
      UPDATE geofences SET
        nome = COALESCE(?, nome),
        descrizione = COALESCE(?, descrizione),
        tipo = COALESCE(?, tipo),
        colore = COALESCE(?, colore),
        coordinate = COALESCE(?, coordinate),
        raggio_metri = COALESCE(?, raggio_metri),
        attivo = COALESCE(?, attivo)
      WHERE id = ?
    `, [nome, descrizione, tipo, colore, 
        coordinate ? JSON.stringify(coordinate) : null, 
        raggio_metri, attivo, id]);
    
    return this.getGeofenceById(id);
  }

  /**
   * Delete a geofence
   * @param {number} id
   * @returns {boolean}
   */
  deleteGeofence(id) {
    const result = this.execute('DELETE FROM geofences WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // ==================== VEHICLES ====================

  /**
   * Get all vehicles
   * @param {boolean} activeOnly
   * @returns {Array}
   */
  getVehicles(activeOnly = true) {
    const whereClause = activeOnly ? 'WHERE attivo = 1' : '';
    return this.query(`SELECT * FROM vehicles ${whereClause} ORDER BY targa_camion`);
  }

  /**
   * Get vehicle by ID
   * @param {number} id
   * @returns {object|null}
   */
  getVehicleById(id) {
    return this.queryOne('SELECT * FROM vehicles WHERE id = ?', [id]);
  }

  /**
   * Update vehicle
   * @param {number} id
   * @param {object} data
   * @returns {object}
   */
  updateVehicle(id, data) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length > 0) {
      values.push(id);
      this.execute(`UPDATE vehicles SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    }
    
    return this.getVehicleById(id);
  }

  // ==================== COUPLED PAIRS ====================

  /**
   * Get coupled vehicle pairs (from config table or localStorage backup)
   * This could be stored in a dedicated table
   * @returns {Array}
   */
  getCoupledPairs() {
    // Check if coupled_pairs table exists, if not create it
    this.execute(`
      CREATE TABLE IF NOT EXISTS coupled_pairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        truck_plate TEXT NOT NULL,
        trailer_plate TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(truck_plate, trailer_plate)
      )
    `);
    
    return this.query(`
      SELECT truck_plate as truckPlate, trailer_plate as trailerPlate 
      FROM coupled_pairs 
      WHERE active = 1
    `);
  }

  /**
   * Save a coupled pair
   * @param {string} truckPlate
   * @param {string} trailerPlate
   * @returns {object}
   */
  saveCoupledPair(truckPlate, trailerPlate) {
    const normalizedTruck = (truckPlate || '').toUpperCase().replace(/\*+$/, '');
    const normalizedTrailer = (trailerPlate || '').toUpperCase().replace(/\*+$/, '');
    
    try {
      this.execute(`
        INSERT INTO coupled_pairs (truck_plate, trailer_plate)
        VALUES (?, ?)
        ON CONFLICT(truck_plate, trailer_plate) DO UPDATE SET active = 1
      `, [normalizedTruck, normalizedTrailer]);
      
      return { success: true, truckPlate: normalizedTruck, trailerPlate: normalizedTrailer };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove a coupled pair
   * @param {string} truckPlate
   * @param {string} trailerPlate
   * @returns {boolean}
   */
  removeCoupledPair(truckPlate, trailerPlate) {
    const normalizedTruck = (truckPlate || '').toUpperCase().replace(/\*+$/, '');
    const normalizedTrailer = (trailerPlate || '').toUpperCase().replace(/\*+$/, '');
    
    const result = this.execute(`
      DELETE FROM coupled_pairs 
      WHERE truck_plate = ? AND trailer_plate = ?
    `, [normalizedTruck, normalizedTrailer]);
    
    return result.changes > 0;
  }

  /**
   * Save multiple coupled pairs (replaces all existing)
   * @param {Array} pairs - Array of { truckPlate, trailerPlate }
   * @returns {object}
   */
  saveCoupledPairs(pairs) {
    this.transaction(() => {
      // Deactivate all existing pairs
      this.execute('UPDATE coupled_pairs SET active = 0');
      
      // Insert/update new pairs
      for (const pair of pairs) {
        this.saveCoupledPair(pair.truckPlate, pair.trailerPlate);
      }
    });
    
    return { success: true, count: pairs.length };
  }

  // ==================== HIDDEN VEHICLES ====================

  /**
   * Get hidden vehicle plates
   * @returns {Array<string>}
   */
  getHiddenVehicles() {
    // Create table if not exists
    this.execute(`
      CREATE TABLE IF NOT EXISTS hidden_vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plate TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    return this.query('SELECT plate FROM hidden_vehicles').map(r => r.plate);
  }

  /**
   * Toggle vehicle visibility
   * @param {string} plate
   * @returns {object} { hidden: boolean }
   */
  toggleVehicleVisibility(plate) {
    const normalizedPlate = (plate || '').toUpperCase().replace(/\*+$/, '');
    
    const existing = this.queryOne('SELECT id FROM hidden_vehicles WHERE plate = ?', [normalizedPlate]);
    
    if (existing) {
      this.execute('DELETE FROM hidden_vehicles WHERE plate = ?', [normalizedPlate]);
      return { hidden: false, plate: normalizedPlate };
    } else {
      this.execute('INSERT INTO hidden_vehicles (plate) VALUES (?)', [normalizedPlate]);
      return { hidden: true, plate: normalizedPlate };
    }
  }

  /**
   * Set hidden vehicles (replaces all)
   * @param {Array<string>} plates
   * @returns {object}
   */
  setHiddenVehicles(plates) {
    this.transaction(() => {
      this.execute('DELETE FROM hidden_vehicles');
      for (const plate of plates) {
        const normalized = (plate || '').toUpperCase().replace(/\*+$/, '');
        this.execute('INSERT OR IGNORE INTO hidden_vehicles (plate) VALUES (?)', [normalized]);
      }
    });
    
    return { success: true, count: plates.length };
  }

  // ==================== DRIVERS ====================

  /**
   * Get all drivers
   * @param {boolean} activeOnly
   * @returns {Array}
   */
  getDrivers(activeOnly = true) {
    const whereClause = activeOnly ? 'WHERE attivo = 1' : '';
    return this.query(`SELECT * FROM drivers ${whereClause} ORDER BY cognome, nome`);
  }

  /**
   * Get driver by ID
   * @param {number} id
   * @returns {object|null}
   */
  getDriverById(id) {
    return this.queryOne('SELECT * FROM drivers WHERE id = ?', [id]);
  }

  // ==================== EVENTS ====================

  /**
   * Get events with optional filters
   * @param {object} options - { limit, vehicleId, tipo, from, to }
   * @returns {Array}
   */
  getEvents(options = {}) {
    const { limit = 100, vehicleId, tipo, from, to } = options;
    
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params = [];
    
    if (vehicleId) {
      sql += ' AND vehicle_id = ?';
      params.push(vehicleId);
    }
    
    if (tipo) {
      sql += ' AND tipo = ?';
      params.push(tipo);
    }
    
    if (from) {
      sql += ' AND created_at >= ?';
      params.push(from);
    }
    
    if (to) {
      sql += ' AND created_at <= ?';
      params.push(to);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    return this.query(sql, params);
  }

  /**
   * Create an event
   * @param {object} data
   * @returns {object}
   */
  createEvent(data) {
    const { vehicle_id, alarm_id, tipo, messaggio, latitudine, longitudine, geofence_id } = data;
    
    const result = this.execute(`
      INSERT INTO events (vehicle_id, alarm_id, tipo, messaggio, latitudine, longitudine, geofence_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [vehicle_id, alarm_id, tipo, messaggio, latitudine, longitudine, geofence_id]);
    
    return { id: result.lastInsertRowid, ...data };
  }

  // ==================== ALARMS ====================

  /**
   * Get all alarms
   * @param {boolean} activeOnly
   * @returns {Array}
   */
  getAlarms(activeOnly = true) {
    const whereClause = activeOnly ? 'WHERE attivo = 1' : '';
    return this.query(`SELECT * FROM alarms ${whereClause} ORDER BY priorita DESC, nome`);
  }

  // ==================== ROUTES/TRIPS ====================

  /**
   * Get route templates
   * @returns {Array}
   */
  getRouteTemplates(activeOnly = true) {
    const whereClause = activeOnly ? 'WHERE attivo = 1' : '';
    return this.query(`SELECT * FROM route_templates ${whereClause} ORDER BY nome`);
  }

  /**
   * Get trips for a date range
   * @param {string} fromDate
   * @param {string} toDate
   * @returns {Array}
   */
  getTrips(fromDate, toDate) {
    let sql = 'SELECT * FROM trips WHERE 1=1';
    const params = [];
    
    if (fromDate) {
      sql += ' AND data_viaggio >= ?';
      params.push(fromDate);
    }
    
    if (toDate) {
      sql += ' AND data_viaggio <= ?';
      params.push(toDate);
    }
    
    sql += ' ORDER BY data_viaggio, ora_partenza';
    
    return this.query(sql, params);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Format a position row for frontend compatibility
   * @param {object} pos - Raw database row
   * @returns {object} Formatted position
   */
  static formatPositionForFrontend(pos) {
    if (!pos) return null;

    let inputs = {};
    let analogs = {};
    
    try {
      inputs = pos.inputs_json ? JSON.parse(pos.inputs_json) : {};
      analogs = pos.analogs_json ? JSON.parse(pos.analogs_json) : {};
    } catch (e) {
      // ignore parse errors
    }

    return {
      id: pos.id,
      idServizio: pos.id_servizio,
      targa: pos.targa,
      targa_camion: pos.targa,
      nickname: pos.nickname,
      fleetId: pos.fleet_id,
      fleetName: pos.fleet_name,
      brand: pos.brand,
      modello: pos.modello,
      tipologia: pos.tipologia,
      km_totali: pos.km_totali,
      sonde_count: pos.sonde_count,
      posizione: {
        latitude: pos.latitude,
        longitude: pos.longitude,
        speed: pos.speed,
        heading: pos.heading,
        altitude: pos.altitude,
        fixGps: pos.fix_gps,
        address: pos.address ? { F: pos.address } : null,
        inputs,
        analogs
      },
      _hasTemperature: pos.sonde_count > 0,
      _temperature1: pos.temperature1,
      _temperature2: pos.temperature2,
      _frigoOn: pos.frigo_on === 1,
      _doorOpen: pos.door_open === 1,
      lastSync: pos.last_sync
    };
  }

  /**
   * Get all positions formatted for frontend
   * @returns {Array}
   */
  getAllPositionsFormatted() {
    const positions = this.getAllPositions();
    return positions.map(DatabaseService.formatPositionForFrontend);
  }

  /**
   * Get positions by filter type
   * @param {string} filterType - 'all', 'moving', 'stopped', 'withTemperature'
   * @returns {Array}
   */
  getPositionsByFilter(filterType) {
    let positions;
    
    switch (filterType) {
      case 'moving':
        positions = this.getMovingVehicles();
        break;
      case 'stopped':
        positions = this.getStoppedVehicles();
        break;
      case 'withTemperature':
        positions = this.query(`
          SELECT * FROM vehicle_positions 
          WHERE sonde_count > 0 AND latitude IS NOT NULL
          ORDER BY last_sync DESC
        `);
        break;
      case 'all':
      default:
        positions = this.getAllPositions();
    }
    
    return positions.map(DatabaseService.formatPositionForFrontend);
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();
export default databaseService;
