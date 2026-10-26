import pino from 'pino';

const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

let _logger: pino.Logger;

try {
	_logger = pino({
		level: isProduction ? 'info' : 'debug',
		redact: isProduction ? ['err.stack'] : [],
		transport: isProduction
			? undefined
			: { target: 'pino-pretty', options: { colorize: true } }
	});
} catch {
	_logger = pino({
		level: isProduction ? 'info' : 'debug',
		redact: isProduction ? ['err.stack'] : []
	});
}

export const logger = _logger;