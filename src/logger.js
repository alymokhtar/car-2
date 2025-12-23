// src/logger.js - Simple logging utility for monitoring
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

let currentLevel = LOG_LEVELS.INFO;

export function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLevel = LOG_LEVELS[level];
  }
}

function log(level, message, data) {
  if (LOG_LEVELS[level] >= currentLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    console.log(`${prefix} ${message}`, data || '');
    
    // Optional: Send to remote logging service (e.g., Sentry, LogRocket)
    // sendToRemoteLogger({ level, message, data, timestamp });
  }
}

export function debug(message, data) {
  log('DEBUG', message, data);
}

export function info(message, data) {
  log('INFO', message, data);
}

export function warn(message, data) {
  log('WARN', message, data);
}

export function error(message, data) {
  log('ERROR', message, data);
}

// Optional: Send to remote service
// function sendToRemoteLogger(logEntry) {
//   // Example: send to Sentry
//   // Sentry.captureMessage(logEntry.message, logEntry.level.toLowerCase());
// }
