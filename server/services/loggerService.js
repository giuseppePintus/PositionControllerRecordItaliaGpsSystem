import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.resolve(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  API: 'API',
  ALARM: 'ALARM',
  WHATSAPP: 'WHATSAPP'
};

// Colors for console output
const COLORS = {
  ERROR: '\x1b[31m',    // Red
  WARN: '\x1b[33m',     // Yellow
  INFO: '\x1b[36m',     // Cyan
  DEBUG: '\x1b[90m',    // Gray
  API: '\x1b[35m',      // Magenta
  ALARM: '\x1b[41m',    // Red background
  WHATSAPP: '\x1b[32m', // Green
  RESET: '\x1b[0m'
};

// Emojis for log types
const EMOJIS = {
  ERROR: '❌',
  WARN: '⚠️',
  INFO: 'ℹ️',
  DEBUG: '🔍',
  API: '🔌',
  ALARM: '🚨',
  WHATSAPP: '📱'
};

class LoggerService {
  constructor() {
    this.logToFile = process.env.LOG_TO_FILE !== 'false';
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
    this.maxLogFiles = parseInt(process.env.MAX_LOG_FILES) || 7;
    this.currentLogFile = this.getLogFileName();
    
    // Rotate logs daily
    this.scheduleLogRotation();
  }

  getLogFileName(date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    return path.join(logsDir, `gps-tracker-${dateStr}.log`);
  }

  scheduleLogRotation() {
    // Check for rotation every hour
    setInterval(() => {
      const newLogFile = this.getLogFileName();
      if (newLogFile !== this.currentLogFile) {
        this.currentLogFile = newLogFile;
        this.cleanOldLogs();
      }
    }, 3600000); // 1 hour
  }

  cleanOldLogs() {
    try {
      const files = fs.readdirSync(logsDir)
        .filter(f => f.startsWith('gps-tracker-') && f.endsWith('.log'))
        .sort()
        .reverse();

      // Keep only the last maxLogFiles
      files.slice(this.maxLogFiles).forEach(file => {
        fs.unlinkSync(path.join(logsDir, file));
      });
    } catch (error) {
      console.error('Error cleaning old logs:', error.message);
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const emoji = EMOJIS[level] || '';
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    
    return {
      console: `${COLORS[level] || ''}${emoji} [${timestamp}] [${level}] ${message}${metaStr}${COLORS.RESET}`,
      file: `[${timestamp}] [${level}] ${message}${metaStr}`
    };
  }

  shouldLog(level) {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    // Always log API, ALARM, WHATSAPP
    if (['API', 'ALARM', 'WHATSAPP'].includes(level)) return true;
    
    return messageLevelIndex >= currentLevelIndex;
  }

  writeToFile(message) {
    if (!this.logToFile) return;
    
    try {
      fs.appendFileSync(this.currentLogFile, message + '\n');
    } catch (error) {
      console.error('Error writing to log file:', error.message);
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;
    
    const formatted = this.formatMessage(level, message, meta);
    console.log(formatted.console);
    this.writeToFile(formatted.file);
  }

  error(message, meta = {}) {
    this.log(LOG_LEVELS.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  debug(message, meta = {}) {
    this.log(LOG_LEVELS.DEBUG, message, meta);
  }

  api(message, meta = {}) {
    this.log(LOG_LEVELS.API, message, meta);
  }

  alarm(message, meta = {}) {
    this.log(LOG_LEVELS.ALARM, message, meta);
  }

  whatsapp(message, meta = {}) {
    this.log(LOG_LEVELS.WHATSAPP, message, meta);
  }

  // Get recent logs from file
  getRecentLogs(lines = 100, level = null) {
    try {
      if (!fs.existsSync(this.currentLogFile)) {
        return [];
      }
      
      const content = fs.readFileSync(this.currentLogFile, 'utf8');
      let logs = content.split('\n').filter(line => line.trim());
      
      if (level) {
        logs = logs.filter(line => line.includes(`[${level}]`));
      }
      
      return logs.slice(-lines);
    } catch (error) {
      return [];
    }
  }

  // Get log statistics
  getStats() {
    try {
      if (!fs.existsSync(this.currentLogFile)) {
        return { errors: 0, warnings: 0, alarms: 0, apiCalls: 0 };
      }
      
      const content = fs.readFileSync(this.currentLogFile, 'utf8');
      const lines = content.split('\n');
      
      return {
        errors: lines.filter(l => l.includes('[ERROR]')).length,
        warnings: lines.filter(l => l.includes('[WARN]')).length,
        alarms: lines.filter(l => l.includes('[ALARM]')).length,
        apiCalls: lines.filter(l => l.includes('[API]')).length,
        total: lines.filter(l => l.trim()).length
      };
    } catch (error) {
      return { errors: 0, warnings: 0, alarms: 0, apiCalls: 0, total: 0 };
    }
  }
}

export const logger = new LoggerService();
export default logger;
