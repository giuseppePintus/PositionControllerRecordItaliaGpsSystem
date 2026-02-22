import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import db from '../database/db.js';
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './loggerService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.isReady = false;
    this.qrCode = null;
    this.pendingResponses = new Map(); // notificationId -> timeout
    this.escalationTimers = new Map(); // notificationId -> {timer, level}
  }

  // Inizializza il client WhatsApp
  async initialize() {
    // Prevent re-initialization if already ready
    if (this.isReady && this.client) {
      logger.whatsapp('WhatsApp già connesso');
      return;
    }

    // If client exists but not ready, destroy and recreate
    if (this.client) {
      try {
        await this.client.destroy();
      } catch (e) {
        // Ignore destroy errors
      }
      this.client = null;
    }

    logger.whatsapp('Inizializzazione WhatsApp Bot...');
    
    // Use absolute path for session data
    const sessionPath = path.resolve(__dirname, '..', 'data', 'whatsapp-session');
    logger.debug('Session path: ' + sessionPath);
    
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: sessionPath,
        clientId: 'gps-tracker-bot'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--mute-audio',
          '--safebrowsing-disable-auto-update'
        ],
        timeout: 60000
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/nicokant/nicokant.github.io/refs/heads/main/nicokant.github.io/nicokant.github.io/nicokant.github.io/nicokant.github.io/nicokant.github.io/nicokant.github.io/nicokant.github.io/nicokant.github.io/nicokant.github.io/nicokant.github.io/nicokant.github.io/',
        strict: false
      }
    });

    // Event handlers
    this.client.on('qr', (qr) => {
      this.qrCode = qr;
      logger.whatsapp('Scansiona il QR code per connettere WhatsApp');
      qrcode.generate(qr, { small: true });
      this.emit('qr', qr);
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.qrCode = null;
      logger.whatsapp('WhatsApp Bot connesso e pronto!');
      this.updateConnectionStatus(true);
      this.emit('ready');
    });

    this.client.on('authenticated', () => {
      logger.whatsapp('WhatsApp autenticato');
      this.emit('authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('Autenticazione WhatsApp fallita', { message: msg });
      this.isReady = false;
      this.emit('auth_failure', msg);
    });

    this.client.on('disconnected', (reason) => {
      logger.warn('WhatsApp disconnesso', { reason });
      this.isReady = false;
      this.updateConnectionStatus(false);
      this.emit('disconnected', reason);
    });

    // Gestione messaggi in arrivo
    this.client.on('message', async (message) => {
      await this.handleIncomingMessage(message);
    });

    try {
      await this.client.initialize();
    } catch (error) {
      logger.error('Errore inizializzazione WhatsApp', { message: error.message });
    }
  }

  // Aggiorna stato connessione nel DB
  updateConnectionStatus(connected) {
    try {
      const existing = db.prepare('SELECT id FROM whatsapp_config LIMIT 1').get();
      if (existing) {
        db.prepare(`
          UPDATE whatsapp_config 
          SET is_connected = ?, last_connected = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(connected ? 1 : 0, existing.id);
      } else {
        db.prepare(`
          INSERT INTO whatsapp_config (is_connected, last_connected) VALUES (?, CURRENT_TIMESTAMP)
        `).run(connected ? 1 : 0);
      }
    } catch (err) {
      logger.error('Errore aggiornamento stato WhatsApp', { message: err.message });
    }
  }

  // Ottieni configurazione
  getConfig() {
    try {
      let config = db.prepare('SELECT * FROM whatsapp_config LIMIT 1').get();
      if (!config) {
        db.prepare(`
          INSERT INTO whatsapp_config (timeout_risposta_minuti, timeout_chiamata_minuti, timeout_responsabile_minuti) 
          VALUES (5, 10, 15)
        `).run();
        config = db.prepare('SELECT * FROM whatsapp_config LIMIT 1').get();
      }
      return config;
    } catch (err) {
      logger.error('Errore get config WhatsApp', { message: err.message });
      return {
        timeout_risposta_minuti: 5,
        timeout_chiamata_minuti: 10,
        timeout_responsabile_minuti: 15,
        messaggio_template: 'ALLARME: {tipo_allarme} - Veicolo {targa} - {messaggio}. Rispondi OK per confermare.'
      };
    }
  }

  // Formatta numero telefono per WhatsApp (formato internazionale)
  formatPhoneNumber(phone) {
    if (!phone) return null;
    // Rimuovi spazi, trattini, parentesi
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    // Se inizia con 00, sostituisci con +
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
    }
    // Se non inizia con +, aggiungi prefisso italiano
    if (!cleaned.startsWith('+')) {
      // Se inizia con 0, rimuovilo e aggiungi +39
      if (cleaned.startsWith('0')) {
        cleaned = '+39' + cleaned.substring(1);
      } else if (cleaned.startsWith('3')) {
        // Numero mobile italiano
        cleaned = '+39' + cleaned;
      } else {
        cleaned = '+39' + cleaned;
      }
    }
    // Rimuovi il + per il formato WhatsApp
    return cleaned.replace('+', '') + '@c.us';
  }

  // Invia messaggio WhatsApp
  async sendMessage(phoneNumber, message) {
    if (!this.isReady) {
      logger.error('WhatsApp non connesso - impossibile inviare messaggio');
      return { success: false, error: 'WhatsApp non connesso' };
    }

    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    if (!formattedNumber) {
      return { success: false, error: 'Numero telefono non valido' };
    }

    try {
      const result = await this.client.sendMessage(formattedNumber, message);
      logger.whatsapp(`Messaggio inviato a ${phoneNumber}`);
      return { 
        success: true, 
        messageId: result.id._serialized,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Errore invio messaggio a ${phoneNumber}`, { message: error.message });
      return { success: false, error: error.message };
    }
  }

  // Gestione messaggi in arrivo
  async handleIncomingMessage(message) {
    const from = message.from;
    const body = message.body.trim().toUpperCase();
    const phoneNumber = from.replace('@c.us', '');

    logger.whatsapp(`Messaggio ricevuto da ${phoneNumber}: ${body}`);

    // Cerca notifiche pending per questo numero
    const pendingNotification = db.prepare(`
      SELECT an.*, d.nome as driver_nome, d.cognome as driver_cognome
      FROM alarm_notifications an
      LEFT JOIN drivers d ON an.driver_id = d.id
      WHERE an.telefono_destinatario LIKE ? 
        AND an.stato = 'sent'
        AND an.risposta_ricevuta = 0
      ORDER BY an.created_at DESC
      LIMIT 1
    `).get(`%${phoneNumber.slice(-10)}%`);

    if (pendingNotification) {
      // Verifica se è una risposta di conferma
      const confirmedResponses = ['OK', 'SI', 'SÌ', 'CONFERMO', 'RICEVUTO', 'VISTO', '👍', '✓', '✔'];
      const isConfirmed = confirmedResponses.some(r => body.includes(r));

      // Aggiorna la notifica
      db.prepare(`
        UPDATE alarm_notifications 
        SET risposta_ricevuta = 1,
            risposta_at = CURRENT_TIMESTAMP,
            risposta_testo = ?,
            stato = ?
        WHERE id = ?
      `).run(message.body, isConfirmed ? 'confirmed' : 'responded', pendingNotification.id);

      // Cancella timer escalation
      this.cancelEscalation(pendingNotification.id);

      if (isConfirmed) {
        await this.sendMessage(phoneNumber, '✅ Conferma ricevuta. Grazie!');
        logger.alarm(`Allarme confermato da ${pendingNotification.driver_nome} ${pendingNotification.driver_cognome}`);
        this.emit('alarm_confirmed', pendingNotification);
      } else {
        await this.sendMessage(phoneNumber, `📝 Risposta registrata: "${message.body}"`);
        this.emit('alarm_responded', pendingNotification, message.body);
      }
    }
  }

  // Invia notifica allarme con escalation
  async sendAlarmNotification(alarmData) {
    const {
      alarmId,
      eventId,
      vehiclePlate,
      tipoAllarme,
      messaggio,
      driverId,
      driverPhone,
      driverName
    } = alarmData;

    const config = this.getConfig();
    
    // Componi messaggio
    let template = config.messaggio_template || 'ALLARME: {tipo_allarme} - Veicolo {targa} - {messaggio}. Rispondi OK per confermare.';
    const alarmMessage = template
      .replace('{tipo_allarme}', tipoAllarme || 'Generico')
      .replace('{targa}', vehiclePlate || 'N/D')
      .replace('{messaggio}', messaggio || '');

    // Crea record notifica
    const notificationResult = db.prepare(`
      INSERT INTO alarm_notifications 
      (alarm_id, event_id, driver_id, vehicle_plate, tipo_notifica, stato, messaggio, telefono_destinatario, escalation_level)
      VALUES (?, ?, ?, ?, 'whatsapp', 'pending', ?, ?, 1)
    `).run(alarmId, eventId, driverId, vehiclePlate, alarmMessage, driverPhone);

    const notificationId = notificationResult.lastInsertRowid;

    // Invia messaggio WhatsApp
    const result = await this.sendMessage(driverPhone, alarmMessage);

    if (result.success) {
      // Aggiorna stato notifica
      const nextEscalationTime = new Date(Date.now() + config.timeout_risposta_minuti * 60 * 1000);
      
      db.prepare(`
        UPDATE alarm_notifications 
        SET stato = 'sent',
            whatsapp_message_id = ?,
            inviato_at = CURRENT_TIMESTAMP,
            next_escalation_at = ?
        WHERE id = ?
      `).run(result.messageId, nextEscalationTime.toISOString(), notificationId);

      // Imposta timer per escalation
      this.scheduleEscalation(notificationId, config.timeout_risposta_minuti * 60 * 1000, 1);

      logger.whatsapp(`Notifica allarme inviata a ${driverName} (${driverPhone})`);
      return { success: true, notificationId };
    } else {
      // Fallback: prova subito chiamata
      db.prepare(`
        UPDATE alarm_notifications SET stato = 'failed' WHERE id = ?
      `).run(notificationId);
      
      logger.error('Fallito invio notifica WhatsApp, tenta chiamata...');
      await this.escalateToCall(notificationId);
      return { success: false, error: result.error, notificationId };
    }
  }

  // Pianifica escalation
  scheduleEscalation(notificationId, delayMs, level) {
    // Cancella timer esistente
    this.cancelEscalation(notificationId);

    const timer = setTimeout(async () => {
      await this.processEscalation(notificationId, level);
    }, delayMs);

    this.escalationTimers.set(notificationId, { timer, level });
    logger.debug(`Escalation livello ${level} pianificata per notifica ${notificationId} tra ${delayMs/1000}s`);
  }

  // Cancella escalation
  cancelEscalation(notificationId) {
    const existing = this.escalationTimers.get(notificationId);
    if (existing) {
      clearTimeout(existing.timer);
      this.escalationTimers.delete(notificationId);
      logger.debug(`Escalation cancellata per notifica ${notificationId}`);
    }
  }

  // Processa escalation
  async processEscalation(notificationId, currentLevel) {
    const notification = db.prepare('SELECT * FROM alarm_notifications WHERE id = ?').get(notificationId);
    
    if (!notification || notification.risposta_ricevuta || notification.stato === 'confirmed') {
      logger.debug(`Escalation non necessaria per notifica ${notificationId}`);
      return;
    }

    const config = this.getConfig();

    if (currentLevel === 1) {
      // Livello 1 -> Livello 2: Chiamata all'autista
      logger.alarm(`Escalation livello 2: Chiamata all'autista per notifica ${notificationId}`);
      await this.escalateToCall(notificationId);
      
      // Pianifica prossima escalation (chiamata responsabile)
      this.scheduleEscalation(notificationId, config.timeout_chiamata_minuti * 60 * 1000, 2);
      
    } else if (currentLevel === 2) {
      // Livello 2 -> Livello 3: Contatta responsabile
      logger.alarm(`Escalation livello 3: Contatto responsabile per notifica ${notificationId}`);
      await this.escalateToResponsable(notificationId);
    }
  }

  // Escalation: Chiamata telefonica (simulata - WhatsApp non supporta chiamate automatiche)
  // In produzione si userebbe Twilio o simili
  async escalateToCall(notificationId) {
    const notification = db.prepare('SELECT * FROM alarm_notifications WHERE id = ?').get(notificationId);
    if (!notification) return;

    // Invia messaggio urgente WhatsApp come "chiamata"
    const urgentMessage = `🚨 URGENTE - CHIAMATA AUTOMATICA 🚨\n\n` +
      `Non hai risposto all'allarme precedente!\n\n` +
      `${notification.messaggio}\n\n` +
      `⚠️ Se non rispondi entro pochi minuti, verrà contattato il responsabile.\n\n` +
      `Rispondi OK per confermare.`;

    await this.sendMessage(notification.telefono_destinatario, urgentMessage);

    db.prepare(`
      UPDATE alarm_notifications 
      SET chiamata_effettuata = 1,
          chiamata_at = CURRENT_TIMESTAMP,
          escalation_level = 2
      WHERE id = ?
    `).run(notificationId);

    this.emit('escalation_call', notification);
  }

  // Escalation: Contatta responsabile
  async escalateToResponsable(notificationId) {
    const notification = db.prepare('SELECT * FROM alarm_notifications WHERE id = ?').get(notificationId);
    if (!notification) return;

    // Ottieni responsabili attivi ordinati per priorità
    const responsables = db.prepare(`
      SELECT * FROM responsables WHERE attivo = 1 ORDER BY priorita ASC
    `).all();

    if (responsables.length === 0) {
      logger.error('Nessun responsabile configurato per escalation!');
      return;
    }

    // Ottieni info autista
    const driver = notification.driver_id 
      ? db.prepare('SELECT * FROM drivers WHERE id = ?').get(notification.driver_id)
      : null;

    const driverInfo = driver 
      ? `${driver.nome} ${driver.cognome} (${driver.telefono})`
      : 'Autista non identificato';

    // Messaggio per il responsabile
    const responsableMessage = `🚨 ESCALATION ALLARME 🚨\n\n` +
      `L'autista NON HA RISPOSTO all'allarme!\n\n` +
      `📋 Dettagli:\n` +
      `• Veicolo: ${notification.vehicle_plate}\n` +
      `• Autista: ${driverInfo}\n` +
      `• Allarme: ${notification.messaggio}\n` +
      `• Inviato: ${notification.inviato_at}\n` +
      `• Chiamata: ${notification.chiamata_at || 'Non effettuata'}\n\n` +
      `⚠️ Richiesta azione immediata!`;

    // Invia a tutti i responsabili
    for (const resp of responsables) {
      const phone = resp.telefono_whatsapp || resp.telefono;
      await this.sendMessage(phone, responsableMessage);
      logger.whatsapp(`Notifica responsabile inviata a ${resp.nome} ${resp.cognome}`);
    }

    db.prepare(`
      UPDATE alarm_notifications 
      SET escalation_level = 3,
          stato = 'escalated_responsable'
      WHERE id = ?
    `).run(notificationId);

    this.emit('escalation_responsable', notification, responsables);
  }

  // Ottieni autista per veicolo
  getDriverForVehicle(vehiclePlate) {
    const assignment = db.prepare(`
      SELECT d.* FROM drivers d
      JOIN driver_vehicle_assignments dva ON d.id = dva.driver_id
      WHERE dva.vehicle_plate = ? 
        AND dva.attivo = 1 
        AND d.attivo = 1
        AND (dva.data_fine IS NULL OR dva.data_fine >= DATE('now'))
      ORDER BY dva.data_inizio DESC
      LIMIT 1
    `).get(vehiclePlate);

    return assignment;
  }

  // Stato connessione
  getStatus() {
    return {
      isReady: this.isReady,
      qrCode: this.qrCode,
      pendingEscalations: this.escalationTimers.size
    };
  }

  // Disconnetti
  async disconnect() {
    if (this.client) {
      // Cancella tutti i timer
      for (const [id, data] of this.escalationTimers) {
        clearTimeout(data.timer);
      }
      this.escalationTimers.clear();
      
      await this.client.destroy();
      this.isReady = false;
      logger.whatsapp('WhatsApp Bot disconnesso');
    }
  }
}

// Singleton
const whatsappService = new WhatsAppService();

export default whatsappService;
