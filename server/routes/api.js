import express from 'express';
import db from '../database/db.js';
import { recordItaliaClient } from '../services/recordItaliaClient.js';
import { geofenceService } from '../services/geofenceService.js';
import { monitoringService } from '../services/monitoringService.js';
import { logger } from '../services/loggerService.js';
import { getAllLatestPositions, getLatestPositionByTarga, getSyncStatus } from '../database/positionsDb.js';

const router = express.Router();

// ==================== FLOTTE E POSIZIONI ====================

/**
 * GET /api/fleets - Ottiene le flotte dall'API Record Italia
 */
router.get('/fleets', async (req, res) => {
  try {
    const fleets = await recordItaliaClient.getFleets();
    res.json(fleets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/positions - Ottiene tutte le posizioni dalla cache SQL
 * I dati vengono aggiornati in background dal monitoringService ogni 60 secondi
 */
router.get('/positions', async (req, res) => {
  try {
    // Get positions from SQL
    const positions = getAllLatestPositions();
    res.json(positions || []);
  } catch (error) {
    logger.error('Errore lettura posizioni da SQL', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/positions/live - Forza aggiornamento posizioni dall'API (uso manuale)
 */
router.get('/positions/live', async (req, res) => {
  try {
    const positions = await recordItaliaClient.getAllPositions();
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/positions/sync-status - Stato della sincronizzazione
 */
router.get('/positions/sync-status', async (req, res) => {
  try {
    // Get status from SQL
    const syncStatus = getSyncStatus();
    const monitoringStatus = monitoringService.getStatus();
    
    res.json({
      lastSync: syncStatus.lastSync,
      totalVehicles: syncStatus.totalVehicles,
      monitoring: monitoringStatus,
      source: 'sql'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/positions/fleet/:idFlotta - Posizioni di una flotta specifica
 */
router.get('/positions/fleet/:idFlotta', async (req, res) => {
  try {
    const positions = await recordItaliaClient.getFleetPositions(req.params.idFlotta);
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/positions/service/:idServizio - Posizione di un servizio specifico
 */
router.get('/positions/service/:idServizio', async (req, res) => {
  try {
    const position = await recordItaliaClient.getServicePosition(req.params.idServizio);
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/history/:idServizio - Storico posizioni
 */
router.get('/history/:idServizio', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const toDate = to || new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    const history = await recordItaliaClient.getServiceHistory(req.params.idServizio, fromDate, toDate);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== VEICOLI ====================

/**
 * GET /api/vehicles - Lista veicoli dal database locale
 */
router.get('/vehicles', (req, res) => {
  try {
    const vehicles = db.prepare(`
      SELECT v.*, 
        (SELECT COUNT(*) FROM alarms WHERE vehicle_id = v.id AND attivo = 1) as alarms_count
      FROM vehicles v
      WHERE v.attivo = 1
      ORDER BY v.nickname, v.targa_camion
    `).all();
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/vehicles/:id - Dettaglio veicolo
 */
router.get('/vehicles/:id', (req, res) => {
  try {
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Veicolo non trovato' });
    }
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/vehicles/:id - Aggiorna veicolo (incluse dimensioni)
 */
router.put('/vehicles/:id', (req, res) => {
  try {
    const { 
      nickname, targa_camion, targa_rimorchio, attivo,
      lunghezza, larghezza, altezza, peso_totale, peso_per_asse,
      tipo_veicolo, is_compatto, note_dimensioni
    } = req.body;
    
    db.prepare(`
      UPDATE vehicles 
      SET nickname = COALESCE(?, nickname),
          targa_camion = COALESCE(?, targa_camion),
          targa_rimorchio = COALESCE(?, targa_rimorchio),
          attivo = COALESCE(?, attivo),
          lunghezza = COALESCE(?, lunghezza),
          larghezza = COALESCE(?, larghezza),
          altezza = COALESCE(?, altezza),
          peso_totale = COALESCE(?, peso_totale),
          peso_per_asse = COALESCE(?, peso_per_asse),
          tipo_veicolo = COALESCE(?, tipo_veicolo),
          is_compatto = COALESCE(?, is_compatto),
          note_dimensioni = COALESCE(?, note_dimensioni),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nickname, targa_camion, targa_rimorchio, attivo,
      lunghezza, larghezza, altezza, peso_totale, peso_per_asse,
      tipo_veicolo, is_compatto, note_dimensioni,
      req.params.id
    );
    
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/vehicles/:id/positions - Ultime posizioni di un veicolo
 * Note: Position history is not stored in SQL-only mode. Returns current position only.
 */
router.get('/vehicles/:id/positions', async (req, res) => {
  try {
    // Get vehicle plate from database
    const vehicle = db.prepare('SELECT targa_camion FROM vehicles WHERE id = ?').get(req.params.id);
    if (!vehicle || !vehicle.targa_camion) {
      return res.json([]);
    }

    // Get latest position from SQL (history not available in SQL-only mode)
    const latestPos = getLatestPositionByTarga(vehicle.targa_camion);
    
    if (latestPos && latestPos.posizione) {
      res.json([{
        latitude: latestPos.posizione.latitude,
        longitude: latestPos.posizione.longitude,
        speed: latestPos.posizione.speed,
        heading: latestPos.posizione.heading,
        timestamp: latestPos.posizione.fixGps,
        temperature1: latestPos._temperature1,
        temperature2: latestPos._temperature2
      }]);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GEOFENCE ====================

/**
 * GET /api/geofences - Lista geofence
 */
router.get('/geofences', (req, res) => {
  try {
    const geofences = db.prepare('SELECT * FROM geofences ORDER BY nome').all();
    res.json(geofences.map(g => ({
      ...g,
      coordinate: JSON.parse(g.coordinate)
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/geofences - Crea geofence
 */
router.post('/geofences', (req, res) => {
  try {
    const { nome, descrizione, tipo, colore, coordinate, raggio_metri } = req.body;
    
    if (!nome || !coordinate) {
      return res.status(400).json({ error: 'Nome e coordinate richiesti' });
    }

    const result = db.prepare(`
      INSERT INTO geofences (nome, descrizione, tipo, colore, coordinate, raggio_metri)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      nome,
      descrizione || '',
      tipo || 'polygon',
      colore || '#FF0000',
      JSON.stringify(coordinate),
      raggio_metri || 0
    );

    const geofence = db.prepare('SELECT * FROM geofences WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...geofence,
      coordinate: JSON.parse(geofence.coordinate)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/geofences/:id - Aggiorna geofence
 */
router.put('/geofences/:id', (req, res) => {
  try {
    const { nome, descrizione, tipo, colore, coordinate, raggio_metri, attivo } = req.body;
    
    db.prepare(`
      UPDATE geofences 
      SET nome = COALESCE(?, nome),
          descrizione = COALESCE(?, descrizione),
          tipo = COALESCE(?, tipo),
          colore = COALESCE(?, colore),
          coordinate = COALESCE(?, coordinate),
          raggio_metri = COALESCE(?, raggio_metri),
          attivo = COALESCE(?, attivo)
      WHERE id = ?
    `).run(
      nome,
      descrizione,
      tipo,
      colore,
      coordinate ? JSON.stringify(coordinate) : null,
      raggio_metri,
      attivo,
      req.params.id
    );

    const geofence = db.prepare('SELECT * FROM geofences WHERE id = ?').get(req.params.id);
    res.json({
      ...geofence,
      coordinate: JSON.parse(geofence.coordinate)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/geofences/:id - Elimina geofence
 */
router.delete('/geofences/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM geofences WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TRATTE E CHECKPOINT ====================

/**
 * GET /api/routes - Lista tratte
 */
router.get('/routes', (req, res) => {
  try {
    const routes = db.prepare(`
      SELECT r.*, v.nickname as vehicle_name, v.targa_camion,
        (SELECT COUNT(*) FROM route_checkpoints WHERE route_id = r.id) as checkpoints_count
      FROM routes r
      LEFT JOIN vehicles v ON r.vehicle_plate = v.targa_camion
      ORDER BY r.nome
    `).all();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/routes - Crea tratta
 */
router.post('/routes', (req, res) => {
  try {
    const { nome, descrizione, vehicle_id } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome richiesto' });
    }

    const result = db.prepare(`
      INSERT INTO routes (nome, descrizione, vehicle_id)
      VALUES (?, ?, ?)
    `).run(nome, descrizione || '', vehicle_id || null);

    const route = db.prepare('SELECT * FROM routes WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/routes/:id - Dettaglio tratta con checkpoint
 */
router.get('/routes/:id', (req, res) => {
  try {
    const route = db.prepare(`
      SELECT r.*, v.nickname as vehicle_name, v.targa_camion
      FROM routes r
      LEFT JOIN vehicles v ON r.vehicle_plate = v.targa_camion
      WHERE r.id = ?
    `).get(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Tratta non trovata' });
    }

    const checkpoints = db.prepare(`
      SELECT rc.*, g.nome as geofence_nome, g.coordinate, g.colore
      FROM route_checkpoints rc
      LEFT JOIN geofences g ON rc.geofence_id = g.id
      WHERE rc.route_id = ?
      ORDER BY rc.ordine
    `).all(req.params.id);

    res.json({
      ...route,
      checkpoints: checkpoints.map(c => ({
        ...c,
        coordinate: c.coordinate ? JSON.parse(c.coordinate) : null
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/routes/:id - Aggiorna tratta
 */
router.put('/routes/:id', (req, res) => {
  try {
    const { nome, descrizione, vehicle_id, attivo } = req.body;
    
    db.prepare(`
      UPDATE routes 
      SET nome = COALESCE(?, nome),
          descrizione = COALESCE(?, descrizione),
          vehicle_id = COALESCE(?, vehicle_id),
          attivo = COALESCE(?, attivo)
      WHERE id = ?
    `).run(nome, descrizione, vehicle_id, attivo, req.params.id);

    const route = db.prepare('SELECT * FROM routes WHERE id = ?').get(req.params.id);
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/routes/:id - Elimina tratta
 */
router.delete('/routes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM routes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/routes/:id/checkpoints - Aggiungi checkpoint
 */
router.post('/routes/:routeId/checkpoints', (req, res) => {
  try {
    const { nome, geofence_id, ordine, ora_prevista_arrivo, ora_prevista_partenza, 
            tolleranza_minuti, notifica_ingresso, notifica_uscita, notifica_ritardo } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome richiesto' });
    }

    // Calcola ordine se non specificato
    let orderNum = ordine;
    if (orderNum === undefined) {
      const maxOrder = db.prepare('SELECT MAX(ordine) as max FROM route_checkpoints WHERE route_id = ?')
        .get(req.params.routeId);
      orderNum = (maxOrder?.max || 0) + 1;
    }

    const result = db.prepare(`
      INSERT INTO route_checkpoints 
      (route_id, nome, geofence_id, ordine, ora_prevista_arrivo, ora_prevista_partenza, 
       tolleranza_minuti, notifica_ingresso, notifica_uscita, notifica_ritardo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.routeId,
      nome,
      geofence_id || null,
      orderNum,
      ora_prevista_arrivo || null,
      ora_prevista_partenza || null,
      tolleranza_minuti || 30,
      notifica_ingresso !== false ? 1 : 0,
      notifica_uscita !== false ? 1 : 0,
      notifica_ritardo !== false ? 1 : 0
    );

    const checkpoint = db.prepare('SELECT * FROM route_checkpoints WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(checkpoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/checkpoints/:id - Aggiorna checkpoint
 */
router.put('/checkpoints/:id', (req, res) => {
  try {
    const { nome, geofence_id, ordine, ora_prevista_arrivo, ora_prevista_partenza,
            tolleranza_minuti, notifica_ingresso, notifica_uscita, notifica_ritardo } = req.body;
    
    db.prepare(`
      UPDATE route_checkpoints 
      SET nome = COALESCE(?, nome),
          geofence_id = COALESCE(?, geofence_id),
          ordine = COALESCE(?, ordine),
          ora_prevista_arrivo = ?,
          ora_prevista_partenza = ?,
          tolleranza_minuti = COALESCE(?, tolleranza_minuti),
          notifica_ingresso = COALESCE(?, notifica_ingresso),
          notifica_uscita = COALESCE(?, notifica_uscita),
          notifica_ritardo = COALESCE(?, notifica_ritardo)
      WHERE id = ?
    `).run(
      nome,
      geofence_id,
      ordine,
      ora_prevista_arrivo,
      ora_prevista_partenza,
      tolleranza_minuti,
      notifica_ingresso,
      notifica_uscita,
      notifica_ritardo,
      req.params.id
    );

    const checkpoint = db.prepare('SELECT * FROM route_checkpoints WHERE id = ?').get(req.params.id);
    res.json(checkpoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/checkpoints/:id - Elimina checkpoint
 */
router.delete('/checkpoints/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM route_checkpoints WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ALLARMI ====================

/**
 * GET /api/alarms - Lista allarmi
 */
router.get('/alarms', (req, res) => {
  try {
    const alarms = db.prepare(`
      SELECT a.*, 
        v.nickname as vehicle_name, v.targa_camion,
        g.nome as geofence_nome,
        r.nome as route_nome
      FROM alarms a
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      LEFT JOIN geofences g ON a.geofence_id = g.id
      LEFT JOIN routes r ON a.route_id = r.id
      ORDER BY a.priorita DESC, a.nome
    `).all();
    res.json(alarms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/alarms - Crea allarme
 */
router.post('/alarms', (req, res) => {
  try {
    const { nome, tipo, vehicle_id, geofence_id, route_id, checkpoint_id,
            ora_inizio, ora_fine, giorni_settimana, notifica_telegram, 
            notifica_push, notifica_chiamata, priorita } = req.body;
    
    if (!nome || !tipo) {
      return res.status(400).json({ error: 'Nome e tipo richiesti' });
    }

    const result = db.prepare(`
      INSERT INTO alarms 
      (nome, tipo, vehicle_id, geofence_id, route_id, checkpoint_id,
       ora_inizio, ora_fine, giorni_settimana, notifica_telegram, 
       notifica_push, notifica_chiamata, priorita)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nome,
      tipo,
      vehicle_id || null,
      geofence_id || null,
      route_id || null,
      checkpoint_id || null,
      ora_inizio || null,
      ora_fine || null,
      giorni_settimana || '1,2,3,4,5,6,7',
      notifica_telegram !== false ? 1 : 0,
      notifica_push !== false ? 1 : 0,
      notifica_chiamata || 0,
      priorita || 1
    );

    const alarm = db.prepare('SELECT * FROM alarms WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(alarm);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/alarms/:id - Aggiorna allarme
 */
router.put('/alarms/:id', (req, res) => {
  try {
    const { nome, tipo, vehicle_id, geofence_id, route_id, checkpoint_id,
            ora_inizio, ora_fine, giorni_settimana, notifica_telegram, 
            notifica_push, notifica_chiamata, attivo, priorita } = req.body;
    
    db.prepare(`
      UPDATE alarms 
      SET nome = COALESCE(?, nome),
          tipo = COALESCE(?, tipo),
          vehicle_id = ?,
          geofence_id = ?,
          route_id = ?,
          checkpoint_id = ?,
          ora_inizio = ?,
          ora_fine = ?,
          giorni_settimana = COALESCE(?, giorni_settimana),
          notifica_telegram = COALESCE(?, notifica_telegram),
          notifica_push = COALESCE(?, notifica_push),
          notifica_chiamata = COALESCE(?, notifica_chiamata),
          attivo = COALESCE(?, attivo),
          priorita = COALESCE(?, priorita)
      WHERE id = ?
    `).run(
      nome, tipo, vehicle_id, geofence_id, route_id, checkpoint_id,
      ora_inizio, ora_fine, giorni_settimana, notifica_telegram,
      notifica_push, notifica_chiamata, attivo, priorita, req.params.id
    );

    const alarm = db.prepare('SELECT * FROM alarms WHERE id = ?').get(req.params.id);
    res.json(alarm);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/alarms/:id - Elimina allarme
 */
router.delete('/alarms/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM alarms WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EVENTI ====================

/**
 * GET /api/events - Lista eventi
 */
router.get('/events', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const vehicleId = req.query.vehicle_id;
    const tipo = req.query.tipo;
    const types = req.query.types ? (typeof req.query.types === 'string' ? [req.query.types] : req.query.types) : null;

    let query = `
      SELECT e.*, v.nickname as vehicle_name, v.targa_camion, g.nome as geofence_nome
      FROM events e
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      LEFT JOIN geofences g ON e.geofence_id = g.id
      WHERE 1=1
    `;
    const params = [];

    if (vehicleId) {
      query += ' AND e.vehicle_id = ?';
      params.push(vehicleId);
    }
    
    if (types && types.length > 0) {
      const placeholders = types.map(() => '?').join(',');
      query += ` AND e.tipo IN (${placeholders})`;
      params.push(...types);
    } else if (tipo) {
      query += ' AND e.tipo = ?';
      params.push(tipo);
    }

    query += ' ORDER BY e.created_at DESC LIMIT ?';
    params.push(limit);

    const events = db.prepare(query).all(...params);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MONITORAGGIO ====================

/**
 * GET /api/monitoring/status - Stato del servizio di monitoraggio
 */
router.get('/monitoring/status', (req, res) => {
  res.json(monitoringService.getStatus());
});

/**
 * POST /api/monitoring/check - Forza controllo immediato
 */
router.post('/monitoring/check', async (req, res) => {
  try {
    await monitoringService.forceCheck();
    res.json({ success: true, message: 'Controllo completato' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/monitoring/start - Avvia monitoraggio
 */
router.post('/monitoring/start', (req, res) => {
  monitoringService.start();
  res.json({ success: true, status: monitoringService.getStatus() });
});

/**
 * POST /api/monitoring/stop - Ferma monitoraggio
 */
router.post('/monitoring/stop', (req, res) => {
  monitoringService.stop();
  res.json({ success: true, status: monitoringService.getStatus() });
});

// ==================== UTILITY ====================

/**
 * GET /api/test-connection - Test connessione API Record Italia
 */
router.get('/test-connection', async (req, res) => {
  try {
    const connected = await recordItaliaClient.testConnection();
    res.json({ connected, message: connected ? 'Connessione OK' : 'Connessione fallita' });
  } catch (error) {
    res.status(500).json({ connected: false, error: error.message });
  }
});

// ==================== TRATTE ====================

/**
 * GET /api/routes - Lista tratte
 */
router.get('/routes', (req, res) => {
  try {
    const routes = db.prepare(`
      SELECT r.*, 
        v.nickname as vehicle_name,
        v.targa_camion as vehicle_plate,
        (SELECT COUNT(*) FROM route_destinations WHERE route_id = r.id) as destinations_count,
        (SELECT COUNT(*) FROM route_destinations WHERE route_id = r.id AND arrivato = 1) as arrived_count
      FROM routes r
      LEFT JOIN vehicles v ON r.vehicle_plate = v.targa_camion
      ORDER BY r.created_at DESC
    `).all();
    
    // Aggiungi destinazioni a ogni tratta per la preview
    const routesWithDests = routes.map(route => {
      const destinations = db.prepare(`
        SELECT * FROM route_destinations 
        WHERE route_id = ? 
        ORDER BY ordine
      `).all(route.id);
      return { ...route, destinations };
    });
    
    res.json(routesWithDests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/routes/:id - Dettaglio tratta con destinazioni
 */
router.get('/routes/:id', (req, res) => {
  try {
    const route = db.prepare('SELECT * FROM routes WHERE id = ?').get(req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Tratta non trovata' });
    }
    
    const destinations = db.prepare(`
      SELECT * FROM route_destinations 
      WHERE route_id = ? 
      ORDER BY ordine
    `).all(req.params.id);
    
    res.json({ ...route, destinations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/routes - Crea nuova tratta
 */
router.post('/routes', (req, res) => {
  try {
    const { nome, descrizione, vehicle_id, tipo, data_viaggio, giorni_settimana, attivo, destinations } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome richiesto' });
    }
    
    // Crea tratta
    const result = db.prepare(`
      INSERT INTO routes (nome, descrizione, vehicle_id, tipo, data_viaggio, giorni_settimana, attivo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      nome, 
      descrizione || '', 
      vehicle_id || null,
      tipo || 'template',
      data_viaggio || null,
      giorni_settimana || null,
      attivo !== false ? 1 : 0
    );
    
    const routeId = result.lastInsertRowid;
    
    // Aggiungi destinazioni se presenti
    if (destinations && destinations.length > 0) {
      const insertDest = db.prepare(`
        INSERT INTO route_destinations 
        (route_id, ordine, nome, indirizzo, latitudine, longitudine, raggio_metri, ora_partenza_prevista, ora_arrivo_prevista, tolleranza_minuti, notifica_arrivo, notifica_partenza)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      destinations.forEach((dest, index) => {
        insertDest.run(
          routeId,
          index + 1,
          dest.nome,
          dest.indirizzo || '',
          dest.latitudine,
          dest.longitudine,
          dest.raggio_metri || 500,
          dest.ora_partenza_prevista || null,
          dest.ora_arrivo_prevista || null,
          dest.tolleranza_minuti || 30,
          dest.notifica_arrivo ? 1 : 0,
          dest.notifica_partenza ? 1 : 0
        );
      });
    }
    
    const route = db.prepare('SELECT * FROM routes WHERE id = ?').get(routeId);
    const dests = db.prepare('SELECT * FROM route_destinations WHERE route_id = ? ORDER BY ordine').all(routeId);
    
    res.status(201).json({ ...route, destinations: dests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/routes/:id - Aggiorna tratta
 */
router.put('/routes/:id', (req, res) => {
  try {
    const { nome, descrizione, vehicle_id, tipo, data_viaggio, giorni_settimana, attivo, destinations } = req.body;
    
    db.prepare(`
      UPDATE routes 
      SET nome = COALESCE(?, nome),
          descrizione = COALESCE(?, descrizione),
          vehicle_id = ?,
          tipo = COALESCE(?, tipo),
          data_viaggio = ?,
          giorni_settimana = ?,
          attivo = COALESCE(?, attivo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nome, descrizione, vehicle_id || null, tipo, data_viaggio || null, giorni_settimana || null, attivo, req.params.id);
    
    // Se ci sono destinazioni, aggiornale
    if (destinations && destinations.length > 0) {
      // Elimina destinazioni esistenti e ricrea
      db.prepare('DELETE FROM route_destinations WHERE route_id = ?').run(req.params.id);
      
      const insertDest = db.prepare(`
        INSERT INTO route_destinations 
        (route_id, ordine, nome, indirizzo, latitudine, longitudine, raggio_metri, ora_partenza_prevista, ora_arrivo_prevista, tolleranza_minuti, notifica_arrivo, notifica_partenza)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      destinations.forEach((dest, index) => {
        insertDest.run(
          req.params.id,
          index + 1,
          dest.nome,
          dest.indirizzo || '',
          dest.latitudine,
          dest.longitudine,
          dest.raggio_metri || 500,
          dest.ora_partenza_prevista || null,
          dest.ora_arrivo_prevista || null,
          dest.tolleranza_minuti || 30,
          dest.notifica_arrivo ? 1 : 0,
          dest.notifica_partenza ? 1 : 0
        );
      });
    }
    
    const route = db.prepare('SELECT * FROM routes WHERE id = ?').get(req.params.id);
    const dests = db.prepare('SELECT * FROM route_destinations WHERE route_id = ? ORDER BY ordine').all(req.params.id);
    
    res.json({ ...route, destinations: dests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/routes/:id - Elimina tratta
 */
router.delete('/routes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM routes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/routes/:id/check-arrival - Verifica arrivo a destinazione
 */
router.post('/routes/:id/check-arrival', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const route = db.prepare('SELECT * FROM routes WHERE id = ?').get(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Tratta non trovata' });
    }
    
    const destinations = db.prepare(`
      SELECT * FROM route_destinations WHERE route_id = ? AND arrivato = 0 ORDER BY ordine
    `).all(req.params.id);
    
    const arrivedDestinations = [];
    
    for (const dest of destinations) {
      const distance = getDistanceKm(latitude, longitude, dest.latitudine, dest.longitudine) * 1000; // in metri
      
      if (distance <= dest.raggio_metri) {
        // Arrivato!
        db.prepare(`
          UPDATE route_destinations 
          SET arrivato = 1, ora_arrivo_effettivo = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(dest.id);
        
        arrivedDestinations.push({
          ...dest,
          distance_meters: Math.round(distance)
        });
      }
    }
    
    res.json({ 
      arrivedDestinations,
      remaining: destinations.length - arrivedDestinations.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/routes/:id/reset - Reset arrivi tratta
 */
router.post('/routes/:id/reset', (req, res) => {
  try {
    db.prepare(`
      UPDATE route_destinations 
      SET arrivato = 0, ora_arrivo_effettivo = NULL 
      WHERE route_id = ?
    `).run(req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TEMPLATE PERCORSI ====================

/**
 * GET /api/templates - Lista template percorsi con tappe
 */
router.get('/templates', (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM template_stops WHERE template_id = t.id) as stops_count
      FROM route_templates t
      WHERE t.attivo = 1
      ORDER BY t.nome
    `).all();
    
    // Carica le tappe per ogni template
    const templatesWithStops = templates.map(template => {
      const stops = db.prepare(`
        SELECT id, ordine, nome, indirizzo, latitudine as lat, longitudine as lng, tempo_sosta_minuti as tempo_sosta
        FROM template_stops 
        WHERE template_id = ? 
        ORDER BY ordine
      `).all(template.id);
      return { ...template, stops };
    });
    
    res.json(templatesWithStops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/templates/:id - Dettaglio template con tappe
 */
router.get('/templates/:id', (req, res) => {
  try {
    const template = db.prepare('SELECT * FROM route_templates WHERE id = ?').get(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    const stops = db.prepare(`
      SELECT * FROM template_stops 
      WHERE template_id = ? 
      ORDER BY ordine
    `).all(req.params.id);
    
    res.json({ ...template, stops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/templates - Crea template percorso
 */
router.post('/templates', (req, res) => {
  try {
    const { nome, descrizione, distanza_km, durata_minuti, polyline, stops, colore, giorni_settimana } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: 'Nome richiesto' });
    }
    
    const result = db.prepare(`
      INSERT INTO route_templates (nome, descrizione, distanza_km, durata_minuti, polyline, colore, giorni_settimana)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nome, descrizione || '', distanza_km || null, durata_minuti || null, polyline || null, colore || '#3B82F6', giorni_settimana || '[]');
    
    const templateId = result.lastInsertRowid;
    
    // Inserisci tappe
    if (stops && stops.length > 0) {
      const insertStop = db.prepare(`
        INSERT INTO template_stops (template_id, ordine, nome, indirizzo, latitudine, longitudine, place_id, raggio_arrivo_metri, tempo_sosta_minuti)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stops.forEach((stop, index) => {
        insertStop.run(
          templateId,
          index + 1,
          stop.nome || `Tappa ${index + 1}`,
          stop.indirizzo || '',
          stop.lat || stop.latitudine,
          stop.lng || stop.longitudine,
          stop.place_id || null,
          stop.raggio_arrivo_metri || 500,
          stop.tempo_sosta_minuti || 30
        );
      });
    }
    
    const template = db.prepare('SELECT * FROM route_templates WHERE id = ?').get(templateId);
    const templateStops = db.prepare('SELECT * FROM template_stops WHERE template_id = ? ORDER BY ordine').all(templateId);
    
    res.status(201).json({ ...template, stops: templateStops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/templates/:id - Aggiorna template
 */
router.put('/templates/:id', (req, res) => {
  try {
    const { nome, descrizione, distanza_km, durata_minuti, polyline, stops, colore, giorni_settimana } = req.body;
    
    db.prepare(`
      UPDATE route_templates 
      SET nome = COALESCE(?, nome),
          descrizione = COALESCE(?, descrizione),
          distanza_km = ?,
          durata_minuti = ?,
          polyline = ?,
          colore = COALESCE(?, colore),
          giorni_settimana = COALESCE(?, giorni_settimana),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nome, descrizione, distanza_km, durata_minuti, polyline, colore, giorni_settimana, req.params.id);
    
    // Aggiorna tappe se fornite
    if (stops) {
      db.prepare('DELETE FROM template_stops WHERE template_id = ?').run(req.params.id);
      
      const insertStop = db.prepare(`
        INSERT INTO template_stops (template_id, ordine, nome, indirizzo, latitudine, longitudine, place_id, raggio_arrivo_metri, tempo_sosta_minuti)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stops.forEach((stop, index) => {
        insertStop.run(
          req.params.id,
          index + 1,
          stop.nome || `Tappa ${index + 1}`,
          stop.indirizzo || '',
          stop.lat || stop.latitudine,
          stop.lng || stop.longitudine,
          stop.place_id || null,
          stop.raggio_arrivo_metri || 500,
          stop.tempo_sosta_minuti || 30
        );
      });
    }
    
    const template = db.prepare('SELECT * FROM route_templates WHERE id = ?').get(req.params.id);
    const templateStops = db.prepare('SELECT * FROM template_stops WHERE template_id = ? ORDER BY ordine').all(req.params.id);
    
    res.json({ ...template, stops: templateStops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/templates/:id - Elimina template
 */
router.delete('/templates/:id', (req, res) => {
  try {
    db.prepare('UPDATE route_templates SET attivo = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/templates/:id/stops - Aggiungi tappa al template
 */
router.post('/templates/:id/stops', (req, res) => {
  try {
    const templateId = req.params.id;
    const { nome, indirizzo, lat, lng, place_id, raggio_arrivo_metri, tempo_sosta, ordine } = req.body;
    
    // Calcola ordine se non fornito
    let stopOrdine = ordine;
    if (!stopOrdine) {
      const maxOrdine = db.prepare('SELECT MAX(ordine) as max FROM template_stops WHERE template_id = ?').get(templateId);
      stopOrdine = (maxOrdine?.max || 0) + 1;
    }
    
    const result = db.prepare(`
      INSERT INTO template_stops (template_id, ordine, nome, indirizzo, latitudine, longitudine, place_id, raggio_arrivo_metri, tempo_sosta_minuti)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      templateId,
      stopOrdine,
      nome || `Tappa ${stopOrdine}`,
      indirizzo || '',
      lat || null,
      lng || null,
      place_id || null,
      raggio_arrivo_metri || 500,
      tempo_sosta || 30
    );
    
    const newStop = db.prepare('SELECT * FROM template_stops WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newStop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/templates/:id/stops/:stopId - Aggiorna tappa del template
 */
router.put('/templates/:id/stops/:stopId', (req, res) => {
  try {
    const { nome, indirizzo, lat, lng, place_id, raggio_arrivo_metri, tempo_sosta, ordine } = req.body;
    
    db.prepare(`
      UPDATE template_stops 
      SET nome = COALESCE(?, nome),
          indirizzo = COALESCE(?, indirizzo),
          latitudine = COALESCE(?, latitudine),
          longitudine = COALESCE(?, longitudine),
          place_id = COALESCE(?, place_id),
          raggio_arrivo_metri = COALESCE(?, raggio_arrivo_metri),
          tempo_sosta_minuti = COALESCE(?, tempo_sosta_minuti),
          ordine = COALESCE(?, ordine)
      WHERE id = ? AND template_id = ?
    `).run(nome, indirizzo, lat, lng, place_id, raggio_arrivo_metri, tempo_sosta, ordine, req.params.stopId, req.params.id);
    
    const stop = db.prepare('SELECT * FROM template_stops WHERE id = ?').get(req.params.stopId);
    res.json(stop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/templates/:id/stops/:stopId - Elimina tappa dal template
 */
router.delete('/templates/:id/stops/:stopId', (req, res) => {
  try {
    db.prepare('DELETE FROM template_stops WHERE id = ? AND template_id = ?').run(req.params.stopId, req.params.id);
    
    // Riordina le tappe rimanenti
    const remainingStops = db.prepare('SELECT id FROM template_stops WHERE template_id = ? ORDER BY ordine').all(req.params.id);
    remainingStops.forEach((stop, index) => {
      db.prepare('UPDATE template_stops SET ordine = ? WHERE id = ?').run(index + 1, stop.id);
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== VIAGGI (ISTANZE CALENDARIO) ====================

/**
 * GET /api/trips - Lista viaggi (filtro per data/range)
 */
router.get('/trips', (req, res) => {
  try {
    const { data, from, to, stato } = req.query;
    
    let query = `
      SELECT t.id, t.template_id, t.data_viaggio as data, t.ora_partenza, t.ora_arrivo_prevista,
        t.vehicle_plate, t.stato, t.note, t.created_at, t.updated_at,
        rt.nome as template_nome, rt.colore as template_colore,
        (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id) as stops_count,
        (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id AND stato = 'raggiunta') as completed_count
      FROM trips t
      LEFT JOIN route_templates rt ON t.template_id = rt.id
      WHERE 1=1
    `;
    const params = [];
    
    if (data) {
      query += ' AND t.data_viaggio = ?';
      params.push(data);
    } else if (from && to) {
      query += ' AND t.data_viaggio BETWEEN ? AND ?';
      params.push(from, to);
    }
    
    if (stato) {
      query += ' AND t.stato = ?';
      params.push(stato);
    }
    
    query += ' ORDER BY t.data_viaggio, t.ora_partenza';
    
    const trips = db.prepare(query).all(...params);
    
    // Carica le tappe per ogni viaggio
    const tripsWithStops = trips.map(trip => {
      const stops = db.prepare(`
        SELECT id, ordine, nome, indirizzo, stato, ora_arrivo_effettiva as ora_arrivo, ora_partenza_effettiva as ora_partenza,
        CASE WHEN stato = 'raggiunta' OR stato = 'completata' THEN 1 ELSE 0 END as completato
        FROM trip_stops 
        WHERE trip_id = ? 
        ORDER BY ordine
      `).all(trip.id);
      return { ...trip, stops };
    });
    
    res.json(tripsWithStops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trips/calendar - Viaggi raggruppati per data (vista calendario)
 */
router.get('/trips/calendar', (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;
    
    // Primo e ultimo giorno del mese
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0).toISOString().split('T')[0];
    
    const trips = db.prepare(`
      SELECT 
        t.*, 
        rt.nome as template_nome,
        (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id) as stops_count,
        (SELECT GROUP_CONCAT(nome, ' → ') FROM (SELECT nome FROM trip_stops WHERE trip_id = t.id ORDER BY ordine LIMIT 3)) as stops_preview
      FROM trips t
      LEFT JOIN route_templates rt ON t.template_id = rt.id
      WHERE t.data_viaggio BETWEEN ? AND ?
      ORDER BY t.data_viaggio, t.ora_partenza
    `).all(startDate, endDate);
    
    // Raggruppa per data
    const calendar = {};
    trips.forEach(trip => {
      if (!calendar[trip.data_viaggio]) {
        calendar[trip.data_viaggio] = [];
      }
      calendar[trip.data_viaggio].push(trip);
    });
    
    res.json({ year: y, month: m, trips: calendar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/trips/:id - Dettaglio viaggio con tappe
 */
router.get('/trips/:id', (req, res) => {
  try {
    const trip = db.prepare(`
      SELECT t.*, rt.nome as template_nome
      FROM trips t
      LEFT JOIN route_templates rt ON t.template_id = rt.id
      WHERE t.id = ?
    `).get(req.params.id);
    
    if (!trip) {
      return res.status(404).json({ error: 'Viaggio non trovato' });
    }
    
    const stops = db.prepare(`
      SELECT * FROM trip_stops 
      WHERE trip_id = ? 
      ORDER BY ordine
    `).all(req.params.id);
    
    res.json({ ...trip, stops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/trips - Crea nuovo viaggio
 */
router.post('/trips', (req, res) => {
  try {
    const { 
      template_id, nome, descrizione, data_viaggio, data, ora_partenza,
      targa_motrice, targa_rimorchio, vehicle_plate, autista, note,
      distanza_km, durata_minuti, polyline, stops
    } = req.body;
    
    // Accetta sia data che data_viaggio
    const dataViaggio = data_viaggio || data;
    
    if (!dataViaggio) {
      return res.status(400).json({ error: 'Data viaggio richiesta' });
    }
    
    // Se c'è un template, copia nome e tappe se non forniti
    let tripName = nome;
    let tripStops = stops;
    
    if (template_id && !stops) {
      const template = db.prepare('SELECT * FROM route_templates WHERE id = ?').get(template_id);
      if (template) {
        tripName = tripName || template.nome;
        tripStops = db.prepare('SELECT * FROM template_stops WHERE template_id = ? ORDER BY ordine').all(template_id);
      }
    }
    
    if (!tripName) {
      tripName = `Viaggio ${dataViaggio}`;
    }
    
    // vehicle_plate può essere passato direttamente
    const motrice = targa_motrice || vehicle_plate || null;
    
    const result = db.prepare(`
      INSERT INTO trips (template_id, nome, descrizione, data_viaggio, ora_partenza, targa_motrice, targa_rimorchio, autista, note, distanza_km, durata_minuti, polyline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      template_id || null, tripName, descrizione || '', dataViaggio, ora_partenza || null,
      motrice, targa_rimorchio || null, autista || null, note || '', distanza_km || null, durata_minuti || null, polyline || null
    );
    
    const tripId = result.lastInsertRowid;
    
    // Inserisci tappe
    if (tripStops && tripStops.length > 0) {
      const insertStop = db.prepare(`
        INSERT INTO trip_stops (trip_id, ordine, nome, indirizzo, latitudine, longitudine, place_id, raggio_arrivo_metri, ora_arrivo_prevista, ora_partenza_prevista, tempo_sosta_minuti, notifica_arrivo, notifica_partenza)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Calcola orari previsti in base a ora_partenza e durate
      let currentTime = ora_partenza ? parseTime(ora_partenza) : null;
      
      tripStops.forEach((stop, index) => {
        let arrivo = stop.ora_arrivo_prevista || null;
        let partenza = stop.ora_partenza_prevista || null;
        
        // Se abbiamo ora partenza base, calcola orari automatici
        if (currentTime && !arrivo) {
          // Il primo punto è la partenza, gli altri sono arrivi
          if (index > 0) {
            // Aggiungi tempo viaggio stimato (placeholder, userà durata da directions)
            arrivo = formatTime(currentTime);
          }
        }
        
        const tempoSosta = stop.tempo_sosta_minuti || 30;
        if (currentTime && arrivo && !partenza && index < tripStops.length - 1) {
          currentTime += tempoSosta;
          partenza = formatTime(currentTime);
        }
        
        insertStop.run(
          tripId,
          index + 1,
          stop.nome || `Tappa ${index + 1}`,
          stop.indirizzo || '',
          stop.lat || stop.latitudine,
          stop.lng || stop.longitudine,
          stop.place_id || null,
          stop.raggio_arrivo_metri || 500,
          arrivo,
          partenza,
          tempoSosta,
          stop.notifica_arrivo !== false ? 1 : 0,
          stop.notifica_partenza !== false ? 1 : 0
        );
        
        // Avanza il tempo per la prossima tappa
        if (currentTime) {
          currentTime += tempoSosta;
        }
      });
    }
    
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
    const savedStops = db.prepare('SELECT * FROM trip_stops WHERE trip_id = ? ORDER BY ordine').all(tripId);
    
    res.status(201).json({ ...trip, stops: savedStops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper per gestione orari
function parseTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * PUT /api/trips/:id - Aggiorna viaggio
 */
router.put('/trips/:id', (req, res) => {
  try {
    const { 
      nome, descrizione, data_viaggio, ora_partenza,
      targa_motrice, targa_rimorchio, autista, stato, note,
      distanza_km, durata_minuti, polyline, stops
    } = req.body;
    
    db.prepare(`
      UPDATE trips 
      SET nome = COALESCE(?, nome),
          descrizione = COALESCE(?, descrizione),
          data_viaggio = COALESCE(?, data_viaggio),
          ora_partenza = ?,
          targa_motrice = ?,
          targa_rimorchio = ?,
          autista = ?,
          stato = COALESCE(?, stato),
          note = ?,
          distanza_km = ?,
          durata_minuti = ?,
          polyline = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nome, descrizione, data_viaggio, ora_partenza,
      targa_motrice, targa_rimorchio, autista, stato, note,
      distanza_km, durata_minuti, polyline,
      req.params.id
    );
    
    // Aggiorna tappe se fornite
    if (stops) {
      db.prepare('DELETE FROM trip_stops WHERE trip_id = ?').run(req.params.id);
      
      const insertStop = db.prepare(`
        INSERT INTO trip_stops (trip_id, ordine, nome, indirizzo, latitudine, longitudine, place_id, raggio_arrivo_metri, ora_arrivo_prevista, ora_partenza_prevista, tempo_sosta_minuti, notifica_arrivo, notifica_partenza)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stops.forEach((stop, index) => {
        insertStop.run(
          req.params.id,
          index + 1,
          stop.nome || `Tappa ${index + 1}`,
          stop.indirizzo || '',
          stop.lat || stop.latitudine,
          stop.lng || stop.longitudine,
          stop.place_id || null,
          stop.raggio_arrivo_metri || 500,
          stop.ora_arrivo_prevista || null,
          stop.ora_partenza_prevista || null,
          stop.tempo_sosta_minuti || 30,
          stop.notifica_arrivo !== false ? 1 : 0,
          stop.notifica_partenza !== false ? 1 : 0
        );
      });
    }
    
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
    const savedStops = db.prepare('SELECT * FROM trip_stops WHERE trip_id = ? ORDER BY ordine').all(req.params.id);
    
    res.json({ ...trip, stops: savedStops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/trips/:tripId/stops/:stopId - Aggiorna singola tappa (per monitoraggio)
 */
router.put('/trips/:tripId/stops/:stopId', (req, res) => {
  try {
    const { stato, ora_arrivo_effettiva, ora_partenza_effettiva, note } = req.body;
    
    db.prepare(`
      UPDATE trip_stops 
      SET stato = COALESCE(?, stato),
          ora_arrivo_effettiva = COALESCE(?, ora_arrivo_effettiva),
          ora_partenza_effettiva = COALESCE(?, ora_partenza_effettiva),
          note = COALESCE(?, note)
      WHERE id = ? AND trip_id = ?
    `).run(stato, ora_arrivo_effettiva, ora_partenza_effettiva, note, req.params.stopId, req.params.tripId);
    
    // Aggiorna stato viaggio se necessario
    const allStops = db.prepare('SELECT * FROM trip_stops WHERE trip_id = ?').all(req.params.tripId);
    const completedStops = allStops.filter(s => s.stato === 'raggiunta').length;
    
    let tripStato = 'pianificato';
    if (completedStops > 0 && completedStops < allStops.length) {
      tripStato = 'in_corso';
    } else if (completedStops === allStops.length) {
      tripStato = 'completato';
    }
    
    db.prepare('UPDATE trips SET stato = ? WHERE id = ?').run(tripStato, req.params.tripId);
    
    const stop = db.prepare('SELECT * FROM trip_stops WHERE id = ?').get(req.params.stopId);
    res.json(stop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/trips/:id - Elimina viaggio
 */
router.delete('/trips/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/trips/from-template - Crea viaggio da template per date specifiche
 */
router.post('/trips/from-template', (req, res) => {
  try {
    const { template_id, dates, targa_motrice, targa_rimorchio, ora_partenza } = req.body;
    
    if (!template_id || !dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'template_id e dates[] richiesti' });
    }
    
    const template = db.prepare('SELECT * FROM route_templates WHERE id = ?').get(template_id);
    if (!template) {
      return res.status(404).json({ error: 'Template non trovato' });
    }
    
    const templateStops = db.prepare('SELECT * FROM template_stops WHERE template_id = ? ORDER BY ordine').all(template_id);
    
    const createdTrips = [];
    
    for (const data of dates) {
      const result = db.prepare(`
        INSERT INTO trips (template_id, nome, descrizione, data_viaggio, ora_partenza, targa_motrice, targa_rimorchio, distanza_km, durata_minuti, polyline)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        template_id, template.nome, template.descrizione, data, ora_partenza || null,
        targa_motrice || null, targa_rimorchio || null,
        template.distanza_km, template.durata_minuti, template.polyline
      );
      
      const tripId = result.lastInsertRowid;
      
      // Copia tappe
      const insertStop = db.prepare(`
        INSERT INTO trip_stops (trip_id, ordine, nome, indirizzo, latitudine, longitudine, place_id, raggio_arrivo_metri, tempo_sosta_minuti)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      templateStops.forEach(stop => {
        insertStop.run(
          tripId, stop.ordine, stop.nome, stop.indirizzo,
          stop.latitudine, stop.longitudine, stop.place_id,
          stop.raggio_arrivo_metri, stop.tempo_sosta_minuti
        );
      });
      
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
      createdTrips.push(trip);
    }
    
    res.status(201).json({ created: createdTrips.length, trips: createdTrips });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GEOCODE ====================

/**
 * GET /api/geocode - Geocoding indirizzo con Google Maps
 * Query params: q (query)
 */
router.get('/geocode', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query richiesta' });
    }
    
    // Prima cerca nelle tappe predefinite
    const customStops = db.prepare(`
      SELECT * FROM custom_stops 
      WHERE attivo = 1 AND (nome LIKE ? OR indirizzo LIKE ?)
      LIMIT 5
    `).all(`%${q}%`, `%${q}%`);
    
    // Formatta risultati custom (priorità)
    const customResults = customStops.map(s => ({
      display_name: s.nome,
      short_name: s.nome,
      address: s.indirizzo,
      lat: s.latitudine,
      lon: s.longitudine,
      place_id: null,
      type: 'custom',
      categoria: s.categoria,
      raggio_metri: s.raggio_metri,
      isCustom: true,
      provider: 'custom'
    }));

    // Se ci sono abbastanza risultati custom, ritorna solo quelli
    if (customResults.length >= 5) {
      return res.json(customResults);
    }
    
    // Geocoding con Google Maps
    const googleResults = await geocodeWithGoogle(q);
    
    // Unisci risultati (custom prima)
    res.json([...customResults, ...googleResults]);
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Provider: Google Maps Geocoding API
async function geocodeWithGoogle(query) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('Google Maps API key non configurata');
    return [];
  }
  
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=it&region=it`
  );
  
  const data = await response.json();
  
  if (data.status !== 'OK') {
    console.error('Google Geocode error:', data.status, data.error_message);
    return [];
  }
  
  return (data.results || []).slice(0, 5).map(r => {
    const addr = r.address_components || [];
    
    // Estrai componenti indirizzo
    const getComponent = (type) => {
      const comp = addr.find(a => a.types.includes(type));
      return comp ? comp.long_name : '';
    };
    
    const streetNumber = getComponent('street_number');
    const route = getComponent('route');
    const locality = getComponent('locality') || getComponent('administrative_area_level_3');
    
    // Costruisci short_name
    let shortName = '';
    if (route) {
      shortName = streetNumber ? `${route} ${streetNumber}` : route;
      if (locality) shortName += `, ${locality}`;
    } else {
      shortName = r.formatted_address.split(',').slice(0, 2).join(',').trim();
    }
    
    return {
      display_name: r.formatted_address,
      short_name: shortName,
      address: r.formatted_address,
      lat: r.geometry.location.lat,
      lon: r.geometry.location.lng,
      place_id: r.place_id,
      type: r.types?.[0] || 'address',
      isCustom: false,
      provider: 'google'
    };
  });
}

/**
 * GET /api/google/maps-key - Restituisce API key per Google Maps JS SDK
 * La key dovrebbe avere restrizioni HTTP Referrer configurate su Google Cloud Console
 */
router.get('/google/maps-key', (req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key non configurata' });
  }
  
  // In produzione, verificare il referrer
  const referrer = req.get('Referer') || req.get('Origin') || '';
  const allowedDomains = [
    'localhost',
    '127.0.0.1',
    // Aggiungi qui il tuo dominio di produzione
  ];
  
  const isAllowed = process.env.NODE_ENV === 'development' || 
    allowedDomains.some(domain => referrer.includes(domain));
  
  if (!isAllowed) {
    return res.status(403).json({ error: 'Dominio non autorizzato' });
  }
  
  res.json({ key: apiKey });
});

/**
 * GET /api/google/autocomplete - Autocomplete Google Places
 */
router.get('/google/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;
    if (!input || input.trim().length < 2) {
      return res.json([]); // Ritorna array vuoto se input troppo corto
    }
    
    const searchInput = input.trim();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key non configurata' });
    }
    
    // Prima cerca nelle tappe predefinite
    const customStops = db.prepare(`
      SELECT * FROM custom_stops 
      WHERE attivo = 1 AND (nome LIKE ? OR indirizzo LIKE ?)
      LIMIT 3
    `).all(`%${searchInput}%`, `%${searchInput}%`);
    
    const customResults = customStops.map(s => ({
      place_id: `custom_${s.id}`,
      description: s.nome,
      secondary_text: s.indirizzo,
      main_text: s.nome,
      lat: s.latitudine,
      lon: s.longitudine,
      isCustom: true,
      categoria: s.categoria
    }));
    
    // Google Places Autocomplete - solo se input >= 3 caratteri
    let googleResults = [];
    if (searchInput.length >= 3) {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchInput)}&key=${apiKey}&language=it&components=country:it|country:ch|country:fr|country:de|country:at|country:si&types=establishment|geocode`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK') {
        googleResults = (data.predictions || []).map(p => ({
          place_id: p.place_id,
          description: p.description,
          secondary_text: p.structured_formatting?.secondary_text || '',
          main_text: p.structured_formatting?.main_text || p.description,
          isCustom: false
        }));
      } else if (data.status !== 'ZERO_RESULTS') {
        console.error('Google Autocomplete error:', data.status, data.error_message);
      }
    }
    
    res.json([...customResults, ...googleResults]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/google/place-details - Dettagli luogo Google
 */
router.get('/google/place-details', async (req, res) => {
  try {
    const { place_id } = req.query;
    if (!place_id) {
      return res.status(400).json({ error: 'place_id richiesto' });
    }
    
    // Se è una tappa custom
    if (place_id.startsWith('custom_')) {
      const stopId = place_id.replace('custom_', '');
      const stop = db.prepare('SELECT * FROM custom_stops WHERE id = ?').get(stopId);
      if (stop) {
        return res.json({
          place_id: place_id,
          name: stop.nome,
          formatted_address: stop.indirizzo,
          lat: stop.latitudine,
          lon: stop.longitudine,
          isCustom: true
        });
      }
    }
    
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key non configurata' });
    }
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${apiKey}&language=it&fields=place_id,name,formatted_address,geometry`
    );
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return res.status(400).json({ error: data.status });
    }
    
    const result = data.result;
    res.json({
      place_id: result.place_id,
      name: result.name,
      formatted_address: result.formatted_address,
      lat: result.geometry.location.lat,
      lon: result.geometry.location.lng,
      isCustom: false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/google/directions - Calcola percorso con Google Directions API
 * Supporta restrizioni per camion
 */
router.post('/google/directions', async (req, res) => {
  try {
    const { origin, destination, waypoints, vehicle } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin e destination richiesti' });
    }
    
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key non configurata' });
    }
    
    // Costruisci URL
    let url = `https://maps.googleapis.com/maps/api/directions/json?`;
    url += `origin=${encodeURIComponent(typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`)}`;
    url += `&destination=${encodeURIComponent(typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`)}`;
    url += `&key=${apiKey}&language=it&region=it&alternatives=true`;
    
    // Waypoints intermedi
    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints.map(w => 
        typeof w === 'string' ? w : `${w.lat},${w.lng}`
      ).join('|');
      url += `&waypoints=optimize:true|${encodeURIComponent(waypointsStr)}`;
    }
    
    // Aggiungi restrizioni per veicoli pesanti se specificato
    if (vehicle) {
      // Google Directions API supporta avoid=tolls,highways,ferries
      // Per restrizioni camion avanzate serve Routes API (prefer)
      // Ma possiamo usare mode=driving e annotare le dimensioni
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return res.status(400).json({ error: data.status, message: data.error_message });
    }
    
    // Formatta risposta
    const routes = data.routes.map((route, idx) => {
      // Calcola totale distanza e durata da tutti i legs
      const totalDistance = route.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
      const totalDuration = route.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);
      
      return {
        index: idx,
        summary: route.summary,
        distance: {
          value: totalDistance,
          text: totalDistance >= 1000 ? `${(totalDistance / 1000).toFixed(1)} km` : `${totalDistance} m`
        },
        duration: {
          value: totalDuration,
          text: totalDuration >= 3600 
            ? `${Math.floor(totalDuration / 3600)} ore ${Math.floor((totalDuration % 3600) / 60)} min`
            : `${Math.floor(totalDuration / 60)} min`
        },
        start_address: route.legs[0]?.start_address,
        end_address: route.legs[route.legs.length - 1]?.end_address,
        // Tutti i legs per mostrare info per ogni tappa
        legs: route.legs.map(leg => ({
          distance: leg.distance,
          duration: leg.duration,
          start_address: leg.start_address,
          end_address: leg.end_address,
          steps: leg.steps?.slice(0, 5).map(s => ({
            instruction: s.html_instructions?.replace(/<[^>]*>/g, '') || '',
            distance: s.distance,
            duration: s.duration
          }))
        })),
        polyline: route.overview_polyline?.points,
        bounds: route.bounds,
        warnings: route.warnings || [],
        waypoint_order: route.waypoint_order
      };
    });
    
    res.json({
      routes,
      vehicle_restrictions: vehicle ? {
        lunghezza: vehicle.lunghezza,
        altezza: vehicle.altezza,
        peso: vehicle.peso_totale,
        warning: vehicle.is_compatto ? null : 'Verifica manualmente restrizioni per veicoli pesanti (sottopassi, ponti, ZTL)'
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TAPPE PREDEFINITE ====================

/**
 * GET /api/custom-stops - Lista tappe predefinite
 */
router.get('/custom-stops', (req, res) => {
  try {
    const { categoria, search } = req.query;
    let query = 'SELECT * FROM custom_stops WHERE attivo = 1';
    const params = [];
    
    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }
    if (search) {
      query += ' AND (nome LIKE ? OR indirizzo LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY nome';
    const stops = db.prepare(query).all(...params);
    res.json(stops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/custom-stops - Crea tappa predefinita
 */
router.post('/custom-stops', (req, res) => {
  try {
    const { nome, indirizzo, latitudine, longitudine, raggio_metri, categoria, note } = req.body;
    
    if (!nome || !latitudine || !longitudine) {
      return res.status(400).json({ error: 'Nome e coordinate richiesti' });
    }
    
    const result = db.prepare(`
      INSERT INTO custom_stops (nome, indirizzo, latitudine, longitudine, raggio_metri, categoria, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nome, indirizzo || '', latitudine, longitudine, raggio_metri || 500, categoria || null, note || null);
    
    const stop = db.prepare('SELECT * FROM custom_stops WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(stop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/custom-stops/:id - Aggiorna tappa predefinita
 */
router.put('/custom-stops/:id', (req, res) => {
  try {
    const { nome, indirizzo, latitudine, longitudine, raggio_metri, categoria, note, attivo } = req.body;
    
    db.prepare(`
      UPDATE custom_stops 
      SET nome = COALESCE(?, nome),
          indirizzo = COALESCE(?, indirizzo),
          latitudine = COALESCE(?, latitudine),
          longitudine = COALESCE(?, longitudine),
          raggio_metri = COALESCE(?, raggio_metri),
          categoria = COALESCE(?, categoria),
          note = COALESCE(?, note),
          attivo = COALESCE(?, attivo)
      WHERE id = ?
    `).run(nome, indirizzo, latitudine, longitudine, raggio_metri, categoria, note, attivo, req.params.id);
    
    const stop = db.prepare('SELECT * FROM custom_stops WHERE id = ?').get(req.params.id);
    res.json(stop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/custom-stops/:id - Elimina tappa predefinita
 */
router.delete('/custom-stops/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM custom_stops WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: calcola distanza km
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * POST /api/check-geofence - Verifica se un punto è in un geofence
 */
router.post('/check-geofence', (req, res) => {
  try {
    const { latitude, longitude, geofence_id } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Coordinate richieste' });
    }

    const point = { latitude, longitude };
    
    if (geofence_id) {
      const geofence = db.prepare('SELECT * FROM geofences WHERE id = ?').get(geofence_id);
      if (!geofence) {
        return res.status(404).json({ error: 'Geofence non trovato' });
      }
      const isInside = geofenceService.isPointInGeofence(point, geofence);
      res.json({ inside: isInside, geofence_id });
    } else {
      const geofences = db.prepare('SELECT * FROM geofences WHERE attivo = 1').all();
      const insideGeofences = geofenceService.checkAllGeofences(point, geofences);
      res.json({ 
        inside_count: insideGeofences.length,
        geofences: insideGeofences.map(g => ({ id: g.id, nome: g.nome }))
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUTISTI ====================

/**
 * GET /api/drivers - Lista autisti
 */
router.get('/drivers', (req, res) => {
  try {
    const drivers = db.prepare(`
      SELECT d.*, 
        (SELECT GROUP_CONCAT(vehicle_plate) FROM driver_vehicle_assignments 
         WHERE driver_id = d.id AND attivo = 1) as veicoli_assegnati
      FROM drivers d
      WHERE d.attivo = 1
      ORDER BY d.cognome, d.nome
    `).all();
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/drivers/:id - Dettaglio autista
 */
router.get('/drivers/:id', (req, res) => {
  try {
    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Autista non trovato' });
    }
    
    // Carica veicoli assegnati
    const assignments = db.prepare(`
      SELECT * FROM driver_vehicle_assignments 
      WHERE driver_id = ? AND attivo = 1
      ORDER BY data_inizio DESC
    `).all(req.params.id);
    
    res.json({ ...driver, assignments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/drivers - Crea autista
 */
router.post('/drivers', (req, res) => {
  try {
    const { 
      nome, cognome, telefono, telefono_whatsapp, email,
      codice_fiscale, patente_numero, patente_scadenza, cqc_scadenza, note
    } = req.body;
    
    if (!nome || !cognome || !telefono) {
      return res.status(400).json({ error: 'Nome, cognome e telefono sono obbligatori' });
    }
    
    const result = db.prepare(`
      INSERT INTO drivers (nome, cognome, telefono, telefono_whatsapp, email, codice_fiscale, patente_numero, patente_scadenza, cqc_scadenza, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nome, cognome, telefono, telefono_whatsapp || telefono, email, codice_fiscale, patente_numero, patente_scadenza, cqc_scadenza, note);
    
    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/drivers/:id - Aggiorna autista
 */
router.put('/drivers/:id', (req, res) => {
  try {
    const { 
      nome, cognome, telefono, telefono_whatsapp, email,
      codice_fiscale, patente_numero, patente_scadenza, cqc_scadenza, note, attivo
    } = req.body;
    
    db.prepare(`
      UPDATE drivers SET
        nome = COALESCE(?, nome),
        cognome = COALESCE(?, cognome),
        telefono = COALESCE(?, telefono),
        telefono_whatsapp = COALESCE(?, telefono_whatsapp),
        email = COALESCE(?, email),
        codice_fiscale = COALESCE(?, codice_fiscale),
        patente_numero = COALESCE(?, patente_numero),
        patente_scadenza = COALESCE(?, patente_scadenza),
        cqc_scadenza = COALESCE(?, cqc_scadenza),
        note = COALESCE(?, note),
        attivo = COALESCE(?, attivo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nome, cognome, telefono, telefono_whatsapp, email, codice_fiscale, patente_numero, patente_scadenza, cqc_scadenza, note, attivo, req.params.id);
    
    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/drivers/:id - Disattiva autista
 */
router.delete('/drivers/:id', (req, res) => {
  try {
    db.prepare('UPDATE drivers SET attivo = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/drivers/:id/assign-vehicle - Assegna veicolo ad autista
 */
router.post('/drivers/:id/assign-vehicle', (req, res) => {
  try {
    const { vehicle_plate, data_inizio } = req.body;
    
    if (!vehicle_plate) {
      return res.status(400).json({ error: 'Targa veicolo richiesta' });
    }
    
    // Disattiva assegnazioni precedenti per questo veicolo
    db.prepare(`
      UPDATE driver_vehicle_assignments SET attivo = 0, data_fine = DATE('now')
      WHERE vehicle_plate = ? AND attivo = 1
    `).run(vehicle_plate);
    
    // Crea nuova assegnazione
    const result = db.prepare(`
      INSERT INTO driver_vehicle_assignments (driver_id, vehicle_plate, data_inizio)
      VALUES (?, ?, COALESCE(?, DATE('now')))
    `).run(req.params.id, vehicle_plate, data_inizio);
    
    res.status(201).json({ id: result.lastInsertRowid, driver_id: req.params.id, vehicle_plate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/drivers/:id/unassign-vehicle/:plate - Rimuovi assegnazione veicolo
 */
router.delete('/drivers/:id/unassign-vehicle/:plate', (req, res) => {
  try {
    db.prepare(`
      UPDATE driver_vehicle_assignments 
      SET attivo = 0, data_fine = DATE('now')
      WHERE driver_id = ? AND vehicle_plate = ? AND attivo = 1
    `).run(req.params.id, req.params.plate);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/drivers/by-vehicle/:plate - Trova autista per veicolo
 */
router.get('/drivers/by-vehicle/:plate', (req, res) => {
  try {
    const driver = db.prepare(`
      SELECT d.* FROM drivers d
      JOIN driver_vehicle_assignments dva ON d.id = dva.driver_id
      WHERE dva.vehicle_plate = ? 
        AND dva.attivo = 1 
        AND d.attivo = 1
        AND (dva.data_fine IS NULL OR dva.data_fine >= DATE('now'))
      ORDER BY dva.data_inizio DESC
      LIMIT 1
    `).get(req.params.plate);
    
    if (!driver) {
      return res.status(404).json({ error: 'Nessun autista assegnato a questo veicolo' });
    }
    
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RESPONSABILI ====================

/**
 * GET /api/responsables - Lista responsabili
 */
router.get('/responsables', (req, res) => {
  try {
    const responsables = db.prepare(`
      SELECT * FROM responsables WHERE attivo = 1 ORDER BY priorita ASC, cognome, nome
    `).all();
    res.json(responsables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/responsables - Crea responsabile
 */
router.post('/responsables', (req, res) => {
  try {
    const { nome, cognome, telefono, telefono_whatsapp, email, ruolo, priorita } = req.body;
    
    if (!nome || !cognome || !telefono) {
      return res.status(400).json({ error: 'Nome, cognome e telefono sono obbligatori' });
    }
    
    const result = db.prepare(`
      INSERT INTO responsables (nome, cognome, telefono, telefono_whatsapp, email, ruolo, priorita)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nome, cognome, telefono, telefono_whatsapp || telefono, email, ruolo || 'responsabile', priorita || 1);
    
    const responsable = db.prepare('SELECT * FROM responsables WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(responsable);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/responsables/:id - Aggiorna responsabile
 */
router.put('/responsables/:id', (req, res) => {
  try {
    const { nome, cognome, telefono, telefono_whatsapp, email, ruolo, priorita, attivo } = req.body;
    
    db.prepare(`
      UPDATE responsables SET
        nome = COALESCE(?, nome),
        cognome = COALESCE(?, cognome),
        telefono = COALESCE(?, telefono),
        telefono_whatsapp = COALESCE(?, telefono_whatsapp),
        email = COALESCE(?, email),
        ruolo = COALESCE(?, ruolo),
        priorita = COALESCE(?, priorita),
        attivo = COALESCE(?, attivo)
      WHERE id = ?
    `).run(nome, cognome, telefono, telefono_whatsapp, email, ruolo, priorita, attivo, req.params.id);
    
    const responsable = db.prepare('SELECT * FROM responsables WHERE id = ?').get(req.params.id);
    res.json(responsable);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/responsables/:id - Disattiva responsabile
 */
router.delete('/responsables/:id', (req, res) => {
  try {
    db.prepare('UPDATE responsables SET attivo = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== WHATSAPP ====================

/**
 * GET /api/whatsapp/status - Stato connessione WhatsApp
 */
router.get('/whatsapp/status', async (req, res) => {
  try {
    // Import dinamico per evitare problemi di caricamento
    const { default: whatsappService } = await import('../services/whatsappService.js');
    const status = whatsappService.getStatus();
    const config = whatsappService.getConfig();
    res.json({ ...status, config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/initialize - Inizializza WhatsApp Bot
 */
router.post('/whatsapp/initialize', async (req, res) => {
  try {
    const { default: whatsappService } = await import('../services/whatsappService.js');
    await whatsappService.initialize();
    res.json({ success: true, message: 'Inizializzazione avviata' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/disconnect - Disconnetti WhatsApp Bot
 */
router.post('/whatsapp/disconnect', async (req, res) => {
  try {
    const { default: whatsappService } = await import('../services/whatsappService.js');
    await whatsappService.disconnect();
    res.json({ success: true, message: 'WhatsApp disconnesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/whatsapp/config - Aggiorna configurazione WhatsApp
 */
router.put('/whatsapp/config', (req, res) => {
  try {
    const { 
      timeout_risposta_minuti, 
      timeout_chiamata_minuti, 
      timeout_responsabile_minuti,
      messaggio_template 
    } = req.body;
    
    const existing = db.prepare('SELECT id FROM whatsapp_config LIMIT 1').get();
    
    if (existing) {
      db.prepare(`
        UPDATE whatsapp_config SET
          timeout_risposta_minuti = COALESCE(?, timeout_risposta_minuti),
          timeout_chiamata_minuti = COALESCE(?, timeout_chiamata_minuti),
          timeout_responsabile_minuti = COALESCE(?, timeout_responsabile_minuti),
          messaggio_template = COALESCE(?, messaggio_template),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(timeout_risposta_minuti, timeout_chiamata_minuti, timeout_responsabile_minuti, messaggio_template, existing.id);
    } else {
      db.prepare(`
        INSERT INTO whatsapp_config (timeout_risposta_minuti, timeout_chiamata_minuti, timeout_responsabile_minuti, messaggio_template)
        VALUES (?, ?, ?, ?)
      `).run(
        timeout_risposta_minuti || 5, 
        timeout_chiamata_minuti || 10, 
        timeout_responsabile_minuti || 15,
        messaggio_template
      );
    }
    
    const config = db.prepare('SELECT * FROM whatsapp_config LIMIT 1').get();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/send-test - Invia messaggio di test
 */
router.post('/whatsapp/send-test', async (req, res) => {
  try {
    const { telefono, messaggio } = req.body;
    
    if (!telefono || !messaggio) {
      return res.status(400).json({ error: 'Telefono e messaggio richiesti' });
    }
    
    const { default: whatsappService } = await import('../services/whatsappService.js');
    const result = await whatsappService.sendMessage(telefono, messaggio);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/send-alarm - Invia notifica allarme via WhatsApp
 */
router.post('/whatsapp/send-alarm', async (req, res) => {
  try {
    const { 
      alarm_id, event_id, vehicle_plate, tipo_allarme, messaggio,
      driver_id, driver_phone, driver_name
    } = req.body;
    
    const { default: whatsappService } = await import('../services/whatsappService.js');
    
    // Se non è specificato l'autista, cerca quello assegnato al veicolo
    let targetDriverId = driver_id;
    let targetPhone = driver_phone;
    let targetName = driver_name;
    
    if (!targetPhone && vehicle_plate) {
      const driver = whatsappService.getDriverForVehicle(vehicle_plate);
      if (driver) {
        targetDriverId = driver.id;
        targetPhone = driver.telefono_whatsapp || driver.telefono;
        targetName = `${driver.nome} ${driver.cognome}`;
      }
    }
    
    if (!targetPhone) {
      return res.status(400).json({ error: 'Nessun autista trovato per questo veicolo' });
    }
    
    const result = await whatsappService.sendAlarmNotification({
      alarmId: alarm_id,
      eventId: event_id,
      vehiclePlate: vehicle_plate,
      tipoAllarme: tipo_allarme,
      messaggio,
      driverId: targetDriverId,
      driverPhone: targetPhone,
      driverName: targetName
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/whatsapp/notifications - Lista notifiche allarme
 */
router.get('/whatsapp/notifications', (req, res) => {
  try {
    const { status, limit } = req.query;
    
    let query = `
      SELECT an.*, 
        d.nome as driver_nome, d.cognome as driver_cognome,
        a.nome as alarm_nome, a.tipo as alarm_tipo
      FROM alarm_notifications an
      LEFT JOIN drivers d ON an.driver_id = d.id
      LEFT JOIN alarms a ON an.alarm_id = a.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND an.stato = ?';
      params.push(status);
    }
    
    query += ' ORDER BY an.created_at DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    
    const notifications = db.prepare(query).all(...params);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LOGS E MONITORING ====================

/**
 * GET /api/logs - Ottiene i log recenti
 */
router.get('/logs', async (req, res) => {
  try {
    const { lines = 100, level } = req.query;
    const logs = await logger.getRecentLogs(parseInt(lines), level);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/logs/stats - Ottiene le statistiche dei log
 */
router.get('/logs/stats', async (req, res) => {
  try {
    const stats = await logger.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/monitoring/status - Stato del servizio di monitoraggio
 */
router.get('/monitoring/status', (req, res) => {
  try {
    const status = monitoringService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
