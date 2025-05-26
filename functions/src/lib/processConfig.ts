import { EventEmitter } from 'events';

// Increase the maximum number of listeners for the process
process.setMaxListeners(20); // Increased from default 10

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

export const configureProcess = () => {
  // Additional process configuration can be added here
  return process;
}; 