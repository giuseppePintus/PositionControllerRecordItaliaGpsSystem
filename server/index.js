import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import database and initialize
import db, { initDatabase } from './database/db.js';
initDatabase();

// Import routes
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import vehicleControllerApi from './routes/vehicleControllerApi.js';
import gestionaleApi from './routes/gestionaleApi.js';

// Import services
import { monitoringService } from './services/monitoringService.js';
import { recordItaliaClient } from './services/recordItaliaClient.js';
import whatsappService from './services/whatsappService.js';
import { logger } from './services/loggerService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 1000, // Limite richieste per IP
  message: { error: 'Troppe richieste, riprova più tardi' }
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);
app.use('/api/v2', vehicleControllerApi);
app.use('/api/gestionale', gestionaleApi);
app.use('/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    monitoring: monitoringService.getStatus()
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientPath));
  
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Errore interno del server' 
      : err.message
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚛 GPS TRACKER SYSTEM                                   ║
║                                                            ║
║   Server avviato su: http://localhost:${PORT}              ║
║   Ambiente: ${process.env.NODE_ENV || 'development'}                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Test API connection
  console.log('🔌 Test connessione API Record Italia...');
  try {
    const connected = await recordItaliaClient.testConnection();
    if (connected) {
      console.log('✅ Connessione API Record Italia OK');
      
      // Avvia monitoraggio automatico
      monitoringService.start();
    } else {
      console.log('❌ Connessione API Record Italia fallita');
    }
  } catch (error) {
    console.error('❌ Errore test connessione:', error.message);
  }

  // Inizializza WhatsApp Bot (opzionale, si può anche fare via API)
  console.log('📱 Inizializzazione WhatsApp Bot...');
  try {
    await whatsappService.initialize();
    console.log('✅ WhatsApp Bot inizializzato (QR Code in console se necessario)');
  } catch (error) {
    console.warn('⚠️ WhatsApp Bot non inizializzato:', error.message);
    console.log('   Puoi inizializzarlo manualmente via API /api/whatsapp/initialize');
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM ricevuto, chiusura server...');
  monitoringService.stop();
  await whatsappService.disconnect();
  db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT ricevuto, chiusura server...');
  monitoringService.stop();
  await whatsappService.disconnect();
  db.close();
  process.exit(0);
});

export default app;
