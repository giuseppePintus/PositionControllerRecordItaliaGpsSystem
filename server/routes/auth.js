import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { notificationService } from '../services/notificationService.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

/**
 * POST /auth/login - Login utente
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password richiesti' });
    }

    // Check admin credentials from env
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { id: 0, username: 'admin', ruolo: 'admin' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({ token, user: { id: 0, username: 'admin', ruolo: 'admin' } });
    }

    // Check database users
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND attivo = 1').get(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, ruolo: user.ruolo },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        ruolo: user.ruolo,
        telegram_chat_id: user.telegram_chat_id
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /auth/register - Registra nuovo utente (solo admin)
 */
router.post('/register', authenticateToken, async (req, res) => {
  try {
    if (req.user.ruolo !== 'admin') {
      return res.status(403).json({ error: 'Solo gli admin possono registrare utenti' });
    }

    const { username, password, ruolo, telegram_chat_id } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password richiesti' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username già esistente' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, ruolo, telegram_chat_id)
      VALUES (?, ?, ?, ?)
    `).run(username, password_hash, ruolo || 'viewer', telegram_chat_id || null);

    const user = db.prepare('SELECT id, username, ruolo, telegram_chat_id, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /auth/me - Ottieni utente corrente
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

/**
 * PUT /auth/me - Aggiorna profilo utente
 */
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { telegram_chat_id, current_password, new_password } = req.body;

    if (req.user.id === 0) {
      // Admin da env - non può modificare
      return res.status(400).json({ error: 'Admin predefinito non modificabile' });
    }

    // Verifica password se si vuole cambiarla
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Password attuale richiesta' });
      }

      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
      const validPassword = await bcrypt.compare(current_password, user.password_hash);
      
      if (!validPassword) {
        return res.status(401).json({ error: 'Password attuale non valida' });
      }

      const password_hash = await bcrypt.hash(new_password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, req.user.id);
    }

    // Aggiorna telegram_chat_id
    if (telegram_chat_id !== undefined) {
      db.prepare('UPDATE users SET telegram_chat_id = ? WHERE id = ?').run(telegram_chat_id, req.user.id);
    }

    const updatedUser = db.prepare('SELECT id, username, ruolo, telegram_chat_id FROM users WHERE id = ?')
      .get(req.user.id);

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /auth/users - Lista utenti (solo admin)
 */
router.get('/users', authenticateToken, (req, res) => {
  try {
    if (req.user.ruolo !== 'admin') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const users = db.prepare('SELECT id, username, ruolo, telegram_chat_id, attivo, created_at FROM users').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /auth/users/:id - Elimina utente (solo admin)
 */
router.delete('/users/:id', authenticateToken, (req, res) => {
  try {
    if (req.user.ruolo !== 'admin') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PUSH NOTIFICATIONS ====================

/**
 * POST /auth/push/subscribe - Registra subscription push
 */
router.post('/push/subscribe', (req, res) => {
  try {
    const { subscription } = req.body;
    const userAgent = req.get('User-Agent') || '';

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Subscription non valida' });
    }

    notificationService.saveSubscription(subscription, userAgent);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /auth/push/unsubscribe - Rimuovi subscription push
 */
router.post('/push/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint richiesto' });
    }

    notificationService.removeSubscription(endpoint);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /auth/push/vapid-public-key - Ottieni chiave pubblica VAPID
 */
router.get('/push/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
});

/**
 * POST /auth/push/test - Invia notifica push di test
 */
router.post('/push/test', authenticateToken, async (req, res) => {
  try {
    await notificationService.sendPushToAll({
      title: '🔔 Test Notifica',
      body: 'Questa è una notifica di test dal sistema GPS Tracker',
      data: { test: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /auth/telegram/test - Invia messaggio Telegram di test
 */
router.post('/telegram/test', authenticateToken, async (req, res) => {
  try {
    const { chat_id } = req.body;
    const result = await notificationService.sendTelegram(
      '🔔 *Test Notifica*\n\nQuesta è una notifica di test dal sistema GPS Tracker.',
      chat_id
    );
    res.json({ success: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Middleware per autenticazione JWT
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token non valido' });
    }
    req.user = user;
    next();
  });
}

export default router;
