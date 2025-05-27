"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureProcess = void 0;
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
const configureProcess = () => {
    // Additional process configuration can be added here
    return process;
};
exports.configureProcess = configureProcess;
//# sourceMappingURL=processConfig.js.map