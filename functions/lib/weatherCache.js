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
exports.getWeatherData = void 0;
exports.fetchWeatherData = fetchWeatherData;
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
async function fetchWeatherData(location, unit = 'imperial') {
    // Check cache first
    const cacheRef = admin_1.db.collection('weatherCache').doc(`${location}_${unit}`);
    const cacheDoc = await cacheRef.get();
    if (cacheDoc.exists) {
        const cachedData = cacheDoc.data();
        const cacheTime = cachedData.timestamp.toDate();
        const now = new Date();
        // Cache is valid for 1 hour
        if (cacheTime && (now.getTime() - cacheTime.getTime() < 3600000)) {
            return cachedData.weatherData;
        }
    }
    // Get API key from Secret Manager
    const apiKey = await getSecret('OPENWEATHERMAP_API_KEY');
    // Fetch new data from OpenWeatherMap
    const response = await axios_1.default.get(`https://api.openweathermap.org/data/2.5/forecast?q=${location}&units=${unit}&appid=${apiKey}`);
    const weatherData = {
        locationName: location,
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        overallDescription: response.data.list[0].weather[0].description,
        tempMin: Math.min(...response.data.list.map((item) => item.main.temp_min)),
        tempMax: Math.max(...response.data.list.map((item) => item.main.temp_max)),
        sunrise: new Date(response.data.city.sunrise * 1000).toLocaleTimeString(),
        sunset: new Date(response.data.city.sunset * 1000).toLocaleTimeString(),
        humidityAvg: response.data.list.reduce((acc, item) => acc + item.main.humidity, 0) / response.data.list.length,
        hourly: response.data.list.slice(0, 8).map((item) => ({
            time: new Date(item.dt * 1000).toLocaleTimeString(),
            temp: item.main.temp,
            feelsLike: item.main.feels_like,
            description: item.weather[0].description,
            pop: item.pop * 100,
            windSpeed: item.wind.speed,
            windGust: item.wind.gust,
            icon: item.weather[0].icon
        }))
    };
    // Update cache
    await cacheRef.set({
        weatherData,
        timestamp: new Date()
    });
    return weatherData;
}
exports.getWeatherData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { location, unit = 'imperial' } = data;
    if (!location) {
        throw new functions.https.HttpsError('invalid-argument', 'Location is required');
    }
    return fetchWeatherData(location, unit);
});
//# sourceMappingURL=weatherCache.js.map