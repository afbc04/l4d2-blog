const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Garantees directory exists
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Changes format - console
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// Changes format - file
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({ filename: path.join(logDir, 'app.log'), format: fileFormat })
  ]
});

// Methods log request
logger.httpRequest = (req, res, duration) => {
  logger.info(
    `${req.method} ${req.originalUrl} | ${res.statusCode} | ${duration}ms | IP: ${req.ip} | User: ${req.token?._id || '???'}`
  );
};

// Methods log event
logger.event = (event, extraData = '') => {
  logger.info(`EVENT: ${event} ${extraData}`);
};

// Methods log error
logger.err = (err, req) => {
  const method = req?.method || '-';
  const url = req?.originalUrl || '-';
  const ip = req?.ip || '-';
  const user = req?.token?._id || '???';

  logger.error(`ERROR ${method} ${url} | ${err.message} | IP: ${ip} | User: ${user}`);
  if (err.stack) console.error(err.stack);
};

module.exports = logger;