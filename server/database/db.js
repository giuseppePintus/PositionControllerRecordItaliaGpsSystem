import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'gps_system.db');

// Assicurati che la cartella data esista
import fs from 'fs';
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Inizializza le tabelle
export function initDatabase() {
  // Tabella veicoli (camion + rimorchio) con dimensioni
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_servizio INTEGER UNIQUE,
      nickname TEXT,
      targa_camion TEXT,
      targa_rimorchio TEXT,
      modello TEXT,
      brand TEXT,
      -- Dimensioni veicolo (in metri/tonnellate)
      lunghezza REAL DEFAULT 16.5,
      larghezza REAL DEFAULT 2.55,
      altezza REAL DEFAULT 4.0,
      peso_totale REAL DEFAULT 44.0,
      peso_per_asse REAL DEFAULT 11.5,
      tipo_veicolo TEXT DEFAULT 'trattore_semirimorchio',
      -- Flags speciali
      is_compatto INTEGER DEFAULT 0,
      note_dimensioni TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella geofence (zone)
  db.exec(`
    CREATE TABLE IF NOT EXISTS geofences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descrizione TEXT,
      tipo TEXT DEFAULT 'polygon',
      colore TEXT DEFAULT '#FF0000',
      coordinate TEXT NOT NULL,
      raggio_metri INTEGER DEFAULT 0,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella tratte (percorsi con punti di controllo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descrizione TEXT,
      vehicle_plate TEXT,
      tipo TEXT DEFAULT 'adhoc',
      data_viaggio DATE,
      giorni_settimana TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella checkpoints tratta
  db.exec(`
    CREATE TABLE IF NOT EXISTS route_checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      geofence_id INTEGER,
      ordine INTEGER NOT NULL DEFAULT 0,
      ora_prevista_arrivo TIME,
      ora_prevista_partenza TIME,
      tolleranza_minuti INTEGER DEFAULT 30,
      notifica_ingresso INTEGER DEFAULT 1,
      notifica_uscita INTEGER DEFAULT 1,
      notifica_ritardo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
      FOREIGN KEY (geofence_id) REFERENCES geofences(id)
    )
  `);

  // Tabella destinazioni tratta (waypoints)
  db.exec(`
    CREATE TABLE IF NOT EXISTS route_destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      ordine INTEGER NOT NULL,
      nome TEXT NOT NULL,
      indirizzo TEXT,
      latitudine REAL NOT NULL,
      longitudine REAL NOT NULL,
      raggio_metri INTEGER DEFAULT 500,
      ora_partenza_prevista TIME,
      ora_arrivo_prevista TIME,
      allarme_attivo INTEGER DEFAULT 1,
      minuti_preavviso INTEGER DEFAULT 30,
      notifica_arrivo INTEGER DEFAULT 1,
      notifica_partenza INTEGER DEFAULT 1,
      arrivato INTEGER DEFAULT 0,
      partito INTEGER DEFAULT 0,
      ora_arrivo_effettivo DATETIME,
      ora_partenza_effettivo DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
    )
  `);

  // Tabella tappe predefinite (luoghi salvati con nomi custom)
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      indirizzo TEXT,
      latitudine REAL NOT NULL,
      longitudine REAL NOT NULL,
      raggio_metri INTEGER DEFAULT 500,
      categoria TEXT,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella allarmi configurati
  db.exec(`
    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL,
      vehicle_id INTEGER,
      geofence_id INTEGER,
      route_id INTEGER,
      checkpoint_id INTEGER,
      ora_inizio TIME,
      ora_fine TIME,
      giorni_settimana TEXT DEFAULT '1,2,3,4,5,6,7',
      notifica_telegram INTEGER DEFAULT 1,
      notifica_push INTEGER DEFAULT 1,
      notifica_chiamata INTEGER DEFAULT 0,
      attivo INTEGER DEFAULT 1,
      priorita INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (geofence_id) REFERENCES geofences(id),
      FOREIGN KEY (route_id) REFERENCES routes(id),
      FOREIGN KEY (checkpoint_id) REFERENCES route_checkpoints(id)
    )
  `);

  // Tabella eventi/log
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER,
      alarm_id INTEGER,
      tipo TEXT NOT NULL,
      messaggio TEXT,
      latitudine REAL,
      longitudine REAL,
      geofence_id INTEGER,
      notificato INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (alarm_id) REFERENCES alarms(id),
      FOREIGN KEY (geofence_id) REFERENCES geofences(id)
    )
  `);

  // NOTE: vehicle_positions table is defined later in the file with full schema for API cache

  // Tabella sottoscrizioni push
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT UNIQUE NOT NULL,
      keys TEXT NOT NULL,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella utenti
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      telegram_chat_id TEXT,
      ruolo TEXT DEFAULT 'viewer',
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella stato geofence per veicoli (traccia se è dentro o fuori)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicle_geofence_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      geofence_id INTEGER NOT NULL,
      inside INTEGER DEFAULT 0,
      last_change DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(vehicle_id, geofence_id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (geofence_id) REFERENCES geofences(id)
    )
  `);

  // ==================== NUOVA ARCHITETTURA TRATTE/VIAGGI ====================

  // Template percorsi (percorsi tipo riutilizzabili)
  db.exec(`
    CREATE TABLE IF NOT EXISTS route_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descrizione TEXT,
      distanza_km REAL,
      durata_minuti INTEGER,
      polyline TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tappe dei template (waypoints)
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      ordine INTEGER NOT NULL,
      nome TEXT NOT NULL,
      indirizzo TEXT,
      latitudine REAL NOT NULL,
      longitudine REAL NOT NULL,
      place_id TEXT,
      raggio_arrivo_metri INTEGER DEFAULT 500,
      tempo_sosta_minuti INTEGER DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES route_templates(id) ON DELETE CASCADE
    )
  `);

  // Viaggi concreti (istanze su calendario)
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER,
      nome TEXT NOT NULL,
      descrizione TEXT,
      data_viaggio DATE NOT NULL,
      ora_partenza TIME,
      targa_motrice TEXT,
      targa_rimorchio TEXT,
      autista TEXT,
      stato TEXT DEFAULT 'pianificato',
      distanza_km REAL,
      durata_minuti INTEGER,
      polyline TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES route_templates(id) ON DELETE SET NULL
    )
  `);

  // Tappe del viaggio (copia da template o create ad-hoc)
  db.exec(`
    CREATE TABLE IF NOT EXISTS trip_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      ordine INTEGER NOT NULL,
      nome TEXT NOT NULL,
      indirizzo TEXT,
      latitudine REAL NOT NULL,
      longitudine REAL NOT NULL,
      place_id TEXT,
      raggio_arrivo_metri INTEGER DEFAULT 500,
      -- Orari pianificati
      ora_arrivo_prevista TIME,
      ora_partenza_prevista TIME,
      tempo_sosta_minuti INTEGER DEFAULT 30,
      -- Orari effettivi (monitoraggio)
      ora_arrivo_effettiva DATETIME,
      ora_partenza_effettiva DATETIME,
      -- Stato
      stato TEXT DEFAULT 'da_raggiungere',
      notifica_arrivo INTEGER DEFAULT 1,
      notifica_partenza INTEGER DEFAULT 1,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    )
  `);

  // Tabella autisti con numeri di telefono
  db.exec(`
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cognome TEXT NOT NULL,
      telefono TEXT NOT NULL,
      telefono_whatsapp TEXT,
      email TEXT,
      codice_fiscale TEXT,
      patente_numero TEXT,
      patente_scadenza DATE,
      cqc_scadenza DATE,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella associazione autista-veicolo (un autista può guidare più veicoli)
  db.exec(`
    CREATE TABLE IF NOT EXISTS driver_vehicle_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      vehicle_plate TEXT NOT NULL,
      data_inizio DATE DEFAULT CURRENT_DATE,
      data_fine DATE,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
    )
  `);

  // Tabella responsabili (per escalation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS responsables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cognome TEXT NOT NULL,
      telefono TEXT NOT NULL,
      telefono_whatsapp TEXT,
      email TEXT,
      ruolo TEXT DEFAULT 'responsabile',
      priorita INTEGER DEFAULT 1,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella notifiche allarme (per tracciare lo stato di escalation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS alarm_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alarm_id INTEGER,
      event_id INTEGER,
      driver_id INTEGER,
      vehicle_plate TEXT,
      tipo_notifica TEXT NOT NULL,
      stato TEXT DEFAULT 'pending',
      messaggio TEXT,
      telefono_destinatario TEXT,
      whatsapp_message_id TEXT,
      inviato_at DATETIME,
      risposta_ricevuta INTEGER DEFAULT 0,
      risposta_at DATETIME,
      risposta_testo TEXT,
      chiamata_effettuata INTEGER DEFAULT 0,
      chiamata_at DATETIME,
      escalation_level INTEGER DEFAULT 1,
      next_escalation_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (alarm_id) REFERENCES alarms(id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    )
  `);

  // Tabella configurazione WhatsApp
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_data TEXT,
      is_connected INTEGER DEFAULT 0,
      last_connected DATETIME,
      timeout_risposta_minuti INTEGER DEFAULT 5,
      timeout_chiamata_minuti INTEGER DEFAULT 10,
      timeout_responsabile_minuti INTEGER DEFAULT 15,
      messaggio_template TEXT DEFAULT 'ALLARME: {tipo_allarme} - Veicolo {targa} - {messaggio}. Rispondi OK per confermare.',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabella posizioni veicoli (cache locale delle posizioni da Record Italia)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicle_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_servizio INTEGER UNIQUE NOT NULL,
      targa TEXT,
      nickname TEXT,
      fleet_id INTEGER,
      fleet_name TEXT,
      latitude REAL,
      longitude REAL,
      speed REAL DEFAULT 0,
      heading INTEGER DEFAULT 0,
      altitude REAL,
      fix_gps DATETIME,
      address TEXT,
      km_totali REAL DEFAULT 0,
      brand TEXT,
      modello TEXT,
      tipologia TEXT,
      sonde_count INTEGER DEFAULT 0,
      temperature1 REAL,
      temperature2 REAL,
      frigo_on INTEGER DEFAULT 0,
      door_open INTEGER DEFAULT 0,
      inputs_json TEXT,
      analogs_json TEXT,
      raw_data TEXT,
      last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ==================== GESTIONALE - ANAGRAFICHE ====================

  // Clienti
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_clienti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ragione_sociale TEXT NOT NULL,
      partita_iva TEXT,
      codice_fiscale TEXT,
      indirizzo TEXT,
      citta TEXT,
      cap TEXT,
      provincia TEXT,
      telefono TEXT,
      email TEXT,
      pec TEXT,
      codice_destinatario TEXT,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Vettori
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_vettori (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ragione_sociale TEXT NOT NULL,
      tipo_vettore TEXT DEFAULT 'Nazionale',
      partita_iva TEXT,
      codice_fiscale TEXT,
      indirizzo TEXT,
      citta TEXT,
      cap TEXT,
      provincia TEXT,
      telefono TEXT,
      email TEXT,
      pec TEXT,
      iban TEXT,
      codice_destinatario TEXT,
      referente TEXT,
      telefono_referente TEXT,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Mittenti/Destinatari
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_mittenti_destinatari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ragione_sociale TEXT NOT NULL,
      tipo TEXT DEFAULT 'destinatario',
      indirizzo TEXT,
      citta TEXT,
      cap TEXT,
      provincia TEXT,
      nazione TEXT DEFAULT 'IT',
      telefono TEXT,
      email TEXT,
      riferimento TEXT,
      orari_apertura TEXT,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Piattaforme Logistiche
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_piattaforme (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codice TEXT,
      indirizzo TEXT,
      citta TEXT,
      cap TEXT,
      provincia TEXT,
      telefono TEXT,
      email TEXT,
      responsabile TEXT,
      orari_apertura TEXT,
      costo_accesso REAL DEFAULT 0,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Magazzino
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_magazzino (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codice TEXT,
      descrizione TEXT NOT NULL,
      categoria TEXT,
      unita_misura TEXT DEFAULT 'PZ',
      quantita REAL DEFAULT 0,
      prezzo_unitario REAL DEFAULT 0,
      fornitore TEXT,
      ubicazione TEXT,
      scorta_minima REAL DEFAULT 0,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tipi Veicoli
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_tipi_veicoli (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codice TEXT,
      categoria TEXT DEFAULT 'motrice',
      lunghezza REAL,
      larghezza REAL,
      altezza REAL,
      peso_max REAL,
      volume_max REAL,
      assi INTEGER DEFAULT 2,
      euro_class TEXT,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Autisti (gestionale)
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_autisti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cognome TEXT NOT NULL,
      codice_fiscale TEXT,
      data_nascita DATE,
      telefono TEXT,
      email TEXT,
      patente_tipo TEXT,
      patente_numero TEXT,
      patente_scadenza DATE,
      cqc_numero TEXT,
      cqc_scadenza DATE,
      carta_conducente TEXT,
      carta_scadenza DATE,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Officine
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_officine (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ragione_sociale TEXT NOT NULL,
      tipo TEXT DEFAULT 'meccanica',
      indirizzo TEXT,
      citta TEXT,
      cap TEXT,
      provincia TEXT,
      telefono TEXT,
      email TEXT,
      referente TEXT,
      orari_apertura TEXT,
      specializzazioni TEXT,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tipi Documenti
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_tipi_documenti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codice TEXT,
      categoria TEXT DEFAULT 'altro',
      descrizione TEXT,
      obbligatorio INTEGER DEFAULT 0,
      scadenza_prevista INTEGER DEFAULT 0,
      giorni_preavviso INTEGER DEFAULT 30,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Impostazioni Utente
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 0,
      setting_key TEXT NOT NULL,
      setting_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, setting_key)
    )
  `);

  // Migrations - aggiungi colonne mancanti se non esistono
  try {
    // Aggiungi vehicle_plate alla tabella routes se non esiste
    const routeColumns = db.prepare("PRAGMA table_info(routes)").all();
    const hasVehiclePlate = routeColumns.some(c => c.name === 'vehicle_plate');
    if (!hasVehiclePlate) {
      db.exec('ALTER TABLE routes ADD COLUMN vehicle_plate TEXT');
      console.log('Migration: aggiunta colonna vehicle_plate a routes');
    }

    // Aggiungi colonne a route_templates se non esistono
    const templateColumns = db.prepare("PRAGMA table_info(route_templates)").all();
    const templateColNames = templateColumns.map(c => c.name);
    
    const templateCols = [
      { name: 'colore', sql: "ALTER TABLE route_templates ADD COLUMN colore TEXT DEFAULT '#3B82F6'" },
      { name: 'giorni_settimana', sql: "ALTER TABLE route_templates ADD COLUMN giorni_settimana TEXT DEFAULT '[]'" },
    ];

    for (const col of templateCols) {
      if (!templateColNames.includes(col.name)) {
        db.exec(col.sql);
        console.log('Migration: aggiunta colonna ' + col.name + ' a route_templates');
      }
    }

    // Aggiungi colonne dimensioni veicoli se non esistono
    const vehicleColumns = db.prepare("PRAGMA table_info(vehicles)").all();
    const vehicleColNames = vehicleColumns.map(c => c.name);
    
    const dimensionCols = [
      { name: 'lunghezza', sql: 'ALTER TABLE vehicles ADD COLUMN lunghezza REAL DEFAULT 16.5' },
      { name: 'larghezza', sql: 'ALTER TABLE vehicles ADD COLUMN larghezza REAL DEFAULT 2.55' },
      { name: 'altezza', sql: 'ALTER TABLE vehicles ADD COLUMN altezza REAL DEFAULT 4.0' },
      { name: 'peso_totale', sql: 'ALTER TABLE vehicles ADD COLUMN peso_totale REAL DEFAULT 44.0' },
      { name: 'peso_per_asse', sql: 'ALTER TABLE vehicles ADD COLUMN peso_per_asse REAL DEFAULT 11.5' },
      { name: 'tipo_veicolo', sql: "ALTER TABLE vehicles ADD COLUMN tipo_veicolo TEXT DEFAULT 'trattore_semirimorchio'" },
      { name: 'is_compatto', sql: 'ALTER TABLE vehicles ADD COLUMN is_compatto INTEGER DEFAULT 0' },
      { name: 'note_dimensioni', sql: 'ALTER TABLE vehicles ADD COLUMN note_dimensioni TEXT' },
    ];

    for (const col of dimensionCols) {
      if (!vehicleColNames.includes(col.name)) {
        db.exec(col.sql);
        console.log('Migration: aggiunta colonna ' + col.name + ' a vehicles');
      }
    }

    // Imposta veicoli compatti (GT736ms e XA330pl)
    db.prepare(`
      UPDATE vehicles SET is_compatto = 1, lunghezza = 12.0, altezza = 3.5
      WHERE targa_camion IN ('GT736MS', 'GT736ms') OR targa_rimorchio IN ('XA330PL', 'XA330pl')
    `).run();

    // Migration: aggiungi colonna codice_destinatario a gest_vettori se non esiste
    const vettoriColumns = db.prepare("PRAGMA table_info(gest_vettori)").all();
    const vettoriColNames = vettoriColumns.map(c => c.name);
    if (!vettoriColNames.includes('codice_destinatario')) {
      db.exec('ALTER TABLE gest_vettori ADD COLUMN codice_destinatario TEXT');
      console.log('Migration: aggiunta colonna codice_destinatario a gest_vettori');
    }

  } catch (err) {
    console.error('Migration error:', err.message);
  }

  console.log('Database inizializzato correttamente');
}

// ============================================================================
// HELPER: Conversione snake_case <-> camelCase
// ============================================================================

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toCamelCase(obj) {
  if (!obj) return obj;
  const result = {};
  for (const key in obj) {
    result[snakeToCamel(key)] = obj[key];
  }
  return result;
}

function toSnakeCase(obj) {
  if (!obj) return obj;
  const result = {};
  for (const key in obj) {
    let value = obj[key];
    // Converti booleani in 1/0 per SQLite
    if (typeof value === 'boolean') {
      value = value ? 1 : 0;
    }
    result[camelToSnake(key)] = value;
  }
  return result;
}

// ============================================================================
// CRUD GENERICO PER TABELLE
// ============================================================================

export function createRepository(tableName) {
  return {
    findAll: (limit = 100, offset = 0) => {
      const stmt = db.prepare(`SELECT * FROM ${tableName} ORDER BY id DESC LIMIT ? OFFSET ?`);
      return stmt.all(limit, offset).map(toCamelCase);
    },

    count: () => {
      return db.prepare(`SELECT COUNT(*) as total FROM ${tableName}`).get().total;
    },

    findById: (id) => {
      const row = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id);
      return toCamelCase(row);
    },

    create: (data) => {
      const snakeData = toSnakeCase(data);
      delete snakeData.id;
      delete snakeData.created_at;
      delete snakeData.updated_at;
      
      const keys = Object.keys(snakeData);
      const placeholders = keys.map(() => '?').join(', ');
      const values = Object.values(snakeData);
      
      const stmt = db.prepare(`INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`);
      const result = stmt.run(...values);
      return { ...data, id: result.lastInsertRowid };
    },

    update: (id, data) => {
      const snakeData = toSnakeCase(data);
      delete snakeData.id;
      delete snakeData.created_at;
      snakeData.updated_at = new Date().toISOString();
      
      const keys = Object.keys(snakeData);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(snakeData), id];
      
      db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`).run(...values);
      return { ...data, id };
    },

    delete: (id) => {
      return db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
    }
  };
}

// ============================================================================
// REPOSITORY GESTIONALE PRE-CONFIGURATI
// ============================================================================

export const clientiRepo = createRepository('gest_clienti');
export const vettoriRepo = createRepository('gest_vettori');
export const mittentiDestinatariRepo = createRepository('gest_mittenti_destinatari');
export const piattaformeRepo = createRepository('gest_piattaforme');
export const magazzinoRepo = createRepository('gest_magazzino');
export const tipiVeicoliRepo = createRepository('gest_tipi_veicoli');
export const autistiRepo = createRepository('gest_autisti');
export const officineRepo = createRepository('gest_officine');
export const tipiDocumentiRepo = createRepository('gest_tipi_documenti');

// ============================================================================
// IMPOSTAZIONI UTENTE
// ============================================================================

export const userSettingsRepo = {
  get: (userId, key) => {
    const row = db.prepare(`SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?`).get(userId || 0, key);
    return row ? JSON.parse(row.setting_value) : null;
  },

  set: (userId, key, value) => {
    const jsonValue = JSON.stringify(value);
    db.prepare(`
      INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, setting_key) 
      DO UPDATE SET setting_value = ?, updated_at = datetime('now')
    `).run(userId || 0, key, jsonValue, jsonValue);
    return value;
  },

  getAll: (userId) => {
    const rows = db.prepare(`SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?`).all(userId || 0);
    const result = {};
    for (const row of rows) {
      result[row.setting_key] = JSON.parse(row.setting_value);
    }
    return result;
  },

  delete: (userId, key) => {
    return db.prepare(`DELETE FROM user_settings WHERE user_id = ? AND setting_key = ?`).run(userId || 0, key);
  }
};

export default db;
