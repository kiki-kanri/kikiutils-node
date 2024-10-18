describe('Pino Logger', () => {
	beforeEach(() => {
		delete process.env.PINO_LOGGER_LEVEL;
		delete process.env.NODE_ENV;
		jest.resetModules();
	});

	it('should create a pino instance', () => {
		const { logger } = require('../src/pino');
		expect(logger).toBeDefined();
		expect(logger).toHaveProperty('error');
		expect(logger).toHaveProperty('info');
		expect(logger).toHaveProperty('warn');
	});

	it('should set the logger level based on PINO_LOGGER_LEVEL environment variable', () => {
		process.env.PINO_LOGGER_LEVEL = 'warn';
		jest.isolateModules(() => {
			const { logger } = require('../src/pino');
			expect(logger.level).toBe('warn');
		});
	});

	it('should set the logger level to error in production environment', () => {
		process.env.NODE_ENV = 'production';
		jest.isolateModules(() => {
			const { logger } = require('../src/pino');
			expect(logger.level).toBe('error');
		});
	});

	it('should allow manual logger level assignment', () => {
		const { logger } = require('../src/pino');
		logger.level = 'info';
		expect(logger.level).toBe('info');
	});
});