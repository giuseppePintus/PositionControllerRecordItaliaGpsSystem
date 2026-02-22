import { Telegraf } from 'telegraf';
import webpush from 'web-push';
import db from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Import dinamico per evitare dipendenze circolari
let whatsappService = null;
const getWhatsAppService = async () => {
  if (!whatsappService) {
    const module = await import('./whatsappService.js');
    whatsappService = module.default;
  }
  return whatsappService;
};

/**
 * Servizio per le notifiche - Telegram e Push
 */
class NotificationService {
  constructor() {
    this.telegramBot = null;
    this.webPushConfigured = false;
    
    this.initTelegram();
    this.initWebPush();
  }

  /**
   * Inizializza il bot Telegram
   */
  initTelegram() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token || token === 'your_telegram_bot_token') {
      console.log('⚠️ Telegram Bot non configurato. Aggiungi TELEGRAM_BOT_TOKEN in .env');
      return;
    }

    try {
      this.telegramBot = new Telegraf(token);
      
      // Comandi del bot
      this.telegramBot.command('start', (ctx) => {
        const chatId = ctx.chat.id;
        ctx.reply(
          `🚛 Benvenuto nel sistema GPS Tracker!\n\n` +
          `Il tuo Chat ID è: ${chatId}\n\n` +
          `Usa questo ID nella configurazione dell'app per ricevere notifiche.\n\n` +
          `Comandi disponibili:\n` +
          `/status - Stato dei veicoli\n` +
          `/help - Mostra aiuto`
        );
      });

      this.telegramBot.command('help', (ctx) => {
        ctx.reply(
          `📋 Comandi disponibili:\n\n` +
          `/start - Inizia e ottieni il tuo Chat ID\n` +
          `/status - Stato attuale dei veicoli\n` +
          `/help - Mostra questo messaggio`
        );
      });

      this.telegramBot.command('status', async (ctx) => {
        try {
          // Get vehicles from SQLite
          const vehicles = db.prepare(`
            SELECT * FROM vehicles WHERE attivo = 1
          `).all();

          if (vehicles.length === 0) {
            ctx.reply('Nessun veicolo configurato.');
            return;
          }

          // Get positions from SQL
          const { getAllLatestPositions } = await import('../database/positionsDb.js');
          const positions = getAllLatestPositions();
          const positionsByPlate = new Map();
          positions.forEach(p => {
            const plate = (p.targa || '').toUpperCase().replace(/\*+$/, '');
            if (plate) positionsByPlate.set(plate, p);
          });

          let message = '🚛 *Stato Veicoli*\n\n';
          
          for (const v of vehicles) {
            const plate = (v.targa_camion || '').toUpperCase().replace(/\*+$/, '');
            const pos = positionsByPlate.get(plate);
            
            const speed = pos?.posizione?.speed || 0;
            const status = speed > 0 ? '🟢 In movimento' : '🔴 Fermo';
            message += `*${v.nickname || v.targa_camion}*\n`;
            message += `${status} - ${speed} km/h\n`;
            if (pos?.posizione?.fixGps) {
              message += `📍 Ultimo aggiornamento: ${new Date(pos.posizione.fixGps).toLocaleString('it-IT')}\n`;
            }
            message += '\n';
          }

          ctx.replyWithMarkdown(message);
        } catch (error) {
          console.error('Errore comando status:', error);
          ctx.reply('Errore nel recupero dello stato.');
        }
      });

      // Avvia il bot
      this.telegramBot.launch().then(() => {
        console.log('✅ Telegram Bot avviato');
      }).catch(err => {
        console.error('❌ Errore avvio Telegram Bot:', err.message);
      });

      // Gestione chiusura
      process.once('SIGINT', () => this.telegramBot?.stop('SIGINT'));
      process.once('SIGTERM', () => this.telegramBot?.stop('SIGTERM'));

    } catch (error) {
      console.error('❌ Errore inizializzazione Telegram:', error.message);
    }
  }

  /**
   * Inizializza Web Push
   */
  initWebPush() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL;

    if (!publicKey || !privateKey || publicKey === 'your_vapid_public_key') {
      console.log('⚠️ Web Push non configurato. Genera le chiavi VAPID.');
      return;
    }

    try {
      webpush.setVapidDetails(email, publicKey, privateKey);
      this.webPushConfigured = true;
      console.log('✅ Web Push configurato');
    } catch (error) {
      console.error('❌ Errore configurazione Web Push:', error.message);
    }
  }

  /**
   * Invia notifica Telegram
   * @param {string} message - Messaggio da inviare
   * @param {string} chatId - Chat ID (opzionale, usa default)
   * @param {Object} options - Opzioni aggiuntive
   */
  async sendTelegram(message, chatId = null, options = {}) {
    if (!this.telegramBot) {
      console.log('Telegram non configurato, notifica non inviata:', message);
      return false;
    }

    const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;
    
    if (!targetChatId) {
      console.log('Chat ID Telegram non configurato');
      return false;
    }

    try {
      await this.telegramBot.telegram.sendMessage(targetChatId, message, {
        parse_mode: 'Markdown',
        ...options
      });
      console.log('✅ Notifica Telegram inviata');
      return true;
    } catch (error) {
      console.error('❌ Errore invio Telegram:', error.message);
      return false;
    }
  }

  /**
   * Invia notifica Telegram con posizione
   * @param {string} message - Messaggio
   * @param {number} latitude - Latitudine
   * @param {number} longitude - Longitudine
   * @param {string} chatId - Chat ID
   */
  async sendTelegramWithLocation(message, latitude, longitude, chatId = null) {
    if (!this.telegramBot) return false;

    const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;
    if (!targetChatId) return false;

    try {
      // Invia messaggio
      await this.telegramBot.telegram.sendMessage(targetChatId, message, {
        parse_mode: 'Markdown'
      });
      
      // Invia posizione
      await this.telegramBot.telegram.sendLocation(targetChatId, latitude, longitude);
      
      return true;
    } catch (error) {
      console.error('❌ Errore invio Telegram con location:', error.message);
      return false;
    }
  }

  /**
   * Invia notifica Push a tutti i subscriber
   * @param {Object} payload - {title, body, icon, data}
   */
  async sendPushToAll(payload) {
    if (!this.webPushConfigured) {
      console.log('Web Push non configurato');
      return;
    }

    try {
      const subscriptions = db.prepare('SELECT * FROM push_subscriptions').all();
      
      const notificationPayload = JSON.stringify({
        title: payload.title || 'GPS Tracker Alert',
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: '/badge-72.png',
        data: payload.data || {}
      });

      const results = await Promise.allSettled(
        subscriptions.map(sub => {
          const subscription = {
            endpoint: sub.endpoint,
            keys: JSON.parse(sub.keys)
          };
          return webpush.sendNotification(subscription, notificationPayload);
        })
      );

      // Rimuovi subscription non valide
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const sub = subscriptions[index];
          if (result.reason.statusCode === 410 || result.reason.statusCode === 404) {
            db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
            console.log('Rimossa subscription non valida:', sub.id);
          }
        }
      });

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Push inviate: ${successCount}/${subscriptions.length}`);
      
    } catch (error) {
      console.error('❌ Errore invio Push:', error.message);
    }
  }

  /**
   * Invia notifica per evento veicolo
   * @param {string} type - Tipo evento (enter, exit, late, early, stopped, moving)
   * @param {Object} vehicle - Dati veicolo
   * @param {Object} geofence - Dati geofence (opzionale)
   * @param {Object} alarm - Dati allarme
   */
  async sendVehicleNotification(type, vehicle, geofence = null, alarm = null) {
    let message = '';
    let emoji = '';
    
    const vehicleName = vehicle.nickname || vehicle.targa_camion || `ID:${vehicle.id}`;
    const time = new Date().toLocaleString('it-IT');

    switch (type) {
      case 'enter':
        emoji = '📍';
        message = `${emoji} *INGRESSO ZONA*\n\n` +
          `Veicolo: *${vehicleName}*\n` +
          `Zona: *${geofence?.nome || 'N/A'}*\n` +
          `Ora: ${time}`;
        break;
        
      case 'exit':
        emoji = '🚪';
        message = `${emoji} *USCITA ZONA*\n\n` +
          `Veicolo: *${vehicleName}*\n` +
          `Zona: *${geofence?.nome || 'N/A'}*\n` +
          `Ora: ${time}`;
        break;
        
      case 'late':
        emoji = '⏰';
        message = `${emoji} *RITARDO*\n\n` +
          `Veicolo: *${vehicleName}*\n` +
          `${alarm?.messaggio || 'Il veicolo è in ritardo'}\n` +
          `Ora: ${time}`;
        break;
        
      case 'early':
        emoji = '⚡';
        message = `${emoji} *ANTICIPO*\n\n` +
          `Veicolo: *${vehicleName}*\n` +
          `${alarm?.messaggio || 'Il veicolo è in anticipo'}\n` +
          `Ora: ${time}`;
        break;
        
      case 'stopped':
        emoji = '🛑';
        message = `${emoji} *VEICOLO FERMO*\n\n` +
          `Veicolo: *${vehicleName}*\n` +
          `${geofence ? `Zona: *${geofence.nome}*\n` : ''}` +
          `Ora: ${time}`;
        break;
        
      case 'moving':
        emoji = '🚛';
        message = `${emoji} *VEICOLO IN MOVIMENTO*\n\n` +
          `Veicolo: *${vehicleName}*\n` +
          `Ora: ${time}`;
        break;
        
      case 'not_departed':
        emoji = '⚠️';
        message = `${emoji} *MANCATA PARTENZA*\n\n` +
          `Veicolo: *${vehicleName}*\n` +
          `Il veicolo non è partito all'orario previsto\n` +
          `Ora: ${time}`;
        break;
        
      case 'not_arrived':
        emoji = '🚨';
        message = `${emoji} *MANCATO ARRIVO*\n\n` +
          `Veicolo: *${vehicleName}*\n` +
          `Il veicolo non è arrivato all'orario previsto\n` +
          `${geofence ? `Destinazione: *${geofence.nome}*\n` : ''}` +
          `Ora: ${time}`;
        break;
        
      default:
        emoji = '📢';
        message = `${emoji} *NOTIFICA*\n\n` +
          `Veicolo: *${vehicleName}*\n` +
          `Tipo: ${type}\n` +
          `Ora: ${time}`;
    }

    // Invia notifiche in base alla configurazione dell'allarme
    const promises = [];

    if (!alarm || alarm.notifica_telegram) {
      if (vehicle.latitudine && vehicle.longitudine) {
        promises.push(this.sendTelegramWithLocation(message, vehicle.latitudine, vehicle.longitudine));
      } else {
        promises.push(this.sendTelegram(message));
      }
    }

    if (!alarm || alarm.notifica_push) {
      promises.push(this.sendPushToAll({
        title: `${emoji} GPS Alert`,
        body: message.replace(/\*/g, '').replace(/\n/g, ' '),
        data: { type, vehicleId: vehicle.id, geofenceId: geofence?.id }
      }));
    }

    // Notifica WhatsApp all'autista assegnato (con sistema di escalation)
    if (!alarm || alarm.notifica_whatsapp !== false) {
      promises.push(this.sendWhatsAppNotification(type, vehicle, geofence, alarm, message));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Invia notifica WhatsApp all'autista con escalation
   * @param {string} type - Tipo evento
   * @param {Object} vehicle - Dati veicolo
   * @param {Object} geofence - Dati geofence
   * @param {Object} alarm - Dati allarme
   * @param {string} formattedMessage - Messaggio già formattato
   */
  async sendWhatsAppNotification(type, vehicle, geofence = null, alarm = null, formattedMessage = '') {
    try {
      const wsService = await getWhatsAppService();
      
      if (!wsService || !wsService.isReady()) {
        console.log('📱 WhatsApp non connesso, notifica saltata');
        return { success: false, reason: 'WhatsApp non connesso' };
      }

      // Trova autista assegnato al veicolo
      const targa = vehicle.targa_camion || vehicle.targa;
      if (!targa) {
        console.log('📱 Targa veicolo non trovata, notifica WhatsApp saltata');
        return { success: false, reason: 'Targa veicolo non trovata' };
      }

      const driver = wsService.getDriverForVehicle(targa);
      if (!driver) {
        console.log(`📱 Nessun autista assegnato a ${targa}, notifica WhatsApp saltata`);
        return { success: false, reason: 'Nessun autista assegnato' };
      }

      // Pulisci il messaggio per WhatsApp (rimuovi Markdown)
      const cleanMessage = formattedMessage
        .replace(/\*/g, '*') // Mantieni asterischi per bold WhatsApp
        .trim();

      // Crea evento alarm_notification per tracking e escalation
      const result = await wsService.sendAlarmNotification({
        alarmId: alarm?.id || null,
        eventId: null, // Potrebbe essere passato come parametro
        vehiclePlate: targa,
        tipoAllarme: type,
        messaggio: cleanMessage,
        driverId: driver.id,
        driverPhone: driver.telefono_whatsapp || driver.telefono,
        driverName: `${driver.nome} ${driver.cognome}`
      });

      return result;
    } catch (error) {
      console.error('❌ Errore invio WhatsApp:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Salva subscription Push
   * @param {Object} subscription - Subscription object dal browser
   * @param {string} userAgent - User agent del browser
   */
  saveSubscription(subscription, userAgent = '') {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO push_subscriptions (endpoint, keys, user_agent)
        VALUES (?, ?, ?)
      `).run(subscription.endpoint, JSON.stringify(subscription.keys), userAgent);
      return true;
    } catch (error) {
      console.error('Errore salvataggio subscription:', error.message);
      return false;
    }
  }

  /**
   * Rimuove subscription Push
   * @param {string} endpoint - Endpoint della subscription
   */
  removeSubscription(endpoint) {
    try {
      db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
      return true;
    } catch (error) {
      console.error('Errore rimozione subscription:', error.message);
      return false;
    }
  }

  /**
   * Invia notifica per evento tratta
   * @param {string} type - Tipo evento (arrival, delay)
   * @param {Object} route - Dati tratta
   * @param {Object} destination - Dati destinazione
   * @param {Object} position - Posizione corrente {latitude, longitude}
   */
  async sendRouteNotification(type, route, destination, position) {
    let message = '';
    let emoji = '';
    
    const vehiclePlate = route.vehicle_plate || 'N/A';
    const time = new Date().toLocaleString('it-IT');

    switch (type) {
      case 'arrival':
        emoji = '🎯';
        message = `${emoji} *ARRIVO DESTINAZIONE*\n\n` +
          `Veicolo: *${vehiclePlate}*\n` +
          `Tratta: *${route.nome}*\n` +
          `Tappa: *${destination.nome}*\n` +
          `📍 ${destination.indirizzo || ''}\n\n` +
          `Ora arrivo: ${time}`;
        break;
        
      case 'delay':
        emoji = '⚠️';
        message = `${emoji} *RITARDO TRATTA*\n\n` +
          `Veicolo: *${vehiclePlate}*\n` +
          `Tratta: *${route.nome}*\n` +
          `Tappa mancata: *${destination.nome}*\n` +
          `Arrivo previsto: ${destination.ora_arrivo_prevista}\n` +
          `📍 ${destination.indirizzo || ''}\n\n` +
          `Ora attuale: ${time}`;
        break;
        
      default:
        emoji = '📍';
        message = `${emoji} *NOTIFICA TRATTA*\n\n` +
          `Veicolo: *${vehiclePlate}*\n` +
          `Tratta: *${route.nome}*\n` +
          `Evento: ${type}\n` +
          `Ora: ${time}`;
    }

    const promises = [];

    // Telegram
    if (position.latitude && position.longitude) {
      promises.push(this.sendTelegramWithLocation(message, position.latitude, position.longitude));
    } else {
      promises.push(this.sendTelegram(message));
    }

    // Push
    promises.push(this.sendPushToAll({
      title: `${emoji} Tratta: ${route.nome}`,
      body: message.replace(/\*/g, '').replace(/\n/g, ' '),
      data: { 
        type: 'route_' + type, 
        routeId: route.id, 
        destinationId: destination.id,
        latitude: position.latitude,
        longitude: position.longitude
      }
    }));

    await Promise.allSettled(promises);
  }
}

export const notificationService = new NotificationService();
export default NotificationService;
