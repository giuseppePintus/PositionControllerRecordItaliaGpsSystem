import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from './loggerService.js';

dotenv.config();

const API_BASE_URL = process.env.RECORD_ITALIA_API_URL || 'https://api.recorditalia.net';
const SECRET_KEY = process.env.RECORD_ITALIA_SECRET;

// Headers comuni per tutte le richieste
const getHeaders = () => ({
  'secret': SECRET_KEY,
  'X-Requested-With': 'XMLHttpRequest',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
});

/**
 * Retry wrapper per chiamate API
 */
async function withRetry(fn, retries = 3, delay = 5000, silent = false) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      if (!silent) {
        logger.debug(`Retry ${i + 1}/${retries} dopo ${delay}ms`, { error: error.message });
      }
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * Client per le API Record Italia GPS
 */
class RecordItaliaClient {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      timeout: 120000, // 120 secondi (2 minuti)
      headers: getHeaders()
    });

    // Cache per ridurre le chiamate API
    this.fleetCache = null;
    this.fleetCacheTime = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minuti
  }

  /**
   * Ottiene la lista delle flotte disponibili
   * @returns {Promise<Array>} Lista delle flotte
   */
  async getFleets() {
    try {
      // Check cache
      if (this.fleetCache && this.fleetCacheTime && 
          (Date.now() - this.fleetCacheTime) < this.CACHE_TTL) {
        return this.fleetCache;
      }

      const response = await withRetry(() => this.axios.get('/owner/flotta'), 3, 2000, true);
      
      // La risposta è un array con un oggetto che contiene 'flotta'
      if (response.data && Array.isArray(response.data) && response.data[0]?.flotta) {
        this.fleetCache = response.data[0].flotta;
        this.fleetCacheTime = Date.now();
        logger.api(`Trovate ${this.fleetCache.length} flotte`);
        return this.fleetCache;
      }
      
      // Fallback per altre strutture
      if (response.data?.flotta) {
        this.fleetCache = response.data.flotta;
        this.fleetCacheTime = Date.now();
        return response.data.flotta;
      }
      
      logger.warn('Nessuna flotta trovata nella risposta');
      return [];
    } catch (error) {
      logger.error('Errore nel recupero flotte', { code: error.code, status: error.response?.status, message: error.message });
      throw new Error(`Errore API RecordItalia: ${error.code || error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Ottiene le posizioni di tutti i veicoli di una flotta
   * @param {number} idFlotta - ID della flotta
   * @returns {Promise<Array>} Lista delle posizioni
   */
  async getFleetPositions(idFlotta) {
    try {
      const response = await withRetry(() => this.axios.post(`/owner/posizione/flotta/${idFlotta}`), 3, 2000, true);
      
      if (response.data) {
        // L'API restituisce un array di servizi con le loro posizioni
        const positions = Array.isArray(response.data) ? response.data : [response.data];
        logger.api(`Flotta ${idFlotta}: ${positions.length} veicoli`);
        return positions;
      }
      
      return [];
    } catch (error) {
      logger.error(`Errore nel recupero posizioni flotta ${idFlotta}`, { code: error.code, message: error.message });
      throw new Error(`Errore API RecordItalia: ${error.code || error.message}`);
    }
  }

  /**
   * Ottiene la posizione dettagliata di un singolo servizio/veicolo
   * @param {number} idServizio - ID del servizio
   * @returns {Promise<Object>} Dati posizione
   */
  async getServicePosition(idServizio) {
    try {
      const response = await withRetry(() => this.axios.post(`/owner/posizione/servizio/${idServizio}`), 3, 2000, true);
      return response.data;
    } catch (error) {
      logger.error(`Errore nel recupero posizione servizio ${idServizio}`, { code: error.code, message: error.message });
      throw new Error(`Errore API RecordItalia: ${error.code || error.message}`);
    }
  }

  /**
   * Ottiene lo storico delle posizioni di un servizio
   * @param {number} idServizio - ID del servizio
   * @param {string} fromDate - Data inizio (YYYY-MM-DD HH:mm:ss)
   * @param {string} toDate - Data fine (YYYY-MM-DD HH:mm:ss)
   * @returns {Promise<Array>} Storico posizioni
   */
  async getServiceHistory(idServizio, fromDate, toDate) {
    try {
      const response = await this.axios.post(`/owner/storico/${idServizio}`, {
        TimeZoneAdjustment: 0,
        FromDate: fromDate,
        ToDate: toDate
      });
      
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      logger.error(`Errore nel recupero storico servizio ${idServizio}`, { message: error.message });
      throw new Error(`Errore API RecordItalia: ${error.message}`);
    }
  }

  /**
   * Ottiene tutte le posizioni di tutti i veicoli in tutte le flotte
   * @returns {Promise<Array>} Lista completa delle posizioni
   */
  async getAllPositions() {
    try {
      const fleets = await this.getFleets();
      const allPositions = [];

      for (const fleet of fleets) {
        try {
          const positions = await this.getFleetPositions(fleet.id);
          allPositions.push(...positions.map(pos => ({
            ...pos,
            fleetId: fleet.id,
            fleetName: fleet.nome
          })));
        } catch (err) {
          logger.error(`Errore flotta ${fleet.id}`, { message: err.message });
        }
      }

      return allPositions;
    } catch (error) {
      logger.error('Errore nel recupero di tutte le posizioni', { message: error.message });
      throw error;
    }
  }

  /**
   * Verifica la connessione alle API
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const fleets = await this.getFleets();
      return fleets.length >= 0;
    } catch (error) {
      logger.error('Test connessione fallito', { message: error.message });
      return false;
    }
  }
}

// Esporta istanza singleton
export const recordItaliaClient = new RecordItaliaClient();
export default RecordItaliaClient;
