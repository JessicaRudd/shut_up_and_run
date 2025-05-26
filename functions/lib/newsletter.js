"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndDeliverNewsletter = void 0;
const functions = __importStar(require("firebase-functions"));
const admin_1 = require("./lib/firebase/admin");
const weatherCache_1 = require("./weatherCache");
const newsCache_1 = require("./newsCache");
exports.generateAndDeliverNewsletter = functions.pubsub
    .schedule('0 0 * * *') // Run at midnight every day
    .timeZone('America/New_York') // Adjust based on your target timezone
    .onRun(async (context) => {
    var _a, _b;
    try {
        // Get all users
        const usersSnapshot = await admin_1.db.collection('users').get();
        for (const userDoc of usersSnapshot.docs) {
            const userProfile = userDoc.data();
            const userId = userDoc.id;
            try {
                // Get user's timezone
                const userTimezone = userProfile.timezone || 'America/New_York';
                const userTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });
                const userHour = new Date(userTime).getHours();
                // Only generate newsletter if it's after midnight in user's timezone
                if (userHour < 0 || userHour > 6) {
                    console.log(`Skipping newsletter for user ${userId} - not after midnight in their timezone`);
                    continue;
                }
                // Gather data
                const weatherData = await (0, weatherCache_1.fetchWeatherData)(userProfile.location);
                const newsData = await (0, newsCache_1.fetchNewsData)(userProfile.newsSearchPreferences || [], userProfile.location);
                // Store newsletter in Firestore
                await admin_1.db.collection('newsletters').add({
                    userId,
                    content: {
                        weather: weatherData,
                        news: newsData
                    },
                    generatedAt: new Date(),
                    delivered: false
                });
                // Deliver newsletter based on user preferences
                const delivery = {};
                if ((_a = userProfile.newsletterDelivery) === null || _a === void 0 ? void 0 : _a.email) {
                    // TODO: Implement email delivery using SendGrid or similar
                    delivery.email = userProfile.newsletterDelivery.email;
                }
                if ((_b = userProfile.newsletterDelivery) === null || _b === void 0 ? void 0 : _b.googleChat) {
                    // TODO: Implement Google Chat delivery
                    delivery.googleChat = userProfile.newsletterDelivery.googleChat;
                }
                // Update delivery status
                if (Object.keys(delivery).length > 0) {
                    await admin_1.db.collection('newsletters').doc(userId).update({
                        delivered: true,
                        deliveryInfo: delivery
                    });
                }
            }
            catch (error) {
                console.error(`Error processing newsletter for user ${userId}:`, error);
                // Continue with next user
                continue;
            }
        }
        return null;
    }
    catch (error) {
        console.error('Error in newsletter generation:', error);
        throw error;
    }
});
//# sourceMappingURL=newsletter.js.map