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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewsData = void 0;
exports.fetchNewsData = fetchNewsData;
const functions = __importStar(require("firebase-functions"));
const admin_1 = require("./lib/firebase/admin");
const axios_1 = __importDefault(require("axios"));
const secret_manager_1 = require("@google-cloud/secret-manager");
const secretManager = new secret_manager_1.SecretManagerServiceClient();
async function getSecret(secretName) {
    var _a, _b;
    const [version] = await secretManager.accessSecretVersion({
        name: `projects/shut-up-and-run/secrets/${secretName}/versions/latest`,
    });
    return ((_b = (_a = version.payload) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.toString()) || '';
}
async function fetchNewsData(categories, location) {
    // Check cache first
    const cacheKey = `${categories.sort().join('_')}_${location || 'global'}`;
    const cacheRef = admin_1.db.collection('newsCache').doc(cacheKey);
    const cacheDoc = await cacheRef.get();
    if (cacheDoc.exists) {
        const cachedData = cacheDoc.data();
        const cacheTime = cachedData.timestamp.toDate();
        const now = new Date();
        // Cache is valid for 30 minutes
        if (now.getTime() - cacheTime.getTime() < 1800000) {
            return cachedData.articles;
        }
    }
    // Get API credentials from Secret Manager
    const [apiKey, searchEngineId] = await Promise.all([
        getSecret('GOOGLE_SEARCH_API_KEY'),
        getSecret('GOOGLE_SEARCH_CX')
    ]);
    const searchPromises = categories.map(async (category) => {
        var _a;
        const query = `${category} running news ${location ? `in ${location}` : ''}`;
        const response = await axios_1.default.get(`https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`);
        return ((_a = response.data.items) === null || _a === void 0 ? void 0 : _a.map((item) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet
        }))) || [];
    });
    const results = await Promise.all(searchPromises);
    const articles = results.flat().slice(0, 10); // Limit to 10 articles total
    // Update cache
    await cacheRef.set({
        articles,
        timestamp: new Date()
    });
    return articles;
}
exports.getNewsData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { categories, location } = data;
    if (!categories || !Array.isArray(categories)) {
        throw new functions.https.HttpsError('invalid-argument', 'Categories array is required');
    }
    return fetchNewsData(categories, location);
});
//# sourceMappingURL=newsCache.js.map