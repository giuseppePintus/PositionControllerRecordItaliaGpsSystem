/**
 * Position Database Service - SQL-only storage for vehicle positions
 * Replaces MongoDB for position caching
 */
import db from './db.js';
import { logger } from '../services/loggerService.js';

/**
 * Save or update a vehicle position in SQL
 */
export function saveVehiclePosition(vehicleData) {
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
  } = vehicleData;

  const normalizedTarga = (targa || '').toUpperCase().replace(/\*+$/, '');

  if (!idServizio) {
    return { updated: false, error: 'Missing idServizio' };
  }

  try {
    const stmt = db.prepare(`
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
    `);

    stmt.run(
      idServizio,
      normalizedTarga,
      nickname,
      fleetId,
      fleetName,
      latitude,
      longitude,
      speed,
      heading,
      altitude,
      fixGps,
      address,
      kmTotali,
      brand,
      modello,
      tipologia,
      sondeCount,
      temperature1,
      temperature2,
      frigoOn ? 1 : 0,
      doorOpen ? 1 : 0,
      JSON.stringify(inputs),
      JSON.stringify(analogs),
      JSON.stringify(rawData)
    );

    return { updated: true, changed: true };
  } catch (error) {
    logger.error('Errore salvataggio posizione SQL', { targa: normalizedTarga, error: error.message });
    return { updated: false, error: error.message };
  }
}

/**
 * Save multiple positions in a transaction (batch save)
 */
export function saveMultiplePositions(positions) {
  const results = { saved: 0, errors: 0 };
  
  const saveMany = db.transaction((positionsArray) => {
    for (const pos of positionsArray) {
      try {
        saveVehiclePosition(pos);
        results.saved++;
      } catch (err) {
        results.errors++;
        logger.error('Errore batch save position', { error: err.message });
      }
    }
  });

  try {
    saveMany(positions);
  } catch (error) {
    logger.error('Errore transaction batch save', { error: error.message });
  }

  return results;
}

/**
 * Get all latest vehicle positions
 */
export function getAllLatestPositions() {
  try {
    const positions = db.prepare(`
      SELECT * FROM vehicle_positions 
      ORDER BY last_sync DESC
    `).all();

    return positions.map(formatPositionForFrontend);
  } catch (error) {
    logger.error('Errore recupero posizioni SQL', { error: error.message });
    return [];
  }
}

/**
 * Get latest position for a single vehicle by targa
 */
export function getLatestPositionByTarga(targa) {
  const normalizedTarga = (targa || '').toUpperCase().replace(/\*+$/, '');
  
  try {
    const position = db.prepare(`
      SELECT * FROM vehicle_positions 
      WHERE targa = ? 
      ORDER BY last_sync DESC 
      LIMIT 1
    `).get(normalizedTarga);

    return position ? formatPositionForFrontend(position) : null;
  } catch (error) {
    logger.error('Errore recupero posizione singola SQL', { targa, error: error.message });
    return null;
  }
}

/**
 * Get latest position for a single vehicle by idServizio
 */
export function getLatestPositionByIdServizio(idServizio) {
  try {
    const position = db.prepare(`
      SELECT * FROM vehicle_positions 
      WHERE id_servizio = ? 
      LIMIT 1
    `).get(idServizio);

    return position ? formatPositionForFrontend(position) : null;
  } catch (error) {
    logger.error('Errore recupero posizione per idServizio SQL', { idServizio, error: error.message });
    return null;
  }
}

/**
 * Get sync status
 */
export function getSyncStatus() {
  try {
    const countResult = db.prepare('SELECT COUNT(*) as count FROM vehicle_positions').get();
    const latestResult = db.prepare('SELECT last_sync FROM vehicle_positions ORDER BY last_sync DESC LIMIT 1').get();
    
    return {
      totalVehicles: countResult?.count || 0,
      lastSync: latestResult?.last_sync || null
    };
  } catch (error) {
    logger.error('Errore sync status SQL', { error: error.message });
    return { totalVehicles: 0, lastSync: null };
  }
}

/**
 * Format position document for frontend compatibility
 */
function formatPositionForFrontend(pos) {
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
 * Clean old positions (keep only latest per vehicle)
 */
export function cleanOldPositions() {
  // This table already uses UNIQUE constraint on id_servizio, so no cleanup needed
  // But we could add a position history table in the future if needed
  return { cleaned: 0 };
}

export default {
  saveVehiclePosition,
  saveMultiplePositions,
  getAllLatestPositions,
  getLatestPositionByTarga,
  getLatestPositionByIdServizio,
  getSyncStatus,
  cleanOldPositions
};
