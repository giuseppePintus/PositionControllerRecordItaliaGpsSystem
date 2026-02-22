// ============================================================================
// DATABASE GESTIONALE - Tabelle Anagrafiche
// ============================================================================
import db from './db.js';

// Inizializza le tabelle del gestionale
export function initGestionaleDatabase() {
  
  // ==================== CLIENTI ====================
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

  // ==================== VETTORI ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_vettori (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ragione_sociale TEXT NOT NULL,
      tipo_vettore TEXT DEFAULT 'esterno',
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
      referente TEXT,
      telefono_referente TEXT,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ==================== MITTENTI/DESTINATARI ====================
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

  // ==================== PIATTAFORME LOGISTICHE ====================
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

  // ==================== MAGAZZINO ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_magazzino (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codice TEXT NOT NULL UNIQUE,
      descrizione TEXT NOT NULL,
      categoria TEXT,
      unita_misura TEXT DEFAULT 'pz',
      giacenza INTEGER DEFAULT 0,
      scorta_minima INTEGER DEFAULT 0,
      prezzo_acquisto REAL DEFAULT 0,
      fornitore TEXT,
      ubicazione TEXT,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ==================== TIPI VEICOLI ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_tipi_veicoli (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codice TEXT,
      categoria TEXT DEFAULT 'autoarticolato',
      lunghezza REAL DEFAULT 16.50,
      larghezza REAL DEFAULT 2.55,
      altezza REAL DEFAULT 4.00,
      peso_max REAL DEFAULT 44.0,
      portata_utile REAL DEFAULT 26.0,
      volume_utile REAL DEFAULT 90.0,
      num_assi INTEGER DEFAULT 5,
      euro_classe TEXT,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ==================== AUTISTI (Gestionale) ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_autisti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cognome TEXT NOT NULL,
      nome TEXT NOT NULL,
      codice_fiscale TEXT,
      telefono TEXT NOT NULL,
      telefono_whatsapp TEXT,
      email TEXT,
      patente_numero TEXT,
      patente_scadenza DATE,
      cqc_scadenza DATE,
      carta_qualificazione TEXT,
      data_assunzione DATE,
      tipo_contratto TEXT,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ==================== OFFICINE ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_officine (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ragione_sociale TEXT NOT NULL,
      tipo TEXT DEFAULT 'meccanica',
      indirizzo TEXT,
      citta TEXT,
      provincia TEXT,
      telefono TEXT,
      telefono_emergenza TEXT,
      email TEXT,
      orari_apertura TEXT,
      servizi TEXT,
      convenzionato INTEGER DEFAULT 0,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ==================== TIPI DOCUMENTI ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS gest_tipi_documenti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codice TEXT,
      categoria TEXT DEFAULT 'trasporto',
      descrizione TEXT,
      obbligatorio INTEGER DEFAULT 0,
      scadenza INTEGER DEFAULT 0,
      giorni_preavviso INTEGER DEFAULT 30,
      note TEXT,
      attivo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ==================== IMPOSTAZIONI UTENTE ====================
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      setting_key TEXT NOT NULL,
      setting_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, setting_key)
    )
  `);

  console.log('✅ Database Gestionale inizializzato');
}

// ============================================================================
// CRUD GENERICI PER ANAGRAFICHE
// ============================================================================

// Helper per convertire snake_case a camelCase
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// Helper per convertire camelCase a snake_case
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Converte un oggetto da snake_case a camelCase
function toCamelCase(obj) {
  if (!obj) return obj;
  const result = {};
  for (const key in obj) {
    result[snakeToCamel(key)] = obj[key];
  }
  return result;
}

// Converte un oggetto da camelCase a snake_case
function toSnakeCase(obj) {
  if (!obj) return obj;
  const result = {};
  for (const key in obj) {
    result[camelToSnake(key)] = obj[key];
  }
  return result;
}

// ============================================================================
// REPOSITORY GENERICO
// ============================================================================

export function createRepository(tableName) {
  return {
    // Lista tutti i record con paginazione
    findAll: (limit = 100, offset = 0) => {
      const stmt = db.prepare(`SELECT * FROM ${tableName} ORDER BY id DESC LIMIT ? OFFSET ?`);
      const rows = stmt.all(limit, offset);
      return rows.map(toCamelCase);
    },

    // Conta totale record
    count: (where = '') => {
      const query = where 
        ? `SELECT COUNT(*) as total FROM ${tableName} WHERE ${where}`
        : `SELECT COUNT(*) as total FROM ${tableName}`;
      return db.prepare(query).get().total;
    },

    // Trova per ID
    findById: (id) => {
      const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
      const row = stmt.get(id);
      return toCamelCase(row);
    },

    // Crea nuovo record
    create: (data) => {
      const snakeData = toSnakeCase(data);
      delete snakeData.id; // Rimuovi id se presente
      delete snakeData.created_at;
      delete snakeData.updated_at;
      
      const keys = Object.keys(snakeData);
      const placeholders = keys.map(() => '?').join(', ');
      const values = Object.values(snakeData);
      
      const stmt = db.prepare(`
        INSERT INTO ${tableName} (${keys.join(', ')})
        VALUES (${placeholders})
      `);
      
      const result = stmt.run(...values);
      return { ...data, id: result.lastInsertRowid };
    },

    // Aggiorna record
    update: (id, data) => {
      const snakeData = toSnakeCase(data);
      delete snakeData.id;
      delete snakeData.created_at;
      snakeData.updated_at = new Date().toISOString();
      
      const keys = Object.keys(snakeData);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(snakeData), id];
      
      const stmt = db.prepare(`
        UPDATE ${tableName} 
        SET ${setClause}
        WHERE id = ?
      `);
      
      stmt.run(...values);
      return { ...data, id };
    },

    // Elimina record
    delete: (id) => {
      const stmt = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
      return stmt.run(id);
    },

    // Ricerca con filtri
    search: (term, fields, limit = 100) => {
      if (!term || !fields.length) {
        return [];
      }
      const conditions = fields.map(f => `${camelToSnake(f)} LIKE ?`).join(' OR ');
      const stmt = db.prepare(`
        SELECT * FROM ${tableName} 
        WHERE ${conditions}
        ORDER BY id DESC
        LIMIT ?
      `);
      const searchTerm = `%${term}%`;
      const params = [...fields.map(() => searchTerm), limit];
      const rows = stmt.all(...params);
      return rows.map(toCamelCase);
    }
  };
}

// Repository preconfigurati
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
    const stmt = db.prepare(`
      SELECT setting_value FROM user_settings 
      WHERE user_id = ? AND setting_key = ?
    `);
    const row = stmt.get(userId || 0, key);
    return row ? JSON.parse(row.setting_value) : null;
  },

  set: (userId, key, value) => {
    const stmt = db.prepare(`
      INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, setting_key) 
      DO UPDATE SET setting_value = ?, updated_at = datetime('now')
    `);
    const jsonValue = JSON.stringify(value);
    stmt.run(userId || 0, key, jsonValue, jsonValue);
    return value;
  },

  getAll: (userId) => {
    const stmt = db.prepare(`
      SELECT setting_key, setting_value FROM user_settings 
      WHERE user_id = ?
    `);
    const rows = stmt.all(userId || 0);
    const result = {};
    for (const row of rows) {
      result[row.setting_key] = JSON.parse(row.setting_value);
    }
    return result;
  },

  delete: (userId, key) => {
    const stmt = db.prepare(`
      DELETE FROM user_settings 
      WHERE user_id = ? AND setting_key = ?
    `);
    return stmt.run(userId || 0, key);
  }
};

export default {
  initGestionaleDatabase,
  clientiRepo,
  vettoriRepo,
  mittentiDestinatariRepo,
  piattaformeRepo,
  magazzinoRepo,
  tipiVeicoliRepo,
  autistiRepo,
  officineRepo,
  tipiDocumentiRepo,
  userSettingsRepo
};
