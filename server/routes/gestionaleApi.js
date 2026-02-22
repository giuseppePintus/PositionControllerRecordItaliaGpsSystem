// ============================================================================
// API ROUTES - GESTIONALE
// ============================================================================
import express from 'express';
import {
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
} from '../database/db.js';

const router = express.Router();

// ============================================================================
// HELPER: Crea routes CRUD per una risorsa
// ============================================================================
function createCrudRoutes(router, path, repository) {
  // GET - Lista con paginazione
  router.get(path, (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      const data = repository.findAll(limit, offset);
      const total = repository.count();
      res.json({ data, total, limit, offset });
    } catch (err) {
      console.error(`Errore GET ${path}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET - Singolo record
  router.get(`${path}/:id`, (req, res) => {
    try {
      const item = repository.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'Record non trovato' });
      }
      res.json(item);
    } catch (err) {
      console.error(`Errore GET ${path}/:id:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST - Crea nuovo
  router.post(path, (req, res) => {
    try {
      const item = repository.create(req.body);
      res.status(201).json(item);
    } catch (err) {
      console.error(`Errore POST ${path}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT - Aggiorna
  router.put(`${path}/:id`, (req, res) => {
    try {
      const item = repository.update(req.params.id, req.body);
      res.json(item);
    } catch (err) {
      console.error(`Errore PUT ${path}/:id:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE - Elimina
  router.delete(`${path}/:id`, (req, res) => {
    try {
      repository.delete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error(`Errore DELETE ${path}/:id:`, err);
      res.status(500).json({ error: err.message });
    }
  });
}

// ============================================================================
// ROUTES ANAGRAFICHE
// ============================================================================

createCrudRoutes(router, '/clienti', clientiRepo);
createCrudRoutes(router, '/vettori', vettoriRepo);
createCrudRoutes(router, '/mittenti-destinatari', mittentiDestinatariRepo);
createCrudRoutes(router, '/piattaforme', piattaformeRepo);
createCrudRoutes(router, '/magazzino', magazzinoRepo);
createCrudRoutes(router, '/tipi-veicoli', tipiVeicoliRepo);
createCrudRoutes(router, '/autisti', autistiRepo);
createCrudRoutes(router, '/officine', officineRepo);
createCrudRoutes(router, '/tipi-documenti', tipiDocumentiRepo);

// ============================================================================
// ROUTES IMPOSTAZIONI UTENTE
// ============================================================================

// GET - Tutte le impostazioni utente
router.get('/user-settings', (req, res) => {
  try {
    const userId = req.user?.id || 0;
    const settings = userSettingsRepo.getAll(userId);
    res.json(settings);
  } catch (err) {
    console.error('Errore GET user-settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Singola impostazione
router.get('/user-settings/:key', (req, res) => {
  try {
    const userId = req.user?.id || 0;
    const value = userSettingsRepo.get(userId, req.params.key);
    res.json({ key: req.params.key, value });
  } catch (err) {
    console.error('Errore GET user-settings/:key:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST/PUT - Salva impostazione
router.post('/user-settings/:key', (req, res) => {
  try {
    const userId = req.user?.id || 0;
    const value = userSettingsRepo.set(userId, req.params.key, req.body.value);
    res.json({ key: req.params.key, value });
  } catch (err) {
    console.error('Errore POST user-settings/:key:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Salva tutte le impostazioni
router.post('/user-settings/all', (req, res) => {
  try {
    const userId = req.user?.id || 0;
    const settings = req.body.value || req.body;
    
    // Salva ogni impostazione
    for (const [key, value] of Object.entries(settings)) {
      userSettingsRepo.set(userId, key, value);
    }
    
    res.json({ success: true, settings });
  } catch (err) {
    console.error('Errore POST user-settings/all:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Rimuovi impostazione
router.delete('/user-settings/:key', (req, res) => {
  try {
    const userId = req.user?.id || 0;
    userSettingsRepo.delete(userId, req.params.key);
    res.json({ success: true });
  } catch (err) {
    console.error('Errore DELETE user-settings/:key:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
