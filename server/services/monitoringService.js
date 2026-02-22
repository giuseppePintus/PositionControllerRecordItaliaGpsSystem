import cron from 'node-cron';
import db from '../database/db.js';
import { recordItaliaClient } from './recordItaliaClient.js';
import { geofenceService } from './geofenceService.js';
import { notificationService } from './notificationService.js';
import { logger } from './loggerService.js';
import { saveVehiclePosition, saveMultiplePositions, getAllLatestPositions, getLatestPositionByTarga } from '../database/positionsDb.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Servizio di monitoraggio - controlla periodicamente le posizioni e genera allarmi
 * Gli allarmi vengono processati in modo asincrono per non bloccare il ciclo principale
 */
class MonitoringService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = parseInt(process.env.CHECK_INTERVAL_MINUTES) || 1; // Check every 1 minute (60 seconds)
    this.cronJob = null;
    this.alarmQueue = []; // Queue for background alarm processing
    this.processingAlarms = false;
    this.lastApiError = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 5;
  }

  /**
   * Avvia il monitoraggio periodico
   */
  start() {
    if (this.isRunning) {
      logger.warn('Monitoraggio già attivo');
      return;
    }

    logger.info(`Avvio monitoraggio ogni 60 secondi (salvataggio SQL)`);

    // Avvia il processore di allarmi in background
    this.startAlarmProcessor();

    // Esegui subito al primo avvio
    this.checkAllVehicles();

    // Configura cron job - ogni 60 secondi
    this.cronJob = cron.schedule('* * * * *', () => {
      this.checkAllVehicles();
    });

    this.isRunning = true;
  }

  /**
   * Ferma il monitoraggio
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info('Monitoraggio fermato');
  }

  /**
   * Avvia il processore di allarmi in background
   */
  startAlarmProcessor() {
    setInterval(async () => {
      if (this.processingAlarms || this.alarmQueue.length === 0) return;
      
      this.processingAlarms = true;
      
      while (this.alarmQueue.length > 0) {
        const alarmTask = this.alarmQueue.shift();
        try {
          await this.processAlarmTask(alarmTask);
        } catch (error) {
          logger.error('Errore processamento allarme in background', { 
            error: error.message,
            task: alarmTask.type 
          });
        }
      }
      
      this.processingAlarms = false;
    }, 1000); // Check queue every second
  }

  /**
   * Processa un task di allarme dalla coda
   */
  async processAlarmTask(task) {
    const { type, vehicle, geofence, alarm, transition, lat, lng } = task;
    
    logger.alarm(`Processamento allarme: ${type}`, {
      vehicle: vehicle?.nickname || vehicle?.targa_camion,
      geofence: geofence?.nome,
      alarm: alarm?.nome
    });
    
    try {
      await notificationService.sendVehicleNotification(
        transition || type,
        { ...vehicle, latitudine: lat, longitudine: lng },
        geofence,
        alarm
      );
      logger.info('Notifica allarme inviata con successo', { type });
    } catch (error) {
      logger.error('Errore invio notifica allarme', { error: error.message, type });
    }
  }

  /**
   * Aggiunge un allarme alla coda di processamento
   */
  queueAlarm(alarmData) {
    this.alarmQueue.push({
      ...alarmData,
      queuedAt: new Date().toISOString()
    });
    logger.debug('Allarme aggiunto alla coda', { queueLength: this.alarmQueue.length });
  }

  /**
   * Controlla tutti i veicoli
   */
  async checkAllVehicles() {
    logger.info('Inizio controllo posizioni...');

    try {
      // Ottieni tutte le posizioni dall'API
      logger.api('Richiesta posizioni a RecordItalia API');
      const positions = await recordItaliaClient.getAllPositions();
      
      // Reset error counter on success
      this.consecutiveErrors = 0;
      this.lastApiError = null;
      
      logger.api(`Ricevute ${positions.length} posizioni`);

      // Ottieni tutti i geofence attivi
      const geofences = db.prepare('SELECT * FROM geofences WHERE attivo = 1').all();

      // Processa ogni posizione
      for (const pos of positions) {
        await this.processVehiclePosition(pos, geofences);
      }

      // Controlla allarmi temporali (partenze/arrivi mancati)
      await this.checkTimeBasedAlarms();

      // Controlla arrivi alle destinazioni delle tratte
      await this.checkRouteDestinations(positions);
      
      logger.info('Controllo posizioni completato', { 
        vehicles: positions.length, 
        geofences: geofences.length,
        alarmsInQueue: this.alarmQueue.length
      });

    } catch (error) {
      this.consecutiveErrors++;
      this.lastApiError = error.message;
      
      // Log appropriato in base al numero di errori consecutivi
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        logger.error('API RecordItalia non raggiungibile - troppi errori consecutivi', { 
          error: error.message,
          consecutiveErrors: this.consecutiveErrors
        });
      } else {
        logger.warn('Errore nel controllo posizioni', { 
          error: error.message,
          consecutiveErrors: this.consecutiveErrors
        });
      }
    }
  }

  /**
   * Restituisce lo stato del servizio
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      alarmQueueLength: this.alarmQueue.length,
      processingAlarms: this.processingAlarms,
      lastApiError: this.lastApiError,
      consecutiveErrors: this.consecutiveErrors,
      healthy: this.consecutiveErrors < this.maxConsecutiveErrors
    };
  }

  /**
   * Processa la posizione di un singolo veicolo
   * @param {Object} position - Dati posizione dall'API
   * @param {Array} geofences - Lista geofence attivi
   */
  async processVehiclePosition(position, geofences) {
    try {
      // Trova o crea il veicolo nel database
      let vehicle = db.prepare('SELECT * FROM vehicles WHERE id_servizio = ?')
        .get(position.idServizio);

      if (!vehicle) {
        // Crea nuovo veicolo
        const result = db.prepare(`
          INSERT INTO vehicles (id_servizio, nickname, targa_camion, modello, brand)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          position.idServizio,
          position.nickname,
          position.targa,
          position.modello,
          position.brand
        );
        vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
        logger.info('Nuovo veicolo registrato', { nickname: position.nickname, targa: position.targa });
      }

      // Estrai coordinate dalla posizione
      const lat = position.posizione?.latitude || position.latitude;
      const lng = position.posizione?.longitude || position.longitude;
      const speed = position.posizione?.speed || position.speed || 0;
      const heading = position.posizione?.heading || position.heading || 0;
      const altitude = position.posizione?.altitude || position.altitude || 0;
      const kmTotali = position.km_totali || 0;
      const stato = position.posizione?.stato || position.stato;
      const messaggio = position.posizione?.message || position.message;
      const fixGps = position.posizione?.fixGps || position.fixGps;
      
      // Estrai dati aggiuntivi
      const inputs = position.posizione?.inputs || {};
      const analogs = position.posizione?.analogs || {};
      const frigoOn = inputs['CHIAVE FRIGO'] === '1' ? 1 : 0;
      const doorOpen = inputs['VANO CARICO'] === '1' ? 1 : 0;
      const temp1 = analogs.analog1;
      const temp2 = analogs.analog2;
      const address = position.posizione?.address?.F || '';
      const tipologia = position.tipologia?.tipologia || '';

      if (!lat || !lng) {
        logger.debug('Coordinate mancanti', { vehicle: vehicle.nickname || vehicle.targa_camion });
        return;
      }

      // Salva in SQL (source of truth per le posizioni - NO MongoDB)
      saveVehiclePosition({
        idServizio: position.idServizio,
        targa: position.targa,
        nickname: position.nickname,
        fleetId: position.fleetId,
        fleetName: position.fleetName,
        latitude: lat,
        longitude: lng,
        speed,
        heading,
        altitude,
        fixGps,
        address,
        kmTotali,
        brand: position.brand,
        modello: position.modello,
        tipologia,
        sondeCount: position.sonde_count || 0,
        temperature1: temp1,
        temperature2: temp2,
        frigoOn,
        doorOpen,
        inputs,
        analogs,
        rawData: position
      });

      // Controlla geofence
      const point = { latitude: lat, longitude: lng };
      
      for (const geofence of geofences) {
        const isInside = geofenceService.isPointInGeofence(point, geofence);
        
        // Ottieni stato precedente
        const prevStatus = db.prepare(`
          SELECT * FROM vehicle_geofence_status 
          WHERE vehicle_id = ? AND geofence_id = ?
        `).get(vehicle.id, geofence.id);

        // Rileva transizione
        const transition = geofenceService.detectTransition(prevStatus, isInside);

        // Aggiorna stato
        db.prepare(`
          INSERT OR REPLACE INTO vehicle_geofence_status (vehicle_id, geofence_id, inside, last_change)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).run(vehicle.id, geofence.id, isInside ? 1 : 0);

        // Se c'è una transizione, genera evento
        if (transition) {
          logger.info(`Transizione geofence: ${vehicle.nickname || vehicle.targa_camion} - ${transition} - ${geofence.nome}`);
          
          // Registra evento
          db.prepare(`
            INSERT INTO events (vehicle_id, tipo, messaggio, latitudine, longitudine, geofence_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            vehicle.id,
            transition,
            `${transition === 'enter' ? 'Ingresso' : 'Uscita'} in ${geofence.nome}`,
            lat,
            lng,
            geofence.id
          );

          // Cerca allarmi attivi per questa combinazione
          const alarms = db.prepare(`
            SELECT * FROM alarms 
            WHERE attivo = 1 
            AND (vehicle_id IS NULL OR vehicle_id = ?)
            AND (geofence_id IS NULL OR geofence_id = ?)
          `).all(vehicle.id, geofence.id);

          for (const alarm of alarms) {
            // Verifica orario e giorno - accoda l'allarme per processamento in background
            if (this.isAlarmActiveNow(alarm)) {
              this.queueAlarm({
                type: 'geofence_transition',
                transition,
                vehicle,
                geofence,
                alarm,
                lat,
                lng
              });
            }
          }
        }
      }

      // SQL gestisce automaticamente lo storage senza retention policy

    } catch (error) {
      logger.error('Errore processamento posizione veicolo', { 
        idServizio: position.idServizio,
        error: error.message 
      });
    }
  }

  /**
   * Controlla allarmi basati sul tempo (partenze/arrivi)
   */
  async checkTimeBasedAlarms() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentDay = now.getDay() || 7; // 1-7 (Lun-Dom)

    // Trova checkpoint con orari previsti nelle prossime/precedenti tolleranza minuti
    const checkpoints = db.prepare(`
      SELECT rc.*, r.vehicle_plate, r.nome as route_nome, g.nome as geofence_nome, g.coordinate
      FROM route_checkpoints rc
      JOIN routes r ON rc.route_id = r.id
      LEFT JOIN geofences g ON rc.geofence_id = g.id
      WHERE r.attivo = 1 AND r.vehicle_plate IS NOT NULL
    `).all();

    for (const checkpoint of checkpoints) {
      if (!checkpoint.vehicle_plate) continue;

      // Ottieni ultima posizione del veicolo da SQL
      const lastPos = getLatestPositionByTarga(checkpoint.vehicle_plate);

      if (!lastPos || !lastPos.posizione) continue;

      // Verifica arrivo previsto
      if (checkpoint.ora_prevista_arrivo && checkpoint.geofence_id) {
        const expectedTime = this.parseTime(checkpoint.ora_prevista_arrivo);
        const tolerance = checkpoint.tolleranza_minuti || 30;
        
        // Se siamo oltre l'orario previsto + tolleranza
        if (this.isTimePassed(expectedTime, tolerance)) {
          // Verifica se il veicolo è nel geofence
          const coords = JSON.parse(checkpoint.coordinate || '[]');
          if (coords.length > 0) {
            const point = { latitude: lastPos.posizione.latitude, longitude: lastPos.posizione.longitude };
            const geofence = { coordinate: checkpoint.coordinate, tipo: 'polygon', raggio_metri: 0 };
            const isInside = geofenceService.isPointInGeofence(point, geofence);

            if (!isInside && checkpoint.notifica_ritardo) {
              // Verifica se non abbiamo già notificato oggi
              const existingEvent = db.prepare(`
                SELECT * FROM events 
                WHERE vehicle_id = ? AND tipo = 'not_arrived' 
                AND date(created_at) = date('now')
                AND messaggio LIKE ?
              `).get(checkpoint.vehicle_id, `%${checkpoint.nome}%`);

              if (!existingEvent) {
                const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(checkpoint.vehicle_id);
                
                db.prepare(`
                  INSERT INTO events (vehicle_id, tipo, messaggio, latitudine, longitudine)
                  VALUES (?, ?, ?, ?, ?)
                `).run(
                  checkpoint.vehicle_id,
                  'not_arrived',
                  `Mancato arrivo a ${checkpoint.nome} (previsto ${checkpoint.ora_prevista_arrivo})`,
                  lastPos.posizione.latitude,
                  lastPos.posizione.longitude
                );

                await notificationService.sendVehicleNotification(
                  'not_arrived',
                  { ...vehicle, latitudine: lastPos.latitudine, longitudine: lastPos.longitudine },
                  { nome: checkpoint.geofence_nome || checkpoint.nome }
                );
              }
            }
          }
        }
      }

      // Verifica partenza prevista
      if (checkpoint.ora_prevista_partenza && checkpoint.geofence_id) {
        const expectedTime = this.parseTime(checkpoint.ora_prevista_partenza);
        const tolerance = checkpoint.tolleranza_minuti || 30;
        
        // Se siamo oltre l'orario di partenza + tolleranza
        if (this.isTimePassed(expectedTime, tolerance)) {
          const coords = JSON.parse(checkpoint.coordinate || '[]');
          if (coords.length > 0) {
            const point = { latitude: lastPos.latitudine, longitude: lastPos.longitudine };
            const geofence = { coordinate: checkpoint.coordinate, tipo: 'polygon', raggio_metri: 0 };
            const isInside = geofenceService.isPointInGeofence(point, geofence);

            if (isInside && checkpoint.notifica_ritardo) {
              // Il veicolo è ancora dentro quando doveva essere partito
              const existingEvent = db.prepare(`
                SELECT * FROM events 
                WHERE vehicle_id = ? AND tipo = 'not_departed' 
                AND date(created_at) = date('now')
                AND messaggio LIKE ?
              `).get(checkpoint.vehicle_id, `%${checkpoint.nome}%`);

              if (!existingEvent) {
                const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(checkpoint.vehicle_id);
                
                db.prepare(`
                  INSERT INTO events (vehicle_id, tipo, messaggio, latitudine, longitudine)
                  VALUES (?, ?, ?, ?, ?)
                `).run(
                  checkpoint.vehicle_id,
                  'not_departed',
                  `Mancata partenza da ${checkpoint.nome} (prevista ${checkpoint.ora_prevista_partenza})`,
                  lastPos.latitudine,
                  lastPos.longitudine
                );

                await notificationService.sendVehicleNotification(
                  'not_departed',
                  { ...vehicle, latitudine: lastPos.latitudine, longitudine: lastPos.longitudine },
                  { nome: checkpoint.geofence_nome || checkpoint.nome }
                );
              }
            }
          }
        }
      }
    }
  }

  /**
   * Verifica se un allarme è attivo ora (orario e giorno)
   * @param {Object} alarm - Allarme dal database
   * @returns {boolean}
   */
  isAlarmActiveNow(alarm) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay() || 7;

    // Verifica giorno
    if (alarm.giorni_settimana) {
      const days = alarm.giorni_settimana.split(',').map(d => parseInt(d));
      if (!days.includes(currentDay)) {
        return false;
      }
    }

    // Verifica orario
    if (alarm.ora_inizio && alarm.ora_fine) {
      const start = alarm.ora_inizio.slice(0, 5);
      const end = alarm.ora_fine.slice(0, 5);
      
      if (start <= end) {
        // Stesso giorno
        if (currentTime < start || currentTime > end) {
          return false;
        }
      } else {
        // Attraversa mezzanotte
        if (currentTime < start && currentTime > end) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Parse time string to Date
   * @param {string} timeStr - Formato HH:MM:SS o HH:MM
   * @returns {Date}
   */
  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Verifica se un orario è passato considerando la tolleranza
   * @param {Date} expectedTime - Orario previsto
   * @param {number} toleranceMinutes - Tolleranza in minuti
   * @returns {boolean}
   */
  isTimePassed(expectedTime, toleranceMinutes) {
    const now = new Date();
    const deadlineTime = new Date(expectedTime.getTime() + toleranceMinutes * 60 * 1000);
    return now > deadlineTime;
  }

  /**
   * Forza un controllo immediato
   */
  async forceCheck() {
    console.log('🔄 Controllo forzato...');
    await this.checkAllVehicles();
  }

  /**
   * Controlla le destinazioni delle tratte e notifica arrivi
   */
  async checkRouteDestinations(positions) {
    try {
      // Trova tutte le tratte attive con veicolo assegnato
      const routes = db.prepare(`
        SELECT r.*, GROUP_CONCAT(rd.id) as dest_ids
        FROM routes r
        LEFT JOIN route_destinations rd ON rd.route_id = r.id AND rd.arrivato = 0
        WHERE r.attivo = 1 AND r.vehicle_plate IS NOT NULL
        GROUP BY r.id
      `).all();

      for (const route of routes) {
        if (!route.vehicle_plate) continue;

        // Trova posizione del veicolo assegnato
        const vehiclePos = positions.find(p => {
          const plate = (p.targa || p.targa_camion || '').toUpperCase().replace(/\*+$/, '');
          return plate === route.vehicle_plate.toUpperCase();
        });

        if (!vehiclePos) continue;

        const lat = vehiclePos.posizione?.latitude || vehiclePos.latitude;
        const lng = vehiclePos.posizione?.longitude || vehiclePos.longitude;
        if (!lat || !lng) continue;

        // Trova destinazioni non ancora raggiunte per questa tratta
        const destinations = db.prepare(`
          SELECT * FROM route_destinations 
          WHERE route_id = ? AND arrivato = 0 
          ORDER BY ordine
        `).all(route.id);

        for (const dest of destinations) {
          // Calcola distanza
          const distance = this.getDistanceMeters(lat, lng, dest.latitudine, dest.longitudine);

          if (distance <= dest.raggio_metri) {
            // ARRIVATO!
            console.log(`🎯 Veicolo ${route.vehicle_plate} arrivato a "${dest.nome}" (${distance.toFixed(0)}m)`);
            
            // Aggiorna destinazione
            db.prepare(`
              UPDATE route_destinations 
              SET arrivato = 1, ora_arrivo_effettivo = CURRENT_TIMESTAMP 
              WHERE id = ?
            `).run(dest.id);

            // Crea evento
            db.prepare(`
              INSERT INTO events (vehicle_id, tipo, messaggio, latitudine, longitudine)
              VALUES (NULL, 'route_arrival', ?, ?, ?)
            `).run(
              `🎯 ${route.vehicle_plate} arrivato a "${dest.nome}" - Tratta: ${route.nome}`,
              lat,
              lng
            );

            // Invia notifica se abilitata
            if (dest.notifica_arrivo) {
              await notificationService.sendRouteNotification(
                'arrival',
                route,
                dest,
                { latitude: lat, longitude: lng }
              );
            }
          } else if (dest.allarme_attivo && dest.ora_arrivo_prevista) {
            // Verifica ritardo
            const expectedTime = this.parseTime(dest.ora_arrivo_prevista);
            const tolerance = dest.minuti_preavviso || 30;
            
            if (this.isTimePassed(expectedTime, tolerance)) {
              // Ritardo - verifica se non già notificato oggi
              const existing = db.prepare(`
                SELECT * FROM events 
                WHERE tipo = 'route_delay' 
                AND date(created_at) = date('now')
                AND messaggio LIKE ?
              `).get(`%${dest.nome}%${route.vehicle_plate}%`);

              if (!existing) {
                console.log(`⚠️ Ritardo: ${route.vehicle_plate} non arrivato a "${dest.nome}" (previsto ${dest.ora_arrivo_prevista})`);
                
                db.prepare(`
                  INSERT INTO events (vehicle_id, tipo, messaggio, latitudine, longitudine)
                  VALUES (NULL, 'route_delay', ?, ?, ?)
                `).run(
                  `⚠️ Ritardo: ${route.vehicle_plate} non arrivato a "${dest.nome}" (previsto ${dest.ora_arrivo_prevista}) - Tratta: ${route.nome}`,
                  lat,
                  lng
                );

                await notificationService.sendRouteNotification(
                  'delay',
                  route,
                  dest,
                  { latitude: lat, longitude: lng }
                );
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Errore controllo destinazioni tratte:', error.message);
    }
  }

  /**
   * Calcola distanza in metri tra due punti
   */
  getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // metri
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Stato del servizio
   */
  getStatus() {
    return {
      running: this.isRunning,
      interval: this.checkInterval,
      nextRun: this.cronJob ? 'In attesa...' : 'Non pianificato'
    };
  }
}

export const monitoringService = new MonitoringService();
export default MonitoringService;
