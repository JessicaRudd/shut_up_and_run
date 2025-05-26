import { configureProcess } from './lib/processConfig';

// Configure process settings
configureProcess();

// Export all functions
export * from './weatherCache';
export * from './newsCache';
export * from './newsletter'; 